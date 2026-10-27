"""v0.8.0 unified cockpit, circular actions, desktop legend and live state tests.

Runs production HTML/CSS/JS with seeded test fixtures in Chromium. Touch checks
use browser hit-testing and CDP events, not direct calls to input handlers.
"""
from pathlib import Path
from itertools import combinations
import json, shutil, os
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'screenshots'/'v0.8.0'; OUT.mkdir(parents=True,exist_ok=True)
ACTIONS=['mobileInteract','mobileBoost','mobileSonar','mobileMine','mobileRepair','mobileSilent','mobileLights','mobileCruise']
SECONDARY=ACTIONS[2:]

def open_game(browser,w,h,touch=False):
    context=browser.new_context(viewport={'width':w,'height':h},is_mobile=touch,has_touch=touch,device_scale_factor=2 if touch else 1,service_workers='block')
    page=context.new_page();page.set_default_timeout(5000);errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content((ROOT/'index.html').read_text())
    page.add_style_tag(content=(ROOT/'styles.css').read_text())
    page.evaluate('''()=>{window.ABYSS_TEST_MODE=true;const store={'the-abyss-below-v01':JSON.stringify({credits:675,xp:330,secured:[0,1],upgrades:{hull:4,battery:3,minePower:3,mineCapacity:3}})};
      Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>store[k]??null,setItem:(k,v)=>store[k]=v,removeItem:k=>delete store[k]}});}''')
    page.add_script_tag(content=(ROOT/'game.js').read_text());page.locator('#startBtn').click();page.wait_for_timeout(60)
    return context,page,errors

def fixture(page,**kwargs):
    return page.evaluate('opts=>AbyssDiagnostics.simulationFixture(opts)',kwargs)
def state(page):return page.evaluate('AbyssDiagnostics.state()')
def details(page):return page.evaluate('AbyssDiagnostics.debug()')
def rect(page,selector):return page.locator(selector).bounding_box()
def centre(r):return (r['x']+r['width']/2,r['y']+r['height']/2)
def overlaps(a,b,pad=0):
    return a['x']<b['x']+b['width']+pad and a['x']+a['width']+pad>b['x'] and a['y']<b['y']+b['height']+pad and a['y']+a['height']+pad>b['y']
def scene(page,depth=415):
    fixture(page,depth=depth,facing=.30,lights=True,battery=174,boost=72,mineAmmo=4,upgrades={'minePower':3,'mineCapacity':3},
      items=[{'dx':100,'dy':40,'type':'crystal'},{'dx':180,'dy':-10,'type':'scrap'}],
      rocks=[{'dx':-140,'dy':-25,'radius':46},{'dx':190,'dy':115,'radius':37},{'dx':250,'dy':-130,'radius':65}],
      predators=[{'dx':145,'dy':75,'tier':'apex'}])

def inspect_layout(page,w,h,touch):
    assert page.locator('.cockpit-hud').is_visible()
    assert page.locator('#vesselName').inner_text()=='NEREID'
    assert page.locator('#vesselMark').inner_text()=='MK II'
    assert page.locator('#ratingStat').inner_text()=='930'
    assert page.locator('.stats-line,.systems-bar,.focus-hud,.vignette-label').count()==0
    ids=page.locator('[id]').evaluate_all('(els)=>els.map(e=>e.id)')
    assert len(ids)==len(set(ids)), 'Duplicate element IDs'
    hud=rect(page,'.cockpit-hud');view=rect(page,'.viewport')
    assert hud['x']>=view['x'] and hud['x']+hud['width']<=view['x']+view['width']
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'), (w,h,'horizontal overflow')
    # Text spans/values must fit their own reference or system card.
    clipped=page.locator('.reference-tab,.instrument-tab,.cockpit-context').evaluate_all('''els=>els.flatMap(e=>[...e.querySelectorAll('span,strong,small')].filter(n=>getComputedStyle(n).display!=='none' && n.getBoundingClientRect().width>0).filter(n=>{const a=n.getBoundingClientRect(),b=e.getBoundingClientRect();return a.left<b.left-1||a.right>b.right+1;}).map(n=>({text:n.textContent,card:e.id||e.className})))''')
    assert not clipped,(w,h,clipped)
    if touch:
      assert page.locator('.desktop-keybinds').is_hidden()
      assert page.locator('.mobile-controls').is_visible()
      joy=rect(page,'#mobileJoystick');assert joy['x']>w/2
      rects={id:rect(page,'#'+id) for id in ACTIONS}
      for id,r in rects.items():
        assert abs(r['width']-r['height'])<.5,(id,r)
        assert r['width']>=44,(id,r)
        assert page.locator('#'+id).evaluate('e=>getComputedStyle(e).borderRadius')=='50%'
        assert r['x']>=0 and r['y']>hud['y']+hud['height'],(w,h,id,r,hud)
        assert r['x']+r['width']<=w/2+1,(w,h,id,r)
        assert r['y']+r['height']<=h,(id,r)
        assert r['x']+r['width']+8<joy['x'],(w,h,id,r,joy)
        assert page.evaluate('([id,x,y])=>document.elementFromPoint(x,y)?.closest("button")?.id===id',[id,*centre(r)]),(w,h,id,'hit target')
      for a,b in combinations(ACTIONS,2):assert not overlaps(rects[a],rects[b],2),(w,h,a,b)
      assert rects['mobileInteract']['width']>rects['mobileBoost']['width']>max(rects[id]['width'] for id in SECONDARY)
    else:
      assert page.locator('.mobile-controls').is_hidden()
      assert page.locator('.desktop-keybinds').is_visible()
      keys=page.locator('.desktop-keybinds kbd').all_inner_texts()
      for k in ['MOUSE','WASD','E','SPACE','Q','F','R','L','SHIFT','ESC']:assert k in keys
      assert page.locator('#mineDeployBtn').count()==0, 'Top readout must not deploy mines'
    return hud

