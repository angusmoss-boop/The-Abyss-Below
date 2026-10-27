"""Actual Chromium screenshots of the release. Gameplay fixtures only, no fake sync badge."""
from v0100_harness import *
from playwright.sync_api import sync_playwright

with sync_playwright() as pw:
 b=launch_browser(pw)
 c,p,errors=build(b,390,844,True,launch=False)
 p.screenshot(path=str(OUT/'mobile-menu.png'))
 assert not errors,errors;c.close()
 for touch,w,h in [(True,390,844),(True,844,390),(False,1440,900)]:
  c,p,errors=build(b,w,h,touch)
  if not touch:p.locator('#focusToggleBtn').click();p.wait_for_timeout(60)
  fix(p,depth=210,lights=True,facing=.9,upgrades={'engine':2,'flashlight':3,'hull':4,'minePower':2,'mineCapacity':3},mineAmmo=3)
  p.evaluate('AbyssDiagnostics.regenerate(227136)')
  p.evaluate('AbyssDiagnostics.lightingFixture({depth:210,facing:.9,lights:true,freeze:true})')
  p.screenshot(path=str(OUT/f'{"mobile" if touch else "desktop"}-{w}x{h}-idle.png'))
  if touch:
   p.evaluate('AbyssDiagnostics.unfreeze()')
   session=p.context.new_cdp_session(p)
   # The first finger establishes a floating origin in open water, not a fixed pad.
   x,y=(w-79,h-139) if h>w else (w-92,h-88)
   session.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'id':21,'x':x,'y':y}]})
   session.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'id':21,'x':x-27,'y':y-30}]})
   step(p,.06,freeze=False)
   p.screenshot(path=str(OUT/f'mobile-{w}x{h}-floating-helm.png'))
   session.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
  # Real station interface; seed credits solely for a readable purchasing preview.
  p.evaluate('AbyssDiagnostics.grantCredits(420)');dock(p)
  p.locator('#ammunitionTab').click()
  p.screenshot(path=str(OUT/f'{"mobile" if touch else "desktop"}-{w}x{h}-ammunition.png'))
  assert not errors,errors;c.close()
 b.close()
print('PASS screenshots: real production rendering, deterministic gameplay fixtures; local preview correctly remains NOT VERIFIED')
