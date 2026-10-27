"""Three-column dock, all real purchase paths, focus, sizing and v0.10 migration."""
from v0110_harness import *
from playwright.sync_api import sync_playwright
import zipfile

def inside(r,w,h):return r and r['x']>=-1 and r['y']>=-1 and r['x']+r['width']<=w+1 and r['y']+r['height']<=h+1

def run():
 with sync_playwright() as pw:
  b=launch_browser(pw)
  sizes=[(320,568),(320,740),(360,780),(390,844),(430,932),(568,320),(640,360),(844,390),(915,412),(768,1024),(1024,768),(1440,900),(1920,1080)]
  for w,h in sizes:
   c,p,errors=build(b,w,h,w<1100,store={SAVE:json.dumps({'credits':25000})});dock(p)
   assert p.locator('[data-system]').count()==12
   assert len(p.locator('#upgradeList').evaluate('(e)=>getComputedStyle(e).gridTemplateColumns').split())==3
   nodes=p.locator('[data-system]').evaluate_all('(nodes)=>nodes.map(n=>({text:n.innerText,html:n.innerHTML,rect:n.getBoundingClientRect().toJSON(),scroll:n.scrollWidth,client:n.clientWidth}))')
   assert all('<span>' in n['html'] and 'CR' not in n['text'] and 'MK ' not in n['text'] for n in nodes)
   assert all(n['scroll']<=n['client']+1 for n in nodes),(w,h,'tile overflow')
   assert inside(p.locator('.dock-overlay .dialog-card').bounding_box(),w,h),(w,h,'dock outside')
   assert inside(p.locator('#launchAgain').bounding_box(),w,h),(w,h,'launch outside')
   for system in ['hull','magnet','shield','disruptor']:
    p.locator('[data-system="'+system+'"]').click()
    assert state(p)['paused'] and state(p)['upgradeOpen']
    assert inside(p.locator('#upgradeDialog').bounding_box(),w,h)
    assert inside(p.locator('#upgradePurchase').bounding_box(),w,h)
    assert not p.locator('#upgradePurchase').is_disabled()
    p.keyboard.press('Tab');assert p.evaluate('document.activeElement.closest("#upgradeDialog")!==null')
    p.keyboard.press('Escape');assert not state(p)['upgradeOpen'] and state(p)['paused']
    assert p.evaluate('document.activeElement.dataset.system')==system
   p.locator('#ammunitionTab').click();assert inside(p.locator('#launchAgain').bounding_box(),w,h)
   p.locator('#upgradesTab').click();p.locator('#launchAgain').click();assert not state(p)['paused']
   assert not errors,errors;c.close()
  print('PASS 13 screen sizes: exactly 3 columns/12 name-only tiles; scrollable landscape dock; pinned undock/purchase; child focus and Escape returns to tile without resuming')
  c,p,errors=build(b,390,844,True,store={SAVE:json.dumps({'credits':30000})});dock(p)
  catalogue=p.evaluate('AbyssDiagnostics.upgradeCatalog()');total=0
  for u in catalogue:
   for level in range(u['level'],u['limit']):
    price=u.get('prices',[0]*8)[level] if 'prices' in u else int(u['base']*1.55**level)
    before=state(p);buy(p,u['id']);after=state(p)
    assert after['credits']==before['credits']-price,(u['id'],level,before['credits'],after['credits'],price)
    assert debug(p)['saved']['upgrades'][u['id']]==level+1
    assert after['mineAmmo']==0
    total+=price
   p.locator('[data-system="'+u['id']+'"]').click();assert p.locator('#upgradePurchase').is_disabled()
   assert 'FULLY UPGRADED' in p.locator('#upgradePurchase').inner_text()
   assert p.locator('.upgrade-comparison tr').count()>=3
   p.keyboard.press('Escape')
  assert total==11924,total
  assert state(p)['shieldCapacity']==70 and state(p)['magnetRange']==220 and state(p)['disruptorMark']==4
  assert state(p)['safeDepth']==1530 and state(p)['boostCapacity']==150
  data=store(p);c.close();c,p,errors=build(b,store=data);assert state(p)['shieldCapacity']==70 and state(p)['disruptorMark']==4
  assert state(p)['credits']==30000-11924 and state(p)['mineAmmo']==0
  dock(p);p.locator('#ammunitionTab').click();p.locator('#fillMinesBtn').click();assert state(p)['mineAmmo']==8
  print('PASS all 51 paid upgrade levels via real pop-ups, Mk cap guards, exact 11,924-credit tree, no ammo grants, persistent stats and separate ammunition shop')
  assert not errors,errors;c.close()
  # Empty wallet still allows reading every system; exact price allows one upgrade only.
  c,p,errors=build(b);dock(p);p.locator('[data-system="magnet"]').click()
  assert p.locator('#upgradePurchase').is_disabled() and '80' in p.locator('#upgradePriceNote').inner_text()
  p.keyboard.press('Escape');p.evaluate('AbyssDiagnostics.grantCredits(80)');buy(p,'magnet');assert state(p)['credits']==0 and state(p)['magnetRange']==100
  p.locator('[data-system="magnet"]').click();assert '130' in p.locator('#upgradePurchase').inner_text()
  p.locator('#upgradeDetailClose').click();assert state(p)['paused'];assert not errors,errors;c.close()
  print('PASS insufficient-credit and exact-credit purchases; installed systems remain inspectable at max level')
  # Build an actual v0.10 campaign from archived runtime bytes, then migrate those exact bytes.
  oldzip=ROOT.parent/'the-abyss-below-v0.10.0-complete.zip'
  fixture=ROOT/'tests/fixtures/v0100_campaign.json'
  if oldzip.exists():
   z=zipfile.ZipFile(oldzip);oldstore={SAVE:json.dumps({'credits':840,'xp':350,'secured':[0,1],'upgrades':{'engine':3,'hull':4,'minePower':2,'mineCapacity':2,'flashlight':3}})}
   oc=b.new_context(service_workers='block');op=oc.new_page();op.set_content(z.read('index.html').decode());op.add_style_tag(content=z.read('styles.css').decode())
   op.evaluate('''store=>{window.ABYSS_TEST_MODE=true;window.testStore=store;Object.defineProperty(window,'localStorage',{value:{getItem:k=>testStore[k]??null,setItem:(k,v)=>testStore[k]=v}})}''',oldstore)
   op.add_script_tag(content=z.read('game.js').decode());op.locator('#startBtn').click();op.evaluate('requestAnimationFrame=()=>0');op.wait_for_timeout(65)
   # Mark genuine collections and predator damage; buy real owned ammo in the old shop.
   item=op.evaluate('AbyssDiagnostics.debug().items.find(x=>x.type==="scrap")');op.evaluate('p=>AbyssDiagnostics.moveTo(p.x,p.y)',item);op.evaluate('AbyssDiagnostics.use()')
   enemy=op.evaluate('AbyssDiagnostics.debug().predators.find(x=>x.tier==="reaper")');op.evaluate('id=>AbyssDiagnostics.hurtEnemy(id,60)',enemy['id'])
   op.evaluate('AbyssDiagnostics.moveTo(600,160);AbyssDiagnostics.use()');op.locator('#ammunitionTab').click();op.locator('#buyMineBtn').click()
   old=op.evaluate('testStore');oc.close()
   fixture.parent.mkdir(parents=True,exist_ok=True)
   fixture.write_text(json.dumps({'source':'Synthetic campaign created with the actual archived v0.10.0 production runtime','storage':old},indent=2)+'\n')
  else:
   old=json.loads(fixture.read_text())['storage']
  baseline=json.loads(old[CAMPAIGN])
  c,p,errors=build(b,store=old);current=json.loads(store(p)[CAMPAIGN]);
  assert baseline['id']==current['id'] and baseline['levels']==current['levels']
  for k in ['credits','xp','secured','mineAmmo','bestDepth']:assert baseline['profile'][k]==current['profile'][k],k
  for k,v in baseline['profile']['upgrades'].items():assert current['profile']['upgrades'][k]==v
  assert all(current['profile']['upgrades'][k]==0 for k in ['magnet','shield','disruptor'])
  assert state(p)['mineAmmo']==1
  assert not errors,errors;c.close();b.close()
  print('PASS actual v0.10 campaign byte migration: stable campaign ID, level seed/layout/depletion/drops, owned ammunition, credits, XP, recorders and previous upgrades; new modules start unfitted')
if __name__=='__main__':run()
