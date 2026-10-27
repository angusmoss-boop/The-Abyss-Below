from v0150_harness import *
from playwright.sync_api import sync_playwright
with sync_playwright() as pw:
 b=launch_browser(pw);c,p,e=build(b,390,844,True)
 for index in range(5):
  p.evaluate('i=>AbyssDiagnostics.fixtureLevel(i)',index)
  for seed in [17,12345,9081726]:
   p.evaluate('s=>AbyssDiagnostics.regenerate(s)',seed)
   w=p.evaluate('AbyssDiagnostics.wild()');print(index,seed,'mines',len(w['mines']),'vents',len(w['vents']),'schools',len(w['schools']),'benthos',len(w['benthos']),flush=True)
 print('errors',e);c.close();b.close()
