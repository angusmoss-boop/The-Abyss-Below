from v0200_harness import *
from playwright.sync_api import sync_playwright
import math,statistics,copy

def school(p):return p.evaluate('AbyssDiagnostics.wild().schools[0]')
def swim(p,seconds):p.evaluate('t=>{for(let left=t;left>1e-8;left-=1/60)AbyssDiagnostics.fishPulse(Math.min(left,1/60))}',seconds)
def spread(s):return sum(math.hypot(f['x']-s['x'],f['y']-s['y']) for f in s['fish'])/len(s['fish'])
def run():
 with sync_playwright() as pw:
  b=launch_browser(pw);c,p,errors=build(b,1440,900)
  fix(p,depth=80,upgrades={'hull':7},lights=False)
  p.evaluate('AbyssDiagnostics.wildFixture({schools:[{dx:300,dy:0,species:0}]})')
  swim(p,4);s=school(p);baseline=spread(s)
  speeds=[math.hypot(f['vx'],f['vy']) for f in s['fish']]
  assert statistics.pstdev(speeds)>2,(speeds,s)
  assert len({round(f['angle'],2) for f in s['fish']})>=5
  assert len({round(f['paceTarget'],2) for f in s['fish']})>=5
  assert 8<baseline<150,baseline
  velocities=copy.deepcopy(s['fish']);swim(p,2)
  assert any(abs(math.hypot(a['vx'],a['vy'])-math.hypot(d['vx'],d['vy']))>3 for a,d in zip(velocities,school(p)['fish']))
  print('PASS individual headings, independently varying smooth speeds and loose cohesion; no indexed rows or fixed formation',flush=True)
  # A boat enters the school: members flee individually and spread, then regroup
  # after the disturbance leaves. This test measures the actual simulation.
  s=school(p);before=spread(s);move(p,s['x']-10,s['y']);swim(p,2.0);scattered=school(p);wide=spread(scattered)
  assert scattered['fear']>.35 and wide>before*1.25,(before,wide,scattered['fear'])
  move(p,scattered['x']-550,scattered['y']);swim(p,18);after=school(p)
  # Keep the school on-screen in the test; distance remains beyond the reaction range.
  if after['fear']>.1:move(p,after['x']-420,after['y']);swim(p,8);after=school(p)
  assert after['fear']<.12,after['fear']
  assert spread(after)<wide,(before,wide,spread(after))
  print('PASS submarine proximity spreads the school farther; fear subsides and the fish loosely regroup',before,wide,spread(after),flush=True)
  # Isolate the front/rear speed rule while retaining the production neighbor code.
  fix(p,depth=80,upgrades={'hull':7},lights=False)
  p.evaluate('AbyssDiagnostics.wildFixture({schools:[{dx:300,dy:0,species:0}]})')
  p.evaluate('''()=>{const s=AbyssDiagnostics.wild().schools[0];AbyssDiagnostics.mutateSchool(0,{heading:0,phase:0});
   s.fish.forEach((f,i)=>AbyssDiagnostics.mutateFish(0,i,{x:s.x+(i===0?70:i===1?-70:0),y:s.y+(i>1?(i-4)*18:0),vx:0,vy:0,pace:1,paceTarget:1,paceTimer:20,wander:0,wanderTarget:0}));}''')
  swim(p,.1);s=school(p)
  assert s['fish'][1]['vx']>s['fish'][0]['vx']+2,(s['fish'][0],s['fish'][1])
  print('PASS rear fish accelerate to catch up while leading fish ease off',flush=True)
  # Obstacle avoidance at scatter speeds; no effects on currency or hull.
  f=fix(p,depth=80,upgrades={'hull':7},lights=False,rocks=[{'dx':200,'dy':50,'radius':50}])
  p.evaluate('AbyssDiagnostics.wildFixture({schools:[{dx:100,dy:0,species:2}]})')
  initial=state(p);swim(p,6);s=school(p)
  assert all(p.evaluate('v=>AbyssDiagnostics.wildClear(...v)',[x['x'],x['y'],5.9]) for x in s['fish'])
  assert state(p)['credits']==initial['credits'] and state(p)['crystals']==initial['crystals'] and state(p)['hull']==initial['hull']
  # Save uses a real generated level for a reproducible school ID.
  p.evaluate('AbyssDiagnostics.relaunch();AbyssDiagnostics.enableWild()');s=p.evaluate('AbyssDiagnostics.wild().schools[0]')
  move(p,s['x']-250,s['y']);swim(p,2);p.evaluate('AbyssDiagnostics.save()');before=p.evaluate('AbyssDiagnostics.wild().schools');ss=store(p);c.close()
  c,p,e=build(b,store=ss);errors+=e;after=p.evaluate('AbyssDiagnostics.wild().schools')
  assert len(before)==len(after)
  for a,d in zip(before,after):
   assert a['fish']==d['fish'] and a['x']==d['x'] and a['y']==d['y'],(a['id'],a['fish'],d['fish'])
  assert state(p)['paused'] and not errors,errors;c.close();b.close()
  print('PASS solid-rock avoidance, harmlessness, saved individual pace/random/heading state and paused resume',flush=True)
if __name__=='__main__':run()
