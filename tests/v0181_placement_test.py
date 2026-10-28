from v0181_harness import *
from playwright.sync_api import sync_playwright
import math
with sync_playwright() as pw:
 b=launch_browser(pw);c,p,errors=build(b)
 result=[]
 for level in range(5):
  p.evaluate('(i)=>AbyssDiagnostics.fixtureLevel(i)',level)
  # Test offers against a hull suited to the next accessible band.
  fix(p,upgrades={'hull':[0,1,2,4,6][level]})
  for seed in [17,53,1704,1800,9911,43125,65535,1234567]:
   p.evaluate('(s)=>AbyssDiagnostics.regenerate(s)',seed)
   before=debug(p)['field']['loot'];check=p.evaluate('AbyssDiagnostics.signalPlacementProbe()')
   assert before==debug(p)['field']['loot'],'New content moved finite resources'
   assert len(check['offers'])==3
   for offer in check['offers']:
    for pt in offer['points']:
     assert not pt['blocked'],(level,seed,'blocked mission',pt)
     assert pt['depth']<state(p)['safeDepth']-5,(level,seed,pt['depth'],state(p)['safeDepth'])
   if level==3:
    site=check['warden'];assert site and not site['blocked']
    assert all(math.hypot(site['x']-w['x'],site['y']-w['y'])>520 for w in debug(p)['wrecks'])
    wild=p.evaluate('AbyssDiagnostics.wild()')
    assert all(m['detonated'] or math.hypot(m['anchorX']-site['x'],m['anchorY']-m['tether']-(site['y']-170))>=105+m['sway'] for m in wild['mines'])
   result.append({'level':level+1,'seed':seed,'passed':True})
 assert not errors,errors
 (ROOT/'verification/v0.18.1/placements.json').write_text(json.dumps(result,indent=2)+'\n')
 print('PASS 40 seeded level/contract generation checks: safe hull depths, open-water mission targets, unchanged finite resources, Warden clear of recorders, protected observation buoy.')
 c.close();b.close()
