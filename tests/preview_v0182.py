"""Real renderer and production damage/recovery flows, with synthetic equipment for previews."""
from v0182_harness import *
from v0182_recovery_test import take
from playwright.sync_api import sync_playwright
import math,json

def prepare(p):
 p.evaluate('AbyssDiagnostics.regenerate(41072)')
 fix(p,depth=45,upgrades={'engine':2,'flashlight':3,'railgun':1,'torpedo':1,'minePower':1,'mineCapacity':1},mineAmmo=0)
 p.evaluate('AbyssDiagnostics.relaunch()')
 d=debug(p)
 for kind,num in [('scrap',3),('crystal',2),('recorder',1)]:
  for n in [i for i in d['items'] if i['type']==kind][:num]:take(p,n)
 move(p,600,2320);p.evaluate('AbyssDiagnostics.setSystems({hull:0.001,shield:0})');step(p,.1)
 assert not state(p)['running'] and state(p)['recoveryPods']==1
 return debug(p)['field']['recoveries'][0]

with sync_playwright() as pw:
 b=launch_browser(pw);c,p,e=build(b,390,844,True);pod=prepare(p)
 p.screenshot(path=str(OUT/'mobile-loss-manifest.png'))
 p.locator('#retryBtn').click();p.evaluate('AbyssDiagnostics.step(0)');pod=debug(p)['field']['recoveries'][0]
 move(p,pod['x']-35,pod['y']+32);p.evaluate('a=>AbyssDiagnostics.face(a)',math.atan2(-32,35))
 p.screenshot(path=str(OUT/'mobile-recovery-wreck.png'))
 p.evaluate('AbyssDiagnostics.openSurvey()');p.screenshot(path=str(OUT/'mobile-recovery-map.png'));p.locator('#surveyClose').click()
 dock(p);p.locator('#ammunitionTab').click();p.locator('.ordnance-card.mine').scroll_into_view_if_needed();p.screenshot(path=str(OUT/'mobile-rescue-ammunition.png'))
 assert not e,e;c.close()
 layouts=[]
 for w,h,touch in [(320,568,True),(390,844,True),(844,390,True),(640,360,True),(1440,900,False)]:
  c,p,e=build(b,w,h,touch);prepare(p)
  info=p.evaluate('''()=>{const b=document.querySelector('#retryBtn').getBoundingClientRect();const d=document.querySelector('#modalOverlay').getBoundingClientRect();return {button:{x:b.x,y:b.y,w:b.width,h:b.height},overlay:{x:d.x,y:d.y,w:d.width,h:d.height},overflow:document.documentElement.scrollWidth>innerWidth};}''')
  assert not info['overflow'],(w,h,info)
  # Scrollable loss dialogs must allow the actual retry button to be reached.
  p.locator('#retryBtn').scroll_into_view_if_needed();r=p.locator('#retryBtn').bounding_box()
  assert r['x']>=-1 and r['x']+r['width']<=w+1 and r['y']>=-1 and r['y']+r['height']<=h+1,(w,h,r)
  if w==844:p.screenshot(path=str(OUT/'landscape-loss-manifest.png'))
  p.locator('#retryBtn').click();assert state(p)['running'] and state(p)['weaponAmmo']=={'railgun':10,'torpedo':3} and state(p)['mineAmmo']==3
  assert not e,e;layouts.append({'viewport':[w,h],'touch':touch,'status':'PASS'});c.close()
 b.close()
 (ROOT/'verification/v0.18.2/preview-layout.json').write_text(json.dumps({'note':'Synthetic equipment; actual generated resource pickups, pressure defeat and production renderer. Not physical-device evidence.','layouts':layouts},indent=2)+'\n')
 print('PASS preview capture and loss/rescue UI at five touch/desktop sizes')
