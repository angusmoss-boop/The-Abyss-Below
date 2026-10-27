"""v0.7.0 ordnance, predator balance, persistence, visibility and multi-touch tests.
Run with: python tests/v070_mines_test.py
Uses the real game code in Chromium plus test-only fixed-step fixtures.
"""
from pathlib import Path
import math
import shutil
from playwright.sync_api import sync_playwright
from v060_mechanics_test import launch, fixture, step, state, detail, PIXEL_MAX

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'screenshots'/'v0.7.0'
OUT.mkdir(parents=True,exist_ok=True)


def drop(page):
    return page.evaluate('AbyssDiagnostics.mine()')


def load_seed(browser, seed):
    context=browser.new_context(viewport={'width':1440,'height':900},service_workers='block')
    page=context.new_page();errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content((ROOT/'index.html').read_text())
    page.add_style_tag(content=(ROOT/'styles.css').read_text())
    page.evaluate('''seed=>{
      const store={'the-abyss-below-v01':JSON.stringify(seed)};
      Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>store[k]??null,setItem:(k,v)=>store[k]=v}});
      window.ABYSS_TEST_MODE=true;
    }''',seed)
    page.add_script_tag(content=(ROOT/'game.js').read_text())
    return context,page,errors


def run():
  with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path=shutil.which('chromium'))
    context,page,errors=launch(browser)
    s=state(page);d=detail(page);tiers=page.evaluate('AbyssDiagnostics.tiers()')
    assert s['credits']==650 and s['secured']==2 and s['hullLevel']==7
    assert (s['minePower'],s['mineCapacityMark'],s['mineCapacity'],s['mineAmmo'])==(0,1,2,0),s
    assert [tiers[t]['health'] for t in ['common','apex','reaper']]==[100,200,400]
    assert all(e['health']==e['maxHealth']==tiers[e['tier']]['health'] for e in d['predators'])
    assert [tiers[t]['speed'] for t in ['common','apex']]==[96,158]
    assert tiers['reaper']['speed']==s['maxNormalSpeed']==146*(1+4*.17)
    assert (s['commonCount'],s['apexCount'],s['reaperCount'])==(46,11,5)
    print('PASS: old-save migration, existing progression, 100/200/400 HP, faster tiers and exact Mk IV/reaper speed parity')

    fixture(page,depth=1000,upgrades={'engine':4},predators=[{'dx':0,'dy':-180,'tier':'reaper','aggression':1,'alertUntil':999}])
    step(page,4,['s']);a=detail(page);gap_a=a['player']['y']-a['predators'][0]['y']
    step(page,2,['s']);b=detail(page);gap_b=b['player']['y']-b['predators'][0]['y']
    assert abs(gap_b-gap_a)<1,(gap_a,gap_b)
    assert abs(b['player']['vy']-tiers['reaper']['speed'])<.01
    assert abs(b['predators'][0]['vy']-tiers['reaper']['speed'])<.01
    step(page,1.5,['s',' ']);c=detail(page)
    assert c['player']['y']-c['predators'][0]['y']>gap_b+200
    print('PASS: settled Mk IV normal thrust cannot open the chase gap; boost gains over 200 world units')

    # Buy through the actual dock UI, checking independent marks and prices.
    fixture(page,depth=4,upgrades={'minePower':0,'mineCapacity':1})
    page.evaluate('AbyssDiagnostics.grantCredits(5000);AbyssDiagnostics.resupply()')
    page.locator('[data-upgrade="minePower"]').click()
    assert (state(page)['minePower'],state(page)['mineDamage'],state(page)['mineAmmo'])==(1,60,2)
    assert state(page)['credits']==4900
    page.locator('[data-upgrade="minePower"]').click()
    assert state(page)['mineCapacity']==2 and state(page)['mineDamage']==110
    for mark,capacity in [(2,4),(3,6),(4,8)]:
      page.locator('[data-upgrade="mineCapacity"]').click()
      s=state(page)
      assert s['mineCapacityMark']==mark and s['mineCapacity']==capacity and s['mineAmmo']==capacity,s
      assert s['minePower']==2
    for mark,damage in [(3,180),(4,240)]:
      page.locator('[data-upgrade="minePower"]').click()
      s=state(page);assert s['minePower']==mark and s['mineDamage']==damage and s['mineAmmo']==8,s
    assert state(page)['credits']==3350,state(page)
    assert page.locator('[data-upgrade="minePower"]').is_disabled()
    assert page.locator('[data-upgrade="mineCapacity"]').is_disabled()
    page.screenshot(path=str(OUT/'desktop-dock-upgrades.png'))
    persisted=page.evaluate("JSON.parse(localStorage.getItem('the-abyss-below-v01'))")
    page.locator('#launchAgain').click()
    print('PASS: dock purchases, distinct damage/capacity upgrades, 2/4/6/8 racks, pricing, resupply and max-level guards')

    fresh,p,err=load_seed(browser,persisted)
    p.locator('#startBtn').click()
    assert (state(p)['minePower'],state(p)['mineCapacityMark'],state(p)['mineAmmo'])==(4,4,8)
    assert state(p)['credits']==3350 and state(p)['secured']==2
    assert not err,err
    fresh.close()
    fresh,p,err=load_seed(browser,{})
    assert p.locator('#menuProgress').inner_text()=='NEW CAPTAIN · NO SAVED PROGRESS'
    assert state(p)['minePower']==0 and state(p)['mineCapacityMark']==1
    assert not err,err
    fresh.close()
    for invalid in [None,False,'4',-1,99,1.5]:
      fresh,p,err=load_seed(browser,{'upgrades':{'minePower':invalid,'mineCapacity':invalid}})
      assert state(p)['minePower']==0 and state(p)['mineCapacityMark']==1
      assert not err,err
      fresh.close()
    print('PASS: ordnance upgrades persist, new captains remain new, malformed new upgrade values are safely migrated')

    fixture(page,depth=400,upgrades={'minePower':0,'mineCapacity':1})
    assert not drop(page) and state(page)['deployedMines']==0
    fixture(page,depth=4,upgrades={'minePower':1})
    assert not drop(page) and state(page)['mineAmmo']==2
    fixture(page,depth=400,facing=0,rocks=[{'dx':-55,'dy':0,'radius':55}])
    assert not drop(page) and state(page)['mineAmmo']==2
    f=fixture(page,depth=400,facing=math.pi/2,predators=[{'dx':0,'dy':-90}])
    assert drop(page)
    d=detail(page);m=d['mines'][0]
    assert abs(m['x']-f['x'])<.0001 and abs(m['y']-(f['y']-54))<.0001
    assert m['damage']==60 and m['mark']==1 and abs(m['armedAt']-.65)<.0001
    assert not drop(page) and state(page)['mineAmmo']==1
    step(page,.64);assert state(page)['deployedMines']==1 and detail(page)['predators'][0]['health']==100
    step(page,.02);s=state(page)
    assert s['deployedMines']==0 and detail(page)['predators'][0]['health']==40
    assert s['hull']==s['maxHull'],'Own blast must not harm the submarine'
    print('PASS: purchase/dock/blocked-stern guards, astern placement, arming delay, cooldown, proximity damage and no friendly fire')

    # All twelve damage-versus-health combinations, including deaths.
    for mark,damage in [(1,60),(2,110),(3,180),(4,240)]:
      for tier,hp in [('common',100),('apex',200),('reaper',400)]:
        fixture(page,depth=1100,upgrades={'minePower':mark},
          predators=[{'dx':0,'dy':-95,'tier':tier}],
          mines=[{'dx':0,'dy':-70,'mark':mark,'damage':damage}])
        step(page,.02);d=detail(page)
        expected=max(0,hp-damage)
        if expected:
          assert len(d['predators'])==1 and d['predators'][0]['health']==expected,(mark,tier,d)
        else:
          assert not d['predators'] and state(page)['kills']==1,(mark,tier,d)
        assert not d['mines'] and state(page)['hull']==state(page)['maxHull']
        hp_after=[e['health'] for e in d['predators']]
        step(page,.04)
        assert [e['health'] for e in detail(page)['predators']]==hp_after,'A detonated mine may damage only once'
    print('PASS: every warhead/predator health pairing, one damage application, kills and removal of dead hunters')

    fixture(page,depth=1100,predators=[{'dx':0,'dy':-100},{'dx':60,'dy':-140,'tier':'apex'},{'dx':160,'dy':-80,'tier':'reaper'}],
      mines=[{'dx':0,'dy':-70,'damage':180,'mark':3}])
    page.evaluate('AbyssDiagnostics.ping()')
    step(page,.02)
    d=detail(page)
    assert len(d['predators'])==2 and d['predators'][0]['health']==20 and d['predators'][1]['health']==400,d
    assert state(page)['kills']==1
    # Crossing from one side to the other in one simulated frame must trigger.
    f=fixture(page,depth=1100)
    fixture(page,depth=1100,predators=[{'dx':160,'dy':-80,'previousX':f['x']-160,'previousY':f['y']-80}],
      mines=[{'dx':0,'dy':-80}])
    page.evaluate('AbyssDiagnostics.pulseMines(.045)')
    assert state(page)['deployedMines']==0 and detail(page)['predators'][0]['health']==40
    print('PASS: area damage respects blast range and swept proximity catches fast cross-frame contacts')

    # Real keyboard repeat, all gameplay overlays and dock-only replenishment.
    fixture(page,depth=400,upgrades={'minePower':1,'mineCapacity':1,'engine':0})
    page.evaluate('AbyssDiagnostics.unfreeze()');page.keyboard.down('f')
    assert state(page)['mineAmmo']==1
    page.wait_for_timeout(1250);page.keyboard.down('f')
    assert state(page)['mineAmmo']==1,'Held/repeat F must not continuously consume mines'
    page.keyboard.up('f');page.keyboard.press('f')
    assert state(page)['mineAmmo']==0 and state(page)['deployedMines']==2
    page.keyboard.press('f');assert state(page)['mineAmmo']==0
    page.keyboard.press('Escape');frozen=detail(page)
    page.wait_for_timeout(200);page.keyboard.press('f')
    assert detail(page)['clock']==frozen['clock'] and state(page)['mineAmmo']==0
    page.locator('#pauseMenuBtn').click();page.keyboard.press('f')
    assert state(page)['mineAmmo']==0
    page.locator('#startBtn').click()
    assert state(page)['mineAmmo']==0
    step(page,10);assert state(page)['mineAmmo']==0 and state(page)['deployedMines']==2
    fixture(page,depth=400,mineAmmo=1,items=[{'dx':0,'dy':0,'type':'air'}])
    page.evaluate('AbyssDiagnostics.unfreeze()');page.keyboard.press('e');page.keyboard.press('r');page.keyboard.press('q')
    step(page,3,['s',' ']);assert state(page)['mineAmmo']==1
    page.evaluate('AbyssDiagnostics.fixture({x:600,y:160});AbyssDiagnostics.unfreeze()')
    assert state(page)['mineAmmo']==1
    page.keyboard.press('e');assert state(page)['mineAmmo']==2
    page.locator('#launchAgain').click()
    print('PASS: F repeat/empty guards, pause freezes mines, menu/resume retains ammo, no passive/cache/repair/sonar/boost refills, physical dock refills')

    # Defeated contacts cannot reappear in an in-flight sonar scan.
    fixture(page,depth=1100,lights=False,predators=[{'dx':0,'dy':-85,'health':10}],mines=[{'dx':0,'dy':-70}])
    page.evaluate('AbyssDiagnostics.ping()');step(page,.25)
    assert state(page)['predators']==0 and state(page)['kills']==1
    step(page,8)
    assert page.evaluate(PIXEL_MAX)['max']==0
    # Bars, mine lamps and blast particles all remain below the darkness mask.
    fixture(page,depth=1100,lights=False,predators=[{'dx':140,'dy':-100,'tier':'reaper','health':145}],mines=[{'dx':-80,'dy':60}])
    assert page.evaluate(PIXEL_MAX)['max']==0
    page.evaluate('AbyssDiagnostics.ping()');step(page,.5)
    assert page.evaluate(PIXEL_MAX)['lit']>100
    assert detail(page)['mines'][0]['revealUntil']>detail(page)['clock']
    page.screenshot(path=str(OUT/'desktop-health-and-mines.png'))
    assert not errors,errors
    context.close()
    print('PASS: dead sonar contacts stay gone, health bars/mines obey blackout, sonar reveals both on arrival')

    # Actual multi-touch events: steer + boost + mine, plus simultaneous salvage.
    for width,height in [(390,844),(844,390),(320,740)]:
      context,page,errors=launch(browser,width,height,True)
      fixture(page,depth=400,upgrades={'minePower':2,'mineCapacity':3},items=[{'dx':0,'dy':65}])
      page.evaluate('AbyssDiagnostics.unfreeze()')
      bounds={k:page.locator('#'+k).bounding_box() for k in ['mobileJoystick','mobileMine','mobileBoost','mobileInteract']}
      for key,b in bounds.items():
        assert b and b['x']>=0 and b['y']>=0 and b['x']+b['width']<=width+.5 and b['y']+b['height']<=height+.5,(key,b)
        if key!='mobileJoystick':
          assert page.evaluate('([x,y])=>document.elementFromPoint(x,y).closest("button")?.id',[b['x']+b['width']/2,b['y']+b['height']/2])==key
      def center(key):
        b=bounds[key];return round(b['x']+b['width']/2),round(b['y']+b['height']/2)
      jx,jy=center('mobileJoystick');mx,my=center('mobileMine');bx,by=center('mobileBoost');ux,uy=center('mobileInteract')
      assert bounds['mobileMine']['x']+bounds['mobileMine']['width']<bounds['mobileJoystick']['x']
      cdp=context.new_cdp_session(page)
      def touch(kind,points):
        cdp.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':[{'id':i,'x':x,'y':y} for i,x,y in points]})
      touch('touchStart',[(1,jx,jy)]);touch('touchMove',[(1,jx,jy+35)])
      touch('touchStart',[(1,jx,jy+35),(2,bx,by)])
      touch('touchStart',[(1,jx,jy+35),(2,bx,by),(3,mx,my)])
      touch('touchStart',[(1,jx,jy+35),(2,bx,by),(3,mx,my),(4,ux,uy)])
      page.wait_for_timeout(300)
      s=state(page)
      assert s['mineAmmo']==5 and s['deployedMines']==1 and s['joystickY']>.5 and s['boostHeld'] and s['boosting'] and s['useHeld'],s
      assert detail(page)['player']['cargo']['scrap']==1
      touch('touchEnd',[]);page.wait_for_timeout(100)
      assert state(page)['mineAmmo']==5,'Touch release must not fire a duplicate mine'
      assert not state(page)['boostHeld'] and not state(page)['useHeld'] and state(page)['joystickY']==0
      # Screenshot of the actual rendered mine/health UI and its sonar layer.
      fixture(page,depth=1100,lights=True,facing=math.pi/2,upgrades={'minePower':3,'mineCapacity':3},mineAmmo=4,
        predators=[{'dx':-72,'dy':-200,'tier':'reaper','health':220},{'dx':105,'dy':35,'tier':'apex','health':90}],
        mines=[{'dx':0,'dy':-60,'mark':3,'damage':180,'armedAt':10},{'dx':-20,'dy':-120,'mark':2,'damage':110,'armedAt':10}],
        rocks=[{'dx':-135,'dy':-160,'radius':35},{'dx':110,'dy':160,'radius':42}],
        items=[{'dx':-55,'dy':100,'type':'crystal'},{'dx':80,'dy':120,'type':'recorder','index':4}])
      page.evaluate('AbyssDiagnostics.ping()');step(page,.5)
      page.screenshot(path=str(OUT/f'mobile-{width}x{height}-mines.png'))
      assert not errors,errors
      context.close()
      print(f'PASS: {width}x{height} actual four-touch steer + boost + mine + salvage; no duplicate shot; hit-tested layout')
    browser.close()

if __name__=='__main__':
    run()
