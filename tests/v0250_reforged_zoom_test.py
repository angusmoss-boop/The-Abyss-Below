"""Real CDP pinch gestures through the production canvas and action buttons."""
from v0250_harness import *
from v0250_touch_test import send,point
from playwright.sync_api import sync_playwright
import math

def run():
 with sync_playwright() as pw:
  b=launch_browser(pw)
  for w,h in [(390,844),(320,568),(844,390)]:
   c,p,e=build(b,w,h,True);cdp=c.new_cdp_session(p)
   fix(p,depth=45,upgrades={'hull':7,'engine':4,'railgun':4});p.evaluate('AbyssDiagnostics.weaponStock({railgun:20,torpedo:0});AbyssDiagnostics.unfreeze()')
   base=debug(p);assert p.locator('.action-circle').count()==7;sizes=p.locator('.action-circle').evaluate_all('es=>es.map(e=>[e.getBoundingClientRect().width,e.getBoundingClientRect().height])')
   x=w*.65;y=h*.46
   a=point(1,x,y);send(cdp,'touchStart',a);a=point(1,x+12,y);send(cdp,'touchMove',a)
   assert state(p)['joystickVisible']
   z=point(2,x,y+65);send(cdp,'touchStart',a,z)
   assert state(p)['pinching'] and not state(p)['joystickVisible'] and state(p)['joystickX']==0
   a=point(1,x+12,y-35);z=point(2,x,y+105);send(cdp,'touchMove',a,z)
   s=state(p);assert s['viewZoom']>1.8 and s['zoom']<=1.4+1e-9,(w,h,s)
   assert s['weaponAmmo']['railgun']==20 and s['x']==base['player']['x'] and s['y']==base['player']['y']
   assert p.locator('.action-circle').evaluate_all('es=>es.map(e=>[e.getBoundingClientRect().width,e.getBoundingClientRect().height])')==sizes
   # Leaving one finger down cannot become a new helm input.
   send(cdp,'touchEnd',z);send(cdp,'touchMove',point(2,x+25,y+105));assert state(p)['joystickX']==0 and not state(p)['joystickVisible']
   send(cdp,'touchEnd');assert not state(p)['pinchLocked']
   # New single touch can steer again, and action touch is not part of a pinch.
   p.evaluate('AbyssDiagnostics.unfreeze()');a=point(3,x,y);send(cdp,'touchStart',a);a=point(3,x+30,y);send(cdp,'touchMove',a)
   rail=point(4,*centre(p,'mobileRail'));send(cdp,'touchStart',a,rail)
   assert not state(p)['pinching'] and state(p)['joystickX']>0 and state(p)['weaponAmmo']['railgun']==19
   send(cdp,'touchEnd');assert state(p)['joystickX']==0
   # Lower clamp via a real inward pinch.
   p.evaluate('AbyssDiagnostics.unfreeze()');a=point(5,x-35,y);z=point(6,x+35,y);send(cdp,'touchStart',a);send(cdp,'touchStart',a,z)
   send(cdp,'touchMove',point(5,x-5,y),point(6,x+5,y));assert abs(state(p)['viewZoom']-.65)<1e-9
   send(cdp,'touchEnd');assert not state(p)['pinchLocked']
   # Camera scale survives reopening without altering the active dive.
   p.evaluate('AbyssDiagnostics.save()');ss=store(p);c.close();c,p,e2=build(b,w,h,True,store=ss);e+=e2
   assert state(p)['viewZoom']==.65 and abs(state(p)['zoom']-.455)<1e-9
   p.locator('#resumeBtn').click();p.locator('#telemetryBtn').click();p.locator('#viewZoomReset').click();assert state(p)['viewZoom']==1
   assert p.locator('#viewZoomValue').inner_text()=='100%';p.locator('#telemetryClose').click()
   assert not e,e;c.close()
  print('PASS real pinch at three phone sizes, both clamps, fixed-size controls, no unintended steering/fire, action touch isolation, all-fingers-up guard, persisted zoom and reset',flush=True)
  c,p,e=build(b,1440,900);fix(p,depth=80,upgrades={'hull':7});p.evaluate('AbyssDiagnostics.unfreeze()')
  before=debug(p);r=p.locator('#gameCanvas').bounding_box();p.mouse.move(r['x']+r['width']*.55,r['y']+r['height']*.5);p.mouse.wheel(0,-180);p.wait_for_timeout(200)
  assert state(p)['viewZoom']>1 and state(p)['x']==before['player']['x']
  # Chart pinch/zoom remains independent from live world zoom.
  scale=state(p)['zoom'];p.keyboard.press('m');p.locator('#mapZoomIn').click();assert state(p)['zoom']==scale
  p.locator('#surveyClose').click()
  # Existing depth mask remains exact at both camera bounds and all lamp states.
  p.evaluate('AbyssDiagnostics.fixtureLevel(4)')
  for v in [.65,1,2]:
   p.evaluate('v=>AbyssDiagnostics.viewZoom(v)',v)
   p.evaluate('AbyssDiagnostics.lightingFixture({depth:1100,lights:false,quietScene:true,hud:false})')
   maximum=p.evaluate('''()=>{AbyssDiagnostics.renderWorld();const c=document.getElementById('gameCanvas'),a=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let m=0;for(let i=0;i<a.length;i+=4)m=Math.max(m,a[i],a[i+1],a[i+2]);return m;}''')
   assert maximum==0,(v,maximum)
  assert not e,e;c.close();b.close()
  print('PASS desktop wheel zoom, map/view separation, no physics teleport and total darkness at all zoom bounds')
if __name__=='__main__':run()
