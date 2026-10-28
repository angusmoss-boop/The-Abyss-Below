"""Real old-build migration and actual slot UI transitions; no user data used."""
from v0200_harness import *
from v0200_wild_migration_test import old_build
from playwright.sync_api import sync_playwright
import zipfile,copy
INDEX='abyss-campaign-slots-v1';LEGACY='the-abyss-below-campaign-v3'
def slot(i):return 'the-abyss-below-slot-'+str(i)+'-v1'
def archive(p):
 if p.locator('#slotsDialog').evaluate('e=>e.open'):return
 if state(p)['menuOpen']:p.locator('#menuSlotsBtn').click()
 else:
  if not state(p)['pauseOpen']:p.locator('#focusPauseBtn').click()
  p.locator('#pauseSlotsBtn').click()
def rebuild(b,c,p):
 s=store(p);c.close();return build(b,390,844,True,store=s,launch=False)
def run():
 with sync_playwright() as pw:
  b=launch_browser(pw)
  baseline=Path('/mnt/data/the-abyss-below-v0.15.0-complete.zip');fixture=ROOT/'tests/fixtures/v0150_campaign_slots.json'
  if baseline.exists():
   with zipfile.ZipFile(baseline) as z:c,p,e=old_build(b,z)
   p.evaluate('AbyssDiagnostics.grantCredits(777);AbyssDiagnostics.grantCrystals(33)')
   node=next(n for n in debug(p)['items'] if n['type']=='crystal');move(p,node['x'],node['y']);use(p);p.evaluate('AbyssDiagnostics.save()')
   original=store(p);c.close();fixture.write_text(json.dumps(original,indent=2)+'\n')
  else:original=json.loads(fixture.read_text())
  old=json.loads(original[LEGACY])
  c,p,e=build(b,390,844,True,store=original,launch=False)
  assert state(p)['slot']==1 and state(p)['hasSavedDive']
  assert store(p)[LEGACY]==original[LEGACY]
  p.locator('#startBtn').click();d=debug(p)
  for k in ['credits','crystals','mineAmmo','stats','achievements']:assert d['saved'][k]==old['profile'][k],k
  assert all(d['saved']['upgrades'][k]==v for k,v in old['profile']['upgrades'].items())
  for k in ['loot','looted','secured','recoveries','wild','survey']:assert d['field'][k]==old['levels'][old['selectedLevel']][k],k
  for k in ['x','y','hull','cargo','battery','oxygen']:assert (d['player'][k]==dict(old['activeDive']['player'][k],plates=[]) if k=='cargo' else d['player'][k]==old['activeDive']['player'][k]),k
  assert d['player']['weaponAmmo']=={'railgun':0,'torpedo':0}
  before=debug(p);archive(p);assert p.locator('.campaign-slot').count()==3
  p.locator('#slotName2').fill('Second Current');p.locator('[data-new-slot="2"]').click();assert p.evaluate('AbyssSlotReloadRequested')
  saved1=store(p)[slot(1)];c,p,e=rebuild(b,c,p);assert state(p)['slot']==2 and state(p)['campaignTitle']=='Second Current' and state(p)['credits']==0
  assert state(p)['secured']==0 and state(p)['mineAmmo']==0 and state(p)['hullLevel']==0
  p.locator('#startBtn').click();p.evaluate('AbyssDiagnostics.grantCredits(222);AbyssDiagnostics.grantCrystals(22)');archive(p)
  p.locator('#slotName3').fill('Third Descent');p.locator('[data-new-slot="3"]').click();c,p,e=rebuild(b,c,p)
  p.locator('#startBtn').click();p.evaluate('AbyssDiagnostics.grantCredits(333);AbyssDiagnostics.grantCrystals(44)');archive(p)
  assert not p.locator('[data-new-slot]').count() and p.locator('.campaign-slot').count()==3
  assert not p.evaluate('AbyssSlots.activate(1,"Overwrite")')
  assert 'already contains' in p.evaluate('AbyssSlots.status().error')
  p.locator('[data-load-slot="1"]').click();c,p,e=rebuild(b,c,p);assert state(p)['credits']==777 and state(p)['campaignTitle']=='Campaign 1'
  p.locator('#startBtn').click();assert state(p)['paused'];now=debug(p)
  for k in ['x','y','hull','cargo','battery','oxygen']:assert now['player'][k]==before['player'][k],k
  assert now['field']['looted']==before['field']['looted']
  archive(p);ss=store(p)
  assert json.loads(ss[slot(2)])['profile']['credits']==222 and json.loads(ss[slot(3)])['profile']['credits']==333
  print('PASS actual v0.15 campaign migrates into Slot 1; all 3 named slots independent; no overwrite when full; loading restores paused cargo and depleted map unchanged')
  # Cancel then confirm deletion affects only target, and neither backup nor original legacy resurfaces.
  p.locator('[data-delete-slot="2"]').click();p.locator('[data-cancel-delete]').click();assert slot(2) in store(p) and not json.loads(store(p)[slot(2)]).get('empty')
  p.locator('[data-delete-slot="2"]').click();p.locator('[data-confirm-delete="2"]').click();assert p.locator('#slotName2').is_visible()
  assert json.loads(store(p)[slot(2)])['empty'] and slot(2)+'.backup' not in store(p)
  assert store(p)[slot(3)]==ss[slot(3)]
  p.locator('[data-delete-slot="1"]').click();p.locator('[data-confirm-delete="1"]').click();deleted=store(p)
  p.evaluate('dispatchEvent(new Event("pagehide"))');assert store(p)[slot(1)]==deleted[slot(1)]
  c,p,e=rebuild(b,c,p);assert state(p)['slot']==3 and state(p)['credits']==333
  archive(p);assert p.locator('#slotName1').is_visible();assert store(p)[LEGACY]==original[LEGACY]
  print('PASS delete confirmation/cancel, other campaigns intact, pagehide cannot resurrect deleted current save; original legacy never reimported')
  # Backup recovery and quota protection.
  recovered=copy.deepcopy(ss);recovered[slot(1)+'.backup']=ss[slot(1)];recovered[slot(1)]='broken-json';c.close();c,p,e=build(b,store=recovered,launch=False)
  assert state(p)['credits']==777 and p.evaluate('AbyssSlots.status().recovered')
  p.locator('#startBtn').click();archive(p);saved=store(p)[slot(1)]
  p.evaluate('()=>{localStorage.setItem=()=>{throw new DOMException("quota","QuotaExceededError")};}')
  p.locator('[data-load-slot="3"]').click();assert not p.evaluate('Boolean(window.AbyssSlotReloadRequested)')
  assert store(p)[slot(1)]==saved and json.loads(store(p)[INDEX])['active']==1
  assert 'Save failed' in p.locator('#slotsMessage').inner_text()
  c.close();c,p,e=build(b,store=ss,launch=False)
  p.evaluate('''()=>{const k=AbyssSlots.key,v=JSON.parse(testStore[k]);v.profile.credits=9876;testStore[k]=JSON.stringify(v);}''')
  assert not p.evaluate('AbyssDiagnostics.save()');assert json.loads(store(p)[slot(1)])['profile']['credits']==9876
  print('PASS backup recovery, quota failure blocks switching, optimistic stale-window guard refuses to overwrite newer save')
  # Both copies corrupt: exact bytes preserved and another good slot can still be loaded.
  damaged=copy.deepcopy(ss);damaged[slot(1)]='BAD';damaged[slot(1)+'.backup']='BADBACK';c.close();c,p,e=build(b,store=damaged,launch=False)
  assert store(p)[slot(1)]=='BAD' and p.evaluate('AbyssSlots.status().corruptActive')
  archive(p);p.locator('[data-load-slot="3"]').click();c,p,e=rebuild(b,c,p)
  assert state(p)['slot']==3 and state(p)['credits']==333 and store(p)[slot(1)]=='BAD'
  assert not e,e;c.close();b.close();print('PASS unreadable campaign preserved, explicit alternative-slot recovery remains usable')
if __name__=='__main__':run()
