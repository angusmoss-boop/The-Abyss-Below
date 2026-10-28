"""Focused production-code checks for v0.21.0 mechanics and readouts."""
from v0240_harness import *
from playwright.sync_api import sync_playwright
import math, statistics

def pickups(p):return p.evaluate('AbyssDiagnostics.pickups()')
def wild(p):return p.evaluate('AbyssDiagnostics.wild()')

def run():
 with sync_playwright() as pw:
  b=launch_browser(pw);c,p,errors=build(b,1440,900)
  p.evaluate('AbyssDiagnostics.fixtureLevel(4)')
  # Actual collision, not merely route generation: every species moves around a
  # polygon between it and the submarine. Every observed position stays clear.
  for tier in ['common','apex','reaper']:
   f=fix(p,depth=1100,lights=True,upgrades={'hull':7,'shield':4},rocks=[{'dx':-115,'dy':0,'radius':85,'seed':.2}],predators=[{'id':'chaser','tier':tier,'dx':-240,'dy':0,'aggression':1,'alertUntil':999}])
   path=p.evaluate('t=>AbyssDiagnostics.navigationPath("chaser",t)',{'x':f['x'],'y':f['y']})
   assert path and len(path)>2,(tier,path)
   max_side=0;previous=debug(p)['predators'][0]
   for n in range(45):
    step(p,.2);e=debug(p)['predators'][0]
    assert p.evaluate('AbyssDiagnostics.predatorClear("chaser")'),(tier,n,e)
    max_side=max(max_side,abs(e['y']-f['y']))
    assert math.hypot(e['x']-previous['x'],e['y']-previous['y'])<=state(p)['maxNormalSpeed']*.2+.2,(tier,'teleport',e,previous)
    previous=e
   assert max_side>55 and math.hypot(e['x']-f['x'],e['y']-f['y'])<80,(tier,max_side,e,f)
  print('PASS all three tiers route around a blocking rock; swept positions remain outside solids, without teleporting or speed increases',flush=True)
  # Thin obstacles cannot be skipped even by a very large proposed displacement.
  f=fix(p,depth=1100,upgrades={'hull':7},rocks=[{'dx':0,'dy':0,'radius':20}],predators=[{'id':'fast','dx':-100,'dy':0}])
  # Move ship away so this fixture does not begin with the vessel in the rock.
  p.evaluate('s=>AbyssDiagnostics.moveTo(s.x,s.y+160)',f)
  pos=p.evaluate('AbyssDiagnostics.predatorSweep("fast",240,0)')
  assert pos['x']<f['x'] and p.evaluate('AbyssDiagnostics.predatorClear("fast")')
  # A legacy embedded predator is repaired once into nearby water, not left
  # overlapping a rock indefinitely or deleted (health and ID survive).
  fix(p,depth=1100,upgrades={'hull':7},rocks=[{'dx':150,'dy':0,'radius':60}],predators=[{'id':'legacy','dx':150,'dy':0,'health':55}])
  step(p,.01);e=debug(p)['predators'][0];assert e['id']=='legacy' and e['health']==55 and p.evaluate('AbyssDiagnostics.predatorClear("legacy")')
  print('PASS high-speed swept collision and safe migration of an enemy already embedded by an old build',flush=True)
  # Angular eligibility matches radial lighting geometry; the far rear never
  # becomes illuminated at any upgraded mark.
  for mark,full in [(1,33.2315521176),(2,70),(3,110),(4,150)]:
   f=fix(p,depth=1100,lights=True,facing=0,upgrades={'hull':7,'flashlight':mark})
   st=state(p);assert abs(st['flashlightAngle']-full)<1e-6
   half=full/2*math.pi/180
   for angle,expected in [(half*.8,True),(half+.2,False),(math.pi,False)]:
    yes=p.evaluate('a=>AbyssDiagnostics.beamAt(...a)',[f['x']+30+150*math.cos(angle),f['y']+150*math.sin(angle)])
    assert yes==expected,(mark,angle,yes)
   assert not p.evaluate('a=>AbyssDiagnostics.beamAt(...a)',[f['x']+30+st['flashlightLength']+20,f['y']])
   assert st['flashlightPowerRate']==[.04,.055,.075,.10][mark-1]
  print('PASS original Mk I plus 70/110/150 degree upgrade fans, finite range, unchanged power costs and no rear illumination',flush=True)
  # Every item type reports at the ship; no magnet tether is set or drawn.
  for kind in ['scrap','crystal','recorder','air']:
   f=fix(p,depth=80,lights=True,upgrades={'hull':7,'magnet':4},items=[{'dx':0,'dy':0,'type':kind,'quantity':2}])
   if kind=='air':p.evaluate('AbyssDiagnostics.setSystems({hull:100,oxygen:20,battery:20})')
   if kind=='scrap':p.evaluate('AbyssDiagnostics.autoPickup()')
   elif kind in ['crystal','air']:p.evaluate('AbyssDiagnostics.contactPickups()')
   else:use(p)
   labels={n['kind'] for n in pickups(p)}
   assert ('hull' in labels and 'power' not in labels and 'air' not in labels) if kind=='air' else kind in labels,(kind,pickups(p))
   assert debug(p)['player'].get('magnetFlash') is None
   assert all(abs(n['x']-f['x'])<.01 for n in pickups(p))
  # Remote crystal denied; contact crystal and ranged scrap, exact quantities.
  f=fix(p,depth=80,lights=True,upgrades={'magnet':4},items=[{'dx':120,'dy':0,'type':'crystal','quantity':2},{'dx':135,'dy':0,'type':'scrap','quantity':2}])
  p.evaluate('AbyssDiagnostics.autoPickup()');assert debug(p)['player']['cargo']['scrap']==2 and debug(p)['player']['cargo']['crystal']==0
  use(p);assert debug(p)['player']['cargo']['crystal']==0
  move(p,f['x']+120,f['y']);p.evaluate('AbyssDiagnostics.contactPickups()');assert debug(p)['player']['cargo']['crystal']==2
  assert any(n['kind']=='crystal' and n['amount']==2 for n in pickups(p))
  step(p,1.8);assert not pickups(p)
  print('PASS automatic scrap/contact crystals, manual recorders and hull-pack notices; actual quantities at vessel, expiry, no collection tether',flush=True)
  # Circular PC rail is live and uses the existing keyboard controls.
  fix(p,depth=80,lights=True,upgrades={'hull':7,'railgun':4,'torpedo':3,'minePower':2,'mineCapacity':4,'engine':4},mineAmmo=6)
  p.evaluate('AbyssDiagnostics.weaponStock({railgun:24,torpedo:5});AbyssDiagnostics.unfreeze()')
  assert p.locator('.desktop-action').count()==11
  assert p.locator('#railKeyAmmo').inner_text()=='24/32'
  assert p.locator('#torpedoKeyAmmo').inner_text()=='5/6'
  assert p.locator('#desktop-mine-value').inner_text()=='6/8'
  p.keyboard.press('x');step(p,.05);assert state(p)['weaponAmmo']['torpedo']==4
  assert p.locator('#desktop-torpedo .desktop-timer').inner_text().endswith('s')
  p.evaluate('AbyssDiagnostics.unfreeze()');p.keyboard.press('f');step(p,.02);assert state(p)['mineAmmo']==5
  step(p,.1,keys=['z']);assert state(p)['weaponAmmo']['railgun']<24
  p.evaluate('AbyssDiagnostics.unfreeze()');p.keyboard.press('q');step(p,.03)
  assert p.locator('#desktop-sonar .desktop-timer').inner_text().endswith('s')
  assert p.locator('.desktop-keybinds').evaluate('e=>getComputedStyle(e).pointerEvents')=='none'
  print('PASS circular PC weapon/action bank, exact ammo, firing/sonar timers and Z/X/F keyboard attacks; mouse helm is not intercepted',flush=True)
  # Check UI geometry independently of a screenshot, in expanded play.
  p.evaluate("document.getElementById('focusToggleBtn').click()")
  for w,h in [(1440,900),(1920,1080),(1024,768),(800,600),(640,480),(390,844)]:
   p.set_viewport_size({'width':w,'height':h});p.wait_for_timeout(80)
   bounds=p.locator('.desktop-keybinds').bounding_box();orbs=p.locator('.desktop-action-orb').evaluate_all('es=>es.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}})')
   assert all(abs(o['w']-o['h'])<1 for o in orbs),(w,orbs)
   assert all(o['x']>=0 and o['x']+o['w']<=w and o['y']>=0 and o['y']+o['h']<=h for o in orbs),(w,h,orbs)
   assert all(a['x']+a['w']<=d['x']+.1 or d['x']+d['w']<=a['x']+.1 or a['y']+a['h']<=d['y']+.1 or d['y']+d['h']<=a['y']+.1 for i,a in enumerate(orbs) for d in orbs[i+1:]),(w,'overlap')
  assert not errors,errors;c.close();b.close()
  print('PASS six desktop sizes: circular orbs, no overlaps/offscreen readouts; no JavaScript errors',flush=True)
if __name__=='__main__':run()
