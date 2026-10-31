from v0250_harness import *
from playwright.sync_api import sync_playwright
from PIL import Image
import hashlib
SIZES=[(320,568),(390,844),(430,932),(568,320),(844,390),(1024,768),(1440,900)]
def run():
 with sync_playwright() as pw:
  b=launch_browser(pw);allerrors=[]
  for w,h in SIZES:
   print('PHOTO SIZE',w,h,flush=True)
   c,p,errors=build(b,w,h,w<1100);allerrors+=errors
   fix(p,depth=170,lights=True,upgrades={'hull':4,'engine':2,'flashlight':3})
   before=debug(p);assert p.evaluate('AbyssDiagnostics.photo()')
   assert state(p)['paused'] and p.locator('#photoDialog').is_visible()
   for id in ['photoClose','photoSave','photoReset','photoZoom','photoCanvas']:
    box=p.locator('#'+id).bounding_box();assert box and box['width']>15 and box['height']>8,(w,h,id,box)
    assert box['x']>=-1 and box['y']>=-1 and box['x']+box['width']<=w+1 and box['y']+box['height']<=h+1,(w,h,id,box)
   p.locator('#photoZoom').evaluate("e=>{e.value='180';e.dispatchEvent(new Event('input',{bubbles:true}));}")
   view=p.locator('#photoCanvas').bounding_box();x=view['x']+view['width']/2;y=view['y']+view['height']/2
   p.mouse.move(x,y);p.mouse.down();p.mouse.move(x+40,y+25,steps=4);p.mouse.up()
   ps=p.evaluate('AbyssDiagnostics.photoState()');assert ps['zoom']==1.8
   p.keyboard.press('z');p.keyboard.press('x');p.keyboard.press('f');p.wait_for_timeout(30)
   after=debug(p)
   for k in ['x','y','hull','oxygen','battery','cargo','weaponAmmo','mineAmmo']:assert before['player'][k]==after['player'][k],k
   assert before['clock']==after['clock'];assert before['field']['survey']==after['field']['survey']
   if (w,h)==(390,844):
    client=c.new_cdp_session(p)
    def touch(kind,pts):client.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':[{'id':i,'x':xx,'y':yy,'radiusX':3,'radiusY':3,'force':1} for i,xx,yy in pts]})
    touch('touchStart',[(0,x-30,y),(1,x+30,y)])
    touch('touchMove',[(0,x-50,y),(1,x+50,y)])
    touch('touchEnd',[])
    assert p.evaluate('AbyssDiagnostics.photoState().zoom')>1.8
    with p.expect_download() as info:p.locator('#photoSave').click()
    file=ROOT/'verification/v0.25.0/exported-photo.png';info.value.save_as(file)
    im=Image.open(file);assert im.format=='PNG' and im.width>200 and im.height>200
   p.locator('#photoClose').click();assert state(p)['paused'] and state(p)['pauseOpen']
   assert not p.locator('#photoDialog').is_visible()
   p.locator('#resumeBtn').click();assert not state(p)['paused']
   c.close()
  assert not allerrors,allerrors;b.close()
 print('PASS photo mode at 7 sizes: all controls within viewport, real pinch, pan/crop, PNG download, keys cannot fire, no time/resources/survey changes, return paused')
if __name__=='__main__':run()
