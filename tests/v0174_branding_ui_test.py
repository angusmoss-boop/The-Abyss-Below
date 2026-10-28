"""Production UI and real approved images in isolated Chromium; not a live install."""
from v0174_harness import *
from playwright.sync_api import sync_playwright
import base64
SIZES=[(320,568),(360,640),(390,844),(430,932),(568,320),(640,360),(844,390),(915,412),(768,1024),(1024,768),(1440,900)]
BUTTONS=['startBtn','menuHubBtn','menuSlotsBtn','menuAchievementsBtn','newGameBtn','menuAudioBtn','instructionsBtn','checkVersionBtn']
def images(p):
 for name,sel in [('launch-art.webp','img.menu-launch-art,img.launch-art'),('icon-192.png','img.brand-app-icon')]:
  mime='image/webp' if name.endswith('.webp') else 'image/png'
  uri='data:'+mime+';base64,'+base64.b64encode((ROOT/name).read_bytes()).decode()
  p.eval_on_selector_all(sel,'(xs,src)=>xs.forEach(x=>x.src=src)',uri)
 p.wait_for_function('[...document.querySelectorAll("img.menu-launch-art")].every(x=>x.complete&&x.naturalWidth>0)')
def run():
 with sync_playwright() as pw:
  b=launch_browser(pw);results=[]
  for w,h in SIZES:
   touch=w<1100;c,p,errors=build(b,w,h,touch,launch=False);images(p)
   p.wait_for_function('!document.documentElement.classList.contains("abyss-launching")')
   assert p.evaluate('AbyssLaunch.status().ready')
   assert p.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
   box=p.locator('.crystal-menu').bounding_box()
   assert box['x']>=0 and box['y']>=0 and box['x']+box['width']<=w+1 and box['y']+box['height']<=h+1,(w,h,box)
   assert not p.eval_on_selector('.crystal-menu','e=>e.scrollWidth>e.clientWidth+1'),(w,h,'horizontal menu overflow')
   for id in BUTTONS:
    el=p.locator('#'+id);el.scroll_into_view_if_needed();r=el.bounding_box()
    assert r and r['width']>=40 and r['height']>=32,(w,h,id,r)
    assert r['x']>=0 and r['x']+r['width']<=w+1 and r['y']>=0 and r['y']+r['height']<=h+1,(w,h,id,r)
   p.eval_on_selector('.crystal-menu','e=>e.scrollTop=0');p.wait_for_timeout(50)
   if (w,h) in [(390,844),(844,390),(1440,900)]:p.screenshot(path=str(OUT/f'menu-{w}x{h}.png'))
   p.locator('#menuSlotsBtn').click();assert p.locator('.campaign-slot').count()==3;p.locator('#slotsClose').click()
   p.locator('#menuAchievementsBtn').click();assert p.locator('#achievementsDialog').evaluate('e=>e.open');p.locator('#achievementClose').click()
   if (w,h)==(390,844):
    p.locator('#menuHubBtn').click();assert p.locator('#modalOverlay').is_visible();p.locator('#modalClose').click()
   else:p.locator('#startBtn').click()
   assert state(p)['running'] and not state(p)['menuOpen']
   assert not p.locator('#launchScreen').is_visible()
   p.locator('#focusPauseBtn').click();assert state(p)['paused']
   assert not errors,(w,h,errors)
   results.append({'width':w,'height':h,'menu_bounds':box,'horizontal_overflow':False,'all_menu_controls_reachable':True})
   c.close()
  b.close()
 (ROOT/'verification/v0.17.4/layouts.json').write_text(json.dumps(results,indent=2)+'\n')
 print('PASS 11 responsive menu sizes; loaded artwork; no horizontal overflow; reachable controls; slots, achievements, hub, start and pause; no launch overlay in gameplay; no JS errors')
if __name__=='__main__':run()
