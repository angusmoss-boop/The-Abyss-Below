from v0250_harness import *
from playwright.sync_api import sync_playwright
SIZES=[(320,568),(320,740),(360,780),(390,844),(430,932),(568,320),(640,360),(844,390),(915,412),(768,1024),(1024,768),(1440,900),(1920,1080)]
def run():
 with sync_playwright() as pw:
  b=launch_browser(pw);errors=[]
  for w,h in SIZES:
   c,p,e=build(b,w,h,w<1100);errors+=e;p.evaluate('AbyssDiagnostics.openWildlife()')
   assert p.locator('.field-card').count()==10
   assert p.locator('[data-journal-tab="observations"]').get_attribute('aria-selected')=='true'
   for id in ['signalsDialog','signalsClose','signalsContent']:
    box=p.locator('#'+id).bounding_box();assert box and box['x']>=-1 and box['y']>=-1 and box['x']+box['width']<=w+1 and box['y']+box['height']<=h+1,(w,h,id,box)
   card=p.locator('.field-card').first.bounding_box();host=p.locator('#signalsContent').bounding_box();assert card['width']<=host['width']
   p.locator('[data-journal-tab="warden"]').click();assert p.locator('.warden-dossier').is_visible()
   p.locator('[data-journal-tab="observations"]').click();p.locator('#signalsClose').click()
   dock(p);p.locator('#archiveTab').click();p.locator('#wildlifeDockBtn').click();assert p.locator('.field-guide').is_visible()
   c.close()
  assert not errors,errors;b.close()
 print('PASS field-guide and original journal tabs at 13 screen sizes, native dialog close/focus, dock archive entry, 10 entries, no overflowing viewport')
if __name__=='__main__':run()
