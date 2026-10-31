from v0250_harness import *
from playwright.sync_api import sync_playwright
with sync_playwright() as pw:
 b=launch_browser(pw);c,p,errors=build(b,390,844,True)
 print('State:',state(p)); print('Rescue:',p.evaluate('AbyssDiagnostics.rescue()'));print('Errors:',errors)
 assert state(p)['version']=='0.25.0';assert not errors,errors
 p.evaluate('AbyssDiagnostics.rescueLog()');assert p.locator('#rescueDialog').is_visible()
 p.locator('#rescueDone').click()
 print('PASS boot, new module, native rescue log, pause restoration');c.close();b.close()
