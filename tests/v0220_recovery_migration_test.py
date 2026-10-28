"""Real prior-build migration, all-slot isolation, portable wreck manifests and corrupt checkpoint fallback."""
from v0220_harness import *
from v0220_recovery_test import take, collect_set, assert_no_origin
from playwright.sync_api import sync_playwright
from zipfile import ZipFile
import copy, re
BASE=ROOT.parent/'the-abyss-below-v0.18.1-complete.zip'
FIXTURE=ROOT/'tests/fixtures/v0181_recovery_migration.json'
INDEX='abyss-campaign-slots-v1'

def old_build(b):
 with ZipFile(BASE) as z:
  c=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,service_workers='block');p=c.new_page();errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
  html=z.read('index.html').decode();p.set_content(html);p.add_style_tag(content=z.read('styles.css').decode())
  p.evaluate('''()=>{window.ABYSS_TEST_MODE=true;window.testStore={};Object.defineProperty(window,'localStorage',{value:{getItem:k=>testStore[k]??null,setItem:(k,v)=>testStore[k]=v,removeItem:k=>delete testStore[k]}})}''')
  for src in re.findall(r'<script\s+[^>]*src=["\']([^"\']+)',html):p.add_script_tag(content=z.read(src.split('?')[0]).decode())
 p.locator('#startBtn').click();p.evaluate('requestAnimationFrame=()=>0');p.wait_for_timeout(65);p.evaluate('AbyssDiagnostics.step(0)');return c,p,errors

def activate(p,slot):
 if state(p)['menuOpen']:p.locator('#menuSlotsBtn').click()
 else:
  if not state(p)['pauseOpen']:p.locator('#focusPauseBtn').click()
  p.locator('#pauseSlotsBtn').click()
 p.locator('[data-load-slot="'+str(slot)+'"]').click()
 return store(p)

