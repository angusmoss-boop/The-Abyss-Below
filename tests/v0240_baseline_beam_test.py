"""Compare unchanged Mk I world-only pixels outside the deliberately redesigned vessel against actual v0.19 production."""
from v0240_harness import *
from v0240_frontiers_migration_test import old_build
from playwright.sync_api import sync_playwright
import hashlib,base64,math

def image(p,angle):
 p.evaluate('AbyssDiagnostics.fixtureLevel(3)')
 fix(p,depth=1100,facing=angle,upgrades={'hull':7,'flashlight':1},lights=True)
 p.evaluate('a=>AbyssDiagnostics.lightingFixture({depth:1100,facing:a,lights:true,quietScene:true,hud:false})',angle)
 return p.evaluate('''()=>{const src=document.getElementById('gameCanvas'),c=document.createElement('canvas');c.width=src.width;c.height=src.height;const g=c.getContext('2d');g.drawImage(src,0,0);const d=AbyssDiagnostics.debug(),scale=d.viewport.zoom*d.viewport.dpr;g.fillStyle='#000';g.beginPath();g.arc((d.player.x-d.camera.x)*scale,(d.player.y-d.camera.y)*scale,100*scale,0,Math.PI*2);g.fill();return c.toDataURL();}''')
def run():
 with sync_playwright() as pw:
  b=launch_browser(pw);c,p,errors=old_build(b);c2,q,e=build(b,390,844,True);errors+=e
  for angle in [0,-math.pi/2,.78,math.pi]:
   before=image(p,angle);after=image(q,angle);assert before==after,angle
  assert not errors,errors;c.close();c2.close();b.close()
 print('PASS Mk I actual world-rendered pixels outside the 100-unit vessel region exactly match v0.19.0 at four orientations, including complete darkness')
if __name__=='__main__':run()
