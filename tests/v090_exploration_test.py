"""v0.9.0: world-only touch zoom, four lamp marks, power and dock-only populations.
Uses production scripts in Chromium. Synthetic fixtures are gated by test mode.
"""
from pathlib import Path
import json, math, shutil
from playwright.sync_api import sync_playwright
from v080_cockpit_test import open_game, inspect_layout, state, details, fixture
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'screenshots/v0.9.0'; OUT.mkdir(parents=True,exist_ok=True)

def build(browser, w=1440,h=900,touch=False,store=None):
    context=browser.new_context(viewport={'width':w,'height':h},is_mobile=touch,has_touch=touch,device_scale_factor=2 if touch else 1,service_workers='block')
    page=context.new_page();page.set_default_timeout(5000);errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content((ROOT/'index.html').read_text());page.add_style_tag(content=(ROOT/'styles.css').read_text())
    page.evaluate('''store=>{window.ABYSS_TEST_MODE=true;window.testStore=store;Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>store[k]??null,setItem:(k,v)=>store[k]=v,removeItem:k=>delete store[k]}})}''',store or {'the-abyss-below-v01':json.dumps({'credits':1000,'secured':[], 'upgrades':{'hull':7,'oxygen':5}})})
    page.add_script_tag(content=(ROOT/'game.js').read_text());page.locator('#startBtn').click();page.wait_for_timeout(80)
    page.evaluate('AbyssDiagnostics.step(0)')
    return context,page,errors

def moving_to(page,x,y):page.evaluate('([x,y])=>AbyssDiagnostics.moveTo(x,y)',[x,y])
def freeze_screen(page,path):
    page.evaluate('AbyssDiagnostics.step(0)');page.screenshot(path=str(path))

