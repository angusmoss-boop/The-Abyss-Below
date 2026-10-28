"""Numerical and input-path tests for the three real ship systems."""
from v0182_harness import *
from playwright.sync_api import sync_playwright
import math

_raw_fix=fix
def fix(p,**kwargs):
 # Synthetic scene placement on the actual level whose floor contains the test depth.
 depth=kwargs.get('depth',500);index=next((i for i,d in enumerate([300,600,1000,1400,1800]) if depth<d-5),4)
 if state(p)['levelId']!=['sunbreak-shelf','glassbone-rift','drowned-gardens','midnight-cathedral','calypso-abyss'][index]:p.evaluate('(i)=>AbyssDiagnostics.fixtureLevel(i)',index)
 return _raw_fix(p,**kwargs)


def run():
 with sync_playwright() as pw:
  b=launch_browser(pw);c,p,errors=build(b)
  # Every mark: range gate, exact energy use and free near-field collection.
  for mark,reach,cost in [(1,100,1.2),(2,140,1),(3,180,.8),(4,220,.6)]:
   for dx,should in [(reach-1,True),(reach+1,False)]:
    fix(p,depth=45,upgrades={'magnet':mark,'hull':7},items=[{'dx':dx,'dy':0,'quantity':2}]);p.evaluate("AbyssDiagnostics.autoPickup()")
    assert debug(p)['items'][0]['collected']==should,(mark,dx,debug(p)['items'])
    assert abs(state(p)['battery']-(100-cost if should else 100))<1e-6
   fix(p,depth=45,upgrades={'magnet':mark},items=[{'dx':35,'dy':0,'quantity':2}],battery=0);p.evaluate("AbyssDiagnostics.autoPickup()")
   assert debug(p)['player']['cargo']['scrap']==2 and state(p)['battery']==0
  for kind in ['air','recorder']:
   fix(p,depth=45,upgrades={'magnet':4},items=[{'dx':100,'dy':0,'type':kind}]);p.evaluate("AbyssDiagnostics.autoPickup()");assert not debug(p)['items'][0]['collected']
  fix(p,depth=45,upgrades={'magnet':4},items=[{'dx':150,'dy':0}],rocks=[{'dx':90,'dy':0,'radius':35}]);p.evaluate("AbyssDiagnostics.autoPickup()")
  assert not debug(p)['items'][0]['collected'] and state(p)['battery']==100
  fix(p,depth=45,upgrades={'magnet':4},items=[{'dx':150,'dy':0}],battery=.5);p.evaluate("AbyssDiagnostics.autoPickup()");assert not debug(p)['items'][0]['collected']
  # Dark pickups require either lamp visibility or a revealed sonar echo.
  fix(p,depth=1100,upgrades={'magnet':4,'hull':7},lights=False,items=[{'dx':150,'dy':0}]);p.evaluate("AbyssDiagnostics.autoPickup()");assert not debug(p)['items'][0]['collected']
  p.evaluate('AbyssDiagnostics.ping()');step(p,.1);p.evaluate("AbyssDiagnostics.autoPickup()");assert not debug(p)['items'][0]['collected']
  step(p,.25);p.evaluate("AbyssDiagnostics.autoPickup()");assert debug(p)['items'][0]['collected']
  fix(p,depth=1100,facing=0,upgrades={'magnet':4,'hull':7},lights=True,items=[{'dx':150,'dy':0}]);p.evaluate("AbyssDiagnostics.autoPickup()");assert debug(p)['items'][0]['collected']
  fix(p,depth=1100,facing=math.pi,upgrades={'magnet':4,'hull':7},lights=True,items=[{'dx':150,'dy':0}]);p.evaluate("AbyssDiagnostics.autoPickup()");assert not debug(p)['items'][0]['collected']
  fix(p,depth=45,upgrades={'magnet':4,'hull':7},items=[{'dx':120,'dy':0,'quantity':2},{'dx':160,'dy':0,'type':'crystal','quantity':2}]);step(p,.3,keys=['e']);assert all(n['collected'] for n in debug(p)['items'])
  print('PASS four magnet marks: range, exact pickup cost, free close collection, no remote recorders/caches, blocked rock, low power, deep-dark lamp/sonar gates and held E')
  # Barrier subtracts before hull, restarts delay and consumes real battery on recharge.
  for mark,capacity,rate in [(1,20,2),(2,35,3),(3,50,4),(4,70,5)]:
   fix(p,depth=45,upgrades={'magnet':0,'shield':mark,'engine':0,'hull':7},battery=100)
   p.evaluate('AbyssDiagnostics.hit(13)');assert state(p)['shield']==capacity-13 and state(p)['hull']==state(p)['maxHull']
   step(p,7.9);assert state(p)['shield']==capacity-13
   before=state(p)['battery'];step(p,1.1)
   assert abs(state(p)['shield']-(capacity-13+rate))<.05
   assert abs((before-state(p)['battery'])-(rate*.35+1.1*.018))<.03
   p.evaluate('AbyssDiagnostics.hit(100)');assert state(p)['shield']==0 and state(p)['hull']<state(p)['maxHull']
  fix(p,depth=45,upgrades={'shield':4,'engine':1},battery=100)
  p.evaluate('AbyssDiagnostics.setSystems({shield:0,shieldDelay:0})');step(p,.3,keys=['s',' ']);assert state(p)['shield']==0 and state(p)['boosting']
  p.evaluate('AbyssDiagnostics.setSystems({shield:0,shieldDelay:0,battery:.5})');step(p,.2);assert state(p)['shield']==0
  fix(p,depth=1500,upgrades={'shield':4,'hull':0},battery=100);step(p,.01);assert state(p)['hull']<100 and state(p)['shield']==70
  fix(p,depth=45,upgrades={'shield':4,'hull':7},battery=100);p.evaluate('AbyssDiagnostics.setSystems({oxygen:0})');step(p,.2);assert state(p)['hull']<state(p)['maxHull'] and state(p)['shield']==70
  fix(p,depth=45,upgrades={'shield':4,'hull':7},predators=[{'dx':20,'dy':0,'tier':'common','aggression':1}]);step(p,.05);assert state(p)['shield']==57 and state(p)['hull']==state(p)['maxHull']
  print('PASS shield capacities/rates, 8s recharge delay, battery spend, overflow to hull, no charging during boost/empty battery, pressure and oxygen bypass, real predator bite')
  for mark,radius,duration,cost in [(1,180,1.2,3),(2,220,1.6,4),(3,260,2,5),(4,300,2.4,6)]:
   for tier,resistance in [('common',1),('apex',.8),('reaper',.6)]:
    fix(p,depth=1100,upgrades={'shield':0,'disruptor':mark,'sonar':0,'hull':7},predators=[{'dx':80,'dy':0,'tier':tier}]);p.evaluate('AbyssDiagnostics.ping()')
    assert state(p)['battery']==100-12-cost
    step(p,.08);assert not debug(p)['predators'][0].get('stunnedUntil',0)
    step(p,.15);d=debug(p);enemy=d['predators'][0];remaining=enemy['stunnedUntil']-d['clock']
    assert duration*resistance-.11<remaining<=duration*resistance,(mark,tier,remaining)
    x,y=enemy['x'],enemy['y'];step(p,.2);e=debug(p)['predators'][0];assert e['x']==x and e['y']==y
    step(p,duration*resistance);assert debug(p)['predators'][0]['stunnedUntil']<=debug(p)['clock']
   fix(p,depth=1100,upgrades={'disruptor':mark,'hull':7},predators=[{'dx':radius+80,'dy':0}]);p.evaluate('AbyssDiagnostics.ping()');step(p,1)
   assert not debug(p)['predators'][0].get('stunnedUntil',0) and debug(p)['predators'][0]['revealUntil']>0
  fix(p,depth=1100,upgrades={'disruptor':4,'hull':7},battery=14,predators=[{'dx':100,'dy':0}]);p.evaluate('AbyssDiagnostics.ping()');assert state(p)['battery']==2;step(p,.3);assert not debug(p)['predators'][0].get('stunnedUntil',0)
  fix(p,depth=1100,upgrades={'disruptor':4,'hull':7},battery=11);p.evaluate('AbyssDiagnostics.ping()');assert state(p)['battery']==11 and not debug(p)['sonarWaves']
  fix(p,depth=1100,upgrades={'disruptor':4,'hull':7},predators=[{'dx':1,'dy':0,'aggression':1}]);p.evaluate('AbyssDiagnostics.ping()');step(p,.03);assert state(p)['hull']==state(p)['maxHull']
  before=state(p)['battery'];p.evaluate('AbyssDiagnostics.ping()');assert state(p)['battery']==before
  print('PASS 12 disruptor mark/tier pairs, wave-arrival timing, immobility and bite suppression, stun expiry, local-radius restriction, extra power, normal-scan low-power fallback and cooldown')
  assert not errors,errors;c.close();b.close()
if __name__=='__main__':run()
