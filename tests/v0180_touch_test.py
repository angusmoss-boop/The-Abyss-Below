"""Chromium hit-testing and real CDP touch events, not calls to input handlers."""
from v0180_harness import *
from itertools import combinations
import math
from playwright.sync_api import sync_playwright
ACTIONS=['mobileInteract','mobileBoost','mobileSonar','mobileMine','mobileRepair','mobileRail','mobileTorpedo']
def point(id,x,y):return {'id':id,'x':x,'y':y,'radiusX':4,'radiusY':4,'force':1}
def send(cdp,kind,*points):cdp.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':list(points)})
def layout(p,w,h,touch):
 assert p.evaluate('document.documentElement.scrollWidth<=innerWidth'),(w,h,'overflow')
 hud=p.locator('.cockpit-hud').bounding_box();view=p.locator('.viewport').bounding_box()
 assert hud['x']>=view['x'] and hud['x']+hud['width']<=view['x']+view['width']+.5
 clipped=p.locator('.reference-tab,.instrument-tab,.cockpit-context').evaluate_all('''els=>els.flatMap(e=>[...e.querySelectorAll('span,strong,small')].filter(n=>getComputedStyle(n).display!=='none'&&n.getBoundingClientRect().width>0).filter(n=>{const a=n.getBoundingClientRect(),b=e.getBoundingClientRect();return a.left<b.left-1||a.right>b.right+1;}).map(n=>({text:n.textContent,card:e.id||e.className})))''')
 assert not clipped,(w,h,clipped)
 assert p.locator('#mobileJoystick').is_hidden()
 assert p.locator('.joystick-stack,.joystick-guides,.joystick-caption,.mobile-joystick').count()==0
 if touch:
  assert p.locator('.desktop-keybinds').is_hidden()
  rects={id:p.locator('#'+id).bounding_box() for id in ACTIONS}
  for id,r in rects.items():
   assert r and abs(r['width']-r['height'])<.5 and r['width']>=44,(id,r)
   assert r['x']>=0 and r['y']>=hud['y']+hud['height'] and r['y']+r['height']<=h+1,(w,h,id,r)
   assert r['x']+r['width']<=min(250,w-75),(w,h,id,r) # Compact bottom-left island; right side remains free.
   assert p.evaluate('([id,x,y])=>document.elementFromPoint(x,y)?.closest("button")?.id===id',[id,*centre(p,id)]),(id,'bad target')
  for a,b in combinations(rects,2):
   x,y=rects[a],rects[b]
   assert math.hypot(x['x']+x['width']/2-y['x']-y['width']/2,x['y']+x['height']/2-y['y']-y['height']/2)>=(x['width']+y['width'])/2+2,(a,b)
  assert rects['mobileBoost']['width']>rects['mobileInteract']['width']>rects['mobileSonar']['width']>rects['mobileRepair']['width']
 else:
  assert p.locator('.mobile-controls').is_hidden() and p.locator('.desktop-keybinds').is_visible()
  assert state(p)['zoom']==1

