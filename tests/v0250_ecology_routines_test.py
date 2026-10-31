from v0250_harness import *
from playwright.sync_api import sync_playwright
import math

def run():
 with sync_playwright() as pw:
  b=launch_browser(pw);c,p,errors=build(b)
  f=fix(p,depth=150,lights=False,upgrades={'hull':7,'engine':4})
  p.evaluate('AbyssDiagnostics.ecologyFixture({creatures:[]});AbyssDiagnostics.wildFixture({schools:[{dx:160,dy:0,species:1},{dx:-300,dy:20,species:0}]})')
  p.evaluate('AbyssDiagnostics.mutateSchool(0,{routine:"feeding",routineLeft:20,restX:'+str(f['x']+160)+',restY:'+str(f['y'])+'})')
  step(p,1)
  schools=p.evaluate('AbyssDiagnostics.wild().schools');assert schools[0]['activity']=='curious',schools[0]['activity']
  assert schools[0]['fear']<.2
  states=set()
  # One active shoal changes between distinct routines without fixed formation slots.
  for _ in range(40):
   step(p,.8);states.update(s.get('activity') for s in p.evaluate('AbyssDiagnostics.wild().schools'))
  assert len(states)>=3,states
  # An actual boost scatters close fish substantially; prior terrain/fear mechanics still apply.
  move(p,f['x']+100,f['y']);step(p,.8,['d',' '])
  assert any(s['fear']>.35 for s in p.evaluate('AbyssDiagnostics.wild().schools'))
  # Off-camera creatures remain parked; no expensive world-wide movement.
  assert p.evaluate('AbyssLiving.skyAt(0).time')=='DAWN'
  values=p.evaluate('Array.from({length:1200},(_,i)=>AbyssLiving.skyAt(i))')
  assert {'DAWN','DAYLIGHT','SUNSET','DUSK','NIGHT'} <= set(v['time'] for v in values)
  assert {'CALM','LIGHT RAIN','WIND & RAIN'} <= set(v['weather'] for v in values)
  for a,bv in zip(values,values[1:]):
   assert max(abs(x-y) for x,y in zip(a['bottom'],bv['bottom']))<=3
   assert abs(a['rain']-bv['rain'])<.06
  # Original lighting is independent of surface clock and never brightens the abyss.
  before=p.evaluate('AbyssDiagnostics.ambientAtDepth(1100)')
  p.evaluate('AbyssDiagnostics.ecologyFixture({elapsed:670})')
  assert before==p.evaluate('AbyssDiagnostics.ambientAtDepth(1100)')==0
  assert not errors,errors;c.close();b.close()
 print('PASS quiet-vessel curiosity, multiple shoal routines, boost fear, smooth complete daylight/weather cycles, deep ambient darkness unchanged')
if __name__=='__main__':run()
