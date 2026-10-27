"""v0.2.2 mobile two-finger salvage, predator leash, polygon sliding and layout checks."""
from pathlib import Path
import functools, http.server, socketserver, threading, shutil
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
class Server(socketserver.TCPServer):allow_reuse_address=True
server=Server(('127.0.0.1',0),functools.partial(Quiet,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
url=f'http://127.0.0.1:{server.server_address[1]}/?testmode=1'
try:
  with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path=shutil.which('chromium'),args=['--no-proxy-server','--proxy-bypass-list=<-loopback>'])
    for width,height in [(360,780),(390,844),(844,390)]:
      ctx=browser.new_context(viewport={'width':width,'height':height},device_scale_factor=2,is_mobile=True,has_touch=True,service_workers='block')
      page=ctx.new_page(); errors=[]
      page.on('pageerror',lambda e:errors.append(str(e)))
      page.set_content((ROOT/'index.html').read_text());page.add_style_tag(content=(ROOT/'styles.css').read_text());page.evaluate('window.ABYSS_TEST_MODE=true');page.add_script_tag(content=(ROOT/'game.js').read_text());page.locator('#startBtn').click();page.wait_for_timeout(250)
      state=page.evaluate('AbyssDiagnostics.state()')
      assert state['running'] and state['focusMode'],(width,height,state)
      joy=page.locator('#mobileJoystick').bounding_box();use=page.locator('#mobileInteract').bounding_box();actions=page.locator('#mobileSonar').bounding_box();
      assert use['x']+use['width']+8 < joy['x'],(width,height,use,joy)
      # v0.7: wide USE in both orientations makes room for the independent mine button.
      assert use['width']>=actions['width']*1.9 and use['height']>actions['height'],(width,height,use,actions)
      assert page.locator('#mobileJoystick').is_visible()
      page.screenshot(path=str(ROOT/f'v0.2.2-{width}x{height}-fullscreen.png'))
      if width==390:
        page.evaluate("AbyssDiagnostics.fixture({x:600,y:700,items:[{x:600,y:800,type:'scrap'}]})")
        assert page.evaluate('AbyssDiagnostics.debug().items[0].collected')==False
        cdp=ctx.new_cdp_session(page)
        cx=round(joy['x']+joy['width']/2);cy=round(joy['y']+joy['height']/2)
        ux=round(use['x']+use['width']/2);uy=round(use['y']+use['height']/2)
        def touch(typ,pts):cdp.send('Input.dispatchTouchEvent',{'type':typ,'touchPoints':[{'x':x,'y':y,'id':i} for i,x,y in pts]})
        page.evaluate("window.pte=[];['pointerdown','pointerup','pointercancel','lostpointercapture'].forEach(t=>document.addEventListener(t,e=>window.pte.push([t,e.pointerId,e.target.id]),true))")
        touch('touchStart',[(1,cx,cy)])
        touch('touchMove',[(1,cx,cy+50)])
        touch('touchStart',[(1,cx,cy+50),(2,ux,uy)])
        page.wait_for_timeout(1000)
        during=page.evaluate('AbyssDiagnostics.state()'); detail=page.evaluate('AbyssDiagnostics.debug()')
        assert during['useHeld'] and during['joystickY']>.7,(during,detail)
        assert detail['player']['cargo']['scrap']==1,(during,detail)
        touch('touchEnd',[(2,ux,uy)]) # release USE; joystick remains held
        page.wait_for_timeout(100)
        assert not page.evaluate('AbyssDiagnostics.state().useHeld')
        touch('touchEnd',[(1,cx,cy+50)])
        # A distant alerted predator must disengage, rather than following forever.
        page.evaluate("AbyssDiagnostics.fixture({x:950,y:700,predators:[{x:500,y:700,aggression:1,alertUntil:999}]})")
        page.wait_for_timeout(250)
        pred=page.evaluate('AbyssDiagnostics.debug().predators[0]')
        assert pred['aggression']==0 and pred['alertUntil']==0,pred
        # Still hunts if the sub is genuinely close, so disengagement isn't a global nerf.
        page.evaluate("AbyssDiagnostics.fixture({x:680,y:700,predators:[{x:620,y:700}]})")
        page.wait_for_timeout(350)
        assert page.evaluate('AbyssDiagnostics.debug().predators[0].aggression')>.13
        # Geometry: pass the visual gap between adjacent rock polygons.
        rocks=[{'x':530,'y':840,'radius':65,'rot':0,'seed':.4,'spikes':8},{'x':675,'y':840,'radius':65,'rot':0,'seed':.3,'spikes':8}]
        page.evaluate('(rocks)=>AbyssDiagnostics.fixture({x:602,y:700,rocks})',rocks)
        page.keyboard.down('s');page.wait_for_timeout(1800);page.keyboard.up('s')
        through=page.evaluate('AbyssDiagnostics.state()')
        assert through['y']>860,through
        # Ship should not tunnel through a boulder at full speed.
        page.evaluate("AbyssDiagnostics.fixture({x:500,y:700,rocks:[{x:650,y:700,radius:85,rot:0,seed:.2,spikes:8}]})")
        page.keyboard.down('d');page.wait_for_timeout(1800);page.keyboard.up('d')
        against=page.evaluate('AbyssDiagnostics.state()')
        assert against['x']<590,against
        print('PASS: simultaneous 2-finger steering and salvage, predator leash, narrow gap, solid rock')
      assert not errors,(width,height,errors)
      print('PASS mobile layout',width,height,'USE',round(use['width']),round(use['height']),'JOYSTICK',round(joy['width']))
      ctx.close()
    browser.close()
finally:
  server.shutdown()
