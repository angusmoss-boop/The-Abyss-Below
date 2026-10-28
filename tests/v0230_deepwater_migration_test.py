"""Boot the real v0.21.0 release, then upgrade the same three-slot store."""
from v0230_harness import *
from playwright.sync_api import sync_playwright
from zipfile import ZipFile
import math, re, copy
BASE=ROOT.parent/'the-abyss-below-v0.21.0-complete.zip'
def old_build(b):
 with ZipFile(BASE) as z:
  c=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,service_workers='block');p=c.new_page();errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
  html=z.read('index.html').decode();p.set_content(html);p.add_style_tag(content=z.read('styles.css').decode())
  p.evaluate('''()=>{window.ABYSS_TEST_MODE=true;window.testStore={};Object.defineProperty(window,'localStorage',{value:{getItem:k=>testStore[k]??null,setItem:(k,v)=>testStore[k]=v,removeItem:k=>delete testStore[k]}})}''')
  for src in re.findall(r'<script\s+[^>]*src=["\']([^"\']+)',html):p.add_script_tag(content=z.read(src.split('?')[0]).decode())
 p.locator('#startBtn').click();p.evaluate('requestAnimationFrame=()=>0');p.wait_for_timeout(70);step(p,0);return c,p,errors

def run():
 with sync_playwright() as pw:
  b=launch_browser(pw);c,p,errors=old_build(b);assert state(p)['version']=='0.21.0'
  fix(p,depth=40,upgrades={'hull':7,'oxygen':5,'batteryCells':5,'engine':4,'railgun':4,'torpedo':4,'minePower':4,'mineCapacity':4,'magnet':3,'flashlight':3})
  p.evaluate('AbyssDiagnostics.relaunch();AbyssDiagnostics.grantCredits(7123);AbyssDiagnostics.grantCrystals(47);AbyssDiagnostics.weaponStock({railgun:21,torpedo:5})')
  for kind in ['scrap','crystal','recorder']:
   n=next(x for x in debug(p)['items'] if x['type']==kind and not x['collected']);move(p,n['x'],n['y'])
   if kind=='scrap':p.evaluate('AbyssDiagnostics.autoPickup()')
   else:use(p)
  move(p,600,800);p.evaluate('AbyssDiagnostics.face(Math.PI/2);AbyssDiagnostics.ping();AbyssDiagnostics.fire("torpedo");AbyssDiagnostics.hurtEnemy("enemy-0",19);AbyssDiagnostics.save()')
  before=debug(p);oldstore=store(p);costs=p.evaluate('AbyssDiagnostics.costs()');giants=p.evaluate('AbyssDiagnostics.giants().state');sig=p.evaluate('AbyssDiagnostics.signals()');fish=p.evaluate('AbyssDiagnostics.wild().schools')
  for slot in [2,3]:
   v=json.loads(oldstore[CAMPAIGN]);v['id']+='-'+str(slot);v['title']='Legacy '+str(slot);v['profile']['credits']+=slot;oldstore[f'the-abyss-below-slot-{slot}-v1']=json.dumps(v,separators=(',',':'))
  c.close();c,p,e=build(b,390,844,True,store=oldstore,launch=False);errors+=e
  assert state(p)['hasSavedDive'] and debug(p)['saved']==before['saved']
  for a,old in zip(p.evaluate('AbyssDiagnostics.costs()'),costs):
   for price,prev in zip(a['prices'],old['prices']):assert price==prev
  for slot in [2,3]:assert store(p)[f'the-abyss-below-slot-{slot}-v1']==oldstore[f'the-abyss-below-slot-{slot}-v1']
  p.locator('#startBtn').click();after=debug(p);assert state(p)['pauseOpen']
  assert after['player']==before['player']
  for key in ['seed','cycle','loot','looted','salvage','secured','health','survey','wild','drops','recoveries','batteryCells']:assert after['field'][key]==before['field'][key],key
  for key in ['rocks','projectiles','mines','blasts','predators']:assert after[key]==before[key],key
  assert after['items']==before['items']
  assert after['field']['batteryCells']==before['field']['batteryCells']
  assert after['field']['rescue'] and len(after['field']['rescue']['stations'])==1
  assert after['field']['rescue']['drone'] is None
  assert len([n for n in after['items'] if n['type']=='battery'])==3
  assert after['clock']==before['clock'] and p.evaluate('AbyssDiagnostics.giants().state')==giants and p.evaluate('AbyssDiagnostics.signals()')==sig
  assert p.evaluate('AbyssDiagnostics.wild().schools')==fish
  print('PASS real v0.21 migration: exact saved dive, all depleted resources, currencies, paid/emergency ammo, fish positions, wounded enemies, projectiles, missions and discovery state; inactive slots unchanged',flush=True)
  print('PASS all credit and crystal prices unchanged; no retroactive charge',flush=True)
  # Exercise independent slot transitions through actual UI.
  p.locator('#pauseSlotsBtn').click();p.locator('[data-load-slot="2"]').click();ss=store(p);c.close()
  c,p,e=build(b,390,844,True,store=ss,launch=False);errors+=e;assert state(p)['slot']==2 and state(p)['credits']==7125
  p.locator('#startBtn').click();assert state(p)['pauseOpen'] and debug(p)['player']['cargo']==before['player']['cargo']
  p.locator('#pauseSlotsBtn').click();p.locator('[data-load-slot="1"]').click();ss=store(p);c.close()
  c,p,e=build(b,390,844,True,store=ss);errors+=e;assert state(p)['slot']==1 and state(p)['credits']==7123
  assert debug(p)['player']['cargo']==before['player']['cargo'] and state(p)['paused']
  assert not errors,errors;c.close();b.close()
  print('PASS real slot UI transitions preserve independent campaigns after migration',flush=True)
if __name__=='__main__':run()
