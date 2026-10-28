"""Actual v0.18.2 production archive, not a hand-written approximation."""
from v0190_harness import *
from v0190_giants_test import giants,visit
from playwright.sync_api import sync_playwright
from zipfile import ZipFile
import re,copy
BASE=ROOT.parent/'the-abyss-below-v0.18.2-complete.zip'
def old_build(b):
 with ZipFile(BASE) as z:
  c=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,service_workers='block');p=c.new_page();errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
  html=z.read('index.html').decode();p.set_content(html);p.add_style_tag(content=z.read('styles.css').decode())
  p.evaluate('''()=>{window.ABYSS_TEST_MODE=true;window.testStore={};Object.defineProperty(window,'localStorage',{value:{getItem:k=>testStore[k]??null,setItem:(k,v)=>testStore[k]=v,removeItem:k=>delete testStore[k]}})}''')
  for src in re.findall(r'<script\s+[^>]*src=["\']([^"\']+)',html):p.add_script_tag(content=z.read(src.split('?')[0]).decode())
 p.locator('#startBtn').click();p.evaluate('requestAnimationFrame=()=>0');p.wait_for_timeout(65);step(p,0);return c,p,errors
with sync_playwright() as pw:
 b=launch_browser(pw);c,p,errors=old_build(b);assert state(p)['version']=='0.18.2'
 fix(p,depth=40,upgrades={'hull':7,'oxygen':5,'battery':5,'engine':4,'railgun':4,'torpedo':4,'minePower':4,'mineCapacity':4,'magnet':3})
 p.evaluate('AbyssDiagnostics.relaunch();AbyssDiagnostics.grantCredits(7123);AbyssDiagnostics.grantCrystals(47);AbyssDiagnostics.weaponStock({railgun:21,torpedo:5})')
 # Existing destroyed ship, with mixed cargo, is retained exactly.
 for kind in ['scrap','crystal','recorder']:
  n=next(x for x in debug(p)['items'] if x['type']==kind and not x['collected']);move(p,n['x'],n['y'])
  if kind=='scrap':p.evaluate('AbyssDiagnostics.autoPickup()')
  else:use(p)
 move(p,640,1450);p.evaluate('AbyssDiagnostics.loseDive()');p.locator('#retryBtn').click();step(p,0)
 n=next(x for x in debug(p)['items'] if x['type']=='crystal' and not x['collected']);move(p,n['x'],n['y']);use(p)
 move(p,600,800);p.evaluate('AbyssDiagnostics.face(Math.PI/2);AbyssDiagnostics.ping();AbyssDiagnostics.fire("torpedo");AbyssDiagnostics.hurtEnemy("enemy-0",19);AbyssDiagnostics.save()')
 before=debug(p);oldstore=store(p);costs=p.evaluate('AbyssDiagnostics.costs()');oldSignals=p.evaluate('AbyssDiagnostics.signals()')
 for slot in [2,3]:
  v=json.loads(oldstore[CAMPAIGN]);v['id']+='-'+str(slot);v['title']='Legacy '+str(slot);v['profile']['credits']+=slot;oldstore[f'the-abyss-below-slot-{slot}-v1']=json.dumps(v,separators=(',',':'))
 c.close();c,p,e=build(b,390,844,True,store=oldstore,launch=False);errors+=e
 assert state(p)['hasSavedDive'];assert not giants(p)['state']['banked']
 assert debug(p)['saved']==before['saved'] and p.evaluate('AbyssDiagnostics.costs()')==costs
 for slot in [2,3]:assert store(p)[f'the-abyss-below-slot-{slot}-v1']==oldstore[f'the-abyss-below-slot-{slot}-v1']
 p.locator('#startBtn').click();after=debug(p);assert state(p)['pauseOpen']
 for key,value in before['player'].items():
  assert (after['player'][key]==dict(value,plates=[]) if key=='cargo' else after['player'][key]==value),(key,after['player'][key],value)
 for key in ['seed','cycle','loot','looted','salvage','secured','health','survey','wild','drops']:assert after['field'][key]==before['field'][key],key
 assert len(after['predators'])==len(before['predators'])
 for new,old in zip(after['predators'],before['predators']):assert all(new.get(k)==v for k,v in old.items())
 for key in ['rocks','projectiles','mines','blasts']:assert after[key]==before[key],key
 assert len(after['items'])==len(before['items'])
 for new,old in zip(after['items'],before['items']):assert all(new.get(k)==v for k,v in old.items())
 for new,old in zip(after['field']['recoveries'],before['field']['recoveries']):assert new==dict(old,plates=[])
 assert p.evaluate('AbyssDiagnostics.signals()')==oldSignals
 assert after['clock']==before['clock'] and len(after['sonarWaves'])==len(before['sonarWaves'])
 print('PASS actual v0.18.2 migration: every old player field, all resource coordinates and depletion, old wreck cargo, enemy positions/wounds, projectile, prices, missions and paused time retained; inactive slots untouched')
 # A new plate travels with an independent slot, never with other campaigns.
 p.locator('#resumeBtn').click();step(p,0);g=giants(p);visit(p,g['site']['plate']);use(p);assert debug(p)['player']['cargo']['plates']==['wayfarer']
 p.evaluate('AbyssDiagnostics.save();AbyssDiagnostics.unfreeze();AbyssDiagnostics.backgroundPause()');p.locator('#pauseSlotsBtn').click();p.locator('[data-load-slot="2"]').click();ss=store(p);c.close()
 c,p,e=build(b,390,844,True,store=ss,launch=False);errors+=e;assert state(p)['slot']==2
 p.locator('#startBtn').click();assert debug(p)['player']['cargo']['plates']==[] and not giants(p)['state']['banked']
 assert any(o['kind']=='plate' for o in giants(p)['objects'])
 p.locator('#pauseSlotsBtn').click();p.locator('[data-load-slot="1"]').click();ss=store(p);c.close()
 c,p,e=build(b,390,844,True,store=ss);errors+=e;assert debug(p)['player']['cargo']['plates']==['wayfarer']
 assert not any(o['kind']=='plate' for o in giants(p)['objects'])
 print('PASS new discovery ownership and active side-chamber expedition stay isolated across actual slot UI transitions')
 assert not errors,errors;c.close();b.close()
