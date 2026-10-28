"""Staged production-renderer previews; not evidence of a campaign playthrough."""
from v0230_harness import *
from v0230_strongholds_test import strong,point,prime
from playwright.sync_api import sync_playwright
OUT=ROOT/'screenshots/v0.23.0';OUT.mkdir(parents=True,exist_ok=True)
with sync_playwright() as pw:
 b=launch_browser(pw)
 c,p,errors=build(b,1600,1080,False);prime(p)
 p.evaluate("document.body.classList.add('game-focus');window.dispatchEvent(new Event('resize'))")
 v=strong(p)['site'];point(p,{'x':v['x']+v['w']*.31,'y':v['y']})
 p.evaluate('AbyssDiagnostics.face(Math.PI);AbyssDiagnostics.overview()')
 p.screenshot(path=str(OUT/'wayfarer-overview.png'))
 print('desktop',errors,flush=True);c.close()
 c,p,errors=build(b,390,844,True);prime(p)
 v=strong(p)['site'];t=v['traps'][0]
 point(p,{'x':t['x']+110*v['direction'],'y':t['y']+62})
 p.evaluate('AbyssDiagnostics.face(-2.65);AbyssDiagnostics.strongholdClock(.3);AbyssDiagnostics.renderWorld()')
 p.screenshot(path=str(OUT/'mobile-conduit-warning.png'))
 p.evaluate('AbyssDiagnostics.strongholdClock(2.2);AbyssDiagnostics.renderWorld()')
 p.screenshot(path=str(OUT/'mobile-conduit-active.png'))
 p.evaluate('AbyssDiagnostics.openDiscoveries()');p.screenshot(path=str(OUT/'mobile-discoveries.png'))
 print('mobile',errors,flush=True);c.close();b.close()
