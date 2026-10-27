"""v0.4.0 pause/menu/new-game/end-of-dive and visual smoke checks."""
from pathlib import Path
import shutil,json
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]

def launch(browser, mobile=False, data=None):
    context=browser.new_context(viewport={'width':390 if mobile else 1440,'height':844 if mobile else 900},is_mobile=mobile,has_touch=mobile,device_scale_factor=2 if mobile else 1,service_workers='block')
    page=context.new_page();errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content((ROOT/'index.html').read_text())
    page.add_style_tag(content=(ROOT/'styles.css').read_text())
    page.evaluate('''(data)=>{const store={};if(data)store['the-abyss-below-v01']=data;
      Object.defineProperty(window,'localStorage',{configurable:true,value:{
      getItem:k=>store[k]??null,setItem:(k,v)=>store[k]=v,removeItem:k=>delete store[k]}});
      window.ABYSS_TEST_MODE=true;}''',json.dumps(data) if data else None)
    page.add_script_tag(content=(ROOT/'game.js').read_text())
    return context,page,errors

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path=shutil.which('chromium'),args=['--no-proxy-server','--proxy-bypass-list=<-loopback>'])
    ctx,page,errors=launch(browser,mobile=True)
    assert page.locator('#newGameBtn').is_visible()
    assert 'BEGIN EXPEDITION' in page.locator('#startBtn').inner_text()
    page.screenshot(path=str(ROOT/'v0.4.0-main-menu.png'))
    page.locator('#startBtn').click();page.wait_for_timeout(70)
    assert page.evaluate('AbyssDiagnostics.state().running')
    assert page.evaluate('AbyssDiagnostics.state().focusMode')
    # The new sprite has no separate image dependency; capture in play view.
    page.screenshot(path=str(ROOT/'v0.4.0-mobile-submarine.png'))
    page.locator('#focusPauseBtn').click();page.wait_for_timeout(60)
    state=page.evaluate('AbyssDiagnostics.state()')
    assert state['pauseOpen'] and state['paused']
    assert page.locator('#resumeBtn').is_visible() and page.locator('#pauseMenuBtn').is_visible() and page.locator('#quitBtn').is_visible()
    page.screenshot(path=str(ROOT/'v0.4.0-pause-menu.png'))
    page.locator('#resumeBtn').click()
    assert not page.evaluate('AbyssDiagnostics.state().paused')
    page.locator('#focusPauseBtn').click();page.locator('#pauseMenuBtn').click()
    state=page.evaluate('AbyssDiagnostics.state()')
    assert state['menuOpen'] and state['running'] and state['paused'] and not state['pauseOpen'],state
    assert 'CONTINUE' in page.locator('#startBtn').inner_text()
    # Pilot briefing from a suspended dive must not unpause game underneath the main menu.
    page.locator('#instructionsBtn').click();page.locator('#modalClose').click()
    assert page.evaluate('AbyssDiagnostics.state().paused')
    page.locator('#startBtn').click()
    assert not page.evaluate('AbyssDiagnostics.state().paused')
    page.locator('#focusPauseBtn').click();page.locator('#quitBtn').click()
    assert 'ABANDON THIS DIVE?' in page.locator('#modalTitle').inner_text()
    page.locator('#cancelQuitBtn').click()
    assert page.evaluate('AbyssDiagnostics.state().pauseOpen')
    page.locator('#quitBtn').click();page.locator('#confirmQuitBtn').click()
    assert not page.evaluate('AbyssDiagnostics.state().running')
    assert page.evaluate('AbyssDiagnostics.state().menuOpen')
    assert 'BEGIN EXPEDITION' in page.locator('#startBtn').inner_text()
    assert not errors,errors
    ctx.close();print('PASS: mobile title, pause/resume, menu suspend/continue, briefing, quit and discard')

    seed={'credits':950,'bestDepth':800,'xp':250,'secured':[0,1,2],'upgrades':{'hull':4,'oxygen':2,'battery':1,'engine':1}}
    ctx,page,errors=launch(browser,data=seed)
    assert '3/6' in page.locator('#menuProgress').inner_text() if page.locator('#menuProgress').inner_text() else True
    page.locator('#newGameBtn').click()
    assert 'START A NEW GAME?' in page.locator('#modalTitle').inner_text()
    page.locator('#cancelNewGameBtn').click()
    page.locator('#startBtn').click()
    assert page.evaluate('AbyssDiagnostics.state().credits')==950
    assert page.evaluate('AbyssDiagnostics.state().secured')==3
    page.locator('#pauseBtn').click();page.locator('#pauseMenuBtn').click()
    page.locator('#newGameBtn').click();page.locator('#confirmNewGameBtn').click()
    state=page.evaluate('AbyssDiagnostics.state()')
    assert state['running'] and not state['paused'] and not state['menuOpen'],state
    assert state['credits']==0 and state['secured']==0 and state['hullLevel']==0 and state['safeDepth']==130,state
    assert not errors,errors
    ctx.close();print('PASS: New Game cancel preserves banked progress; confirm clears save and launches new run')
    browser.close()
