"""Real production-renderer previews with synthetic campaign progression."""
from v0160_harness import *
from v0160_slots_test import archive,rebuild
from playwright.sync_api import sync_playwright
import shutil

def snap(p,name):
 p.screenshot(path=str(OUT/name));shutil.copyfile(OUT/name,Path('/mnt/data')/('v0.16.0-'+name))
def run():
 with sync_playwright() as pw:
  b=launch_browser(pw);c,p,e=build(b,390,844,True)
  fix(p,depth=145,facing=-1.0,lights=True,upgrades={'hull':3,'engine':2,'battery':2,'shield':2,'railgun':2,'torpedo':2,'minePower':3,'mineCapacity':3,'flashlight':3},mineAmmo=6,
    rocks=[{'dx':-220,'dy':-100,'radius':80},{'dx':210,'dy':-210,'radius':55},{'dx':180,'dy':160,'radius':70},{'dx':-200,'dy':240,'radius':60}],
    predators=[{'dx':90,'dy':-125,'tier':'common','stunnedUntil':100}],items=[{'dx':140,'dy':80,'type':'crystal'},{'dx':-120,'dy':-160,'type':'scrap'}])
  p.evaluate('AbyssDiagnostics.weaponStock({railgun:15,torpedo:3});AbyssDiagnostics.grantCredits(1250);AbyssDiagnostics.grantCrystals(34);AbyssDiagnostics.enableWild();AbyssDiagnostics.setSystems({shield:28});AbyssDiagnostics.step(0.05)')
  snap(p,'combat-controls.png')
  p.evaluate('AbyssDiagnostics.damage(28);AbyssDiagnostics.step(0.12)');snap(p,'damage-flash.png')
  p.set_viewport_size({'width':844,'height':390});p.wait_for_timeout(80);p.evaluate('AbyssDiagnostics.step(0.65)');snap(p,'landscape-combat.png')
  p.set_viewport_size({'width':390,'height':844});p.wait_for_timeout(60);dock(p)
  p.locator('[data-system="torpedo"]').click();snap(p,'torpedo-upgrade.png');p.locator('#upgradeDetailClose').click()
  p.locator('#ammunitionTab').click();snap(p,'dock-ammunition.png');depart(p)
  # Use a real generated world for saved expedition previews.
  p.evaluate('AbyssDiagnostics.relaunch();AbyssDiagnostics.moveTo(600,1600);AbyssDiagnostics.save();AbyssDiagnostics.unfreeze()');archive(p)
  p.locator('#slotName2').fill('Fresh Start');p.locator('[data-new-slot="2"]').click();c,p,e=rebuild(b,c,p)
  archive(p);p.locator('#slotName3').fill('Iron Current');p.locator('[data-new-slot="3"]').click();c,p,e=rebuild(b,c,p)
  p.locator('#startBtn').click();p.evaluate('AbyssDiagnostics.grantCredits(248);AbyssDiagnostics.grantCrystals(16)');archive(p)
  snapshot=store(p);snap(p,'campaign-slots-mobile.png');p.locator('#slotsClose').click()
  p.locator('#pauseAudioBtn').click();snap(p,'music-settings.png');c.close()
  c,p,e=build(b,1440,900,False,store=snapshot,launch=False);archive(p);snap(p,'campaign-slots.png')
  assert not e,e;c.close();b.close()
  print('Previews captured from actual production UI and rendering; progression is synthetic test data, not user saves.')
if __name__=='__main__':run()
