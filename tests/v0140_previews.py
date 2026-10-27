"""Screenshots of production rendering using synthetic outfit/position fixtures."""
from v0140_harness import *
from playwright.sync_api import sync_playwright
import math
GEAR={'hull':7,'engine':4,'flashlight':4,'sonar':4,'shield':3,'battery':5,'oxygen':5,'minePower':4,'mineCapacity':4}
def outfit(p):
 p.evaluate('g=>{AbyssDiagnostics.simulationFixture({depth:50,lights:true,upgrades:g});AbyssDiagnostics.relaunch();AbyssDiagnostics.step(0);}',GEAR)
 p.evaluate('AbyssDiagnostics.setSystems({shield:39})')
def snap(p,name):p.screenshot(path=str(OUT/name))
def run():
 with sync_playwright() as pw:
  b=launch_browser(pw)
  # Natural geometry and generated landmarks. No extra assets or fabricated labels.
  for w,h,touch,name in [(390,844,True,'mobile-hud'),(844,390,True,'landscape-hud'),(1440,900,False,'desktop-hud')]:
   c,p,e=build(b,w,h,touch);outfit(p)
   if not touch:
    p.locator('#telemetryBtn').click();p.locator('#focusToggleBtn').click()
    p.evaluate('dispatchEvent(new Event("resize"))')
   p.evaluate('AbyssDiagnostics.fixtureLevel(1)');env=p.evaluate('AbyssDiagnostics.living().environment');l=env['landmarks'][0]
   move(p,l['x'],l['y']+190);p.evaluate('AbyssDiagnostics.setSystems({hull:230,battery:190,oxygen:240})');p.evaluate('AbyssDiagnostics.surveyNow()');step(p,3,freeze=False)
   snap(p,name+'.png')
   if name=='mobile-hud':
    p.locator('#telemetryBtn').click();snap(p,'mobile-telemetry.png');p.locator('#telemetryClose').click()
    p.evaluate('AbyssDiagnostics.setSystems({hull:40})');snap(p,'mobile-alert.png');p.evaluate('AbyssDiagnostics.setSystems({hull:230})')
   assert not e,e;c.close()
  # All five locations at genuine generated points and the real depth-based lighting.
  for i in range(5):
   c,p,e=build(b,844,500,False);outfit(p);p.locator('#telemetryBtn').click();p.locator('#focusToggleBtn').click();p.evaluate('dispatchEvent(new Event("resize"))')
   p.evaluate('(i)=>AbyssDiagnostics.fixtureLevel(i)',i);p.evaluate('AbyssDiagnostics.regenerate(78231)')
   env=p.evaluate('AbyssDiagnostics.living().environment');l=env['landmarks'][0]
   move(p,l['x'],l['y']+170);p.evaluate('AbyssDiagnostics.surveyNow()');step(p,3,freeze=False);snap(p,f'level-{i+1}-environment.png')
   assert not e,e;c.close()
  # Chart a route using actual visibility/sonar instead of marking every cell known.
  c,p,e=build(b,390,844,True);outfit(p)
  for y in range(200,2050,190):
   move(p,600+math.sin(y*.002)*100,y);p.evaluate('AbyssDiagnostics.surveyNow()');p.evaluate('AbyssDiagnostics.setSystems({battery:250})');p.evaluate('AbyssDiagnostics.ping()');step(p,1.2)
  d=debug(p);p.evaluate('AbyssDiagnostics.setWaypoint(AbyssDiagnostics.state().x,AbyssDiagnostics.state().y)');p.locator('#surveyBtn').click();snap(p,'mobile-survey-map.png')
  p.locator('#mapOverview').click();snap(p,'mobile-survey-overview.png');p.keyboard.press('Escape')
  p.locator('#telemetryBtn').click();p.locator('#telemetryAudioBtn').click();snap(p,'mobile-audio.png');p.keyboard.press('Escape')
  p.evaluate('AbyssDiagnostics.save()');s=store(p);c.close();c,p,e2=build(b,390,844,True,store=s);e+=e2
  snap(p,'mobile-restored-dive.png');assert 'RESTORED' in p.locator('#pauseTitle').inner_text()
  p.locator('#pauseMenuBtn').click();snap(p,'main-menu.png');assert not e,e;c.close();b.close()
  print('PASS previews rendered from production code, synthetic fixtures only; no JavaScript errors')
if __name__=='__main__':run()
