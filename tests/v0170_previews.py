"""Capture actual production UI with synthetic funds and purchased upgrades."""
from v0170_harness import *
from playwright.sync_api import sync_playwright
import json,shutil

def prepare(p):
 p.evaluate('AbyssDiagnostics.grantCredits(10000);AbyssDiagnostics.grantCrystals(200)');dock(p)
 for u in ['hull','hull','railgun','railgun','torpedo','minePower','mineCapacity','magnet','magnet']:buy(p,u)
 p.locator('#ammunitionTab').click()
 for _ in range(7):p.locator('#buyRailBtn').click()
 p.locator('#buyTorpedoBtn').click();p.locator('#buyMineBtn').click()
 p.evaluate('AbyssDiagnostics.grantCredits(1648)');p.locator('#upgradesTab').click();p.locator('#ammunitionTab').click()

def run():
 out=ROOT/'screenshots/v0.17.0';out.mkdir(parents=True,exist_ok=True)
 with sync_playwright() as pw:
  b=launch_browser(pw)
  for w,h,touch,label in [(390,844,True,'mobile-ammunition'),(844,390,True,'landscape-ammunition'),(1440,900,False,'desktop-ammunition')]:
   c,p,e=build(b,w,h,touch);prepare(p);p.locator('#ammunitionTab').focus();p.locator('#dockPanel').evaluate('(e)=>e.closest("#modalBody").scrollTop=0')
   p.screenshot(path=str(out/(label+'.png')))
   assert not e,e
   if w==390:
    p.locator('#upgradesTab').click();p.locator('[data-system="hull"]').click();p.screenshot(path=str(out/'hull-mk3-price.png'));p.locator('#upgradeDetailClose').click()
    p.locator('#expeditionsTab').click();p.screenshot(path=str(out/'resource-stocks.png'))
   c.close()
  b.close()
 for src,dst in [('mobile-ammunition.png','v0.17.0-ammunition-shop.png'),('desktop-ammunition.png','v0.17.0-desktop-ammunition.png'),('hull-mk3-price.png','v0.17.0-upgrade-prices.png'),('resource-stocks.png','v0.17.0-salvage-stocks.png')]:shutil.copy2(out/src,ROOT.parent/dst)
 print('Production previews captured. Synthetic funds and purchased gear; no real user save accessed.')
if __name__=='__main__':run()
