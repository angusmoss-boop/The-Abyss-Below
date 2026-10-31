"""Production aiming helpers, swept impacts and actual simulation with synthetic encounters."""
from v0250_harness import *
from playwright.sync_api import sync_playwright
import math

def fitted(p,**kwargs):
 return fix(p,depth=100,facing=0,upgrades={'hull':7,'railgun':1,'torpedo':1,'minePower':1,'mineCapacity':4},**kwargs)
def load(p):p.evaluate('AbyssDiagnostics.weaponStock({railgun:12,torpedo:3})')
def fire(p,kind):return p.evaluate('k=>AbyssDiagnostics.fire(k)',kind)
def pulse(p,t,move=False):p.evaluate('([t,m])=>AbyssDiagnostics.ordnancePulse(t,{moveEnemies:m})',[t,move])
def hp(p,id='hunter'):return next((q['health'] for q in debug(p)['predators'] if q['id']==id),0)
def seeker(p,kind):return p.evaluate('k=>AbyssDiagnostics.seekTarget(k)',kind)

with sync_playwright() as pw:
 b=launch_browser(pw);c,p,errors=build(b)
 # Meaningful near misses under old straight fire become actual hits now.
 for kind,dx,dy in [('railgun',300,100),('railgun',300,-140),('railgun',500,250),('torpedo',220,190),('torpedo',250,300),('torpedo',250,-300)]:
  fitted(p,predators=[{'id':'hunter','dx':dx,'dy':dy,'stunnedUntil':100}]);load(p);assert fire(p,kind)
  step(p,3.5);assert hp(p)==(65 if kind=='railgun' else 5),(kind,dx,dy,hp(p))
 print('PASS six formerly off-axis misses hit: modest rail correction, much wider torpedo capture, both sides of the bow')
 # Cone boundaries are from the muzzle, use exact angles with a nonmoving target.
 for kind,angle,expect in [('railgun',31,True),('railgun',33,False),('railgun',-31,True),('railgun',90,False),('torpedo',64,True),('torpedo',66,False),('torpedo',-64,True),('torpedo',180,False)]:
  rad=math.radians(angle);fitted(p,predators=[{'id':'hunter','dx':35+300*math.cos(rad),'dy':300*math.sin(rad),'stunnedUntil':100}]);load(p);fire(p,kind)
  assert bool(seeker(p,kind))==expect,(kind,angle,seeker(p,kind))
 print('PASS exact forward-cone boundaries; no target acquisition to the side or behind')
 # Prefer aim direction, keep the lock, retarget a dead/missing enemy, then fly straight.
 fitted(p,predators=[{'id':'center','dx':400,'dy':0,'stunnedUntil':100},{'id':'side','dx':220,'dy':70,'stunnedUntil':100}]);load(p);fire(p,'torpedo');assert seeker(p,'torpedo')['id']=='center'
 p.evaluate('AbyssDiagnostics.mutateEnemy("side",{x:AbyssDiagnostics.debug().player.x+140,y:AbyssDiagnostics.debug().player.y})')
 assert seeker(p,'torpedo')['id']=='center','Unstable target switching'
 p.evaluate('AbyssDiagnostics.mutateEnemy("center",{dead:true,health:0})');assert seeker(p,'torpedo')['id']=='side'
 p.evaluate('AbyssDiagnostics.mutateEnemy("side",{dead:true,health:0})');assert seeker(p,'torpedo') is None
 pulse(p,.1);shot=debug(p)['projectiles'][0];assert abs(shot['vy'])<1e-7
 # No harmless fish, collectibles, derelict mine or scenery can become a seeker target.
 fitted(p,items=[{'dx':180,'dy':40,'type':'crystal'}]);p.evaluate('AbyssDiagnostics.wildFixture({mines:[{dx:250,dy:60,sway:0}],schools:[{dx:200,dy:40,species:1}]})');load(p);fire(p,'torpedo');assert seeker(p,'torpedo') is None
 print('PASS central-target preference, stable lock, dead-target reacquisition and no targeting of fish, loot or abandoned mines')
 # Walls block acquisition, as well as actual rounds; the torpedo cannot pathfind through them.
 for kind in ['railgun','torpedo']:
  fitted(p,rocks=[{'dx':140,'dy':0,'radius':55}],predators=[{'id':'hunter','dx':270,'dy':0,'stunnedUntil':100}]);load(p);fire(p,kind);assert seeker(p,kind) is None
  step(p,2);assert hp(p)==100 and state(p)['projectiles']==0
 # A blocked most-central target does not prevent acquisition of a visible secondary.
 fitted(p,rocks=[{'dx':155,'dy':0,'radius':30}],predators=[{'id':'blocked','dx':300,'dy':0,'stunnedUntil':100},{'id':'open','dx':220,'dy':160,'stunnedUntil':100}]);load(p);fire(p,'torpedo');assert seeker(p,'torpedo')['id']=='open'
 print('PASS rock occlusion, physical projectile collision and visible-secondary selection')
 # Frame-rate-independent angular bounds and unchanged speed.
 rules=p.evaluate('AbyssDiagnostics.guidance()')
 angles={}
 for kind in ['railgun','torpedo']:
  fitted(p,predators=[{'id':'hunter','dx':430,'dy':220,'stunnedUntil':100}]);load(p);fire(p,kind)
  prev=0
  for i in range(8):
   pulse(p,1/120);q=debug(p)['projectiles'][0];a=math.atan2(q['vy'],q['vx'])
   assert abs(a-prev)<=rules[kind]['turnRate']/120+1e-6
   assert abs(a)<=rules[kind]['maxTurn']+1e-6
   assert abs(math.hypot(q['vx'],q['vy'])-(760 if kind=='railgun' else 300))<1e-6
   prev=a
  angles[kind]=prev
 assert angles['torpedo']>angles['railgun']
 for kind,duration in [('railgun',1),('torpedo',3.5)]:
  fitted(p);load(p);fire(p,kind);step(p,duration);assert not debug(p)['projectiles'],'Round exceeded path-length range'
 print('PASS bounded gradual turning, stronger torpedo turn rate, unchanged projectile speed and finite range')
 # Actual predictive steering against independently moving contacts.
 for kind,dx,dy,vx,vy in [('railgun',350,30,0,90),('railgun',350,-40,0,-85),('torpedo',350,60,0,90),('torpedo',350,-60,0,-90)]:
  fitted(p,predators=[{'id':'hunter','dx':dx,'dy':dy,'vx':vx,'vy':vy}]);load(p);fire(p,kind)
  for _ in range(220):
   pulse(p,1/60,True)
   if not debug(p)['projectiles']:break
  assert hp(p)==(65 if kind=='railgun' else 5),(kind,'missed moving target',hp(p))
 print('PASS predictive interception of four moving targets without perfect alignment')
 # The game's real predator AI, real firing and normal advanceSimulation path.
 for kind in ['railgun','torpedo']:
  fitted(p,predators=[{'id':'hunter','dx':320,'dy':100,'aggression':1,'alertUntil':100}]);load(p);fire(p,kind);step(p,2.5)
  assert hp(p)<100,(kind,'actual AI target not hit')
 print('PASS railgun and torpedo hit off-axis live AI predators during normal simulation')
 # Guidance includes the awakened boss, without bypassing its armour/recovery rules.
 for phase in ['recover','windup']:
  fitted(p,predators=[{'id':'cathedral-warden','tier':'warden','health':1200,'dx':300,'dy':160,'wardenPhase':phase,'phaseLeft':1,'heading':math.pi,'aimX':-1,'aimY':0}]);load(p);fire(p,'torpedo')
  for _ in range(160):
   pulse(p,1/60)
   if not debug(p)['projectiles']:break
  damage=1200-hp(p,'cathedral-warden')
  assert (abs(damage-95)<1e-6 if phase=='recover' else 0<damage<95),(phase,damage)
 print('PASS homing against an awakened Warden still respects its armour and recovery vulnerability')
 assert not errors,errors;c.close();b.close()
