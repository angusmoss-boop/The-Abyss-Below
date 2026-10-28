from v0200_harness import *
from playwright.sync_api import sync_playwright
import zipfile,copy,re
BASE=Path('/mnt/data/the-abyss-below-v0.17.4-complete.zip');FIXTURE=ROOT/'tests/fixtures/v0174_lost_signals.json'
def old_build(b):
 z=zipfile.ZipFile(BASE);c=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,service_workers='block');p=c.new_page();errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
 html=z.read('index.html').decode();p.set_content(html);p.add_style_tag(content=z.read('styles.css').decode())
 p.evaluate('''()=>{window.ABYSS_TEST_MODE=true;window.testStore={};Object.defineProperty(window,'localStorage',{value:{getItem:k=>testStore[k]??null,setItem:(k,v)=>testStore[k]=v,removeItem:k=>delete testStore[k]}})}''')
 for src in re.findall(r'<script\s+[^>]*src=["\']([^"\']+)',html):p.add_script_tag(content=z.read(src.split('?')[0]).decode())
 p.locator('#startBtn').click();p.evaluate('requestAnimationFrame=()=>0');p.wait_for_timeout(65);p.evaluate('AbyssDiagnostics.step(0)');return c,p,errors
with sync_playwright() as pw:
 b=launch_browser(pw)
 if BASE.exists():
  c,p,errors=old_build(b);assert state(p)['version']=='0.17.4'
  fix(p,depth=40,upgrades={'hull':5,'engine':3,'railgun':2,'torpedo':2,'battery':3,'shield':2,'magnet':2,'minePower':2,'mineCapacity':3},mineAmmo=0)
  p.evaluate('AbyssDiagnostics.relaunch();AbyssDiagnostics.grantCredits(3500);AbyssDiagnostics.grantCrystals(80)');dock(p)
  for kind in ['railgun','torpedo','mine']:p.evaluate('(id)=>AbyssDiagnostics.buyOrdnance(id,true)',kind)
  depart(p)
  for kind in ['scrap','crystal','recorder']:
   n=next(x for x in debug(p)['items'] if x['type']==kind);move(p,n['x'],n['y'])
   if kind=='scrap':p.evaluate('AbyssDiagnostics.autoPickup()')
   else:use(p)
  p.evaluate('AbyssDiagnostics.hurtEnemy("enemy-0",15);AbyssDiagnostics.save()')
  snap=store(p);expected=debug(p);costs=p.evaluate('AbyssDiagnostics.costs()')
  for slot in [2,3]:
   d=json.loads(snap[CAMPAIGN]);d['id']+='-'+str(slot);d['title']='Archived '+str(slot);d['profile']['credits']+=slot
   snap[f'the-abyss-below-slot-{slot}-v1']=json.dumps(d,separators=(',',':'))
  FIXTURE.write_text(json.dumps({'store':snap,'expected':expected,'costs':costs},separators=(',',':')))
  assert not errors;c.close()
 else:
  v=json.loads(FIXTURE.read_text());snap=v['store'];expected=v['expected'];costs=v['costs']
 old=json.loads(snap[CAMPAIGN]);c,p,errors=build(b,390,844,True,store=snap,launch=False)
 assert state(p)['hasSavedDive'];assert debug(p)['saved']==expected['saved']
 assert p.evaluate('AbyssDiagnostics.costs()')==[dict(u,prices=[dict(v,credits=__import__('math').ceil(v['credits']*1.25)) for v in u['prices']]) for u in costs]
 for slot in [2,3]:assert store(p)[f'the-abyss-below-slot-{slot}-v1']==snap[f'the-abyss-below-slot-{slot}-v1']
 p.locator('#startBtn').click();d=debug(p)
 for k in ['hull','shield','oxygen','battery','cargo','mineAmmo','weaponAmmo','x','y','vx','vy','boost']:
  assert (d['player'][k]==dict(expected['player'][k],plates=[]) if k=='cargo' else d['player'][k]==expected['player'][k]),k
 for k in ['loot','looted','salvage','health','secured','recoveries','survey','wild']:
  assert d['field'][k]==expected['field'][k],k
 assert d['items']==expected['items'];assert len(d['predators'])==len(expected['predators']);assert all(all(a.get(k)==v for k,v in old.items()) for a,old in zip(d['predators'],expected['predators']))
 assert p.evaluate('AbyssDiagnostics.signals().state.completed')==0
 assert not errors,errors
 print('PASS actual v0.17.4 migration: balances, every crystal price and the specified 25% credit uplift, ammo, finite resources/depletion, regeneration, survey, wildlife, enemies, cargo and paused dive preserved; inactive slots remain byte-for-byte unchanged.')
 c.close();b.close()
