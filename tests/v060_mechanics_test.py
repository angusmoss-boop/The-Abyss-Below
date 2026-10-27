"""v0.6.0 helm, capacitor boost, travelling sonar, tier-3 and nameplate tests.

Run: python tests/v060_mechanics_test.py
Uses Chromium and Playwright. Simulation checks use fixed 1/60-second steps;
real pointer/touch checks exercise browser capture and independent touch IDs.
"""
from pathlib import Path
import json
import math
import shutil
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'screenshots'/'v0.6.0'
OUT.mkdir(parents=True,exist_ok=True)


def launch(browser, width=1440, height=900, mobile=False):
    context=browser.new_context(viewport={'width':width,'height':height},
        is_mobile=mobile,has_touch=mobile,device_scale_factor=2 if mobile else 1,
        service_workers='block')
    page=context.new_page();page.set_default_timeout(5000);errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content((ROOT/'index.html').read_text())
    page.add_style_tag(content=(ROOT/'styles.css').read_text())
    page.evaluate('''seed=>{
      const store={'the-abyss-below-v01':JSON.stringify(seed)};
      Object.defineProperty(window,'localStorage',{configurable:true,value:{
        getItem:k=>store[k]??null,setItem:(k,v)=>store[k]=v,removeItem:k=>delete store[k]}});
      window.ABYSS_TEST_MODE=true;
    }''',{'credits':650,'xp':200,'secured':[0,1],'upgrades':{'hull':7}})
    page.add_script_tag(content=(ROOT/'game.js').read_text())
    page.locator('#startBtn').click();page.wait_for_timeout(100)
    return context,page,errors


def fixture(page, **kw):
    return page.evaluate('config=>AbyssDiagnostics.simulationFixture(config)',kw)


def step(page,seconds,keys=()):
    return page.evaluate('([s,k])=>AbyssDiagnostics.step(s,{heldKeys:k})',[seconds,list(keys)])


def state(page):
    return page.evaluate('AbyssDiagnostics.state()')


def detail(page):
    return page.evaluate('AbyssDiagnostics.debug()')


PIXEL_MAX='''() => {
  AbyssDiagnostics.renderWorld();
  const c=document.getElementById('gameCanvas'),p=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
  let max=0,lit=0;for(let i=0;i<p.length;i+=4){max=Math.max(max,p[i],p[i+1],p[i+2]);if(p[i]+p[i+1]+p[i+2])lit++;}
  return {max,lit};
}'''


