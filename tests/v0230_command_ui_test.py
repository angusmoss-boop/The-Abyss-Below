"""Three production command interfaces, actual input flow and displayed readings."""
from v0230_harness import *
from playwright.sync_api import sync_playwright
SIZES=[(320,568),(360,640),(390,844),(430,932),(568,320),(640,360),(844,390),(915,412),(768,1024),(1024,768),(1280,720),(1440,900),(1920,1080)]
def reach(p,selector,w,h):
 el=p.locator(selector);el.scroll_into_view_if_needed();r=el.bounding_box()
 assert r and r['width']>=32 and r['height']>=32,(selector,r)
 assert -1<=r['x'] and -1<=r['y'] and r['x']+r['width']<=w+1 and r['y']+r['height']<=h+1,(w,h,selector,r)
 assert el.evaluate('e=>{const r=e.getBoundingClientRect(),h=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return h===e||e.contains(h)}'),(selector,'occluded')
def no_overflow(p,selector,w,h):
 el=p.locator(selector);r=el.bounding_box();assert r and r['x']>=-1 and r['y']>=-1 and r['x']+r['width']<=w+1 and r['y']+r['height']<=h+1,(w,h,selector,r)
 assert el.evaluate('e=>e.scrollWidth<=e.clientWidth+2'),(w,h,selector,'horizontal overflow')
with sync_playwright() as pw:
 b=launch_browser(pw);rows=[]
 for w,h in SIZES:
  c,p,errors=build(b,w,h,w<1100,launch=False)
  p.wait_for_function('!document.documentElement.classList.contains("abyss-launching")')
  no_overflow(p,'.command-menu',w,h)
  assert p.locator('#menuCampaignName').inner_text()=='Campaign 1'
  assert 'SLOT 01' in p.locator('#menuSlotTag').inner_text()
  assert p.locator('.campaign-figures strong').all_text_contents()==['0/20','0/30','0/5']
  assert p.locator('.chapter-track>span').count()==5
  assert p.locator('#menuVersion').inner_text()=='v0.23.0'
  for selector in ['#startBtn','#menuHubBtn','#menuSlotsBtn','#menuJournalBtn','#checkVersionBtn']:
   reach(p,selector,w,h)
  p.locator('#menuHubBtn').click();assert p.locator('#modalOverlay').is_visible()
  no_overflow(p,'.dialog-card',w,h)
  assert '5:33' in p.locator('#dockBalance').inner_text()
  p.locator('#upgradesTab').click();assert len(p.locator('.upgrade-tile').all())==14
  cols=p.locator('#upgradeList').evaluate('e=>getComputedStyle(e).gridTemplateColumns.split(" ").length');assert cols==3,cols
  for selector in ['#ammunitionTab','#expeditionsTab','#contractsTab','#archiveTab','#upgradesTab']:
   reach(p,selector,w,h);p.locator(selector).click();reach(p,'#launchAgain',w,h)
  p.locator('[data-system="oxygen"]').click()
  assert '5:33' in p.locator('#upgradeDialog').inner_text() and '8:40' in p.locator('#upgradeDialog').inner_text()
  p.locator('#upgradeDetailClose').click();p.locator('#launchAgain').click()
  fix(p,depth=76,upgrades={'hull':2,'oxygen':1,'battery':1,'engine':1,'shield':1},battery=81)
  p.evaluate('AbyssDiagnostics.setSystems({hull:112,oxygen:103,shield:12});AbyssDiagnostics.unfreeze()')
  p.locator('#focusPauseBtn').click();assert state(p)['pauseOpen'] and state(p)['paused']
  no_overflow(p,'.command-pause',w,h)
  gauges=p.locator('.pause-gauge strong').all_text_contents();assert gauges==['72%','79%','62%','60%'],gauges
  assert '6:52' in p.locator('#pauseTelemetry').inner_text() and '17.1 m/s' in p.locator('#pauseTelemetry').inner_text()
  assert 'CHECKPOINT SAVED ON THIS DEVICE'==p.locator('#pauseSaveStatus').inner_text()
  before=debug(p)['player'];p.wait_for_timeout(60);assert debug(p)['player']==before
  for sel in ['#resumeBtn','#pauseMapBtn','#pauseJournalBtn','#pauseSlotsBtn','#pauseAudioBtn','#pauseMenuBtn','#quitBtn']:reach(p,sel,w,h)
  p.locator('#pauseMapBtn').click();assert p.locator('#surveyDialog').evaluate('e=>e.open');p.locator('#surveyClose').click();assert state(p)['pauseOpen']
  p.locator('#pauseAudioBtn').click();assert p.locator('#audioDialog').evaluate('e=>e.open');p.locator('#audioClose').click()
  p.locator('#pauseMenuBtn').click();assert state(p)['menuOpen'] and state(p)['paused']
  assert 'DIVE AT 76 m' in p.locator('#menuDestination').inner_text();assert p.locator('#menuHubBtn').is_disabled()
  p.locator('#startBtn').click();assert not state(p)['menuOpen']
  # Main-menu Continue resumes the current in-memory dive. Reopening pause is safe.
  if not state(p)['pauseOpen']:p.evaluate('AbyssDiagnostics.unfreeze()');p.locator('#focusPauseBtn').click()
  p.evaluate('AbyssDiagnostics.setSystems({battery:0})')
  p.locator('#resumeBtn').click();p.locator('#focusPauseBtn').click();assert 'RESERVE · 50%' in p.locator('#pauseTelemetry').inner_text()
  if w>=1280:
   p.locator('#resumeBtn').focus()
   for i in range(25):
    p.keyboard.press('Tab');assert p.evaluate('document.querySelector("#pauseOverlay").contains(document.activeElement)')
   p.locator('#resumeBtn').click()
  assert p.locator('.mobile-actions .action-circle').count()==7
  assert not errors,(w,h,errors)
  rows.append({'width':w,'height':h,'all_three_surfaces':'PASS','three_column_upgrade_grid':True,'live_readings':'PASS'});c.close()
 (ROOT/'verification/v0.23.0/command-layouts.json').write_text(json.dumps(rows,indent=2)+'\n');b.close()
 print('PASS 13 sizes: redesigned main/pause/dock, unclipped action targets, three-column upgrades, true campaign/air/power telemetry, resume/menu/subdialog flows, paused resources and keyboard focus containment')
