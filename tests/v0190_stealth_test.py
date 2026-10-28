"""Actual analogue helm, removed modes, paused flashlight switching and persistence."""
from v0190_harness import *
from v0190_touch_test import point,send
from playwright.sync_api import sync_playwright
import math

def run():
 with sync_playwright() as pw:
  b=launch_browser(pw);c,p,e=build(b,390,844,True);cdp=c.new_cdp_session(p)
  # Noise is monotonic in actual velocity and zero at rest. Passive insulation survives.
  values=p.evaluate('[0,10,30,60,90,146,245.28].map(s=>AbyssDiagnostics.movementNoiseAt(s,0,false))')
  assert values[0]==0 and all(a<b for a,b in zip(values,values[1:])),values
  assert p.evaluate('AbyssDiagnostics.movementNoiseAt(245.28,4,false)')<values[-1]
  assert p.evaluate('AbyssDiagnostics.movementNoiseAt(450,4,true)')>=82
  signatures=[]
  for drag in [14,26,44]:
   fix(p,depth=80,upgrades={'hull':7,'engine':0,'quiet':0});p.evaluate('AbyssDiagnostics.unfreeze()')
   send(cdp,'touchStart',point(1,280,420));send(cdp,'touchMove',point(1,280+drag,420));step(p,1.5,freeze=False)
   s=state(p);signatures.append({'speed':math.hypot(s['vx'],s['vy']),'noise':s['noise']})
   send(cdp,'touchEnd');assert state(p)['joystickX']==0
   step(p,2,freeze=False);s=state(p);assert math.hypot(s['vx'],s['vy'])<1 and s['noise']<2,s
  assert all(a['noise']<b['noise'] and a['speed']<b['speed'] for a,b in zip(signatures,signatures[1:])),signatures
  assert signatures[0]['noise']<15 and signatures[-1]['noise']>60,signatures
  # Passive insulation does not slow normal throttle; no modifier/latch can survive.
  fix(p,depth=80,upgrades={'hull':7,'engine':4,'quiet':4});a=step(p,1.3,keys=['d'])
  fix(p,depth=80,upgrades={'hull':7,'engine':4,'quiet':4});z=step(p,1.3,keys=['d','shift'])
  assert abs(a['vx']-z['vx'])<1e-7 and abs(a['noise']-z['noise'])<1e-7
  fix(p,depth=80,upgrades={'hull':7,'engine':4,'quiet':0});loud=step(p,1.3,keys=['d'])
  assert abs(a['vx']-loud['vx'])<1e-7 and a['noise']<loud['noise']*.5
  c.close();print('PASS actual light/medium/full touch drags produce increasing speed/noise; release coasts to rest; Shift no longer slows; passive insulation remains effective',flush=True)
  # Flashlight toggles in a paused telemetry modal, stays paused, and persists.
  for w,h in [(320,568),(390,844),(568,320),(844,390),(1440,900)]:
   c,p,e=build(b,w,h,w<1100);fix(p,depth=80,lights=True,upgrades={'hull':7,'flashlight':3});p.evaluate('AbyssDiagnostics.unfreeze()')
   p.locator('#telemetryBtn').click();assert state(p)['paused'] and state(p)['lights']
   btn=p.locator('#telemetryLightsBtn');btn.click();assert not state(p)['lights'] and state(p)['paused'] and btn.get_attribute('aria-pressed')=='false'
   r=btn.bounding_box();assert r['height']>=44 and r['y']>=0 and r['y']+r['height']<=h+1
   p.locator('#telemetryClose').click();assert not state(p)['paused'] and not state(p)['lights']
   data=store(p);assert not e,e;c.close();c,p,e=build(b,w,h,w<1100,store=data)
   assert state(p)['paused'] and not state(p)['lights']
   p.locator('#resumeBtn').click();p.locator('#telemetryBtn').click();p.locator('#telemetryLightsBtn').click()
   assert state(p)['paused'] and state(p)['lights'];p.locator('#telemetryClose').click()
   # Keyboard L still works and the overlay never eats a round or starts steering.
   before=state(p)['weaponAmmo'];p.keyboard.press('l');assert not state(p)['lights']
   assert state(p)['weaponAmmo']==before and not state(p)['joystickVisible']
   assert not e,e;c.close()
  print('PASS flashlight telemetry switch at five sizes, paused-safe operation, saved state across reload, no steering/ammo leakage, L key retained',flush=True)
  # Legacy quiet flag is ignored when restoring a previously saved expedition.
  c,p,e=build(b);fix(p,depth=80,upgrades={'hull':7,'engine':2,'quiet':3});p.evaluate('AbyssDiagnostics.save()');data=store(p);c.close()
  value=json.loads(data[CAMPAIGN]);value['activeDive']['player']['quiet']=True;data[CAMPAIGN]=json.dumps(value)
  c,p,e=build(b,store=data);assert state(p)['paused'] and 'quiet' not in debug(p)['player']
  assert debug(p)['saved']['upgrades']['quiet']==3
  # Restoring rebuilds the seeded terrain. Measure throttle inside the clear
  # harbour, not on a random rock at the previously synthetic fixture position.
  p.locator('#resumeBtn').click();move(p,450,160);s=step(p,1.5,keys=['d']);assert s['vx']>180,s
  assert not e,e;c.close();b.close()
  print('PASS old saved silent state is removed without losing the fitted noise-reduction upgrade',flush=True)
if __name__=='__main__':run()
