"""Production slow-seeking mines, occlusion, arming and relative swept collision."""
from v0240_harness import *
from playwright.sync_api import sync_playwright
import math

def setup(p,**kw):return fix(p,depth=100,facing=0,upgrades={'hull':7,'minePower':1,'mineCapacity':4},**kw)
def pulse(p,t,move=False):p.evaluate('([t,m])=>AbyssDiagnostics.ordnancePulse(t,{moveEnemies:m})',[t,move])
def hp(p,id='hunter'):return next((q['health'] for q in debug(p)['predators'] if q['id']==id),0)
with sync_playwright() as pw:
 b=launch_browser(pw);c,p,errors=build(b)
 setup(p,predators=[{'id':'hunter','dx':-200,'dy':40,'stunnedUntil':100}]);assert p.evaluate('AbyssDiagnostics.mine()')
 original=debug(p)['mines'][0];stock=state(p)['mineAmmo'];step(p,.6);m=debug(p)['mines'][0]
 assert m['x']==original['x'] and m['y']==original['y'] and not m.get('targetId')
 step(p,.2);m=debug(p)['mines'][0];distance=math.hypot(m['x']-original['x'],m['y']-original['y'])
 assert 3<distance<=32*.15+1e-6,(distance,m)
 assert m['targetId']=='hunter' and state(p)['mineAmmo']==stock
 step(p,4);assert not debug(p)['mines'] and hp(p)==40 and state(p)['hull']==state(p)['maxHull']
 print('PASS no seeking before 0.65-second arm delay; partial-frame arming, 3.2 m/s drift, delayed hit outside old trigger radius, no self-damage or second ammo charge')
 # Detect in all directions locally, but never pursue far away contacts.
 for dx,dy in [(180,0),(-180,0),(0,180),(0,-180)]:
  setup(p,mines=[{'dx':0,'dy':0}],predators=[{'id':'hunter','dx':dx,'dy':dy,'stunnedUntil':100}]);pulse(p,.5);m=debug(p)['mines'][0]
  assert m['targetId']=='hunter' and abs(math.hypot(m['vx'],m['vy'])-32)<1e-6
 setup(p,mines=[{'dx':0,'dy':0}],predators=[{'id':'hunter','dx':250,'dy':0,'stunnedUntil':100}]);start=debug(p)['mines'][0];step(p,2);m=debug(p)['mines'][0];assert m['x']==start['x'] and m['y']==start['y']
 # A fleeing contact cannot pull a mine across the map. The same local anchor survives idling.
 setup(p,mines=[{'dx':0,'dy':0}],predators=[{'id':'hunter','dx':0,'dy':175,'vy':32}]);origin=debug(p)['mines'][0]
 for _ in range(70):pulse(p,.1,True)
 m=debug(p)['mines'][0];assert math.hypot(m['x']-origin['x'],m['y']-origin['y'])<=240+1e-6
 assert m.get('targetId') is None and m['vx']==m['vy']==0
 print('PASS local omnidirectional sensing, out-of-range rejection, original-drop leash and stop-on-loss behaviour')
 # Solid rock blocks sensing, contact triggering and explosion damage.
 setup(p,mines=[{'dx':0,'dy':0}],rocks=[{'dx':85,'dy':0,'radius':30}],predators=[{'id':'hunter','dx':160,'dy':0,'stunnedUntil':100}]);origin=debug(p)['mines'][0];step(p,2)
 m=debug(p)['mines'][0];assert m['x']==origin['x'] and m['y']==origin['y'] and hp(p)==100
 setup(p,mines=[{'dx':0,'dy':0}],rocks=[{'dx':25,'dy':0,'radius':13}],predators=[{'id':'hunter','dx':48,'dy':0,'stunnedUntil':100}]);pulse(p,.01);assert len(debug(p)['mines'])==1 and hp(p)==100
 setup(p,mines=[{'dx':0,'dy':0}],rocks=[{'dx':30,'dy':15,'radius':18}],predators=[{'id':'trigger','dx':-40,'dy':0,'stunnedUntil':100},{'id':'hunter','dx':65,'dy':30,'stunnedUntil':100}]);pulse(p,.01)
 assert hp(p,'trigger')==40 and hp(p)==100
 print('PASS rock-blocked homing, no through-wall proximity detonation or blast damage')
 # A fast crossing contact cannot tunnel through a mine even though both move.
 setup(p,mines=[{'dx':0,'dy':0,'armedAt':0}],predators=[{'id':'hunter','dx':-180,'dy':0,'vx':900}]);pulse(p,.4,True)
 assert hp(p)==40 and not debug(p)['mines']
 # Crossing while unarmed is not retroactively counted when the mine arms.
 setup(p,mines=[{'dx':0,'dy':0,'armedAt':.8}],predators=[{'id':'hunter','dx':-200,'dy':0,'vx':400}]);pulse(p,1,True)
 assert hp(p)==100 and len(debug(p)['mines'])==1
 print('PASS relative swept predator/mine contact; no tunnelling or hits during the unarmed part of a frame')
 # Multi-target blast and one credited kill each, including renewable salvage.
 setup(p,mines=[{'dx':0,'dy':0,'damage':110}],predators=[{'id':'hunter','dx':40,'dy':0},{'id':'second','dx':50,'dy':35}]);pulse(p,.01)
 assert not debug(p)['predators'] and state(p)['kills']==2 and len([i for i in debug(p)['items'] if i.get('predatorDrop')])==2
 print('PASS unchanged area damage, kill credit and salvage drops with moving mines')
 assert not errors,errors;c.close();b.close()
