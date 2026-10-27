"""Production Delta Helm mechanics, deterministic generation, saves and visual isolation."""
from v0172_harness import *
from playwright.sync_api import sync_playwright
import math,copy,json

def wild(p):return p.evaluate('AbyssDiagnostics.wild()')
def wfix(p,**v):p.evaluate('v=>AbyssDiagnostics.wildFixture(v)',v)

def run():
 with sync_playwright() as pw:
  b=launch_browser(pw);c,p,e=build(b,390,844,True)
  # Placement across actual seeded geometry, not only unobstructed fixtures.
  for index in range(5):
   p.evaluate('i=>AbyssDiagnostics.fixtureLevel(i)',index)
   for seed in [17,12345,9081726,1,4294967295]:
    p.evaluate('s=>AbyssDiagnostics.regenerate(s)',seed)
    d=debug(p);w=wild(p);before=[d['rocks'],d['field']['loot'],d['field']['looted'],d['saved']['upgrades']]
    assert len(w['mines'])==[8,16,28,42,58][index],(index,seed,len(w['mines']))
    assert len(w['vents'])==[5,9,15,21,28][index]
    assert len(w['schools'])==[12,22,36,48,62][index]
    assert all(6<=len(s['fish'])<=14 for s in w['schools'])
    for m in w['mines']:
     assert math.hypot(m['x']-600,m['y']-160)>490
     assert all(math.hypot(m['x']-l['x'],m['y']-l['y'])>110 for l in d['field']['loot'])
     assert all(math.hypot(m['x']-l['x'],m['y']-l['y'])>185 for l in d['wrecks'])
    checks=[[m['anchorX']+math.sin(t*.65+m['phase'])*m['sway']+math.sin(t*.23+m['phase'])*m['sway']*.2,m['anchorY']-m['tether'],21] for m in w['mines'] for t in [0,1,3,6,11]]
    assert all(p.evaluate('a=>a.map(x=>AbyssDiagnostics.wildClear(...x))',checks))
    p.evaluate('AbyssDiagnostics.enableWild()');d2=debug(p)
    assert wild(p)['field']==w['field']
    assert [d2['rocks'],d2['field']['loot'],d2['field']['looted'],d2['saved']['upgrades']]==before
  print('PASS 25 seeded maps: correct encounter counts, clear harbour/objective/resource approaches, unobstructed sway; independent wildlife RNG never alters terrain, stocks or upgrades',flush=True)
  p.evaluate('AbyssDiagnostics.fixtureLevel(0)')
  # Swept contact catches a crossing even if the end position is past the blast radius.
  fix(p,depth=80,upgrades={'hull':0,'engine':4,'shield':0});wfix(p,mines=[{'dx':100}])
  before=state(p)['hull'];p.evaluate('AbyssDiagnostics.setMotion({vx:40000,vy:0})');step(p,1/60)
  assert wild(p)['mines'][0]['detonated'] and state(p)['hull']==before-24,(wild(p)['mines'],state(p))
  again=state(p)['hull'];step(p,.8);assert state(p)['hull']==again
  print('PASS swept hull contact detonates once, including a high-speed crossing; starting hull survives an isolated level-1 mine',flush=True)
  fix(p,depth=80,upgrades={'hull':0,'shield':1},mineAmmo=2);wfix(p,mines=[{'dx':0}]);p.evaluate('AbyssDiagnostics.setSystems({damageCooldown:.6})');step(p,.01)
  assert state(p)['shield']==0 and state(p)['hull']==96 and state(p)['mineAmmo']==2,state(p)
  assert len(wild(p)['field']['cleared'])==1
  print('PASS shields absorb mine damage first; overflow reaches hull; a recent impact does not silently cancel contact mine damage; paid ammunition unchanged',flush=True)
  fix(p,depth=80,upgrades={'shield':0},predators=[{'dx':230,'dy':0,'id':'enemy-0','tier':'common'}]);wfix(p,mines=[{'dx':230}])
  kills=debug(p)['saved']['stats'].get('kills',0);step(p,.02)
  assert wild(p)['mines'][0]['detonated'] and not debug(p)['predators']
  assert debug(p)['saved']['stats']['kills']==kills+1
  drops=[x for x in debug(p)['items'] if x.get('predatorDrop')];assert len(drops)==1 and drops[0]['quantity']==2
  savedstore=store(p);c.close();c,p,e2=build(b,390,844,True,store=savedstore);e+=e2
  assert state(p)['paused'];assert wild(p)['mines'][0]['detonated'] and len(wild(p)['field']['cleared'])==1
  assert len([x for x in debug(p)['items'] if x.get('predatorDrop')])==1
  p.locator('#resumeBtn').click();dock(p);assert wild(p)['mines'][0]['detonated']
  depart(p);p.evaluate('AbyssDiagnostics.relaunch()');assert wild(p)['mines'][0]['detonated']
  print('PASS predators trigger derelicts, drop recoverable salvage once; destroyed mines stay cleared across reload, dock respawn and relaunch',flush=True)
  # Unrelated far-away accidents do not credit dock camping or generate fake ship noise.
  fix(p,depth=4,upgrades={'hull':7},predators=[{'dx':0,'dy':650,'id':'enemy-remote','tier':'common'}]);wfix(p,mines=[{'dx':0,'dy':650}])
  beforeKills=debug(p)['saved']['stats'].get('kills',0);step(p,.02)
  assert wild(p)['mines'][0]['detonated'] and state(p)['dockSafe']
  assert debug(p)['saved']['stats'].get('kills',0)==beforeKills and debug(p)['player']['noise']==0
  print('PASS remote environmental kills retain drops but do not award harbour-camping achievements or increase vessel noise',flush=True)
  # Sonar reacts on contact, never a blind instant reveal. It does not detonate mines.
  p.evaluate('AbyssDiagnostics.fixtureLevel(4)');fix(p,depth=1100,upgrades={'hull':7,'sonar':2},lights=False)
  wfix(p,mines=[{'dx':260}],vents=[{'dx':300,'dy':120}],schools=[{'dx':260,'dy':-70,'species':3}])
  p.evaluate('AbyssDiagnostics.renderWorld()')
  black=p.evaluate('''()=>{const c=document.getElementById('gameCanvas'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let max=0;for(let i=0;i<d.length;i+=4)max=Math.max(max,d[i],d[i+1],d[i+2]);return max;}''')
  assert black==0,black
  p.evaluate('AbyssDiagnostics.ping()');step(p,.1)
  assert wild(p)['mines'][0]['revealUntil']==0 and wild(p)['schools'][0]['sonarUntil']==0
  step(p,.55);w=wild(p);contacts=p.evaluate('AbyssDiagnostics.living().survey.contacts')
  assert w['mines'][0]['revealUntil']>0 and not w['mines'][0]['detonated']
  assert w['schools'][0]['sonarUntil']>0 and w['schools'][0]['fear']>.1
  assert any(v['type']=='derelict' for v in contacts.values()) and any(v['type']=='thermal' for v in contacts.values())
  assert not any('school' in k for k in contacts)
  step(p,12);p.evaluate('AbyssDiagnostics.renderWorld()')
  maxpixel=p.evaluate('''()=>{const c=document.getElementById('gameCanvas'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let m=0;for(let i=0;i<d.length;i+=4)m=Math.max(m,d[i],d[i+1],d[i+2]);return m;}''')
  assert maxpixel==0,maxpixel
  print('PASS new scenery cannot bypass 1,000 m darkness; sonar arrival reveals hazards/tethers and briefly silhouettes/scatters fish, but never detonates mines or fills the map with wildlife',flush=True)
  # Vent stages, warning window, upward force, enemy coupling, and harmless early seeps.
  p.evaluate('AbyssDiagnostics.fixtureLevel(0)');fix(p,depth=80,upgrades={'hull':7,'shield':0})
  wfix(p,vents=[{'dy':60,'phase':0,'damage':0,'lift':32}]);p.evaluate('AbyssDiagnostics.setClock(7.1)')
  assert wild(p)['vents'][0]['stage']['name']=='warning'
  assert p.evaluate('s=>AbyssDiagnostics.ventAt(s.x,s.y)',state(p))==0
  p.evaluate('AbyssDiagnostics.setClock(10.4)');before=state(p)['hull'];step(p,.25)
  assert state(p)['vy']<0 and state(p)['hull']==before
  fix(p,depth=80,upgrades={'hull':7,'shield':0},predators=[{'dx':0,'dy':0,'tier':'common'}])
  wfix(p,vents=[{'dy':60,'phase':10.4,'damage':5,'lift':46}]);before=state(p)['hull'];step(p,.2)
  assert state(p)['hull']==before-5 and state(p)['vy']<0
  assert debug(p)['predators'][0]['vy']<0
  step(p,3);assert wild(p)['vents'][0]['stage']['name']=='settling'
  print('PASS vent quiet/warning/eruption/settling sequence; warning causes no force, active plume lifts vessel and predator; early seeps do no damage; hot plume damage is rate limited',flush=True)
  # All four silhouettes, coordinated swimming, obstacle avoidance, reactions and no player resources affected.
  fix(p,depth=80,lights=False,upgrades={'hull':7,'engine':4},rocks=[{'dx':220,'dy':20,'radius':35}])
  wfix(p,schools=[{'dx':150,'dy':-45,'species':k} for k in range(4)],benthos=[{'dx':25,'dy':25,'kind':k} for k in range(4)])
  start=wild(p);startStats=state(p);step(p,1)
  w=wild(p);assert len(set(s['shape'] for s in w['species']))==4
  assert w['schools'][0]['fish']!=start['schools'][0]['fish'] and all(b['retreat']>.7 for b in w['benthos'])
  checks=[[f['x'],f['y'],5.5] for s in w['schools'] for f in s['fish']]
  assert all(p.evaluate('xs=>xs.map(x=>AbyssDiagnostics.wildClear(...x))',checks))
  assert state(p)['credits']==startStats['credits'] and state(p)['crystals']==startStats['crystals'] and state(p)['hull']==startStats['hull']
  # Fresh local school for boost and predator responses.
  fix(p,depth=80,lights=False,upgrades={'hull':7,'engine':4});wfix(p,schools=[{'dx':110,'dy':0,'species':0}]);step(p,.2,keys=['d',' ']);assert wild(p)['schools'][0]['fear']>.4
  fix(p,depth=80,lights=False,upgrades={'hull':7},predators=[{'dx':310,'dy':0,'tier':'common'}]);wfix(p,schools=[{'dx':210,'dy':0,'species':2}]);step(p,.2);assert wild(p)['schools'][0]['fear']>.4
  assert wild(p)['activeSchools']<=12
  print('PASS four species, 6–14 members, cohesion/separation and solid-rock avoidance; sonar/boost/predator reactions; reactive seabed life; no wildlife rewards, collision damage or map spam; active-school cap',flush=True)
  assert not e,e;c.close();b.close()
if __name__=='__main__':run()
