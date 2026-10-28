"""Production renderer screenshots; synthetic equipment, positions and pickup fixtures."""
from v0220_harness import *
from playwright.sync_api import sync_playwright
import math,json

def equip(p):
 fix(p,depth=70,lights=True,upgrades={'hull':7,'engine':4,'flashlight':4,'railgun':4,'torpedo':3,'minePower':3,'mineCapacity':4,'shield':3,'battery':4,'oxygen':4,'magnet':4,'sonar':3})
 p.evaluate('AbyssDiagnostics.relaunch();AbyssDiagnostics.weaponStock({railgun:23,torpedo:4})')

def run():
 with sync_playwright() as pw:
  b=launch_browser(pw)
  for w,h,touch,name in [(1440,900,False,'desktop-combat'),(390,844,True,'mobile-beam'),(844,390,True,'landscape-beam')]:
   c,p,errors=build(b,w,h,touch);p.evaluate('AbyssDiagnostics.fixtureLevel(3)');equip(p)
   if not touch:p.evaluate("document.getElementById('focusToggleBtn').click()")
   # Fixed level generation and literal production lighting, not a concept image.
   p.evaluate('AbyssDiagnostics.regenerate(1990)');step(p,3.5)
   p.evaluate('AbyssDiagnostics.lightingFixture({depth:1100,facing:-Math.PI/2,lights:true})')
   spot=p.evaluate('''()=>{const d=AbyssDiagnostics.debug(),s=d.player;for(const dx of [0,130,-130,220,-220,330,-330]){const x=s.x+dx,y=s.y;if(AbyssDiagnostics.wildClear(x,y,35)&&d.predators.every(e=>Math.hypot(e.x-x,e.y-y)>140))return {x,y};}return {x:s.x,y:s.y};}''')
   move(p,spot['x'],spot['y'])
   p.screenshot(path=str(OUT/(name+'.png')))
   if touch and w==390:
    # Preserve actual generated level, change the flashlight upgrade through a fixture,
    # regenerate the same level seed so coverage can be compared side-by-side.
    fix(p,depth=1100,facing=-math.pi/2,lights=True,upgrades={'flashlight':1,'hull':7});p.evaluate('AbyssDiagnostics.regenerate(1990);AbyssDiagnostics.lightingFixture({depth:1100,facing:-Math.PI/2,lights:true})');move(p,spot['x'],spot['y'])
    p.screenshot(path=str(OUT/'mobile-mk1.png'))
    # Icon notices and the unchanged seven-button mobile layout.
    fix(p,depth=260,facing=-math.pi/2,lights=True,upgrades={'flashlight':4,'hull':7,'magnet':4},items=[{'dx':22,'dy':-8,'type':'scrap','quantity':2},{'dx':30,'dy':-14,'type':'crystal','quantity':2}],rocks=[{'dx':-125,'dy':-80,'radius':54},{'dx':100,'dy':-180,'radius':70},{'dx':85,'dy':130,'radius':55}])
    p.evaluate('AbyssDiagnostics.wildFixture({schools:[{dx:90,dy:-60,species:2},{dx:-100,dy:80,species:0}]});AbyssDiagnostics.autoPickup();AbyssDiagnostics.use()')
    step(p,.35);p.screenshot(path=str(OUT/'mobile-pickups.png'))
    p.evaluate('AbyssDiagnostics.unfreeze()');p.locator('#focusPauseBtn').click();p.locator('#pauseAchievementsBtn').click()
    # Scroll only for visibility, never alter achievement markup for a preview.
    p.locator('.achievement-card').nth(20).scroll_into_view_if_needed();p.screenshot(path=str(OUT/'achievements.png'))
   assert not errors,errors;c.close()
  b.close()
 print('PASS production screenshot captures, desktop/portrait/landscape and comparison, no JavaScript errors')
if __name__=='__main__':run()
