"""Real game render. Synthetic money, purchases and camera position for screenshots."""
from v0171_harness import *
from playwright.sync_api import sync_playwright
import math,shutil

def prepare(p):
 p.evaluate('AbyssDiagnostics.grantCredits(9000);AbyssDiagnostics.grantCrystals(150)');dock(p)
 for u in ['hull','hull','engine','engine','railgun','railgun','torpedo','minePower','mineCapacity','flashlight']:buy(p,u)
 p.locator('#ammunitionTab').click()
 for _ in range(12):p.locator('#buyRailBtn').click()
 for _ in range(2):p.locator('#buyTorpedoBtn').click();p.locator('#buyMineBtn').click()
 depart(p)
 p.evaluate('AbyssDiagnostics.lightingFixture({depth:255,facing:-1.9,lights:true,battery:85,freeze:false})')
 p.evaluate('AbyssDiagnostics.step(0,{freezeAfter:false});AbyssDiagnostics.renderWorld()')
 p.evaluate('document.getElementById("notification").classList.add("hidden")');p.wait_for_timeout(200)

def run():
 with sync_playwright() as pw:
  b=launch_browser(pw)
  for w,h,t,label in [(390,844,True,'mobile-controls'),(844,390,True,'landscape-controls'),(1440,900,False,'desktop-reference')]:
   c,p,e=build(b,w,h,t);prepare(p);p.screenshot(path=str(OUT/(label+'.png')))
   if t and w==390:
    p.locator('#focusPauseBtn').click();p.wait_for_timeout(700);p.screenshot(path=str(OUT/'pause-menu.png'))
   assert not e,e;c.close()
  c,p,e=build(b,390,844,True)
  p.evaluate('AbyssDiagnostics.lightingFixture({depth:100,facing:0,lights:true,battery:100,freeze:false});AbyssDiagnostics.step(0,{freezeAfter:false})')
  p.wait_for_timeout(200);p.screenshot(path=str(OUT/'locked-controls.png'));assert not e,e;c.close();b.close()
 for name in ['mobile-controls','landscape-controls','desktop-reference','pause-menu','locked-controls']:
  shutil.copy2(OUT/(name+'.png'),ROOT.parent/('v0.17.1-'+name+'.png'))
 print('PASS current production screenshots: portrait, landscape, desktop, pause and locked gear. Synthetic funds/equipment only.')
if __name__=='__main__':run()
