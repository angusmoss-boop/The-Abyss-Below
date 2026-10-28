"""Production life-support, normal/boost power and zero-energy propulsion."""
from v0230_harness import *
from playwright.sync_api import sync_playwright
import math

def life(p):return p.evaluate('AbyssDiagnostics.lifeline()')
with sync_playwright() as pw:
 b=launch_browser(pw);c,p,errors=build(b)
 for mark in range(6):
  fix(p,depth=60,upgrades={'oxygen':mark,'battery':0,'engine':0,'hull':7,'shield':0},battery=100,lights=False)
  before=state(p);step(p,10);after=state(p)
  rate=.3/(1+mark*.2)
  assert math.isclose(before['oxygen']-after['oxygen'],10*rate,abs_tol=1e-7),(mark,before,after)
  assert math.isclose(life(p)['fullEndurance'],(100+mark*30)/rate,abs_tol=1e-7)
  assert math.isclose(before['battery']-after['battery'],.06,abs_tol=1e-7)
  oxy=next(u for u in p.evaluate('AbyssDiagnostics.upgradeCatalog()') if u['id']=='oxygen')
  assert len(oxy['stats'])==3 and 'endurance' in oxy['stats'][2][0]
 print('PASS exact oxygen consumption at all 6 marks, upgrade detail endurance and very low idle battery draw',flush=True)
 for mark in range(5):
  results=[]
  for charge in [100,0]:
   fix(p,depth=70,upgrades={'hull':7,'engine':mark,'oxygen':0,'battery':0,'shield':0},battery=charge,lights=False)
   step(p,2,keys=['d']);st=state(p);results.append(st)
   assert st['battery']>=0 and st['hull']==st['maxHull']
   expected=146*(1+.17*mark)*(1 if charge else .5)
   assert abs(st['vx']-expected)<.2,(mark,charge,st['vx'],expected)
   assert abs(st['vy'])<1e-5
   if charge==0:
    assert life(p)['reserve'] and life(p)['effectiveSpeed']==expected
    assert 'RESERVE DRIVE' in p.locator('#statusStat').inner_text()
    p.evaluate('AbyssDiagnostics.ping()');assert state(p)['scanCooldown']==0 and state(p)['battery']==0
    step(p,.4,keys=['d',' ']);assert not state(p)['boosting'] and state(p)['boost']==results[0]['boost']
  assert math.isclose(results[1]['vx']/results[0]['vx'],.5,abs_tol=1e-7)
 print('PASS all 5 thruster ratings: empty-battery propulsion exactly half normal commanded speed, no free boost or sonar, no immobility',flush=True)
 # Recovered power restores full thrust without resetting boost/gear.
 p.evaluate('AbyssDiagnostics.setSystems({battery:25})');step(p,2,keys=['d']);assert not life(p)['reserve'] and state(p)['vx']>240
 # Different user actions have independently measurable costs; no passive battery regeneration.
 fix(p,depth=70,upgrades={'hull':7,'engine':4,'battery':0,'shield':0,'sonar':0,'disruptor':0,'flashlight':1},battery=100,lights=True)
 step(p,1,keys=['d']);cruise=100-state(p)['battery'];assert abs(cruise-.064)<1e-7,cruise
 fix(p,depth=70,upgrades={'hull':7,'engine':4,'battery':0,'shield':0,'sonar':0,'disruptor':0,'flashlight':1},battery=100,lights=True)
 step(p,1,keys=['d',' ']);boost=100-state(p)['battery'];assert math.isclose(boost,7.064,abs_tol=1e-7)
 p.evaluate('AbyssDiagnostics.ping()');assert math.isclose(100-state(p)['battery'],boost+12,abs_tol=1e-7)
 fix(p,depth=70,upgrades={'hull':7,'engine':4,'battery':5,'shield':0},battery=1)
 step(p,1,keys=['d',' ']);assert state(p)['battery']>=0 and not state(p)['boosting'] and life(p)['reserve']
 # Pausing does not advance resources with actual requestAnimationFrame running.
 c.close();c,p,e=build(b,stop_raf=False);errors+=e
 p.locator('#focusPauseBtn').click();before=state(p);p.wait_for_timeout(250);after=state(p)
 assert before['oxygen']==after['oxygen'] and before['battery']==after['battery'] and before['x']==after['x']
 assert not errors,errors;c.close();b.close()
 print('PASS boost and sonar dominate measured draw; lamp preserved; empty-power transition is bounded; actual paused frames freeze air and power')
