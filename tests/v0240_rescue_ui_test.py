"""New report, journal and optional search pin across thirteen screen sizes."""
from v0240_rescue_mechanics_test import *
SIZES=[(320,568),(360,640),(390,844),(430,932),(568,320),(640,360),(844,390),(915,412),(768,1024),(1024,768),(1280,720),(1440,900),(1920,1080)]
def reach(p,selector,w,h):
 el=p.locator(selector);el.scroll_into_view_if_needed();r=el.bounding_box()
 assert r and r['width']>=32 and r['height']>=32,(selector,r)
 assert r['x']>=-1 and r['y']>=-1 and r['x']+r['width']<=w+1 and r['y']+r['height']<=h+1,(w,h,selector,r)
 assert el.evaluate('e=>{const r=e.getBoundingClientRect(),h=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return h===e||e.contains(h)}'),selector
with sync_playwright() as pw:
 b=launch_browser(pw);rows=[]
 for w,h in SIZES:
  c,p,errors=build(b,w,h,w<1100,launch=False)
  p.wait_for_function('!document.documentElement.classList.contains("abyss-launching")')
  reach(p,'#menuRescueBtn',w,h);p.locator('#menuRescueBtn').click()
  assert p.locator('#rescueDialog').evaluate('e=>e.open') and p.locator('.rescue-fleet').count()==5
  for sel in ['#rescueClose','#rescueDone']:reach(p,sel,w,h)
  p.locator('#rescueDone').click();assert state(p)['menuOpen']
  p.locator('#startBtn').click();fix(p,depth=80,upgrades={'hull':7})
  stage(p,{'drone':drone_at(state(p)['x']+300,state(p)['y']),'signalAfter':99999,'nextEventAt':99999})
  p.evaluate('AbyssDiagnostics.unfreeze()');p.locator('#focusPauseBtn').click();assert state(p)['pauseOpen']
  reach(p,'#pauseRescueBtn',w,h);p.locator('#pauseRescueBtn').click()
  before=debug(p)['player'];p.wait_for_timeout(50);assert debug(p)['player']==before
  p.locator('#rescuePinBtn').click();assert debug(p)['field']['survey']['waypoint']==rescue(p)['drone']['search']
  p.keyboard.press('Escape');assert state(p)['pauseOpen']
  p.locator('#resumeBtn').click();step(p,0)
  # Full true docking report, not injected dialog text.
  move(p,600,700);step(p,.01)
  stage(p,{'drone':drone_at(610,275,'follow'),'trip':dict(seconds=205,depth=80,damage=0,airAdded=10,startKnown=0,startContracts=0,startCredits=state(p)['credits'])})
  dock(p);assert rescue(p)['done'];reach(p,'#rescueLogBtn',w,h)
  assert '180' in p.locator('.rescue-arrival').inner_text() or rescue(p)['lastReport']['credits']>0
  p.locator('#rescueLogBtn').click()
  r=p.locator('#rescueDialog').bounding_box();assert 0<=r['x'] and 0<=r['y'] and r['x']+r['width']<=w+1 and r['y']+r['height']<=h+1,(w,h,r)
  assert p.locator('#rescueBody').evaluate('e=>e.scrollWidth<=e.clientWidth+1'),(w,h,'overflow')
  assert p.locator('.rescue-report-grid>div').count()==10
  assert p.locator('.rescue-progress').inner_text().count('undefined')==0
  assert 'PIP recovered' in p.locator('#rescueBody').inner_text()
  reach(p,'#rescueDone',w,h);p.locator('#rescueDone').click();assert p.locator('#modalOverlay').is_visible()
  assert p.locator('.mobile-actions .action-circle').count()==7
  reach(p,'#launchAgain',w,h);assert not errors,errors;c.close()
  rows.append({'size':[w,h],'new_dialog':'PASS','report':'PASS','reachable_controls':'PASS'})
 (ROOT/'verification/v0.24.0/rescue-layouts.json').write_text(json.dumps(rows,indent=2)+'\n');b.close()
 print('PASS 13 sizes: main/pause/dock rescue log, true docking report, optional approximate pin, unchanged seven combat buttons, safe pause and Escape, no overflow')
