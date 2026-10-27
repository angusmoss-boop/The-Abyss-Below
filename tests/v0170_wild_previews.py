"""Actual production-rendered previews. Outfit and fish showcase are synthetic fixtures, not a user's save."""
from v0170_harness import *
from playwright.sync_api import sync_playwright
from PIL import Image
import math,io
GEAR={'hull':7,'engine':4,'flashlight':4,'sonar':4,'shield':3,'battery':5,'oxygen':5,'minePower':4,'mineCapacity':4}
def outfit(p):
 fix(p,depth=50,lights=True,upgrades=GEAR,mineAmmo=8);p.evaluate('AbyssDiagnostics.relaunch();AbyssDiagnostics.step(0);')
def focus(p):
 p.locator('#telemetryBtn').click();p.locator('#focusToggleBtn').click();p.evaluate('dispatchEvent(new Event("resize"))')
def snap(p,name):p.screenshot(path=str(OUT/name))
def natural_pose(p,obj):
 candidates=[(obj['x']+dx,obj['y']+dy) for dx,dy in [(115,160),(-115,150),(130,110),(-130,100),(0,200),(0,-150)]]
 for x,y in candidates:
  if p.evaluate('a=>AbyssDiagnostics.wildClear(...a)',[x,y,34]):break
 move(p,x,y);p.evaluate('a=>AbyssDiagnostics.face(a)',math.atan2(obj['y']-y,obj['x']-x));p.evaluate('AbyssDiagnostics.surveyNow()')

def run():
 with sync_playwright() as pw:
  b=launch_browser(pw)
  for width,height,touch,name in [(390,844,True,'mobile-contact-mine'),(844,390,True,'landscape-contact-mine'),(1440,900,False,'desktop-contact-mine')]:
   c,p,e=build(b,width,height,touch);outfit(p)
   if not touch:focus(p)
   p.evaluate('AbyssDiagnostics.regenerate(17)');w=p.evaluate('AbyssDiagnostics.wild()')
   m=sorted(w['mines'],key=lambda x:x['y'])[1];natural_pose(p,m);p.evaluate('AbyssDiagnostics.setClock(4.2)');snap(p,name+'.png')
   if touch and width==390:
    p.evaluate('AbyssDiagnostics.ping()');step(p,.85);p.locator('#surveyBtn').click();snap(p,'mobile-hazard-chart.png')
   assert not e,e;c.close()
  # Genuine generated hot vent, with normal lighting at its real depth.
  c,p,e=build(b,390,844,True);outfit(p);p.evaluate('AbyssDiagnostics.fixtureLevel(1);AbyssDiagnostics.regenerate(17)')
  w=p.evaluate('AbyssDiagnostics.wild()');v=min(w['vents'],key=lambda v:v['y']);natural_pose(p,{'x':v['x'],'y':v['y']-65})
  p.evaluate('t=>AbyssDiagnostics.setClock(t)',(v['period']*2+11-v['phase']));snap(p,'mobile-active-vent.png')
  assert not e,e;c.close()
  # Four-species composition uses the actual renderer and schooling code, with test positions.
  c,p,e=build(b,390,844,True)
  fix(p,depth=65,lights=True,facing=-math.pi/2,upgrades=GEAR,mineAmmo=8,rocks=[{'dx':-190,'dy':-170,'radius':42},{'dx':210,'dy':80,'radius':37},{'dx':-145,'dy':245,'radius':40}])
  p.evaluate('AbyssDiagnostics.enableEnvironment()')
  p.evaluate('''AbyssDiagnostics.wildFixture({schools:[{dx:-125,dy:-210,species:0},{dx:100,dy:-120,species:1},{dx:-105,dy:40,species:2},{dx:125,dy:115,species:3}],benthos:[{dx:-190,dy:-206,kind:0},{dx:210,dy:46,kind:1},{dx:-150,dy:212,kind:2},{dx:-120,dy:218,kind:3}]})''')
  step(p,.18);snap(p,'mobile-four-schools.png')
  frames=[]
  for i in range(42):
   step(p,.1);frames.append(Image.open(io.BytesIO(p.screenshot())).convert('RGB'))
  frames[0].save(OUT/'wildlife-motion.gif',save_all=True,append_images=frames[1:],duration=100,loop=0,optimize=True)
  assert not e,e;c.close()
  # A natural Rift location combining terrain, a school and reactive organisms.
  c,p,e=build(b,390,844,True);outfit(p);p.evaluate('AbyssDiagnostics.regenerate(17)');w=p.evaluate('AbyssDiagnostics.wild()')
  school=w['schools'][2];natural_pose(p,school);step(p,.6);snap(p,'mobile-natural-wildlife.png')
  assert not e,e;c.close();b.close()
  print('PASS natural mine/vent/wildlife previews, surveyed hazard symbols, desktop/landscape; staged four-species production-renderer showcase and 42-frame live simulation GIF')
if __name__=='__main__':run()