def run():
 with sync_playwright() as pw:
  browser=pw.chromium.launch(headless=True,executable_path=shutil.which('chromium'))
  # Zoom affects the world and mask but not DOM control sizing, input mapping or instrument layout.
  for touch,w,h in [(True,390,844),(True,844,390),(True,320,568),(True,1024,768),(False,1440,900),(False,390,844)]:
    context,page,errors=open_game(browser,w,h,touch)
    fixture(page,depth=400,upgrades={'hull':4},lights=True)
    inspect_layout(page,w,h,touch)
    d=details(page);v=d['viewport'];rect=page.locator('#gameCanvas').bounding_box()
    assert v['zoom']==(.70 if touch else 1)
    assert abs(v['w']-rect['width']/v['zoom'])<.01
    assert abs(v['h']-rect['height']/v['zoom'])<.01
    assert abs((d['player']['x']-d['camera']['x'])*v['zoom']-rect['width']/2)<.01
    assert abs((d['player']['y']-d['camera']['y'])*v['zoom']-rect['height']*.52)<.01
    assert not errors,errors
    context.close()
  print('PASS: touch world zoom 0.70 at 4 orientations/sizes; desktop 1.00 at wide/narrow; original full-size controls/HUD retained')

  context,page,errors=build(browser)
  assert state(page)['flashlightMark']==1
  assert state(page)['credits']==1000
  # Buy lamps through the actual dock; no fixture calls grant the upgrade.
  page.evaluate('AbyssDiagnostics.use()')
  assert page.locator('[data-upgrade="flashlight"]').count()==1
  assert page.locator('[data-upgrade="flashlight"]').inner_text()=='75 CR'
  for mark,cost,length in [(2,75,360),(3,150,480),(4,300,620)]:
    before=state(page)['credits'];page.locator('[data-upgrade="flashlight"]').click()
    assert state(page)['credits']==before-cost
    assert state(page)['flashlightMark']==mark and state(page)['flashlightLength']==length
    assert details(page)['saved']['upgrades']['flashlight']==mark
  assert page.locator('[data-upgrade="flashlight"]').is_disabled()
  assert page.locator('[data-upgrade="flashlight"]').inner_text()=='MAX'
  # Purchasing and reopening an already-visited dock must not re-roll the field.
  cycle=state(page)['populationCycle']
  page.locator('#launchAgain').click();page.evaluate('AbyssDiagnostics.use()')
  assert state(page)['populationCycle']==cycle
  page.locator('#launchAgain').click()
  assert not errors,errors;context.close()
  print('PASS: standard Mk I migration; independent dock purchases 75/150/300 CR; immediate reach upgrade; Mk IV cap; no shop reroll')

  # Photometric masks: upgrades strictly grow the illuminated area at every angle, no world leak in blackout.
  for touch,w,h in [(False,1440,900),(True,390,844),(True,844,390)]:
    context,page,errors=build(browser,w,h,touch)
    areas=[]
    for mark in range(1,5):
      for angle in [0,math.pi/2,.73,-2.21]:
        fixture(page,depth=1100,lights=True,facing=angle,upgrades={'flashlight':mark},battery=100)
        stats=page.evaluate('''()=>{AbyssDiagnostics.renderWorld();const d=AbyssDiagnostics.debug(),s=AbyssDiagnostics.state(),c=document.querySelector('#gameCanvas'),a=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let lit=0,leaks=0;const ca=Math.cos(s.facing),si=Math.sin(s.facing),scale=d.viewport.dpr*d.viewport.zoom;for(let py=0;py<c.height;py++)for(let px=0;px<c.width;px++){const i=(py*c.width+px)*4;if(Math.max(a[i],a[i+1],a[i+2])===0)continue;lit++;const dx=(px+.5)/scale+d.camera.x-s.x,dy=(py+.5)/scale+d.camera.y-s.y,along=dx*ca+dy*si-30,side=-dx*si+dy*ca;if(along< -3||along>s.flashlightLength+3||Math.abs(side)>5+Math.max(0,along)*Math.tan(s.flashlightAngle*Math.PI/360)+3)leaks++;}return {lit,leaks};}''')
        assert stats['leaks']==0,(touch,mark,angle,stats)
        assert stats['lit']>1000,(touch,mark,stats)
        if angle==math.pi/2:areas.append(stats['lit'])
      fixture(page,depth=1100,lights=False,upgrades={'flashlight':mark})
      assert page.evaluate('''()=>{AbyssDiagnostics.renderWorld();const c=document.querySelector('#gameCanvas'),a=c.getContext('2d').getImageData(0,0,c.width,c.height).data;return a.every((v,i)=>i%4===3?v===255:v===0)}''')
    assert all(a<b for a,b in zip(areas,areas[1:])),areas
    print('PASS: all four beam marks grow and rotate without leaks; lights-off fully opaque black',touch,w,h,areas)
    assert not errors,errors;context.close()

  context,page,errors=build(browser)
  for mark,power in [(1,.04),(2,.055),(3,.075),(4,.10)]:
    for bat in [0,5]:
      fixture(page,depth=500,lights=True,battery=100,upgrades={'flashlight':mark,'battery':bat})
      after=page.evaluate('AbyssDiagnostics.step(60)')['battery']
      expected=100-60*(.018+power)/(1+bat*.12)
      assert abs(after-expected)<1e-6,(mark,bat,after,expected)
      fixture(page,depth=500,lights=False,battery=100,upgrades={'flashlight':mark,'battery':bat})
      off=page.evaluate('AbyssDiagnostics.step(60)')['battery']
      assert abs((off-after)-60*power/(1+bat*.12))<1e-6
  fixture(page,depth=1100,lights=True,battery=0,upgrades={'flashlight':4})
  assert not state(page)['headlightsActive']
  before=state(page)['battery'];page.wait_for_timeout(150);assert state(page)['battery']==before
  print('PASS: exact slow per-tier lamp drain over 60 simulated seconds; off saves power; battery efficiency, depletion and pause respected')

  # The wider map must not break sonar sampling at either bank, including zoomed mobile view corners.
  fixture(page,depth=1100,lights=False,upgrades={'flashlight':4})
  d=details(page);y=d['player']['y'];centre=d['player']['x'];half=state(page)['worldWidth']/2
  moving_to(page,centre-half+90,y);page.evaluate('AbyssDiagnostics.ping()')
  page.evaluate('AbyssDiagnostics.step(.7)')
  assert details(page)['sonarTerrainEchoes']
  assert all(e['revealUntil']>details(page)['clock'] for e in details(page)['sonarTerrainEchoes'])
  print('PASS: nearby walls still reveal on sonar wave arrival in the widened trench')

  # Validate many maps: exact 3x cross-section, obstacle increase, loot caps, tier floors and side coverage.
  counts=[]
  for seed in range(12):
    page.evaluate('seed=>AbyssDiagnostics.regenerate(seed)',seed)
    d=details(page);counts.append(len(d['rocks']))
    assert 700<len(d['rocks'])<1440,len(d['rocks'])
    assert [sum(i['type']==kind for i in d['items']) for kind in ['scrap','crystal','air','recorder']]==[180,24,30,6]
    assert [sum(e['tier']==tier for e in d['predators']) for tier in ['common','apex','reaper']]==[138,33,15]
    assert min(e['y'] for e in d['predators'] if e['tier']=='reaper')>=8120
    assert min(e['y'] for e in d['predators'] if e['tier']=='apex')>4120
    assert any(e['x']<0 for e in d['predators']) and any(e['x']>1200 for e in d['predators'])
    # All contacts are clear of conservative boulder bounds, including starter/wreck salvage.
    for item in d['items']:
      assert all(math.hypot(item['x']-r['x'],item['y']-r['y'])>r['radius']+13 for r in d['rocks']),('blocked item',seed,item)
    assert all(i['y']>=1920 for i in d['items'] if i['type']=='crystal')
    assert sum(i['type']=='scrap' and i['y']<=1420 for i in d['items'])>=8
    for y in [160,1000,5000,8120,15120,18000]:
      moving_to(page,600,y)
      assert abs(state(page)['worldWidth']-6*(320+math.sin(y*.0031+1)*41+math.sin(y*.0072)*22))<1e-6
  print('PASS: 12 seeded worlds: exact triple width, rocks',min(counts),'-',max(counts),'; 138/33/15 enemies; only 180 scrap + 24 crystals + 30 caches; accessible starter/wreck loot')

  # Persistent population depletion is separate from the non-persistent active dive.
  page.evaluate('AbyssDiagnostics.regenerate(227136)')
  base=details(page)
  items=[next(i for i in base['items'] if i['type']==kind) for kind in ['scrap','crystal','air']]
  for item in items:
    moving_to(page,item['x'],item['y']);page.evaluate('AbyssDiagnostics.use()')
  dead=base['predators'][0];hurt=base['predators'][-1]
  page.evaluate('([id,d])=>AbyssDiagnostics.hurtEnemy(id,d)',[dead['id'],1000])
  page.evaluate('([id,d])=>AbyssDiagnostics.hurtEnemy(id,d)',[hurt['id'],60])
  moving_to(page,600,160)
  page.evaluate('AbyssDiagnostics.step(20)')
  depleted=details(page)
  assert all(next(i for i in depleted['items'] if i['id']==item['id'])['collected'] for item in items)
  assert dead['id'] not in [e['id'] for e in depleted['predators']]
  assert next(e for e in depleted['predators'] if e['id']==hurt['id'])['health']==340
  # Menu merely suspends, then relaunch restores the same depleted contacts at home positions.
  page.evaluate('AbyssDiagnostics.unfreeze()');page.keyboard.press('Escape');page.locator('#pauseMenuBtn').click();page.locator('#startBtn').click()
  page.evaluate('AbyssDiagnostics.relaunch()')
  restored=details(page)
  assert restored['field']==depleted['field']
  assert dead['id'] not in [e['id'] for e in restored['predators']]
  assert all(next(i for i in restored['items'] if i['id']==item['id'])['collected'] for item in items)
  store=page.evaluate('window.testStore');assert not errors,errors;context.close()
  context,page,errors=build(browser,store=store)
  restored=details(page)
  assert restored['field']==depleted['field']
  assert dead['id'] not in [e['id'] for e in restored['predators']]
  assert next(e for e in restored['predators'] if e['id']==hurt['id'])['health']==340
  assert all(next(i for i in restored['items'] if i['id']==item['id'])['collected'] for item in items)
  print('PASS: wait, pause/menu, relaunch and reconstructed page preserve collected loot, dead enemies and partially damaged health')
  # Deliver one recorder; refresh restores ordinary population, not banked recorders or terrain.
  recorder=next(i for i in restored['items'] if i['type']=='recorder')
  moving_to(page,recorder['x'],recorder['y']);page.evaluate('AbyssDiagnostics.use()')
  moving_to(page,600,160);page.evaluate('AbyssDiagnostics.use()')
  refreshed=details(page)
  assert refreshed['field']['cycle']==depleted['field']['cycle']+1
  assert refreshed['field']['looted']==[] and refreshed['field']['health']=={}
  assert len(refreshed['predators'])==186 and all(e['health']==e['maxHealth'] for e in refreshed['predators'])
  assert all(not i['collected'] for i in refreshed['items'])
  assert recorder['index'] in refreshed['saved']['secured']
  assert not any(i['type']=='recorder' and i['index']==recorder['index'] for i in refreshed['items'])
  assert [(r['x'],r['y'],r['radius']) for r in refreshed['rocks']]==[(r['x'],r['y'],r['radius']) for r in base['rocks']]
  cycle=state(page)['populationCycle']
  page.locator('[data-upgrade="engine"]').click();assert state(page)['populationCycle']==cycle
  page.locator('#launchAgain').click();page.evaluate('AbyssDiagnostics.use()');assert state(page)['populationCycle']==cycle
  page.locator('#launchAgain').click();moving_to(page,600,500);page.evaluate('AbyssDiagnostics.step(.02)')
  moving_to(page,600,160);page.evaluate('AbyssDiagnostics.use()');assert state(page)['populationCycle']==cycle+1
  assert not errors,errors;context.close()
  print('PASS: physical dock restores enemies/loot once per visit; actual departure permits next cycle; terrain stable and secured recorders never respawn')

  context,page,errors=build(browser)
  page.evaluate('AbyssDiagnostics.regenerate(42)')
  enemy=details(page)['predators'][0];page.evaluate('([id,d])=>AbyssDiagnostics.hurtEnemy(id,d)',[enemy['id'],1000])
  page.evaluate('AbyssDiagnostics.unfreeze()');page.keyboard.press('Escape');page.locator('#pauseMenuBtn').click()
  page.locator('#newGameBtn').click();page.locator('#confirmNewGameBtn').click()
  assert state(page)['credits']==0 and state(page)['flashlightMark']==1 and state(page)['predators']==186
  assert details(page)['field']['cycle']==0 and details(page)['field']['health']=={} and details(page)['field']['looted']==[]
  assert not errors,errors;context.close()
  print('PASS: confirmed New Game resets banked progression and population depletion together')

  # Corrupt/legacy data should not break the lamp or world; fresh reset clears both saves.
  for value in [None,0,5,-1,'four']:
    store={'the-abyss-below-v01':json.dumps({'credits':321,'secured':[0,1], 'upgrades':{'flashlight':value}}),'the-abyss-below-field-v1':'not json'}
    context,page,errors=build(browser,store=store)
    assert state(page)['flashlightMark']==1 and state(page)['credits']==321 and state(page)['secured']==2
    assert not errors,errors;context.close()
  print('PASS: missing/invalid lamp marks and corrupted field saves fall back without losing banked progress')
  browser.close()

if __name__=='__main__':run()
