import json
from playwright.sync_api import sync_playwright
from v0171_harness import *
with sync_playwright() as pw:
 b=launch_browser(pw)
 c,p,errors=build(b,390,844,True,launch=False)
 print('boot',errors,flush=True)
 print(state(p),flush=True)
 p.locator('#startBtn').click();p.evaluate('requestAnimationFrame=()=>0');p.wait_for_timeout(100);p.evaluate('AbyssDiagnostics.step(0)')
 print('launched',errors,flush=True)
 print(p.locator('.cockpit-hud').bounding_box(),flush=True)
 p.screenshot(path=str(OUT/'initial-hud.png'))
 p.locator('#surveyBtn').click();p.screenshot(path=str(OUT/'initial-map.png'))
 print('map',errors,flush=True)
 p.locator('#surveyClose').click()
 p.locator('#telemetryBtn').click();p.screenshot(path=str(OUT/'initial-telemetry.png'))
 print('telemetry',errors,flush=True)
 c.close();b.close()
