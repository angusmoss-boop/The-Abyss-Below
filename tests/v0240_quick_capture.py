from v0240_harness import *
from v0240_branding_ui_test import images
from playwright.sync_api import sync_playwright
import base64
with sync_playwright() as pw:
 b=launch_browser(pw)
 for w,h,touch in [(390,844,True),(844,390,True),(1440,900,False)]:
  c,p,errors=build(b,w,h,touch,launch=False);images(p)
  p.wait_for_function('!document.documentElement.classList.contains("abyss-launching")')
  p.screenshot(path=str(OUT/f'new-menu-{w}x{h}.png'))
  p.locator('#startBtn').click();p.evaluate('requestAnimationFrame=()=>0;AbyssDiagnostics.step(0)')
  p.evaluate('AbyssDiagnostics.grantCredits(8200);AbyssDiagnostics.grantCrystals(48)')
  dock(p)
  p.eval_on_selector_all('img.dock-vessel-art','(xs,uri)=>xs.forEach(x=>x.src=uri)','data:image/png;base64,'+base64.b64encode((ROOT/'icon-192.png').read_bytes()).decode())
  p.screenshot(path=str(OUT/f'new-dock-{w}x{h}.png'))
  p.locator('#launchAgain').click();fix(p,depth=76,upgrades={'hull':2,'oxygen':1,'battery':1,'engine':1,'shield':1},battery=81)
  p.evaluate("AbyssDiagnostics.setSystems({hull:112,oxygen:103,shield:12})")
  p.evaluate('AbyssDiagnostics.unfreeze()');p.locator('#focusPauseBtn').click()
  p.screenshot(path=str(OUT/f'new-pause-{w}x{h}.png'))
  print(w,h,errors);c.close()
 b.close()
# Actual deterministic pickup in its generated location, no replacement map art.
with sync_playwright() as pw:
 b=launch_browser(pw);c,p,errors=build(b,390,844,True)
 p.evaluate('AbyssDiagnostics.regenerate(8080)')
 node=p.evaluate('AbyssDiagnostics.lifeline().cells.nodes[0]')
 p.evaluate('AbyssDiagnostics.setSystems({battery:35})')
 move(p,node['x']+70,node['y']+85)
 p.evaluate('AbyssDiagnostics.face(Math.atan2(-85,-70));AbyssDiagnostics.step(0)')
 p.screenshot(path=str(OUT/'battery-cell-390x844.png'))
 p.evaluate('AbyssDiagnostics.setSystems({battery:0});AbyssDiagnostics.unfreeze()');p.locator('#focusPauseBtn').click()
 p.screenshot(path=str(OUT/'reserve-drive-pause-390x844.png'))
 assert not errors,errors;c.close();b.close()
