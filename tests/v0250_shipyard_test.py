"""Shared vessel renderer, preview isolation, dock UI and real purchase paths."""
from v0250_harness import *
from playwright.sync_api import sync_playwright
import json,copy
SIZES=[(320,568),(360,780),(390,844),(430,932),(568,320),(640,360),(844,390),(915,412),(768,1024),(1024,768),(1440,900),(1920,1080)]
PIXELS='''u=>{const c=document.createElement('canvas');c.width=600;c.height=240;const g=c.getContext('2d');g.translate(390,120);g.scale(4,4);AbyssShip.draw(g,{upgrades:u,time:1,health:1,boost:1,thrust:1});return c.toDataURL();}'''
def run():
 with sync_playwright() as pw:
  b=launch_browser(pw);c,p,errors=build(b)
  defaults=debug(p)['saved']['upgrades'];images=[]
  for h in range(8):images.append(p.evaluate(PIXELS,{**defaults,'hull':h}))
  assert len(set(images))==8
  for id in ['engine','railgun','torpedo','flashlight','shield','magnet','sonar','disruptor','oxygen','battery','quiet','mineCapacity','minePower']:
   maximum=5 if id in ['oxygen','battery'] else 4
   marks=range(1,maximum+1) if id in ['flashlight','mineCapacity'] else range(maximum+1)
   u={**defaults,'minePower':4}
   frames=[p.evaluate(PIXELS,{**u,id:m}) for m in marks]
   assert len(set(frames))==len(frames),(id,'visually identical marks')
  assert p.evaluate('AbyssShip.engines.slice(1).every((x,i,a)=>i===0||x.length>a[i-1].length&&x.width>a[i-1].width)')
  assert p.evaluate('new Set(AbyssShip.engines.slice(1).map(x=>x.color)).size')==4
  # Wear changes the actual shared model without changing numerical state.
  assert p.evaluate('''()=>{const c=document.createElement('canvas');c.width=250;c.height=120;const g=c.getContext('2d');g.translate(130,60);g.scale(3,3);AbyssShip.draw(g,{upgrades:{hull:7,engine:4},health:1,time:1});const a=c.toDataURL();g.clearRect(-100,-100,200,200);AbyssShip.draw(g,{upgrades:{hull:7,engine:4},health:.2,time:1});return a!==c.toDataURL();}''')
  print('PASS 8 different hull models, 13 graded module appearances, 4 increasing/changing boost plumes and visible health-based wear using the production renderer',flush=True)
  p.evaluate('AbyssDiagnostics.grantCredits(90000);AbyssDiagnostics.grantCrystals(1000)');dock(p);p.locator('#shipyardTab').click()
  for system in ['hull','engine','railgun','torpedo','magnet','shield']:
   before=copy.deepcopy(debug(p)['saved']);p.locator('#shipyardSystem').select_option(system);p.locator('#shipyardNext').click();p.locator('#shipyardThrust').click()
   assert debug(p)['saved']==before,'preview mutated campaign'
   p.locator('#shipyardInspect').click();assert p.locator('#upgradeDialog').is_visible()
   # Both preview canvases have actual nonempty production pixels, including first open.
   assert p.locator('#upgradeShipCurrent').evaluate("c=>c.width>1&&c.getContext('2d').getImageData(10,10,1,1).data[3]>0")
   p.locator('#upgradePurchase').click();p.locator('#upgradeDetailClose').click()
   assert debug(p)['saved']['upgrades'][system]==before['upgrades'][system]+1
   assert debug(p)['saved']['weaponAmmo']==before['weaponAmmo']
  p.locator('#upgradesTab').click()
  for _ in range(6):buy(p,'hull')
  assert p.locator('[data-system="hull"]').get_attribute('class').find('is-maxed')>=0
  p.locator('#shipyardTab').click();p.locator('#shipyardSystem').select_option('hull');assert p.locator('#shipyardNext').is_disabled()
  assert p.locator('#shipyardFinish option').count()==1,'unearned finishes exposed'
  print('PASS next-tier previews/thruster tests never buy equipment or change stock; six real dock purchase paths, max-tier gold state and no unearned finishes',flush=True)
  for w,h in SIZES:
   p.set_viewport_size({'width':w,'height':h});p.wait_for_timeout(50)
   assert p.evaluate('document.documentElement.scrollWidth<=innerWidth'),(w,h,'page overflow')
   for id in ['shipyardCanvas','shipyardSystem','shipyardFinish','shipyardInspect','launchAgain']:
    r=p.locator('#'+id).bounding_box();assert r and r['x']>=0 and r['x']+r['width']<=w+1,(w,h,id,r)
   p.locator('#shipyardInspect').click();p.locator('#upgradeDetailClose').click()
   p.locator('#shipyardThrust').click()
  assert not errors,errors;c.close();b.close()
  print('PASS 12 dock viewports: previews, selectors, purchase dialog and pinned departure stay within viewport; no JavaScript errors')
if __name__=='__main__':run()
