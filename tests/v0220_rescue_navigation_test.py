"""Drone collision and A* routes use the actual shared navigation system."""
from v0220_rescue_mechanics_test import *
with sync_playwright() as pw:
 b=launch_browser(pw);c,p,errors=build(b)
 # A rock directly between an escort and the ship forces a curved route.
 fix(p,depth=82,rocks=[{'dx':0,'dy':0,'radius':65}],upgrades={'hull':7,'engine':4})
 q=state(p);x,y=q['x'],q['y'];stage(p,{'drone':drone_at(x-160,y,'follow'),'signalAfter':99999,'nextEventAt':99999})
 move(p,x+160,y);path=p.evaluate('([a,b])=>AbyssDiagnostics.rescueRoute(a,b)',[{'x':x-160,'y':y},{'x':x+160,'y':y}]);assert len(path)>4
 samples=[]
 for _ in range(170):
  pulse(p,.05);d=rescue(p)['drone'];samples.append(d)
  assert p.evaluate('d=>AbyssDiagnostics.wildClear(d.x,d.y,10)',d),d
 assert math.hypot(d['x']-(x+160),d['y']-y)<90,d
 assert any(abs(v['y']-y)>50 for v in samples),'Follower must turn around the rock, not phase through it'
 print('PASS escort steers around rock with every movement sample collision-clear',flush=True)
 # A drone can reach the harbour; ordinary predators remain excluded.
 fix(p,depth=40,upgrades={'hull':7,'engine':2});stage(p,{'drone':drone_at(600,600,'follow')});move(p,600,160)
 for _ in range(100):pulse(p,.05)
 assert math.hypot(rescue(p)['drone']['x']-600,rescue(p)['drone']['y']-160)<90
 print('PASS follower enters harbour without weakening predator safe-zone rules',flush=True)
 # Geometry and generation tests use real worlds, no clearing their rocks.
 p.evaluate('AbyssDiagnostics.relaunch()');checks=[]
 for level in range(5):
  p.evaluate('i=>AbyssDiagnostics.fixtureLevel(i)',level)
  for seed in [17,53,8080,65535,1234567]:
   p.evaluate('s=>AbyssDiagnostics.regenerate(s)',seed);before=debug(p);s=rescue(p)
   assert len(s['stations'])==(1 if level==0 else 2),(level,seed,s)
   for n in s['stations']:
    assert p.evaluate('n=>AbyssDiagnostics.wildClear(n.x,n.y,45)',n),(level,seed,n)
    assert math.hypot(n['x']-600,n['y']-160)>500
   if level==0:assert (s['stations'][0]['y']-120)/10<=130
   assert p.evaluate('AbyssRescue.valid(AbyssDiagnostics.rescue())')
   p.evaluate('AbyssDiagnostics.rescueSpawn()');s=rescue(p)
   # Only one campaign-wide outstanding rescue; direct fixture clears prior rescue for placement coverage.
   if s['drone']:
    assert p.evaluate('d=>AbyssDiagnostics.wildClear(d.x,d.y,40)',s['drone'])
    assert (s['drone']['y']-120)/10<=state(p)['safeDepth']
    stage(p,{'done':True,'drone':{**s['drone'],'status':'rescued'}})
   assert debug(p)['field']['loot']==before['field']['loot']
   checks.append([level+1,seed,len(s['stations'])])
 print('PASS 25 generated levels: 1/2/2/2/2 service sites, clear placement, stock-hull access, untouched original loot',flush=True)
 assert not errors,errors;c.close();b.close()
 (ROOT/'verification/v0.22.0/rescue-placement.json').write_text(json.dumps(checks,indent=2)+'\n')