def run():
 with sync_playwright() as pw:
  b=launch_browser(pw);errors=[]
  if BASE.exists():
   c,p,e=old_build(b);errors+=e;assert state(p)['version']=='0.18.1'
   fix(p,depth=40,upgrades={'hull':7,'engine':3,'railgun':3,'torpedo':3,'minePower':3,'mineCapacity':4},mineAmmo=7)
   p.evaluate('AbyssDiagnostics.relaunch();AbyssDiagnostics.grantCredits(3456);AbyssDiagnostics.grantCrystals(45);AbyssDiagnostics.weaponStock({railgun:20,torpedo:5})')
   collect_set(p);move(p,600,1120);p.evaluate('AbyssDiagnostics.save()');active=store(p);before=debug(p)
   p.evaluate('AbyssDiagnostics.loseDive()');dead=store(p);oldpods=debug(p)['field']['recoveries'];c.close()
   FIXTURE.write_text(json.dumps({'active':active,'before':before,'dead':dead,'oldpods':oldpods},separators=(',',':')))
  else:
   f=json.loads(FIXTURE.read_text());active=f['active'];before=f['before'];dead=f['dead'];oldpods=f['oldpods']
  # Inactive slots are byte-preserved, not migrated/reset until selected.
  for slot in [2,3]:
   value=json.loads(active[CAMPAIGN]);value['id']+='-'+str(slot);value['title']='Rescue '+str(slot);value['profile']['credits']+=slot
   active[f'the-abyss-below-slot-{slot}-v1']=json.dumps(value,separators=(',',':'))
  c,p,e=build(b,390,844,True,store=active,launch=False);errors+=e
  assert state(p)['hasSavedDive'] and state(p)['version']=='0.22.0'
  assert debug(p)['saved']==before['saved']
  for slot in [2,3]:assert store(p)[f'the-abyss-below-slot-{slot}-v1']==active[f'the-abyss-below-slot-{slot}-v1']
  p.locator('#startBtn').click();after=debug(p)
  for k in ['x','y','vx','vy','hull','battery','oxygen','cargo','mineAmmo','weaponAmmo']:assert (after['player'][k]==dict(before['player'][k],plates=before['player'][k].get('plates',[])) if k=='cargo' else after['player'][k]==before['player'][k]),k
  for k in ['loot','looted','salvage','health','secured','recoveries','survey','wild']:assert after['field'][k]==before['field'][k],k
  assert [n for n in after['items'] if n['type']!='battery']==before['items'];assert all(all(a.get(k)==v for k,v in old.items()) for a,old in zip(after['predators'],before['predators']))
  p.evaluate('AbyssDiagnostics.loseDive()');newpod=debug(p)['field']['recoveries'][0]
  assert newpod['recorders']==[0];p.locator('#defeatMenuBtn').click()
  ss=activate(p,2);slot1=ss[CAMPAIGN];c.close();c,p,e=build(b,390,844,True,store=ss,launch=False);errors+=e
  assert state(p)['slot']==2 and state(p)['credits']==3458 and state(p)['weaponAmmo']=={'railgun':20,'torpedo':5}
  p.locator('#startBtn').click();assert debug(p)['player']['cargo']['recorders']==[0] and state(p)['recoveryPods']==0
  p.evaluate('AbyssDiagnostics.loseDive()');assert state(p)['recoveryPods']==1;p.locator('#defeatMenuBtn').click()
  ss=activate(p,3);slot2=ss['the-abyss-below-slot-2-v1'];c.close();c,p,e=build(b,390,844,True,store=ss,launch=False);errors+=e
  assert state(p)['slot']==3 and state(p)['credits']==3459 and state(p)['mineAmmo']==7
  assert store(p)[CAMPAIGN]==slot1 and store(p)['the-abyss-below-slot-2-v1']==slot2
  ss=activate(p,1);c.close();c,p,e=build(b,390,844,True,store=ss);errors+=e
  assert state(p)['slot']==1 and state(p)['recoveryPods']==1 and state(p)['mineAmmo']==3
  assert_no_origin(p,[0]);assert debug(p)['field']['recoveries'][0]['id']==newpod['id']
  print('PASS actual v0.18.1 active save preserved, no retroactive ammo; death manifests and reset stocks isolated across all three slot UI transitions')

  # Backup round-trip preserves the full rescue manifest and doesn't unlock launchers.
  p.evaluate('AbyssDiagnostics.save()')
  result=p.evaluate('''()=>{const data=JSON.parse(testStore['the-abyss-below-slot-1-v1']);const text=AbyssSignals.pack(data);const out=AbyssSignals.unpack(text);return {data,out};}''')
  assert result['data']==result['out']['payload']
  corrupt=p.evaluate('''()=>{const original=JSON.parse(testStore['the-abyss-below-slot-1-v1']);const id=original.selectedLevel;const results=[];
   const mutations=[d=>d.levels[id].recoveries[0].recorders=[6],d=>d.levels[id].recoveries[0].recorders=[0,0],d=>d.levels[id].recoveries[0].crystal=-1,d=>d.levels[id].recoveries.push(structuredClone(d.levels[id].recoveries[0])),d=>d.levels[id].secured.push(0),d=>d.activeDive.items.find(n=>n.type==='recovery').recorders=[]];
   for(const mutate of mutations){const d=structuredClone(original);mutate(d);try{AbyssSignals.validateCampaign(d);results.push(false);}catch(_){results.push(true);}}return results;}''')
  assert all(corrupt),corrupt
  print('PASS export/import round-trip retains exact wreck and emergency stock; out-of-range/duplicate recorder ownership, bad amounts and mismatched checkpoint manifests rejected')
  c.close()
  # Older already-created pods have no recorder manifest. Do not invent cargo.
  c,p,e=build(b,store=dead);errors+=e
  migrated=debug(p)['field']['recoveries'];assert len(migrated)==len(oldpods)
  for a,z in zip(migrated,oldpods):
   for k in ['id','x','y','scrap','crystal']:assert a[k]==z[k],(k,a,z)
   assert a['recorders']==[]
  assert any(n['type']=='recorder' and n['index']==0 for n in debug(p)['items'])
  assert state(p)['mineAmmo']==7 and state(p)['weaponAmmo']=={'railgun':20,'torpedo':5}
  print('PASS old scrap/crystal pods migrate with empty recorder lists; already-reset old recorders remain in their original wrecks; no retroactive rescue grant')
  c.close()
  # A bad active checkpoint recovers all cargo from its redundant journal once.
  c,p,e=build(b);errors+=e;collect_set(p);p.evaluate('AbyssDiagnostics.save()');snap=store(p)
  data=json.loads(snap[CAMPAIGN]);assert data['levels'][data['selectedLevel']]['pendingCargo']['recorders']==[0]
  data['activeDive']['player']['x']='bad';snap[CAMPAIGN]=json.dumps(data);c.close()
  c,p,e=build(b,store=snap);errors+=e
  assert state(p)['recoveryPods']==1 and debug(p)['field']['recoveries'][0]['recorders']==[0]
  assert_no_origin(p,[0]);assert state(p)['mineAmmo']==0 and state(p)['weaponAmmo']=={'railgun':0,'torpedo':0}
  ss=store(p);c.close();c,p,e=build(b,store=ss);errors+=e
  assert state(p)['recoveryPods']==1
  print('PASS invalid checkpoint journals all cargo into one recoverable site without minting death stock; next reload does not duplicate the recovery')
  assert not errors,errors;c.close();b.close()
if __name__=='__main__':run()
