"""Production HUD, chart gestures, dialogs and Web Audio controls in Chromium."""
from v0160_harness import *
from v0160_touch_test import point,send
from playwright.sync_api import sync_playwright

def inside(r,w,h):return r and r['x']>=-1 and r['y']>=-1 and r['x']+r['width']<=w+1 and r['y']+r['height']<=h+1

def run():
 with sync_playwright() as pw:
  b=launch_browser(pw)
  sizes=[(320,568),(390,844),(430,932),(568,320),(640,360),(844,390),(915,412),(768,1024),(1024,768),(1440,900),(1920,1080)]
  metrics=[]
  for w,h in sizes:
   print('Explorer layout',w,h,flush=True)
   c,p,e=build(b,w,h,w<1100)
   fix(p,depth=210,upgrades={'hull':7,'engine':4,'shield':4,'minePower':4,'mineCapacity':4},hull=17)
   p.evaluate('AbyssDiagnostics.setSystems({hull:17})')
   assert 'LOW HULL' in p.locator('#statusStat').inner_text()
   hud=p.locator('.cockpit-hud').bounding_box();metrics.append({'width':w,'height':h,'hud_height':hud['height']})
   assert hud['height']<=128
   for button in ['surveyBtn','telemetryBtn','focusPauseBtn']:
    assert p.evaluate('([x,y,id])=>document.elementFromPoint(x,y)?.closest("button")?.id===id',[*centre(p,button),button])
   p.locator('#surveyBtn').click();assert state(p)['paused']
   assert inside(p.locator('#surveyDialog').bounding_box(),w,h)
   assert inside(p.locator('#surveyClose').bounding_box(),w,h)
   assert p.locator('#surveyCanvas').bounding_box()['height']>=80
   assert p.locator('#mapMessage').is_visible()
   p.keyboard.press('Escape');assert not p.locator('#surveyDialog').evaluate('(e)=>e.open')
   p.locator('#telemetryBtn').click();assert 'ACTIVE DIVE SAVED' in p.locator('.telemetry-save').inner_text()
   assert inside(p.locator('#telemetryDialog').bounding_box(),w,h)
   assert p.locator('.telemetry-grid>div').count()==14
   p.locator('#telemetryAudioBtn').click();assert p.locator('#audioDialog').evaluate('(e)=>e.open')
   assert inside(p.locator('#audioDialog').bounding_box(),w,h)
   p.locator('#audioTest').click();p.wait_for_timeout(60)
   assert p.evaluate('AbyssAudio.status().available && AbyssAudio.status().unlocked')
   p.keyboard.press('Escape');assert not p.locator('#audioDialog').evaluate('(e)=>e.open')
   assert not e,e;c.close()
  (ROOT/'verification/v0.16.0/hud-measurements.json').write_text(json.dumps(metrics,indent=2)+'\n')
  print('PASS 11 new-HUD/dialog layouts, <=128px HUD, top button hit targets, low-hull warning, 14 telemetry readings, map and sound scroll/close controls')
  c,p,e=build(b,390,844,True);fix(p,depth=90,upgrades={'hull':4});p.evaluate('AbyssDiagnostics.surveyNow()');p.locator('#surveyBtn').click()
  before=debug(p)['player'].copy();cdp=c.new_cdp_session(p);r=p.locator('#surveyCanvas').bounding_box();x,y=r['x']+r['width']/2,r['y']+r['height']/2
  scale=p.locator('#mapScale').inner_text()
  send(cdp,'touchStart',point(1,x-30,y),point(2,x+30,y));send(cdp,'touchMove',point(1,x-65,y),point(2,x+65,y));send(cdp,'touchEnd')
  assert p.locator('#mapScale').inner_text()!=scale
  send(cdp,'touchStart',point(3,x,y));send(cdp,'touchMove',point(3,x+60,y-50));send(cdp,'touchEnd')
  after=debug(p)['player'];assert before['x']==after['x'] and before['y']==after['y'] and before['mineAmmo']==after['mineAmmo']
  assert not state(p)['joystickVisible'] and not state(p)['boostHeld']
  p.locator('#surveyClose').click();assert not p.locator('#surveyDialog').evaluate('(e)=>e.open')
  p.evaluate('AbyssDiagnostics.unfreeze()');p.locator('#surveyBtn').click();p.evaluate('dispatchEvent(new Event("blur"))');p.locator('#surveyClose').click();assert state(p)['paused'] and state(p)['pauseOpen'];p.locator('#resumeBtn').click();assert not state(p)['paused']
  assert not e,e;c.close();print('PASS actual two-finger pinch and drag-pan on survey canvas; no underwater steering, boost or ammunition leakage')
  # Real AudioContext lifecycle with actual user gestures; no claim of audible quality.
  c,p,e=build(b,390,844,True,launch=False,stop_raf=False)
  assert p.evaluate('AbyssAudio.status().state')=='not-started'
  p.locator('#menuAudioBtn').click();p.locator('#audioTest').click();p.wait_for_timeout(50)
  assert p.evaluate('AbyssAudio.status().state')=='running'
  assert p.evaluate('AbyssAudio.status().voices')>0
  p.locator('#effectsVolume').evaluate('(e)=>{e.value=23;e.dispatchEvent(new Event("input",{bubbles:true}))}')
  p.locator('#ambienceVolume').evaluate('(e)=>{e.value=61;e.dispatchEvent(new Event("input",{bubbles:true}))}')
  p.locator('#audioMute').click();assert p.evaluate('AbyssAudio.settings().muted')
  p.locator('#audioClose').click();p.wait_for_timeout(100);assert p.evaluate('AbyssAudio.status().musicMode')=='menu'
  settings=store(p);c.close();c,p,e2=build(b,390,844,True,store=settings,launch=False,stop_raf=False);e+=e2
  assert p.evaluate('AbyssAudio.settings()')=={'effects':.23,'ambience':.61,'music':.3,'muted':True}
  p.locator('#menuAudioBtn').click();p.locator('#audioMute').click();p.locator('#audioClose').click();p.locator('#startBtn').click();p.wait_for_timeout(150)
  assert p.evaluate('AbyssAudio.status().state')=='running'
  p.locator('#focusPauseBtn').click();p.wait_for_timeout(100);assert p.evaluate('AbyssAudio.status().state')=='suspended'
  p.locator('#resumeBtn').click();p.wait_for_timeout(100);assert p.evaluate('AbyssAudio.status().state')=='running'
  p.evaluate('dispatchEvent(new Event("blur"))');p.wait_for_timeout(100);assert p.evaluate('AbyssAudio.status().state')=='suspended' and state(p)['paused']
  assert not e,e;c.close();print('PASS no automatic audio on launch; gesture unlock; test sonar voices; independent sliders + mute persist; pause/blur suspend and Resume resumes AudioContext')
  # Unsupported audio must not break gameplay or conceal status.
  c,p,e=build(b,launch=False);p.evaluate('window.AudioContext=undefined;window.webkitAudioContext=undefined');p.add_script_tag(content=(ROOT/'audio.js').read_text())
  p.locator('#menuAudioBtn').click();assert 'not available' in p.locator('#audioState').inner_text();p.locator('#audioTest').click();p.locator('#audioClose').click();p.locator('#startBtn').click();assert state(p)['running'];assert not e,e
  c.close();b.close();print('PASS browser without Web Audio keeps menus, visible warnings and gameplay functional')
if __name__=='__main__':run()
