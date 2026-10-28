from v0230_harness import *
from playwright.sync_api import sync_playwright
import math
with sync_playwright() as pw:
 b=launch_browser(pw);c,p,e=build(b)
 fix(p,upgrades={'hull':7,'oxygen':5,'battery':4,'shield':4,'engine':4})
 p.evaluate('AbyssDiagnostics.fixtureLevel(3)')
 for seed in range(1,101):
  p.evaluate('s=>AbyssDiagnostics.regenerate(s)',seed)
  p.evaluate('AbyssDiagnostics.signalPlacementProbe()')
  site=p.evaluate('AbyssDiagnostics.signals().state.warden.site')
  p.evaluate('AbyssDiagnostics.setSystems({battery:220})')
  move(p,site['x'],site['y']-170);step(p,.1)
  before=debug(p);use(p)
  if not p.locator('#wakeWarden').is_visible():
   d=debug(p); print('FAIL SEED',seed,'player',d['player']['x'],d['player']['y'],'buoy',site,flush=True)
   print('COLLECTED',[(n['type'],n['id'],n['x'],n['y']) for n,old in zip(d['items'],before['items']) if n['collected'] and not old['collected']],flush=True)
   print('NEAR ITEMS',[(n['type'],n['id'],math.hypot(n['x']-d['player']['x'],n['y']-d['player']['y'])) for n in d['items'] if not n['collected'] and math.hypot(n['x']-d['player']['x'],n['y']-d['player']['y'])<65],flush=True)
   (ROOT/'verification/v0.23.0/diagnostic-buoy.json').write_text(json.dumps({'seed':seed,'site':site,'debug':d,'before':before,'store':store(p)},indent=2));break
  p.locator('#leaveWarden').click()
 else:print('100 SEEDS PASS')
 c.close();b.close()
