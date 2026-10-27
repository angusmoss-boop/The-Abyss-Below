"""Screenshots from production code with synthetic currency/gear, never a real user save."""
from v0130_harness import *
from playwright.sync_api import sync_playwright
import math, json
with sync_playwright() as pw:
 b=launch_browser(pw)
 for w,h,touch in [(390,844,True),(844,390,True),(1440,900,False)]:
  c,p,e=build(b,w,h,touch,launch=False)
  p.screenshot(path=str(OUT/f'{w}x{h}-main-menu.png'))
  p.locator('#menuHubBtn').click()
  p.screenshot(path=str(OUT/f'{w}x{h}-expeditions.png'))
  p.evaluate('AbyssDiagnostics.grantCredits(2000);AbyssDiagnostics.grantCrystals(60)');p.locator('#upgradesTab').click()
  buy(p,'hull');buy(p,'hull');p.locator('[data-system="hull"]').click()
  assert '297 CR + 10' in p.locator('#upgradePurchase').inner_text()
  p.screenshot(path=str(OUT/f'{w}x{h}-hull-iii.png'))
  p.locator('#upgradeDetailClose').click();p.locator('#launchAgain').click();p.locator('#focusPauseBtn').click();p.locator('#pauseAchievementsBtn').click()
  p.screenshot(path=str(OUT/f'{w}x{h}-achievements.png'))
  p.locator('#achievementClose').click();p.locator('#resumeBtn').click()
  # Real generated terrain at the shelf's bottom, no fabricated scene graphic.
  d=debug(p);floor=3120;mid=600+math.sin(floor*.0017)*94+math.sin(floor*.0051)*39
  move(p,mid,floor-32);step(p,.05);p.screenshot(path=str(OUT/f'{w}x{h}-seabed.png'))
  assert not e,e;c.close()
 # Fixture for exhaustive achievement accounting: real pickups, banking, max purchases and stats.
 c,p,e=build(b)
 p.evaluate('AbyssDiagnostics.grantCredits(100000);AbyssDiagnostics.grantCrystals(100000)');dock(p)
 p.evaluate('''()=>{for(const u of AbyssDiagnostics.upgradeCatalog()){document.querySelector('[data-system="'+u.id+'"]').click();for(let i=u.level;i<u.limit;i++)document.getElementById('upgradePurchase').click();document.getElementById('upgradeDetailClose').click();}}''')
 assert next(a for a in p.evaluate('AbyssDiagnostics.achievementCatalog()') if a['id']=='systems')['earned']
 for i in range(5):
  p.evaluate('(i)=>AbyssDiagnostics.fixtureLevel(i)',i)
  p.evaluate('''()=>{for(const n of AbyssDiagnostics.debug().items){if(['scrap','crystal','recorder'].includes(n.type)&&!n.collected){AbyssDiagnostics.moveTo(n.x,n.y);AbyssDiagnostics.use();}}AbyssDiagnostics.moveTo(600,160);AbyssDiagnostics.use();}''')
 a=p.evaluate('AbyssDiagnostics.achievementCatalog()')
 assert next(x for x in a if x['id']=='survey')['earned']
 assert next(x for x in a if x['id']=='transmission')['earned']
 assert next(x for x in a if x['id']=='salvage')['earned'] and next(x for x in a if x['id']=='crystals')['earned']
 (ROOT/'verification/v0.13.0').mkdir(parents=True,exist_ok=True)
 (ROOT/'verification/v0.13.0/achievement-accounting.json').write_text(json.dumps({'source':'Synthetic outfitted ship collecting actual generated resources through production USE and docking handlers; not a playthrough','achievements':a},indent=2)+'\n')
 assert not e,e;c.close();b.close()
 print('PASS production previews in portrait, landscape and desktop; exhaustive fixed-resource collection awards Clean Sweep / Full Survey; 20 recorders, banked resource thresholds and fully upgraded systems award checks')
