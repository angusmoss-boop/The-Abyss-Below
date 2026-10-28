"""Compare unchanged Mk I world-only pixels against actual v0.19 production."""
from v0200_harness import *
from v0200_frontiers_migration_test import old_build
from playwright.sync_api import sync_playwright
import hashlib,base64,math

def image(p,angle):
 p.evaluate('AbyssDiagnostics.fixtureLevel(3)')
 fix(p,depth=1100,facing=angle,upgrades={'hull':7,'flashlight':1},lights=True)
 p.evaluate('a=>AbyssDiagnostics.lightingFixture({depth:1100,facing:a,lights:true,quietScene:true,hud:false})',angle)
 return p.evaluate("document.getElementById('gameCanvas').toDataURL()")
def run():
 with sync_playwright() as pw:
  b=launch_browser(pw);c,p,errors=old_build(b);c2,q,e=build(b,390,844,True);errors+=e
  for angle in [0,-math.pi/2,.78,math.pi]:
   before=image(p,angle);after=image(q,angle);assert before==after,angle
  assert not errors,errors;c.close();c2.close();b.close()
 print('PASS Mk I actual world-rendered canvas pixels exactly match v0.19.0 at four orientations, including complete darkness')
if __name__=='__main__':run()
