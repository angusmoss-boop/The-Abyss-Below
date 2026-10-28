"""Actual multi-finger CDP events through the production combat buttons."""
from v0200_harness import *
from v0200_touch_test import send,point
from playwright.sync_api import sync_playwright

def run():
 with sync_playwright() as pw:
  b=launch_browser(pw)
  for w,h in [(390,844),(568,320),(844,390)]:
   c,p,e=build(b,w,h,True);cdp=c.new_cdp_session(p)
   fix(p,depth=80,upgrades={'hull':7,'engine':4,'railgun':4,'torpedo':4,'minePower':2,'mineCapacity':4},mineAmmo=8)
   p.evaluate('AbyssDiagnostics.weaponStock({railgun:32,torpedo:8});AbyssDiagnostics.unfreeze()')
   helm=point(1,w*.78,h*.6);send(cdp,'touchStart',helm);helm=point(1,w*.78+35,h*.6);send(cdp,'touchMove',helm)
   rail=point(2,*centre(p,'mobileRail'));send(cdp,'touchStart',helm,rail);step(p,.5,freeze=False)
   assert state(p)['weaponAmmo']['railgun']==30 and state(p)['joystickX']>0
   torp=point(3,*centre(p,'mobileTorpedo'));send(cdp,'touchStart',helm,rail,torp);assert state(p)['weaponAmmo']['torpedo']==7
   step(p,1.5,freeze=False);assert state(p)['weaponAmmo']['torpedo']==7
   mine=point(4,*centre(p,'mobileMine'));send(cdp,'touchStart',helm,rail,torp,mine);assert state(p)['mineAmmo']==7
   send(cdp,'touchEnd',rail,torp,mine);remaining=state(p)['weaponAmmo']['railgun'];step(p,.6,freeze=False)
   assert state(p)['weaponAmmo']['railgun']==remaining and state(p)['joystickVisible']
   send(cdp,'touchEnd');assert not state(p)['joystickVisible']
   assert not e,e;c.close()
  b.close();print('PASS actual simultaneous floating steering + held rail + single-shot torpedo + mine at three phone sizes; no double click, no hold-repeat torpedo, no stuck fire on release')
if __name__=='__main__':run()
