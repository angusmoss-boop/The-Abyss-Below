from playwright.sync_api import sync_playwright
from v0240_harness import *
with sync_playwright() as p:
 b=launch_browser(p)
 c,g,errors=build(b,390,844,True)
 print('BOOT',state(g)['build'] if 'build' in state(g) else state(g))
 dock(g);g.locator('#contractsTab').click();print('contracts',g.locator('[data-accept-contract]').count());g.screenshot(path=str(OUT/'initial-contracts.png'))
 g.locator('[data-accept-contract]').first.click();print('active',g.evaluate('AbyssDiagnostics.signals().state.active'))
 g.locator('#archiveTab').click();g.locator('[data-chapter]').first.click();print('archive',g.locator('#signalsDialog').is_visible());g.screenshot(path=str(OUT/'initial-journal.png'))
 print('ERRORS',errors);assert not errors
 c.close();b.close()