def run():
  with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path=shutil.which('chromium'))
    context,page,errors=launch(browser)
    # Spawn ratios and attributes are deliberately explicit, rather than RNG-dependent.
    full=detail(page);s=state(page);tiers=page.evaluate('AbyssDiagnostics.tiers()')
    assert (s['commonCount'],s['apexCount'],s['reaperCount'])==(46,11,5),s
    assert all(800<=(e['homeY']-120)/10<=1800 for e in full['predators'] if e['tier']=='reaper')
    assert tiers['reaper']['speed']>tiers['apex']['speed']>tiers['common']['speed']
    assert tiers['reaper']['damage']>tiers['apex']['damage']>tiers['common']['damage']
    assert s['secured']==2 and s['credits']==650
    assert s['vesselLabel']=='NEREID // MK-II · LIMIT 1,530m'
    print('PASS: 46/11/5 spawn rarity; reapers below 800m; speed/damage ordering; banked save and rated nameplate')

    # Fixed-step velocity and expenditure, no browser timing dependency.
    fixture(page,depth=400)
    normal=step(page,1.0,['s'])
    fixture(page,depth=400)
    boosted=step(page,1.0,['s',' '])
    assert boosted['vy']>normal['vy']*1.8,(normal,boosted)
    assert abs(boosted['boost']-75)<.01,boosted
    assert abs((normal['battery']-boosted['battery'])-7)<.01,(normal,boosted)
    assert boosted['boosting']
    # Stopping early leaves remaining charge usable, with a genuine recharge delay.
    before=boosted['boost'];cool=step(page,1.0)
    assert abs(cool['boost']-before)<.01,cool
    recovered=step(page,1.5)
    assert abs(recovered['boost']-87.5)<.01,recovered
    assert recovered['battery']<cool['battery'], 'Recharge must not create ship power'
    fixture(page,depth=400)
    empty=step(page,4.0,['s',' ']);assert empty['boost']==0 and empty['boostLocked'],empty
    held=step(page,9.5,[' ']);assert held['boost']==100 and not held['boostLocked'] and held['boostNeedsRelease'],held
    held_again=step(page,.2,['s',' ']);assert not held_again['boosting'],held_again
    step(page,.05);assert step(page,.2,['s',' '])['boosting']
    fixture(page,depth=400,battery=.5)
    powerless=step(page,1,['s',' ']);assert not powerless['boosting'] and powerless['boost']==100,powerless
    fixture(page,depth=400)
    idle=step(page,1,[' ']);assert idle['boost']==100 and abs(idle['vy'])<.001,idle
    print('PASS: 1.85x boost, 7 power/s, 4s charge, 1.5s delay, full recharge lock, release-to-rearm and powerless/idle guards')

    fixture(page,depth=400,upgrades={'battery':5},battery=250)
    efficient=step(page,1,['s',' '])
    assert abs((250-efficient['battery'])-(7+.093)/1.6)<.02,efficient
    step(page,1.5)
    charged=step(page,1)
    assert abs(charged['boost']-93.75)<.01,charged
    fixture(page,depth=400,upgrades={'battery':0})
    loud=step(page,1,['s',' ','shift'])
    assert loud['boosting'] and not detail(page)['player']['quiet']
    print('PASS: power upgrades reduce boost draw and accelerate recharge; boost cannot be silent')

    # Rock blocking remains correct at upgraded, boosted speed.
    start=fixture(page,depth=400,facing=0,upgrades={'engine':4},rocks=[{'dx':150,'dy':0,'radius':80}])
    blocked=step(page,2,['d',' '])
    assert blocked['x']<start['x']+90,(start,blocked)
    assert blocked['hull']>0
    fixture(page,depth=400,upgrades={'engine':0})
    print('PASS: boosted maximum-engine submarine does not tunnel through a boulder')

    # Pause retains cooldown/energy, and resets held input rather than restarting boost.
    page.evaluate('AbyssDiagnostics.unfreeze()')
    page.keyboard.down('s');page.keyboard.down('Space');page.wait_for_timeout(200)
    page.keyboard.press('Escape')
    frozen=state(page);page.wait_for_timeout(180);still=state(page)
    assert frozen['paused'] and frozen['boost']==still['boost'] and frozen['battery']==still['battery']
    assert not frozen['boosting']
    page.keyboard.up('Space');page.keyboard.up('s');page.locator('#resumeBtn').click()
    page.wait_for_timeout(60);assert not state(page)['boosting']
    print('PASS: pause freezes charge and power and resume cannot leave boost held')

    # Real PC press, drag, outside-canvas release, cancellation and pause.
    base=fixture(page,depth=400)
    page.evaluate('AbyssDiagnostics.unfreeze()')
    box=page.locator('#gameCanvas').bounding_box()
    cx=box['x']+box['width']/2;cy=box['y']+box['height']*.52
    page.mouse.move(cx+180,cy+20);page.mouse.down();page.wait_for_timeout(280)
    right=state(page)
    assert right['mouseHeld'] and right['x']>base['x']+8 and right['vx']>45,right
    page.mouse.move(cx,cy+190,steps=4);page.wait_for_timeout(250)
    down=state(page);assert down['vy']>45 and down['facing']>.6,down
    page.mouse.move(box['x']+box['width']+70,cy);page.mouse.up()
    assert not state(page)['mouseHeld']
    page.wait_for_timeout(950);stopped=state(page);assert math.hypot(stopped['vx'],stopped['vy'])<9,stopped
    page.mouse.move(cx+150,cy);page.mouse.down();page.keyboard.press('Escape')
    assert state(page)['paused'] and not state(page)['mouseHeld']
    page.mouse.up();page.locator('#resumeBtn').click()
    page.mouse.move(cx+150,cy);page.mouse.down()
    page.evaluate("window.dispatchEvent(new Event('blur'))")
    assert not state(page)['mouseHeld'];page.mouse.up()
    # Clicking HUD controls must not engage the helm, and touch on open water must not either.
    page.locator('#helpBtn').click();assert not state(page)['mouseHeld'];page.locator('#modalClose').click()
    page.locator('#gameCanvas').dispatch_event('pointerdown',{'pointerType':'touch','pointerId':77,'button':0,'clientX':cx,'clientY':cy})
    assert not state(page)['mouseHeld']
    print('PASS: real click-drag steering, bow aim, release outside canvas, pause, blur and HUD/touch separation')

    # Actual wave crossing, screen-covering range, and independently fading echoes.
    f=fixture(page,depth=1100,items=[{'dx':90,'dy':0,'type':'scrap'},{'dx':300,'dy':0,'type':'recorder','index':4},
        {'dx':-210,'dy':-90,'type':'air'},{'dx':430,'dy':180,'type':'crystal'}],
        rocks=[{'dx':-160,'dy':50}],wrecks=[{'dx':200,'dy':120,'index':4}],vents=[{'dx':-160,'dy':-180}],
        predators=[{'dx':-300,'dy':120,'tier':'reaper'}])
    assert page.evaluate(PIXEL_MAX)['max']==0
    page.evaluate('AbyssDiagnostics.ping()');d=detail(page);initial=state(page)
    assert all(i['revealUntil']==0 for i in d['items']),d['items']
    assert initial['scanCooldown']>0 and initial['battery']==88,initial
    assert d['sonarWaves'][0]['radius']>math.hypot(f['viewport']['w']/2,f['viewport']['h']*.52)
    page.evaluate('AbyssDiagnostics.ping()')
    assert state(page)['battery']==88 and len(detail(page)['sonarWaves'])==1
    step(page,.10);assert all(i['revealUntil']==0 for i in detail(page)['items'])
    step(page,.10);d=detail(page)
    assert d['items'][0]['revealUntil']>d['clock'] and d['items'][1]['revealUntil']==0,d['items']
    step(page,.8);d=detail(page)
    assert all(i['revealUntil']>d['clock'] for i in d['items'])
    assert all(x['revealUntil']>d['clock'] for kind in ['rocks','wrecks','vents','predators'] for x in d[kind])
    assert d['sonarTerrainEchoes']
    assert page.evaluate(PIXEL_MAX)['lit']>300,'Echoes must be visible above total blackout'
    # Pixel inspection is a real rendered frame, not a text-only state assertion.
    page.screenshot(path=str(OUT/'desktop-1100m-sonar.png'))
    step(page,7)
    assert not detail(page)['sonarWaves'] and state(page)['scanCooldown']==0
    assert page.evaluate(PIXEL_MAX)['max']==0,'Expired sonar must leave the lights-off world pitch black'
    assert page.locator('#sonarButtonLabel').inner_text()=='PING'
    fixture(page,depth=1100,battery=3)
    page.evaluate('AbyssDiagnostics.ping()');assert not detail(page)['sonarWaves']
    assert state(page)['battery']==3
    print('PASS: sonar reveals on arrival (not at cast), covers corners, reaches every object class, expires into black and enforces power/cooldown')

    # Upgrade semantics and a physically larger viewport still receive full coverage.
    fixture(page,depth=1100,upgrades={'sonar':4})
    page.evaluate('AbyssDiagnostics.ping()')
    upgraded=detail(page);assert state(page)['battery']==96
    assert abs(upgraded['sonarWaves'][0]['echoSeconds']-6.3)<.001
    assert state(page)['scanCooldown']<5.5
    page.set_viewport_size({'width':2560,'height':1440});page.wait_for_timeout(100)
    fixture(page,depth=1100,upgrades={'sonar':0})
    page.evaluate('AbyssDiagnostics.ping()');d=detail(page)
    assert d['sonarWaves'][0]['radius']>=math.hypot(d['viewport']['w']/2,d['viewport']['h']*.52)
    page.set_viewport_size({'width':1440,'height':900});page.wait_for_timeout(60)
    print('PASS: sonar upgrades and 2560px desktop viewport coverage')

    # Tier-3 hit, pursuit leash and safe upper-depth boundary.
    fixture(page,depth=1000,predators=[{'dx':25,'dy':0,'tier':'reaper','aggression':1,'alertUntil':999}])
    hit=step(page,.05);assert hit['hull']==296-42,hit
    fixture(page,depth=1000,predators=[{'dx':0,'dy':670,'tier':'reaper','aggression':1,'alertUntil':999}])
    step(page,.05);assert detail(page)['predators'][0]['aggression']==0
    fixture(page,depth=780,predators=[{'dx':0,'dy':200,'tier':'reaper','aggression':1,'alertUntil':999,'vy':-100}])
    step(page,1);pred=detail(page)['predators'][0];assert pred['y']>=8120,pred
    # Label pressure state is independent of lamps and selected hull upgrade.
    fixture(page,depth=120,upgrades={'hull':0})
    assert state(page)['vesselLabel'].endswith('130m')
    fixture(page,depth=1100,upgrades={'hull':7})
    assert state(page)['vesselLabel'].endswith('1,530m')
    assert state(page)['secured']==2 and state(page)['credits']==650
    assert not errors,errors
    context.close()
    print('PASS: reaper 42-damage hit, finite leash, 800m boundary and dynamic hull label')

    # True multi-touch via Chromium's input stack, not synthetic pointerdown calls.
    for width,height in [(390,844),(844,390),(320,740)]:
      context,page,errors=launch(browser,width,height,True)
      f=fixture(page,depth=400,items=[{'dx':0,'dy':70,'type':'scrap'}])
      page.evaluate('AbyssDiagnostics.unfreeze()')
      joy=page.locator('#mobileJoystick').bounding_box();boost=page.locator('#mobileBoost').bounding_box();use=page.locator('#mobileInteract').bounding_box()
      assert boost and boost['y']+boost['height']<=height and boost['x']+boost['width']<=width
      assert use['x']+use['width']<joy['x']
      cx=round(joy['x']+joy['width']/2);cy=round(joy['y']+joy['height']/2)
      bx=round(boost['x']+boost['width']/2);by=round(boost['y']+boost['height']/2)
      ux=round(use['x']+use['width']/2);uy=round(use['y']+use['height']/2)
      # DOM hit testing rules out pretty but unclickable landscape controls.
      assert page.evaluate('([x,y])=>document.elementFromPoint(x,y).closest("button")?.id',[bx,by])=='mobileBoost'
      cdp=context.new_cdp_session(page)
      def touch(kind,points):
        cdp.send('Input.dispatchTouchEvent',{'type':kind,'touchPoints':[{'x':x,'y':y,'id':i} for i,x,y in points]})
      touch('touchStart',[(1,cx,cy)])
      touch('touchMove',[(1,cx,cy+35)])
      touch('touchStart',[(1,cx,cy+35),(2,bx,by)])
      touch('touchStart',[(1,cx,cy+35),(2,bx,by),(3,ux,uy)])
      page.wait_for_timeout(330)
      s=state(page)
      assert s['boostHeld'] and s['boosting'] and s['joystickY']>.5 and s['useHeld'],s
      assert detail(page)['player']['cargo']['scrap']==1,detail(page)['player']
      assert s['battery']<99 and s['boost']<99
      touch('touchEnd',[]);page.wait_for_timeout(70)
      assert not state(page)['boostHeld'] and not state(page)['useHeld'] and state(page)['joystickY']==0
      # Mobile dark sonar preview with all three tiers behind the lamp.
      fixture(page,depth=1100,facing=math.pi/2,lights=False,
        items=[{'dx':65,'dy':-65,'type':'recorder','index':4},{'dx':-90,'dy':115,'type':'crystal'},{'dx':70,'dy':140,'type':'air'}],
        rocks=[{'dx':-145,'dy':-125,'radius':42},{'dx':145,'dy':120,'radius':35}],
        predators=[{'dx':-90,'dy':-155,'tier':'reaper'},{'dx':125,'dy':50,'tier':'apex'},{'dx':-90,'dy':70,'tier':'common'}],
        wrecks=[{'dx':60,'dy':-65,'index':4}])
      page.evaluate('AbyssDiagnostics.ping()');step(page,.7)
      page.screenshot(path=str(OUT/f'mobile-{width}x{height}-sonar.png'))
      assert page.evaluate(PIXEL_MAX)['lit']>150
      assert not errors,errors
      context.close()
      print(f'PASS: {width}x{height} three-finger joystick + boost + salvage, release cleanup and deep sonar rendering')
    browser.close()

if __name__=='__main__':run()
