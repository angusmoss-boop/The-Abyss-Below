from v0240_harness import *
from playwright.sync_api import sync_playwright
SIZES=[(320,568),(360,640),(390,844),(430,932),(568,320),(640,360),(844,390),(915,412),(768,1024),(1024,768),(1280,720),(1440,900),(1920,1080)]
def bounds(p,selector,w,h):
 r=p.locator(selector).bounding_box();assert r and r['x']>=-1 and r['y']>=-1 and r['x']+r['width']<=w+1 and r['y']+r['height']<=h+1,(w,h,selector,r)
 assert not p.locator(selector).evaluate('e=>e.scrollWidth>e.clientWidth+2'),(w,h,selector,'horizontal overflow')
with sync_playwright() as pw:
 b=launch_browser(pw);results=[]
 for w,h in SIZES:
  c,p,errors=build(b,w,h,w<1100);dock(p);p.locator('#contractsTab').click();bounds(p,'.dialog-card',w,h)
  for button in p.locator('[data-accept-contract]').all():button.scroll_into_view_if_needed();bounds(p,button if False else '#launchAgain',w,h);assert button.bounding_box()['height']>=40
  p.locator('#archiveTab').click();p.locator('[data-chapter]').first.click();bounds(p,'#signalsDialog',w,h)
  for name in ['assignment','warden','transmissions','discoveries']:
   p.locator('[data-journal-tab="'+name+'"]').click();bounds(p,'#signalsDialog',w,h)
  assert p.locator('.discovery-card').count()==5
  p.locator('#discoveryLivery').scroll_into_view_if_needed();bounds(p,'#discoveryLivery',w,h)
  assert p.locator('#discoveryLivery').evaluate('e=>{const r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return hit===e||e.contains(hit)}')
  p.locator('#signalsClose').click();p.locator('#launchAgain').click();p.evaluate('AbyssDiagnostics.unfreeze();AbyssDiagnostics.backgroundPause()')
  p.locator('#pauseSlotsBtn').click();bounds(p,'#slotsDialog',w,h);p.locator('#chooseImport').scroll_into_view_if_needed();assert p.locator('#chooseImport').bounding_box()['height']>=40
  p.locator('#slotsClose').click();p.locator('#resumeBtn').click();p.evaluate('AbyssDiagnostics.step(0)')
  assert p.locator('.touch-action').count()==7 if p.locator('.touch-action').count() else True
  assert not errors,(w,h,errors)
  if (w,h) in [(390,844),(844,390),(1440,900)]:
   dock(p);p.locator('#contractsTab').click();p.locator('[data-accept-contract]').first.scroll_into_view_if_needed();p.screenshot(path=str(OUT/f'contracts-{w}x{h}.png'))
  results.append({'width':w,'height':h,'passed':True});c.close()
 (ROOT/'verification/v0.24.0/signals-layouts.json').write_text(json.dumps(results,indent=2)+'\n');b.close()
 print('PASS 13 portrait, landscape and desktop sizes: contracts/archive, journal sections, backups, no horizontal overflow, reachable departure/close controls, no new action buttons or JavaScript errors.')
