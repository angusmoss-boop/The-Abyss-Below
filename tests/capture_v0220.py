"""Actual renderer/UI, staged synthetic progress; no fabricated screenshots."""
from v0220_rescue_mechanics_test import *
from v0220_branding_ui_test import images
from playwright.sync_api import sync_playwright
import shutil
with sync_playwright() as pw:
 b=launch_browser(pw)
 for w,h,touch in [(390,844,True),(844,390,True),(1440,900,False)]:
  c,p,errors=build(b,w,h,touch);images(p)
  fix(p,depth=80,upgrades={'hull':3,'oxygen':2,'battery':2,'engine':2,'flashlight':3,'railgun':2,'torpedo':2,'minePower':2,'mineCapacity':2})
  p.evaluate('AbyssDiagnostics.relaunch();AbyssDiagnostics.weaponStock({railgun:18,torpedo:4})')
  s=rescue(p);n=s['stations'][0]
  # Natural site and terrain, a staged follower is nearby for a clear demonstration.
  move(p,n['x']-48,n['y']+10);p.evaluate('AbyssDiagnostics.face(-Math.PI/5);AbyssDiagnostics.setSystems({oxygen:64})')
  stage(p,{'drone':drone_at(n['x']-110,n['y']+45,'follow'),'signalAfter':99999,'nextEventAt':99999})
  step(p,.7,keys=['e']);p.screenshot(path=str(OUT/f'{w}x{h}-air-station.png'))
  move(p,n['x']-80,n['y']-85);step(p,1.2);p.evaluate('AbyssDiagnostics.face(-Math.PI/2)');pulse(p,0)
  p.screenshot(path=str(OUT/f'{w}x{h}-drone-escort.png'))
  p.evaluate('AbyssDiagnostics.rescueLog()');p.screenshot(path=str(OUT/f'{w}x{h}-rescue-log.png'));p.locator('#rescueDone').click()
  # Stage real cargo collection and dock through production interactions.
  for kind in ['scrap','crystal','recorder']:
   items=[v for v in debug(p)['items'] if v['type']==kind and not v['collected']][:3 if kind=='scrap' else 1]
   for item in items:
    move(p,item['x'],item['y'])
    if kind=='scrap':p.evaluate('AbyssDiagnostics.autoPickup()')
    else:use(p)
  stage(p,{'drone':drone_at(610,280,'follow'),'trip':dict(seconds=267,depth=139,damage=0,airAdded=25,startKnown=0,startContracts=0,startCredits=state(p)['credits'])})
  move(p,600,700);step(p,.01);dock(p)
  p.screenshot(path=str(OUT/f'{w}x{h}-dock-summary.png'))
  p.locator('#rescueLogBtn').click();p.screenshot(path=str(OUT/f'{w}x{h}-debrief.png'));p.locator('#rescueDone').click()
  p.locator('#launchAgain').click();move(p,600,200);p.evaluate('AbyssDiagnostics.face(-Math.PI/2)');step(p,0)
  p.screenshot(path=str(OUT/f'{w}x{h}-harbour-fleet.png'))
  assert not errors,errors;c.close()
 b.close()
print('Captured actual production rendering at portrait, landscape and desktop; synthetic campaign/equipment/staging.')
