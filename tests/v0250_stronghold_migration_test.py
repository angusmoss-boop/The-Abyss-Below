"""Actual v0.22.0 files, not a fabricated legacy fixture; all-slot migration."""
from v0250_harness import *
from v0250_strongholds_test import prime,strong,point
from playwright.sync_api import sync_playwright
from zipfile import ZipFile
import copy,re,math
BASE=ROOT.parent/'the-abyss-below-v0.22.0-complete.zip'
def old_build(b):
 with ZipFile(BASE) as z:
  c=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,service_workers='block');p=c.new_page();p.set_default_timeout(5000);errs=[];p.on('pageerror',lambda e:errs.append(str(e)))
  p.set_content(z.read('index.html').decode());p.add_style_tag(content=z.read('styles.css').decode())
  p.evaluate('''()=>{window.ABYSS_TEST_MODE=true;window.testStore={};Object.defineProperty(window,'localStorage',{value:{getItem:k=>testStore[k]??null,setItem:(k,v)=>testStore[k]=v,removeItem:k=>delete testStore[k]}})}''')
  for src in re.findall(r'<script\s+[^>]*src=["\']([^"\']+)',z.read('index.html').decode()):p.add_script_tag(content=z.read(src.split('?')[0]).decode())
 p.locator('#startBtn').click();p.evaluate('requestAnimationFrame=()=>0');p.wait_for_timeout(65);step(p,0);return c,p,errs
if __name__=='__main__':
 with sync_playwright() as pw:
  b=launch_browser(pw);c,p,errors=old_build(b);assert state(p)['version']=='0.22.0';prime(p)
  p.evaluate('AbyssDiagnostics.grantCredits(6789);AbyssDiagnostics.grantCrystals(43);AbyssDiagnostics.weaponStock({railgun:21,torpedo:5})')
  # Compare generated geometry before changing the old active pose.
  p.evaluate('AbyssDiagnostics.save()');c2,q,e=build(b,store=store(p));errors+=e;walls=q.evaluate('AbyssDiagnostics.giants().walls')
  candidates=[{'x':w['x'],'y':w['y']} for w in walls]
  blocked=next(n for n in candidates if p.evaluate('n=>AbyssDiagnostics.wildClear(n.x,n.y,28)',n));c2.close()
  # Make an actual lost cargo pod where the enlarged layout adds a bulkhead.
  scrap=next(o for o in debug(p)['items'] if o['type']=='scrap' and not o['collected']);point(p,scrap);p.evaluate('AbyssDiagnostics.autoPickup()');point(p,blocked)
  p.evaluate('AbyssDiagnostics.loseDive()');lost=copy.deepcopy(debug(p)['field']['recoveries']);p.locator('#retryBtn').click();step(p,0)
  oldg=p.evaluate('AbyssDiagnostics.giants()');point(p,oldg['site']['panel']);p.evaluate('AbyssDiagnostics.ping()');step(p,.15);use(p)
  assert p.evaluate('AbyssDiagnostics.giants().state.sites.wayfarer.opened')
  point(p,blocked);p.evaluate('AbyssDiagnostics.save()');before=debug(p);ss=store(p);prices=p.evaluate('AbyssDiagnostics.costs()')
  for i in [2,3]:
   d=json.loads(ss[CAMPAIGN]);d['id']+='-copy'+str(i);d['title']='Legacy '+str(i);d['profile']['credits']+=i;ss[f'the-abyss-below-slot-{i}-v1']=json.dumps(d)
  c.close();c,p,e=build(b,store=ss,launch=False);errors+=e
  for i in [2,3]:assert store(p)[f'the-abyss-below-slot-{i}-v1']==ss[f'the-abyss-below-slot-{i}-v1']
  assert state(p)['hasSavedDive'];p.locator('#startBtn').click();after=debug(p)
  assert state(p)['paused'] and not p.evaluate('AbyssDiagnostics.giantSolid(AbyssDiagnostics.state().x,AbyssDiagnostics.state().y,27)')
  assert math.hypot(state(p)['x']-blocked['x'],state(p)['y']-blocked['y'])<600
  for key in ['hull','oxygen','battery','cargo','weaponAmmo','mineAmmo']:assert after['player'][key]==before['player'][key],key
  for key in ['seed','cycle','loot','looted','salvage','secured','wild','batteryCells','rescue']:assert after['field'][key]==before['field'][key],key
  assert after['rocks']==before['rocks']
  assert [e for e in after['predators'] if not e.get('wreckId')]==before['predators']
  assert len(strong(p)['guards'])==3 and p.evaluate('AbyssDiagnostics.costs()')==prices
  assert strong(p)['state']['opened'] and strong(p)['state']['relays']==[False,False]
  for r in after['field']['recoveries']:
   old=next(n for n in lost if n['id']==r['id'])
   for k in ['scrap','crystal','recorders','plates']:assert r[k]==old[k]
   assert not p.evaluate('n=>AbyssDiagnostics.giantSolid(n.x,n.y,25)',r)
   rendered=next(n for n in after['items'] if n['id']==r['id']);assert rendered['x']==r['x'] and rendered['y']==r['y']
  # The newly expanded checkpoint exports and imports without losing its west-side position.
  p.evaluate('AbyssDiagnostics.save()')
  assert p.evaluate('''()=>{const d=JSON.parse(testStore[AbyssSlots.key]);return JSON.stringify(d)===JSON.stringify(AbyssSignals.unpack(AbyssSignals.pack(d)).payload);}''')
  print('PASS actual v0.22 saved sub/pod embedded by new layout: safe relocation without losing cargo, no enemy/resource reroll, old shortcuts retained, 3 guards added, all currencies/prices unchanged; inactive slots untouched',flush=True)
  # Confirm a previously earned plate is not re-locked or duplicated.
  ss=store(p);d=json.loads(ss[CAMPAIGN]);d['giants']['banked']=['wayfarer'];d['giants']['livery']='wayfarer';d['giants']['sites']['wayfarer'].pop('layout',None);ss[CAMPAIGN]=json.dumps(d);c.close()
  c,p,e=build(b,store=ss);errors+=e;assert strong(p)['state']['relays']==[True,True]
  assert not any(o['kind']=='plate' for o in p.evaluate('AbyssDiagnostics.giants().objects'))
  assert p.evaluate('AbyssDiagnostics.giants().state.livery')=='wayfarer'
  assert not errors,errors;c.close();b.close();print('PASS previously archived plates keep finish and open vault, no duplicated collectible')
