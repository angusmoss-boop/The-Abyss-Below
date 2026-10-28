"""Screenshots from production rendering; synthetic gear/position only."""
from v0190_harness import *
from v0190_giants_test import prime,giants,visit
from playwright.sync_api import sync_playwright
import math
with sync_playwright() as pw:
 b=launch_browser(pw)
 for width,height,touch,name in [(1440,900,False,'desktop'),(390,844,True,'mobile'),(844,390,True,'landscape')]:
  c,p,errors=build(b,width,height,touch);prime(p)
  if not touch:p.evaluate("document.querySelector('#focusToggleBtn').click()")
  g=giants(p);v=g['site'];visit(p,{'x':v['x']+40,'y':v['y']+55});p.evaluate('AbyssDiagnostics.face(Math.PI);AbyssDiagnostics.renderWorld()')
  p.screenshot(path=str(OUT/f'{name}-wayfarer.png'))
  visit(p,v['panel']);p.evaluate('AbyssDiagnostics.ping()');step(p,.2);use(p)
  visit(p,v['plate']);use(p);dock(p)
  p.locator('#archiveTab').click();p.locator('#discoveriesDockBtn').click()
  p.locator('#discoveryLivery').select_option(v['id'])
  p.screenshot(path=str(OUT/f'{name}-discoveries.png'))
  assert not errors,errors;c.close()
 b.close()
