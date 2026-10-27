"""Real UI screenshots with synthetic credits/gear, not concept art or hosted-sync claims."""
from v0110_harness import *
from playwright.sync_api import sync_playwright
with sync_playwright() as pw:
 b=launch_browser(pw)
 for touch,w,h in [(True,390,844),(True,844,390),(False,1440,900)]:
  c,p,errors=build(b,w,h,touch,store={SAVE:json.dumps({'credits':1480,'upgrades':{'hull':3,'engine':2,'battery':2,'flashlight':2,'minePower':2,'mineCapacity':2}})})
  dock(p);p.mouse.move(0,0);p.screenshot(path=str(OUT/f'{"mobile" if touch else "desktop"}-{w}x{h}-dock.png'))
  p.locator('[data-system="shield"]').click();p.screenshot(path=str(OUT/f'{"mobile" if touch else "desktop"}-{w}x{h}-shield.png'))
  p.locator('#upgradePurchase').click();p.mouse.move(0,0);p.screenshot(path=str(OUT/f'{"mobile" if touch else "desktop"}-{w}x{h}-shield-installed.png'))
  p.locator('#upgradeDetailClose').click()
  if h>w:
   p.locator('[data-system="disruptor"]').click();p.screenshot(path=str(OUT/'mobile-disruptor.png'));p.locator('#upgradeDetailClose').click()
   p.locator('[data-system="magnet"]').click();p.screenshot(path=str(OUT/'mobile-magnet.png'));p.locator('#upgradeDetailClose').click()
  p.locator('#ammunitionTab').click();p.screenshot(path=str(OUT/f'{"mobile" if touch else "desktop"}-{w}x{h}-ammo.png'))
  p.locator('#launchAgain').click()
  # Actual three-module HUD at 120m, no additional action circles.
  fix(p,depth=120,lights=True,facing=.6,upgrades={'shield':4,'disruptor':3,'magnet':3,'hull':4,'engine':3,'flashlight':3})
  p.evaluate('AbyssDiagnostics.regenerate(227136);AbyssDiagnostics.lightingFixture({depth:120,lights:true,facing:.6,freeze:true})')
  p.mouse.move(0,0);p.screenshot(path=str(OUT/f'{"mobile" if touch else "desktop"}-{w}x{h}-systems-hud.png'))
  assert not errors,errors;c.close()
 c,p,errors=build(b,390,844,True,launch=False);p.mouse.move(0,0);p.screenshot(path=str(OUT/'mobile-menu.png'));assert not errors,errors;c.close();b.close()
print('PASS production dock, child pop-ups, ammunition shop and fitted-shield HUD on portrait, landscape and desktop; local sync remains unverified')
