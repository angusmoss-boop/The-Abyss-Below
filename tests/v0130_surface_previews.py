"""Render actual v0.13 production scenes, with synthetic gear and credits."""
from v0130_harness import *
from playwright.sync_api import sync_playwright
import math
with sync_playwright() as pw:
 b=launch_browser(pw)
 for w,h,touch in [(390,844,True),(844,390,True),(1440,900,False)]:
  c,p,e=build(b,w,h,touch)
  if not touch:p.locator('#focusToggleBtn').click()
  p.evaluate('AbyssDiagnostics.moveTo(600,220);AbyssDiagnostics.step(0)')
  p.screenshot(path=str(OUT/f'{w}x{h}-harbour.png'))
  dock(p)
  p.evaluate('AbyssDiagnostics.grantCredits(99999);AbyssDiagnostics.grantCrystals(9999)')
  for system,levels in [('hull',3),('engine',4),('flashlight',3),('shield',2),('magnet',1)]:
   p.locator('[data-system="'+system+'"]').click()
   for _ in range(levels):p.locator('#upgradePurchase').click()
   p.locator('#upgradeDetailClose').click()
  p.locator('#dockPanel').evaluate('(e)=>e.scrollTop=0')
  p.screenshot(path=str(OUT/f'{w}x{h}-upgrade-tiers.png'))
  p.locator('#launchAgain').click()
  # A real upward-input breach, photographed while the sub crosses the water.
  fix(p,depth=35,upgrades={'engine':4},facing=-math.pi/2,lights=True)
  move(p,830,470)
  for _ in range(160):
   s=step(p,.025,keys=['w',' '])
   if s['airborne'] and s['y']<5:break
  p.screenshot(path=str(OUT/f'{w}x{h}-breach.png'))
  # Capture the splashdown just after water re-entry.
  for _ in range(220):
   s=step(p,.025)
   if not s['airborne'] and s['y']>70:break
  p.screenshot(path=str(OUT/f'{w}x{h}-splashdown.png'))
  assert not e,e;c.close()
 b.close()
 print('PASS harbour, tier tiles, true launch and splashdown screenshots at 390x844, 844x390 and 1440x900')
