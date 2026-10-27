"""Responsive hub, two-currency details, locked expedition controls and achievements."""
from v0160_harness import *
from playwright.sync_api import sync_playwright

def inside(r,w,h):return r and r['x']>=-1 and r['y']>=-1 and r['x']+r['width']<=w+1 and r['y']+r['height']<=h+1

def run():
 with sync_playwright() as pw:
  b=launch_browser(pw)
  sizes=[(320,568),(320,740),(360,780),(390,844),(430,932),(568,320),(640,360),(844,390),(915,412),(768,1024),(1024,768),(1440,900),(1920,1080)]
  for w,h in sizes:
   c,p,e=build(b,w,h,w<1100,launch=False)
   assert '0.16.0' in p.locator('#menuVersion').inner_text() and 'Arsenal & Archives' in p.locator('#menuVersionName').inner_text()
   p.locator('#menuAchievementsBtn').click();assert p.locator('.achievement-card').count()==20
   assert inside(p.locator('#achievementsDialog').bounding_box(),w,h)
   assert inside(p.locator('#achievementClose').bounding_box(),w,h)
   assert p.locator('#achievementList').evaluate('(e)=>e.scrollHeight>e.clientHeight')
   p.keyboard.press('Escape');p.locator('#menuHubBtn').click()
   assert state(p)['paused'] and inside(p.locator('#launchAgain').bounding_box(),w,h)
   assert p.locator('[data-travel]').count()==5
   assert p.locator('[data-travel]:disabled').count()==5 # four locked + selected first
   assert p.evaluate('document.documentElement.scrollWidth<=innerWidth')
   p.locator('#upgradesTab').click();assert p.locator('[data-system]').count()==14
   assert len(p.locator('#upgradeList').evaluate('(e)=>getComputedStyle(e).gridTemplateColumns').split())==3
   assert p.locator('.upgrade-tier').count()==14
   bounds=p.locator('[data-system]').evaluate_all("""nodes=>nodes.map(e=>{const b=e.getBoundingClientRect(),n=e.querySelector('.upgrade-name').getBoundingClientRect(),t=e.querySelector('.upgrade-tier').getBoundingClientRect();return {id:e.dataset.system,fit:e.scrollWidth<=e.clientWidth+1&&n.left>=b.left&&n.right<=b.right+1&&t.left>=b.left&&t.right<=b.right+1,apart:n.right<=t.left+1||n.bottom<=t.top+1};})""")
   assert all(t['fit'] and t['apart'] for t in bounds),(w,h,bounds)
   p.evaluate('AbyssDiagnostics.grantCredits(30000);AbyssDiagnostics.grantCrystals(1000)')
   for system in ['hull','magnet','shield','disruptor']:
    p.locator('[data-system="'+system+'"]').click()
    assert inside(p.locator('#upgradePurchase').bounding_box(),w,h)
    assert inside(p.locator('#upgradeDetailClose').bounding_box(),w,h)
    assert not p.locator('#upgradePurchase').is_disabled()
    assert 'CR +' in p.locator('#upgradePurchase').inner_text()
    p.keyboard.press('Tab');assert p.evaluate('document.activeElement.closest("#upgradeDialog")!==null')
    p.keyboard.press('Escape');assert state(p)['paused'] and not state(p)['upgradeOpen']
   p.locator('#expeditionsTab').click();p.keyboard.press('ArrowRight');assert p.locator('#upgradesTab').get_attribute('aria-selected')=='true'
   p.keyboard.press('End');assert p.locator('#expeditionsTab').get_attribute('aria-selected')=='true'
   p.locator('#launchAgain').click();assert not state(p)['paused']
   assert not e,e;c.close()
  print('PASS 13 touch/desktop sizes: main menu version and hub entry, achievements scroll/close, 3-column tier-labelled systems, pinned dock controls, dual-currency pop-ups, modal focus, keyboard tablist and no horizontal overflow')
  b.close()
if __name__=='__main__':run()
