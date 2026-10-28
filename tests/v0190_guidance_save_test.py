"""Actual v0.18.0 ordnance migration, exact guided checkpoint restore and import validation."""
from v0190_harness import *
from playwright.sync_api import sync_playwright
from zipfile import ZipFile
import re,json,math
BASE=ROOT.parent/'the-abyss-below-v0.18.0-complete.zip'

def old_build(b):
 z=ZipFile(BASE);c=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,service_workers='block');p=c.new_page();errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
 html=z.read('index.html').decode();p.set_content(html);p.add_style_tag(content=z.read('styles.css').decode())
 p.evaluate('''()=>{window.ABYSS_TEST_MODE=true;window.testStore={};Object.defineProperty(window,'localStorage',{value:{getItem:k=>testStore[k]??null,setItem:(k,v)=>testStore[k]=v,removeItem:k=>delete testStore[k]}})}''')
 for src in re.findall(r'<script\s+[^>]*src=["\']([^"\']+)',html):p.add_script_tag(content=z.read(src.split('?')[0]).decode())
 p.locator('#startBtn').click();p.evaluate('requestAnimationFrame=()=>0');p.wait_for_timeout(65);p.evaluate('AbyssDiagnostics.step(0)');return c,p,errors

with sync_playwright() as pw:
 b=launch_browser(pw);c=None
 if BASE.exists():
  c,p,errors=old_build(b)
  assert state(p)['version']=='0.18.0'
  fix(p,depth=50,upgrades={'hull':7,'engine':3,'railgun':3,'torpedo':3,'minePower':3,'mineCapacity':4,'battery':3,'shield':2})
  p.evaluate('AbyssDiagnostics.relaunch();AbyssDiagnostics.grantCredits(5000);AbyssDiagnostics.grantCrystals(75)');dock(p);p.locator('#ammunitionTab').click()
  for id in ['railgun','torpedo','mine']:p.evaluate('id=>AbyssDiagnostics.buyOrdnance(id,true)',id)
  depart(p);move(p,600,750);p.evaluate('AbyssDiagnostics.face(Math.PI/2)')
  assert p.evaluate('AbyssDiagnostics.mine()')
  assert p.evaluate('AbyssDiagnostics.fire("railgun")') and p.evaluate('AbyssDiagnostics.fire("torpedo")')
  p.evaluate('AbyssDiagnostics.save()');before=debug(p);snap=store(p);costs=p.evaluate('AbyssDiagnostics.costs()');oldSignals=p.evaluate('AbyssDiagnostics.signals()')
  assert len(before['projectiles'])==2 and len(before['mines'])==1
  assert 'launchHeading' not in before['projectiles'][0] and 'originX' not in before['mines'][0]
  for slot in [2,3]:
   value=json.loads(snap[CAMPAIGN]);value['id']+='-'+str(slot);value['title']='Archived '+str(slot);value['profile']['credits']+=slot
   snap[f'the-abyss-below-slot-{slot}-v1']=json.dumps(value,separators=(',',':'))
  fixture={'store':snap,'costs':costs,'before':before,'signals':oldSignals}
  (ROOT/'tests/fixtures/v0180_guidance_migration.json').write_text(json.dumps(fixture,separators=(',',':')))
 else:
  fixture=json.loads((ROOT/'tests/fixtures/v0180_guidance_migration.json').read_text())
  snap=fixture['store'];before=fixture['before'];costs=fixture['costs'];oldSignals=fixture['signals'];errors=[]
 c2,q,err2=build(b,390,844,True,store=snap,launch=False)
 assert state(q)['hasSavedDive'] and state(q)['version']=='0.19.0'
 assert debug(q)['saved']==before['saved'] and q.evaluate('AbyssDiagnostics.costs()')==costs
 for slot in [2,3]:assert store(q)[f'the-abyss-below-slot-{slot}-v1']==snap[f'the-abyss-below-slot-{slot}-v1']
 q.locator('#startBtn').click();after=debug(q)
 assert state(q)['paused'] and after['projectiles']==before['projectiles'] and after['mines']==before['mines']
 for k in ['x','y','hull','battery','oxygen','cargo','weaponAmmo','mineAmmo','weaponCooldown']:
  assert (after['player'][k]==dict(before['player'][k],plates=before['player'][k].get('plates',[])) if k=='cargo' else after['player'][k]==before['player'][k]),k
 assert q.evaluate('AbyssDiagnostics.signals()')==oldSignals
 for k in ['looted','loot','salvage','survey','recoveries','secured','health','wild']:
  assert after['field'][k]==before['field'][k],k
 step(q,.05)
 assert all(math.isfinite(s['launchHeading']) for s in debug(q)['projectiles'])
 step(q,.65);mines=debug(q)['mines'];assert mines and math.isfinite(mines[0]['originX'])
 assert state(q)['weaponAmmo']==before['player']['weaponAmmo'] and state(q)['mineAmmo']==before['player']['mineAmmo']
 print('PASS actual v0.18.0 active rail/torpedo/mine migration, all economies and histories preserved; lazy guidance initialization; inactive campaign slots untouched')
 # New scalar guidance state survives a real captured snapshot unchanged.
 fix(q,depth=100,facing=0,upgrades={'hull':7,'railgun':3,'torpedo':3,'minePower':3,'mineCapacity':4},predators=[{'id':'forward','dx':330,'dy':90,'stunnedUntil':100},{'id':'behind','dx':-190,'dy':60,'stunnedUntil':100}],mines=[{'dx':-60,'dy':60,'armedAt':0,'damage':180}])
 q.evaluate('AbyssDiagnostics.weaponStock({railgun:24,torpedo:6});AbyssDiagnostics.fire("railgun");AbyssDiagnostics.fire("torpedo");AbyssDiagnostics.ordnancePulse(.08);AbyssDiagnostics.save()')
 prior=debug(q);snap2=store(q)
 assert all(s.get('targetId')=='forward' for s in prior['projectiles']) and prior['mines'][0]['targetId']=='behind'
 c3,r,err3=build(b,390,844,True,store=snap2,launch=False);r.locator('#startBtn').click();restored=debug(r)
 assert state(r)['pauseOpen'] and restored['projectiles']==prior['projectiles'] and restored['mines']==prior['mines']
 assert restored['predators']==prior['predators'] and restored['player']['weaponAmmo']==prior['player']['weaponAmmo']
 # Fixtures temporarily removed rocks; restore correctly regenerates real seeded
 # terrain. Scalar target references must resolve, but a regenerated obstruction
 # must release the lock rather than tracking through it.
 for kind,target_id in [('railgun','forward'),('torpedo','forward'),('mine','behind')]:
  result=r.evaluate("""([kind,id])=>{
   const d=AbyssDiagnostics.debug(),o=kind==='mine'?d.mines[0]:d.projectiles.find(p=>p.kind===kind);
   const enemy=d.predators.find(e=>e.id===id),clear=AbyssDiagnostics.guidanceLine(o,enemy,kind==='mine'?8:o.radius);
   const index=kind==='mine'?0:d.projectiles.findIndex(p=>p.kind===kind);const selected=AbyssDiagnostics.seekTarget(kind,index);
   return {id:enemy.id,clear,selected:selected?.id??null};
  }""",[kind,target_id])
  assert result['id']==target_id
  assert result['selected']==(target_id if result['clear'] else None),result
 print('PASS locked target IDs, turned velocities, launch heading, mine anchor/velocity and cooldowns restore exactly, paused, with working target references')
 # Format remains backwards compatible and rejects new-state corruption before import.
 results=r.evaluate('''()=>{
 const original=JSON.parse(testStore['the-abyss-below-slot-1-v1']);
 const packed=AbyssSignals.pack(original,'0.19.0');AbyssSignals.unpack(packed);
 const invalid=[];
 for(const [kind,key,value] of [['projectiles','targetId',{}],['projectiles','launchHeading','bad'],['mines','originX',Infinity],['mines','heading','bad'],['mines','targetId','x'.repeat(101)]]){
  const data=structuredClone(original);data.activeDive[kind][0][key]=value;
  try{AbyssSignals.validateCampaign(data);invalid.push(false);}catch(_){invalid.push(true);}
 }
 return invalid;
 }''')
 assert all(results),results
 assert not errors+err2+err3,errors+err2+err3
 print('PASS portable guided campaign accepted; malformed lock IDs, mine anchors and headings rejected safely without mutating campaigns')
 if c:c.close()
 c2.close();c3.close();b.close()