def run():
  with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,executable_path=shutil.which('chromium'))
    group=os.environ.get('ABYSS_TEST_GROUP','all')
    sizes=[(320,568),(320,740),(360,780),(390,844),(430,932),(568,320),(640,360),(844,390),(915,412),(768,1024),(1024,768)]
    sizes=sizes if group=='all' else sizes[:5] if group=='touch-small' else sizes[5:] if group=='touch-wide' else []
    for w,h in sizes:
      context,page,errors=open_game(browser,w,h,True);scene(page)
      page.wait_for_timeout(70);inspect_layout(page,w,h,True)
      fixture(page,depth=1500,upgrades={'hull':4,'minePower':0},battery=0)
      page.wait_for_timeout(35);inspect_layout(page,w,h,True)
      scene(page)
      assert state(page)['inputMode']=='touch' and state(page)['focusMode']
      if (w,h) in [(320,740),(390,844),(844,390),(1024,768)]:
        # A frozen frame with live button states, then stop RAF to make captures deterministic.
        page.evaluate('AbyssDiagnostics.unfreeze();requestAnimationFrame=()=>0');page.wait_for_timeout(160)
        page.evaluate('AbyssDiagnostics.step(0,{freezeAfter:false})')
        page.screenshot(path=str(OUT/f'mobile-{w}x{h}.png'))
      assert not errors,errors;context.close()
      print('PASS circular touch geometry, left-only actions, right helm, unclipped HUD:',w,h)

    for w,h in ([(390,844),(800,700),(1024,768),(1440,900),(1920,1080)] if group in ['all','desktop'] else []):
      context,page,errors=open_game(browser,w,h);scene(page);page.wait_for_timeout(70)
      inspect_layout(page,w,h,False)
      assert state(page)['inputMode']=='desktop' and not state(page)['focusMode']
      page.locator('#focusToggleBtn').click();page.wait_for_timeout(70);scene(page)
      inspect_layout(page,w,h,False)
      if w==1440:
        page.evaluate('AbyssDiagnostics.unfreeze();requestAnimationFrame=()=>0');page.wait_for_timeout(160)
        page.evaluate('AbyssDiagnostics.step(0,{freezeAfter:false})')
        page.screenshot(path=str(OUT/'desktop-1440x900-focus.png'))
      assert not errors,errors;context.close()
      print('PASS desktop legend, no touch pads at narrow/wide sizes; console and immersive:',w,h)

    if group not in ['all','live']:
      browser.close();return
    context,page,errors=open_game(browser,390,844,True)
    fixture(page,depth=1000,lights=False,upgrades={'hull':0})
    assert page.locator('#ratingStat').inner_text()=='130'
    assert 'alert' in page.locator('#pressureTab').get_attribute('class')
    assert 'PRESSURE ALERT' in page.locator('#statusStat').inner_text()
    assert page.locator('#vesselName').is_visible()
    # No label remains above the submarine on the world canvas, even during a running dive.
    maxpixel=page.evaluate('''()=>{const c=document.querySelector('#gameCanvas'),a=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let m=0;for(let i=0;i<a.length;i+=4)m=Math.max(m,a[i],a[i+1],a[i+2]);return m;}''')
    assert maxpixel==0,maxpixel
    fixture(page,depth=1000,lights=False,upgrades={'hull':7})
    assert page.locator('#ratingStat').inner_text()=='1,530'
    assert 'alert' not in page.locator('#pressureTab').get_attribute('class')
    page.screenshot(path=str(OUT/'mobile-1000m-lights-off.png'))
    print('PASS vessel identity/pressure remain at top in blackout, upgrade immediately, warn beyond rating; world canvas has no nameplate')

    fixture(page,depth=400,upgrades={'minePower':3,'mineCapacity':3},mineAmmo=4,boost=72,battery=170)
    page.evaluate('AbyssDiagnostics.unfreeze()')
    page.locator('#mobileSonar').tap();page.wait_for_timeout(160)
    assert state(page)['scanCooldown']>0
    assert page.locator('#sonarText').inner_text().endswith('s')
    assert page.locator('#sonarButtonLabel').inner_text().endswith('s')
    ring=float(page.locator('#mobileSonar').evaluate("e=>e.style.getPropertyValue('--ring')"))
    assert 0<ring<30,ring
    page.evaluate('AbyssDiagnostics.step(7)')
    assert page.locator('#sonarText').inner_text()=='READY'
    assert page.locator('#sonarButtonLabel').inner_text()=='READY'
    assert page.locator('#mobileSonar').evaluate("e=>e.style.getPropertyValue('--ring')")=='100'
    # Toggling must preserve nested SVG/label markup, unlike the former text-only cruise control.
    page.evaluate('AbyssDiagnostics.unfreeze()');page.locator('#mobileCruise').tap();page.wait_for_timeout(160)
    assert state(page)['cruiseEnabled'] and page.locator('#cruiseLabel').inner_text()=='ON'
    assert page.locator('#mobileCruise svg').count()==1
    page.locator('#mobileLights').tap();page.wait_for_timeout(160)
    assert page.locator('#lightsLabel').inner_text()=='ON'
    page.locator('#mobileSilent').tap();page.wait_for_timeout(160)
    assert page.locator('#mobileSilent').get_attribute('aria-pressed')=='true'
    page.locator('#mobileMine').tap();page.wait_for_timeout(160)
    assert state(page)['mineAmmo']==3
    assert page.locator('#mineAmmoValue').inner_text()=='3/6' and page.locator('#mobileMineLabel').inner_text()=='3/6'
    page.locator('#focusPauseBtn').tap();assert state(page)['paused']
    assert page.locator('#cruiseLabel').inner_text()=='OFF' and page.locator('#mobileCruise svg').count()==1
    page.locator('#resumeBtn').tap()
    assert not state(page)['boostHeld'] and not state(page)['useHeld'] and state(page)['joystickX']==0
    print('PASS live sonar timers/rings, mine ammo, cruise/lamp/silent states and pause input cleanup')

    # Rotate without reloading; HUD geometry and saved progression must remain intact.
    page.set_viewport_size({'width':844,'height':390});page.wait_for_timeout(100)
    fixture(page,depth=400,upgrades={'hull':4})
    inspect_layout(page,844,390,True)
    assert state(page)['credits']==675 and state(page)['secured']==2
    # Hit-test navigation controls and confirm it is still possible to exit/re-enter play view.
    page.locator('#focusToggleBtn').tap();page.wait_for_timeout(80)
    assert not state(page)['focusMode'] and page.locator('.sidebar').is_visible()
    page.locator('#focusToggleBtn').tap();page.wait_for_timeout(80)
    assert state(page)['focusMode']
    # Input capability, not window width, switches the controls. Input is cleared on switching.
    cdp=context.new_cdp_session(page)
    cdp.send('Emulation.setTouchEmulationEnabled',{'enabled':False});page.wait_for_timeout(100)
    assert state(page)['inputMode']=='desktop' and page.locator('.mobile-controls').is_hidden()
    assert page.locator('.desktop-keybinds').is_visible()
    cdp.send('Emulation.setTouchEmulationEnabled',{'enabled':True,'maxTouchPoints':5});page.wait_for_timeout(100)
    assert state(page)['inputMode']=='touch' and page.locator('#mobileJoystick').is_visible()
    assert not errors,errors
    print('PASS live orientation/input-mode switching, persistent banked progress, and fullscreen navigation')
    context.close();browser.close()

if __name__=='__main__':run()
