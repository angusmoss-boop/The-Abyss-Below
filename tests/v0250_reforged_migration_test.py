"""Boot the actual archived v0.23 source, then migrate each slot without rerolling."""
from v0250_harness import *
from playwright.sync_api import sync_playwright
from zipfile import ZipFile
import copy,re
BASE=ROOT.parent/'the-abyss-below-v0.23.0-complete.zip'
def old_build(b):
 with ZipFile(BASE) as z:
  c=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,service_workers='block');p=c.new_page();p.set_default_timeout(5000);errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
  p.set_content(z.read('index.html').decode());p.add_style_tag(content=z.read('styles.css').decode())
  p.evaluate('''()=>{window.ABYSS_TEST_MODE=true;window.testStore={};Object.defineProperty(window,'localStorage',{value:{getItem:k=>testStore[k]??null,setItem:(k,v)=>testStore[k]=v,removeItem:k=>delete testStore[k]}})}''')
  for src in re.findall(r'<script\s+[^>]*src=["\']([^"\']+)',z.read('index.html').decode()):p.add_script_tag(content=z.read(src.split('?')[0]).decode())
 p.locator('#startBtn').click();p.evaluate('requestAnimationFrame=()=>0');p.wait_for_timeout(65);step(p,0);return c,p,errors

def run():
 with sync_playwright() as pw:
  b=launch_browser(pw);c,p,errors=old_build(b)
  assert state(p)['version']=='0.23.0'
  p.evaluate('AbyssDiagnostics.grantCredits(4000);AbyssDiagnostics.grantCrystals(40)');dock(p)
  for u in ['hull','engine','railgun','torpedo','shield']:buy(p,u)
  depart(p);p.evaluate('AbyssDiagnostics.weaponStock({railgun:9,torpedo:2})')
  for kind in ['scrap','crystal']:
   n=next(n for n in debug(p)['items'] if n['type']==kind and not n['collected'])
   move(p,n['x'],n['y'])
   if kind=='scrap':p.evaluate('AbyssDiagnostics.autoPickup()')
   else:use(p)
  p.evaluate('AbyssDiagnostics.setSystems({hull:70,oxygen:73,battery:41})')
  # Old repair is genuinely used; migration gives its new one-charge system once.
  p.evaluate('AbyssDiagnostics.unfreeze()');p.keyboard.press('r');step(p,0)
  p.evaluate('AbyssDiagnostics.save()');before=debug(p);original=store(p);prices=p.evaluate('AbyssDiagnostics.costs()')
  assert 'repairReady' not in before['player']
  seed=json.loads(original[CAMPAIGN]);seed['giants']['banked']=['wayfarer'];seed['giants']['livery']='wayfarer'
  for i in [1,2,3]:
   d=copy.deepcopy(seed);d['id']+='-slot'+str(i);d['title']='Reforge legacy '+str(i);d['profile']['credits']+=i
   original[f'the-abyss-below-slot-{i}-v1']=json.dumps(d)
  c.close()
  for active in [1,2,3]:
   ss=copy.deepcopy(original);idx=json.loads(ss['abyss-campaign-slots-v1']);idx['active']=active;ss['abyss-campaign-slots-v1']=json.dumps(idx)
   c,p,e=build(b,store=ss);errors+=e;after=debug(p)
   assert state(p)['paused'] and state(p)['repairReady']
   for k in ['x','y','vx','vy','facing','hull','oxygen','battery','cargo','weaponAmmo','mineAmmo']:
    assert after['player'][k]==before['player'][k],k
   for k in ['seed','cycle','loot','looted','salvage','secured','wild','batteryCells','rescue','recoveries']:
    assert after['field'][k]==before['field'][k],k
   assert after['rocks']==before['rocks'] and after['predators']==before['predators']
   assert after['saved']['upgrades']==before['saved']['upgrades'] and p.evaluate('AbyssDiagnostics.costs()')==prices
   assert p.evaluate('AbyssDiagnostics.giants().state.livery')=='wayfarer'
   for other in [1,2,3]:
    if other!=active:assert store(p)[f'the-abyss-below-slot-{other}-v1']==ss[f'the-abyss-below-slot-{other}-v1']
   assert p.evaluate('AbyssDiagnostics.repair()');assert not state(p)['repairReady'];p.evaluate('AbyssDiagnostics.save()')
   current=store(p);c.close();c,p,e=build(b,store=current);errors+=e
   assert not state(p)['repairReady'] and state(p)['paused'],'migration must not refill on next load'
   c.close()
  assert not errors,errors;b.close()
  print('PASS actual v0.23.0 source migration in all 3 slots: exact position/vitals/cargo/ammo/geometry/resources/prices retained, earned finish retained, inactive slots untouched; one initial repair charge, spent state retained on next reload')
if __name__=='__main__':run()
