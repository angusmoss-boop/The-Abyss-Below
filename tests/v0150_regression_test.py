"""Retained lighting, sonar, mines, collision, pressure and campaign objectives."""
from v0150_harness import *
from v050_depth_lighting_test import PIXELS
from playwright.sync_api import sync_playwright
import math

_raw_fix=fix
def fix(p,**kwargs):
 # Synthetic scene placement on the actual level whose floor contains the test depth.
 depth=kwargs.get('depth',500);index=next((i for i,d in enumerate([300,600,1000,1400,1800]) if depth<d-5),4)
 if state(p)['levelId']!=['sunbreak-shelf','glassbone-rift','drowned-gardens','midnight-cathedral','calypso-abyss'][index]:p.evaluate('(i)=>AbyssDiagnostics.fixtureLevel(i)',index)
 return _raw_fix(p,**kwargs)

PIXELMAX='''()=>{AbyssDiagnostics.renderWorld();let a=document.getElementById('gameCanvas').getContext('2d').getImageData(0,0,document.getElementById('gameCanvas').width,document.getElementById('gameCanvas').height).data,m=0;for(let i=0;i<a.length;i+=4)m=Math.max(m,a[i],a[i+1],a[i+2]);return m;}'''
def run():
 with sync_playwright() as pw:
  b=launch_browser(pw)
  for touch in [False,True]:
   c,p,errors=build(b,390 if touch else 1440,844 if touch else 900,touch)
   values=p.evaluate('Array.from({length:1001},(_,d)=>AbyssDiagnostics.ambientAtDepth(d))')
   assert values[0]==1 and values[-1]==0 and all(a>b for a,b in zip(values,values[1:]))
   lit=[]
   for mark in range(1,5):
    fix(p,depth=1100,upgrades={'hull':7,'flashlight':mark},lights=True)
    stats=p.evaluate(PIXELS,{'depth':1100,'lights':True,'facing':0,'quietScene':True});assert stats['leaks']==0 and stats['lit']>300
    lit.append(stats['lit'])
    stats=p.evaluate(PIXELS,{'depth':1100,'lights':False,'quietScene':True});assert stats['max']==0
    stats=p.evaluate(PIXELS,{'depth':1100,'lights':True,'battery':0,'quietScene':True});assert stats['max']==0
   assert all(a<b for a,b in zip(lit,lit[1:]))
   for angle in [.73,math.pi/2,-math.pi/2,math.pi]:
    stats=p.evaluate(PIXELS,{'depth':1100,'lights':True,'facing':angle,'quietScene':True});assert stats['leaks']==0
   fix(p,depth=1100,upgrades={'hull':7},lights=False,items=[{'dx':90,'dy':0},{'dx':300,'dy':0,'type':'crystal'}],rocks=[{'dx':-160,'dy':50}],predators=[{'dx':-280,'dy':120,'tier':'reaper'}])
   assert p.evaluate(PIXELMAX)==0
   p.evaluate('AbyssDiagnostics.ping()');assert all(n['revealUntil']==0 for n in debug(p)['items'])
   assert state(p)['battery']==88 and state(p)['scanCooldown']>0
   p.evaluate('AbyssDiagnostics.ping()');assert state(p)['battery']==88
   step(p,.2);items=debug(p)['items'];assert items[0]['revealUntil']>0 and items[1]['revealUntil']==0
   step(p,.8);assert all(n['revealUntil']>0 for n in debug(p)['items']) and p.evaluate(PIXELMAX)>0
   step(p,7);assert p.evaluate(PIXELMAX)==0 and state(p)['scanCooldown']==0
   assert not errors,errors;c.close()
  print('PASS desktop/mobile pixel-level darkness, all four lamp cones/power-off/rotation, continuous fade, sonar wave arrival/cooldown/expiry')
  c,p,errors=build(b)
  for mark,damage in [(1,60),(2,110),(3,180),(4,240)]:
   for tier,hp in [('common',100),('apex',200),('reaper',400)]:
    fix(p,depth=1100,upgrades={'hull':7,'minePower':mark},predators=[{'dx':0,'dy':-95,'tier':tier}],mines=[{'dx':0,'dy':-70,'mark':mark,'damage':damage}])
    step(p,.02);d=debug(p);expected=max(0,round(hp*1.15)-damage)
    assert (d['predators'][0]['health'] if d['predators'] else 0)==expected
    assert state(p)['hull']==state(p)['maxHull'] and not d['mines']
    if not expected:assert state(p)['kills']==1
  fix(p,depth=1100,upgrades={'hull':7,'minePower':1},predators=[{'dx':0,'dy':-90}]);assert p.evaluate('AbyssDiagnostics.mine()')
  step(p,.64);assert debug(p)['predators'][0]['health']==115
  step(p,.02);assert debug(p)['predators'][0]['health']==55
  fix(p,depth=4,upgrades={'minePower':4});assert not p.evaluate('AbyssDiagnostics.mine()')
  fix(p,depth=45,upgrades={'minePower':4},facing=0,rocks=[{'dx':-55,'dy':0,'radius':55}]);assert not p.evaluate('AbyssDiagnostics.mine()')
  print('PASS 12 warhead/health pairings; mine arming/cooldown, no friendly fire and dock/blocked-stern guards')
  # Narrow gap and collision substeps, including the maximum new boost speed.
  f=fix(p,depth=45,upgrades={'hull':7,'engine':0},facing=math.pi/2,rocks=[{'dx':-72,'dy':140,'radius':65,'seed':.4},{'dx':73,'dy':140,'radius':65,'seed':.3}])
  s=step(p,2,keys=['s']);assert s['y']>f['y']+170
  f=fix(p,depth=45,upgrades={'hull':7,'engine':4},facing=0,rocks=[{'dx':150,'dy':0,'radius':85,'seed':.2}])
  s=step(p,2,keys=['d',' ']);assert s['x']<f['x']+95
  fix(p,depth=1100,upgrades={'hull':7},predators=[{'dx':0,'dy':670,'tier':'reaper','aggression':1,'alertUntil':999}]);step(p,.05);assert debug(p)['predators'][0]['aggression']==0
  fix(p,depth=780,upgrades={'hull':7},predators=[{'dx':0,'dy':200,'tier':'reaper','aggression':1,'alertUntil':999}]);step(p,1);assert debug(p)['predators'][0]['y']>=8120
  print('PASS narrow-gap traversal, boosted rock collision, finite pursuit leash, 800 m Reaper floor')
  # Station hull upgrades remain usable via the refactored tab, not just fixtures.
  c.close();c,p,errors=build(b);p.evaluate('AbyssDiagnostics.grantCredits(20000);AbyssDiagnostics.grantCrystals(1000)');dock(p)
  for lv in range(1,8):buy(p,'hull');assert state(p)['safeDepth']==[130,330,630,830,1030,1330,1530,1830][lv]
  p.locator('[data-system="hull"]').click();assert p.locator('#upgradePurchase').is_disabled();p.locator('#upgradeDetailClose').click()
  p.locator('#launchAgain').click();fix(p,depth=1500,upgrades={'hull':7});s=step(p,1);assert s['hull']==s['maxHull']
  fix(p,depth=1500,upgrades={'hull':0});s=step(p,.2);assert s['hull']<100 or not s['running']
  assert not errors,errors;c.close()
  print('PASS seven dual-currency hull purchases and new pressure ladder; deep pressure bypass verified')
  # Storage failure must be visible, not reported as a successful save.
  c,p,errors=build(b,launch=False)
  p.evaluate('localStorage.setItem=()=>{throw new Error("quota")};AbyssDiagnostics.grantCredits(1)')
  p.locator('#startBtn').click();p.evaluate('AbyssDiagnostics.unfreeze()');p.locator('#focusPauseBtn').click();p.locator('#pauseMenuBtn').click()
  assert not state(p)['storageHealthy'] and 'STORAGE UNAVAILABLE' in p.locator('#saveStatus').inner_text()
  assert not errors,errors;c.close();b.close();print('PASS storage failure warning; no silent claim of a persistent save')
if __name__=='__main__':run()
