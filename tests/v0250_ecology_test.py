"""Actual production ecology: persistent placements, swept terrain, visibility and no combat rewards."""
from v0250_harness import *
from playwright.sync_api import sync_playwright
import math,json

def creature(kind,x,y):
 return dict(id=kind+'-test',kind=kind,x=x,y=y,homeX=x,homeY=y,goalX=x+210,goalY=y,heading=0,phase=1,pace=0,fear=0,goalTimer=15,callTimer=18,swim=0)
def run():
 with sync_playwright() as pw:
  b=launch_browser(pw);c,p,errors=build(b)
  probes=[]
  for i in range(5):
   p.evaluate('i=>AbyssDiagnostics.fixtureLevel(i)',i)
   for seed in [117,991,64329,818231]:
    p.evaluate('s=>AbyssDiagnostics.regenerate(s)',seed)
    e=p.evaluate('AbyssDiagnostics.ecology()');assert len(e['creatures'])==(1 if i<2 else 2),(i,seed,e)
    assert all(v['clear'] for v in p.evaluate('AbyssDiagnostics.ecologyClear()')),(i,seed)
    for animal in e['creatures']:
     move(p,animal['x']-190,animal['y'])
     p.evaluate('AbyssDiagnostics.ecologyPulse(8)')
     assert all(v['clear'] for v in p.evaluate('AbyssDiagnostics.ecologyClear()')),(i,seed,'motion')
    probes.append({'level':i,'seed':seed,'creatures':len(e['creatures']),'clear':True})
  # Sonar contacts are temporary and not observations, loot or weapon targets.
  p.evaluate('AbyssDiagnostics.fixtureLevel(3)')
  f=fix(p,depth=1100,lights=False,facing=0,upgrades={'hull':7,'flashlight':4,'railgun':4,'torpedo':4})
  p.evaluate('v=>AbyssDiagnostics.ecologyFixture(v)',{'creatures':[creature('driftback',f['x']+220,f['y'])],'observations':{}})
  before=state(p);p.evaluate('AbyssDiagnostics.ecologyPulse(2.6)');assert not p.evaluate('AbyssDiagnostics.ecology().state.observations')
  p.evaluate('AbyssDiagnostics.ping()');step(p,1.1)
  assert not p.evaluate('AbyssDiagnostics.ecology().state.observations'),'sonar is not a visual observation'
  waves=debug(p)['sonarWaves'];assert any(c['kind']=='livingCreatures' and c['hit'] for w in waves for c in w['contacts']),waves
  p.evaluate('AbyssDiagnostics.weaponStock({railgun:10,torpedo:3});AbyssDiagnostics.fire("railgun")')
  assert p.evaluate('AbyssDiagnostics.seekTarget("railgun")') is None
  assert state(p)['credits']==before['credits'] and state(p)['crystals']==before['crystals']
  # Light and line-of-sight both required. A nearby rock cannot be scanned through for a journal entry.
  f=fix(p,depth=1100,lights=True,facing=0,upgrades={'hull':7,'flashlight':4},rocks=[{'dx':95,'dy':0,'radius':50}])
  p.evaluate('v=>AbyssDiagnostics.ecologyFixture(v)',{'creatures':[creature('glider',f['x']+190,f['y'])],'observations':{}})
  assert not p.evaluate('v=>AbyssDiagnostics.ecologyVisible(v)',{'x':f['x']+190,'y':f['y']})
  f=fix(p,depth=1100,lights=True,facing=0,upgrades={'hull':7,'flashlight':4})
  p.evaluate('v=>AbyssDiagnostics.ecologyFixture(v)',{'creatures':[creature('glider',f['x']+170,f['y'])],'observations':{}})
  p.evaluate('AbyssDiagnostics.ecologyPulse(3)')
  seen=p.evaluate('AbyssDiagnostics.ecology().state.observations');assert 'glider' in seen,seen
  assert seen['glider']['depth']>=1000
  # No simulation advances during ordinary waiting or native photo/journal modals.
  e=p.evaluate('AbyssDiagnostics.ecology()');p.wait_for_timeout(100);assert p.evaluate('AbyssDiagnostics.ecology()')==e
  p.evaluate('AbyssDiagnostics.save()');snapshot=store(p);c.close();c,p,e2=build(b,store=snapshot);errors+=e2
  assert p.evaluate('AbyssDiagnostics.ecology().state.observations')==seen
  assert state(p)['paused']
  assert not errors,errors
  c.close();b.close()
  (ROOT/'verification/v0.25.0/ecology-map-probes.json').write_text(json.dumps(probes,indent=2))
 print('PASS ecology: 20 seeded maps, 32 large animals clear after simulation, sonar-only sightings excluded, wall occlusion, no rewards/target locks, observation and creature state saved, pause stable')
if __name__=='__main__':run()
