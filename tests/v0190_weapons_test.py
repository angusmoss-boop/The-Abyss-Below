"""Production projectile/combat/refill paths, including atomic shot restoration."""
from v0190_harness import *
from playwright.sync_api import sync_playwright
import math
DAMAGE={'railgun':[35,50,70,95],'torpedo':[95,140,200,280]}
CAP={'railgun':[12,18,24,32],'torpedo':[3,4,6,8]}
def stock(p,rail=32,torp=8):p.evaluate('v=>AbyssDiagnostics.weaponStock(v)',{'railgun':rail,'torpedo':torp})
def fire(p,kind):return p.evaluate('k=>AbyssDiagnostics.fire(k)',kind)
def run():
 with sync_playwright() as pw:
  b=launch_browser(pw);c,p,e=build(b)
  p.evaluate('AbyssDiagnostics.grantCredits(100000);AbyssDiagnostics.grantCrystals(10000)');dock(p)
  for kind in DAMAGE:
   for mark in range(1,5):
    buy(p,kind);d=debug(p)
    assert d['saved']['upgrades'][kind]==mark
    assert state(p)['weaponAmmo'][kind]==0
    assert state(p)['mineAmmo']==0
  costs=p.evaluate('AbyssDiagnostics.costs()')
  assert sum(v['crystals'] for u in costs for v in u['prices'])==464
  assert sum(v['credits'] for u in costs for v in u['prices'])==22765
  depart(p);print('PASS eight weapon purchases through real UI, capacity/damage progression, empty installation magazines, no mine grants; full tree 22,765 CR / 464 crystals')
  # 24 real swept-projectile impacts, every weapon mark and all three health tiers.
  for kind in DAMAGE:
   for mark,dmg in enumerate(DAMAGE[kind],1):
    for tier,hp in [('common',100),('apex',200),('reaper',400)]:
     fix(p,depth=100,facing=0,upgrades={'railgun':mark,'torpedo':mark,'hull':7},predators=[{'dx':145,'dy':0,'tier':tier,'health':hp,'maxHealth':hp,'stunnedUntil':100}]);stock(p)
     assert fire(p,kind),(kind,mark,tier)
     assert not fire(p,kind),'cooldown permits duplicate'
     assert state(p)['weaponAmmo'][kind]==CAP[kind][mark-1]-1
     step(p,.55)
     living=debug(p)['predators'];assert (living[0]['health'] if living else 0)==max(0,hp-dmg),(kind,mark,tier,living)
     assert state(p)['projectiles']==0
  print('PASS 24 actual impacts: 2 weapons x 4 marks x 3 predator tiers; exact damage, no doubled hits, cooldown and ammunition deduction')
  # Rock shielding, AoE, friendly safety, and environmental mine interaction.
  for kind in DAMAGE:
   fix(p,depth=100,facing=0,upgrades={'railgun':4,'torpedo':4,'hull':7},rocks=[{'dx':95,'dy':0,'radius':30}],predators=[{'dx':180,'dy':0,'tier':'reaper','health':400,'maxHealth':400,'stunnedUntil':100}]);stock(p);assert fire(p,kind);step(p,.8)
   assert debug(p)['predators'][0]['health']==400 and state(p)['projectiles']==0
  fix(p,depth=100,facing=0,upgrades={'torpedo':4,'hull':7},predators=[{'dx':160,'dy':0,'tier':'reaper','health':400,'maxHealth':400,'stunnedUntil':100},{'dx':165,'dy':60,'tier':'reaper','health':400,'maxHealth':400,'stunnedUntil':100}]);stock(p);hull=state(p)['hull'];assert fire(p,'torpedo');step(p,.8)
  assert [q['health'] for q in debug(p)['predators']]==[120,120] and state(p)['hull']==hull
  fix(p,depth=100,facing=0,upgrades={'railgun':4,'hull':7});stock(p);p.evaluate('AbyssDiagnostics.wildFixture({mines:[{dx:160,dy:0,sway:0}]})');assert fire(p,'railgun');step(p,.4)
  assert len(p.evaluate('AbyssDiagnostics.wild().field.cleared'))==1
  print('PASS rocks block both weapons, torpedo area damage hits multiple enemies without self-damage, railgun triggers abandoned mines')
  # Empty stocks never regenerate on timers, pause, launch or reload.
  fix(p,depth=100,facing=0,upgrades={'railgun':1,'torpedo':1,'hull':7});stock(p,1,1)
  assert fire(p,'railgun');step(p,.5);assert fire(p,'torpedo');step(p,2)
  assert state(p)['weaponAmmo']=={'railgun':0,'torpedo':0};assert not fire(p,'railgun') and not fire(p,'torpedo')
  step(p,10);assert state(p)['weaponAmmo']=={'railgun':0,'torpedo':0}
  p.evaluate('AbyssDiagnostics.relaunch()');assert state(p)['weaponAmmo']=={'railgun':0,'torpedo':0}
  dock(p);assert state(p)['weaponAmmo']=={'railgun':0,'torpedo':0};p.locator('#ammunitionTab').click();p.locator('#fillRailBtn').click();p.locator('#fillTorpedoBtn').click();assert state(p)['weaponAmmo']=={'railgun':12,'torpedo':3};depart(p)
  # Real keyboard paths: rail hold repeats; torpedo ignores repeat keydown.
  fix(p,depth=100,facing=0,upgrades={'railgun':4,'torpedo':4,'hull':7});stock(p)
  step(p,1.1,keys=['z']);assert state(p)['weaponAmmo']['railgun']==29,state(p)['weaponAmmo']
  p.evaluate('AbyssDiagnostics.unfreeze()');p.keyboard.down('x');p.keyboard.down('x');p.keyboard.up('x');assert state(p)['weaponAmmo']['torpedo']==7
  print('PASS limited magazines, empty guards, cooldown, rail hold vs torpedo single press; waiting/relaunch never refill, docking does not refill; explicit paid purchases fill magazines')
  # Snapshot uses a real generated level so its deterministic geometry matches after reload.
  p.evaluate('AbyssDiagnostics.relaunch()');move(p,600,750);p.evaluate('AbyssDiagnostics.face(Math.PI/2)');stock(p,9,5);assert fire(p,'railgun');assert fire(p,'torpedo')
  before=debug(p);snap=store(p);assert len(before['projectiles'])==2
  c.close();c,p,e2=build(b,store=snap)
  after=debug(p);assert state(p)['paused'];assert before['projectiles']==after['projectiles'],(before['projectiles'],after['projectiles'])
  assert before['player']['weaponAmmo']==after['player']['weaponAmmo'] and after['player']['weaponAmmo']=={'railgun':8,'torpedo':4}
  assert before['player']['weaponCooldown']==after['player']['weaponCooldown']
  assert not e+e2,e+e2
  # Pressure visibly signals every damage category with bounded pulse frequency.
  fix(p,depth=140,lights=False,upgrades={'hull':0});hull=state(p)['hull'];step(p,.1);assert state(p)['hull']<hull and state(p)['damageFlashing']
  a=debug(p)['player'];step(p,.5);assert not state(p)['damageFlashing'];step(p,.3);assert state(p)['damageFlashing']
  fix(p,depth=90,lights=False);p.evaluate('AbyssDiagnostics.hit(8)');assert state(p)['damageFlashing'];step(p,.6);assert not state(p)['damageFlashing']
  fix(p,depth=90,upgrades={'shield':4});p.evaluate('AbyssDiagnostics.setSystems({shield:70});AbyssDiagnostics.hit(8)');assert state(p)['damageFlashing']
  fix(p,depth=90);p.evaluate('AbyssDiagnostics.setSystems({oxygen:0})');step(p,.1);assert state(p)['damageFlashing']
  print('PASS rounds/cooldowns/two in-flight shots restore exactly and paused; red damage pulse for impact, shield, oxygen and continuous pressure with non-strobing gaps')
  p.evaluate('AbyssDiagnostics.fixtureLevel(4)');fix(p,depth=1100,lights=False,upgrades={'hull':7,'shield':0})
  pixels="""()=>{const c=document.getElementById('gameCanvas'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let count=0;for(let i=0;i<d.length;i+=4)if(d[i]>35&&d[i]>d[i+1]*1.6&&d[i]>d[i+2]*1.25)count++;return count;}"""
  dark=p.evaluate(pixels);p.evaluate('AbyssDiagnostics.damage(8)');step(p,.12);red=p.evaluate(pixels)
  assert red>dark+25,(dark,red);step(p,.6);assert p.evaluate(pixels)<=dark+5
  print('PASS actual canvas red pixels pulse on damaged hull in complete darkness, then vanish without illuminating scenery')
  c.close();b.close()
if __name__=='__main__':run()