def run():
 with sync_playwright() as pw:
  b=launch_browser(pw)
  sizes=[(320,568),(320,740),(360,780),(390,844),(430,932),(568,320),(640,360),(844,390),(915,412),(768,1024),(1024,768)]
  for w,h in sizes:
   c,p,errors=build(b,w,h,True);fix(p,depth=40,upgrades={'hull':4});layout(p,w,h,True)
   assert state(p)['zoom']==.7
   fix(p,depth=1600,upgrades={'hull':7,'engine':4,'minePower':4,'mineCapacity':4,'shield':4,'magnet':4,'disruptor':4},battery=0);layout(p,w,h,True)
   assert not errors,errors;c.close()
  print('PASS 11 touch viewports: no idle/fixed joystick, full-size circular left actions, unclipped HUD, unchanged .70 world zoom')
  for w,h in [(390,844),(800,700),(1024,768),(1440,900),(1920,1080)]:
   c,p,errors=build(b,w,h);layout(p,w,h,False)
   p.locator('#telemetryBtn').click();p.locator('#focusToggleBtn').click();p.wait_for_timeout(30);layout(p,w,h,False)
   assert not errors,errors;c.close()
  print('PASS 5 desktop sizes: keyboard reference only, no touch controls, 1.00 zoom in console/expanded view')
  c,p,errors=build(b,390,844,True);cdp=c.new_cdp_session(p)
  for x,y in [(300,360),(35,340),(190,230)]:
   fix(p,depth=45,upgrades={'hull':4,'engine':2});p.evaluate('AbyssDiagnostics.unfreeze()')
   send(cdp,'touchStart',point(1,x,y));assert not state(p)['joystickVisible']
   send(cdp,'touchMove',point(1,x+35,y+8));s=state(p)
   assert s['joystickVisible'] and s['joystickX']>.5 and s['joystickY']>0
   r=p.locator('#mobileJoystick').bounding_box();assert abs(r['x']+r['width']/2-x)<1 and abs(r['y']+r['height']/2-y)<1
   s=step(p,.2,freeze=False);assert s['vx']>0
   send(cdp,'touchEnd');assert not state(p)['joystickVisible'] and state(p)['joystickX']==0
  print('PASS floating helm anchors on right/left/upper water; tap alone hidden; drag moves; release hides and clears')
  # Simultaneous steering, boost, mine and salvage, with one owner per pointer.
  fix(p,depth=45,upgrades={'hull':4,'engine':2,'minePower':2,'mineCapacity':2},mineAmmo=4,items=[{'dx':35,'dy':0,'type':'scrap'}]);p.evaluate('AbyssDiagnostics.unfreeze()')
  a=point(1,300,420);send(cdp,'touchStart',a);a=point(1,345,420);send(cdp,'touchMove',a)
  boost=point(2,*centre(p,'mobileBoost'));send(cdp,'touchStart',a,boost);step(p,.15,freeze=False)
  assert state(p)['boostHeld'] and state(p)['boosting'] and state(p)['joystickX']>.9
  mine=point(3,*centre(p,'mobileMine'));send(cdp,'touchStart',a,boost,mine)
  assert state(p)['mineAmmo']==3
  send(cdp,'touchEnd',mine)
  usep=point(4,*centre(p,'mobileInteract'));send(cdp,'touchStart',a,boost,usep);step(p,.1,freeze=False)
  assert state(p)['useHeld'] and state(p)['boostHeld'] and debug(p)['player']['cargo']['scrap']==1
  send(cdp,'touchEnd',usep);assert not state(p)['useHeld']
  send(cdp,'touchEnd',boost);assert not state(p)['boostHeld'] and state(p)['joystickVisible']
  # A second water finger must not steal/re-anchor an already active helm.
  q=point(5,210,290);send(cdp,'touchStart',a,q);send(cdp,'touchMove',a,point(5,160,290));assert state(p)['joystickX']>.9
  send(cdp,'touchEnd',point(5,160,290));send(cdp,'touchCancel');assert not state(p)['joystickVisible'] and state(p)['joystickX']==0
  print('PASS multi-touch steering + boost + mine + salvage; action taps never own helm; extra water touch cannot steal; cancellation resets')
  fix(p,depth=45,upgrades={'hull':4,'engine':0});p.evaluate('AbyssDiagnostics.unfreeze()');send(cdp,'touchStart',point(8,*centre(p,'mobileBoost')));send(cdp,'touchEnd')
  assert not state(p)['joystickVisible'] and not state(p)['boostHeld'] and not state(p)['boostUnlocked']
  assert 'MK I' in p.locator('#notification').inner_text()
  # Touch held while pausing, changing orientation, losing focus and pointer mode.
  fix(p,depth=45,upgrades={'hull':4,'engine':2});p.evaluate('AbyssDiagnostics.unfreeze()')
  send(cdp,'touchStart',point(1,300,360));send(cdp,'touchMove',point(1,340,360))
  p.locator('#focusPauseBtn').click();assert not state(p)['joystickVisible'] and state(p)['paused'];send(cdp,'touchEnd')
  p.locator('#resumeBtn').click();send(cdp,'touchStart',point(1,300,360));send(cdp,'touchMove',point(1,340,360))
  p.set_viewport_size({'width':844,'height':390});p.wait_for_timeout(50);assert not state(p)['joystickVisible'] and state(p)['joystickX']==0;send(cdp,'touchEnd')
  send(cdp,'touchStart',point(1,600,190));send(cdp,'touchMove',point(1,650,190));assert state(p)['joystickVisible']
  p.evaluate('dispatchEvent(new Event("blur"))');assert not state(p)['joystickVisible'];send(cdp,'touchEnd')
  cdp.send('Emulation.setTouchEmulationEnabled',{'enabled':False});p.wait_for_function("AbyssDiagnostics.state().inputMode==='desktop'",polling=30)
  cdp.send('Emulation.setTouchEmulationEnabled',{'enabled':True,'maxTouchPoints':5});p.wait_for_function("AbyssDiagnostics.state().inputMode==='touch'",polling=30);assert p.locator('#mobileJoystick').is_hidden()
  assert not errors,errors;c.close();print('PASS locked boost feedback; pause, orientation, blur and pointer-mode cleanup')
  # Desktop mouse helm remains unchanged.
  c,p,errors=build(b);fix(p,depth=45,upgrades={'hull':4,'engine':2});p.evaluate('AbyssDiagnostics.unfreeze()')
  r=p.locator('#gameCanvas').bounding_box();x,y=r['x']+r['width']*.75,r['y']+r['height']*.5
  p.mouse.move(x,y);p.mouse.down();assert state(p)['mouseHeld']
  s=step(p,.4,keys=[' '],freeze=False);assert s['vx']>0 and s['boosting'] and not s['joystickVisible']
  p.mouse.up();assert not state(p)['mouseHeld'];assert not errors,errors;c.close()
  print('PASS unchanged click-held desktop steering and Space boost')
  b.close()
if __name__=='__main__':run()
