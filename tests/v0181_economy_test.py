"""Production economy: bounded respawns, auto/manual distinction and paid dock ammunition."""
from v0181_harness import *
from playwright.sync_api import sync_playwright
import math,copy,zipfile,re

def auto(p):return p.evaluate('AbyssDiagnostics.autoPickup()')
def pulse(p,t,active=True):return p.evaluate('([t,a])=>AbyssDiagnostics.economyPulse(t,a)',[t,active])
def take(p,n):
 move(p,n['x'],n['y'])
 if n['type']=='scrap':auto(p)
 else:use(p)
def item(p,id):return next(n for n in debug(p)['items'] if n['id']==id)

def run():
 with sync_playwright() as pw:
  b=launch_browser(pw);c,p,errors=build(b)
  # Audit every actual price, not a cherry-picked new upgrade.
  costs=p.evaluate('AbyssDiagnostics.costs()')
  baseline=ROOT.parent/'the-abyss-below-v0.16.0-complete.zip'
  if baseline.exists():
   with zipfile.ZipFile(baseline) as z:old=z.read('game.js').decode()
   old_crystals=json.loads(re.sub(r'(\w+):',r'"\1":',re.search(r'const CRYSTAL_PRICES = Object.freeze\((\{.*?\})\);',old).group(1)))
   old_defs=re.search(r'const UPGRADES = (\[.*?\n  \]);',old,re.S).group(1)
   price_check=p.evaluate('(text)=>{const defs=Function("return ("+text+")")();return defs.map(u=>({id:u.id,prices:Array.from({length:u.limit},(_,i)=>u.prices?.[i]??Math.floor(u.base*Math.pow(1.55,i)))}));}',old_defs)
  else:
   baseline=json.loads((ROOT/'tests/fixtures/v0160_economy_prices.json').read_text());old_crystals=baseline['crystals'];price_check=baseline['upgrades']
  for u in costs:
   prev=next(v for v in price_check if v['id']==u['id'])
   for i,price in enumerate(u['prices']):
    assert price['credits']==math.ceil(prev['prices'][i]*1.5)
    assert price['crystals']==old_crystals[u['id']][i]
  assert sum(v['credits'] for u in costs for v in u['prices'])==22765
  assert sum(v['crystals'] for u in costs for v in u['prices'])==464
  print('PASS all 59 paid increments: exact 1.5x rounded-up credit prices, unchanged 464-crystal tree, 22,765 CR total')
  # Ordinary simulation collects scrap automatically; nearby quest loot stays manual.
  fix(p,depth=45,upgrades={'magnet':0,'hull':7},items=[{'id':'s','dx':25,'dy':0,'type':'scrap','quantity':2},{'id':'c','dx':15,'dy':0,'type':'crystal','quantity':2},{'id':'r','dx':35,'dy':0,'type':'recorder','index':0},{'id':'a','dx':45,'dy':0,'type':'air'}])
  step(p,.02);d=debug(p);assert d['player']['cargo']=={'scrap':2,'crystal':0,'recorders':[]}
  assert all(not n['collected'] for n in d['items'] if n['type']!='scrap')
  use(p);assert debug(p)['player']['cargo']['crystal']==2
  use(p);assert debug(p)['player']['cargo']['recorders']==[0]
  for mark,reach in [(0,60),(1,100),(2,140),(3,180),(4,220)]:
   for dx,expected in [(reach-1,True),(reach+1,False)]:
    fix(p,depth=45,upgrades={'magnet':mark,'hull':7},items=[{'dx':dx,'dy':0,'quantity':2}]);step(p,.02)
    assert debug(p)['items'][0]['collected']==expected,(mark,dx)
  fix(p,depth=45,upgrades={'magnet':4,'hull':7},battery=0,items=[{'dx':30,'dy':0,'quantity':2}]);step(p,.02);assert debug(p)['player']['cargo']['scrap']==2
  fix(p,depth=45,upgrades={'magnet':4,'hull':7},battery=0,items=[{'dx':140,'dy':0,'quantity':2}]);step(p,.02);assert debug(p)['player']['cargo']['scrap']==0
  fix(p,depth=45,upgrades={'magnet':4,'hull':7},items=[{'dx':140,'dy':0,'quantity':2}],rocks=[{'dx':70,'dy':0,'radius':30}]);step(p,.02);assert debug(p)['player']['cargo']['scrap']==0
  p.evaluate('AbyssDiagnostics.fixtureLevel(4)')
  fix(p,depth=1100,facing=0,upgrades={'magnet':4,'hull':7},lights=False,items=[{'dx':140,'dy':0,'quantity':2}]);step(p,.02);assert debug(p)['player']['cargo']['scrap']==0
  p.evaluate('AbyssDiagnostics.ping()');step(p,.6);assert debug(p)['player']['cargo']['scrap']==2
  print('PASS base/4 magnet radii, production-frame auto pickups, crystal/recorder/cache manual interaction, darkness/sonar, battery and rock guards')
  c.close()
  # Actual generated nodes and immutable coordinates. Deterministic time probes avoid a six-minute sleep.
  c,p,errors2=build(b);errors+=errors2;p.evaluate('AbyssDiagnostics.regenerate(41072)')
  d=debug(p);layout=copy.deepcopy(d['field']['loot']);scraps=[n for n in d['items'] if n['type']=='scrap'][:3];crystal=next(n for n in d['items'] if n['type']=='crystal')
  for n in scraps:take(p,n)
  take(p,crystal);assert debug(p)['player']['cargo']['scrap']==6 and debug(p)['player']['cargo']['crystal']==2
  initial=debug(p)['field']['salvage'];assert len(initial['due'])==3 and len(initial['harvested'])==3
  # Fake wall clock and paused wall time cannot replenish anything.
  p.evaluate('Date.now=()=>9999999999999');pulse(p,10000,False)
  assert debug(p)['field']['salvage']==initial
  move(p,600,160);pulse(p,10000);assert debug(p)['field']['salvage']==initial
  move(p,scraps[0]['x'],scraps[0]['y']);pulse(p,299);assert len(debug(p)['field']['salvage']['due'])==3
  # Eligible visible sites stay depleted, even if all timers have elapsed.
  pulse(p,1);assert item(p,scraps[0]['id'])['collected']
  move(p,600,2900);pulse(p,1)
  d=debug(p);assert len(d['field']['salvage']['due'])==2 and len([n for n in scraps if not item(p,n['id'])['collected']])==1
  assert item(p,crystal['id'])['collected'] and d['field']['loot']==layout
  due_before=copy.deepcopy(d['field']['salvage']);pulse(p,44);assert len(debug(p)['field']['salvage']['due'])==2
  pulse(p,1);assert len(debug(p)['field']['salvage']['due'])==1
  # Persist remaining timer and first-survey progress through actual game reload.
  p.evaluate('AbyssDiagnostics.save()');snap=store(p);before=debug(p);c.close();c,p,e=build(b,store=snap);errors+=e;after=debug(p)
  assert after['field']['salvage']==before['field']['salvage'] and after['field']['looted']==before['field']['looted']
  assert after['field']['loot']==layout and state(p)['paused']
  pulse(p,44);assert len(debug(p)['field']['salvage']['due'])==1
  pulse(p,1);assert not debug(p)['field']['salvage']['due'] and item(p,crystal['id'])['collected']
  progress=debug(p)['levels'][0]['resources'];assert progress['collected']==4 and progress['scrapRemaining']==84
  take(p,scraps[0]);assert len(debug(p)['field']['salvage']['harvested'])==3
  assert debug(p)['levels'][0]['resources']['collected']==4
  # Dock refresh does not bypass resource recovery or reset its saved timer.
  before=debug(p)['field']['salvage'];dock(p);after=debug(p)['field']['salvage'];assert before==after
  assert item(p,crystal['id'])['collected'] and item(p,scraps[0]['id'])['collected']
  assert state(p)['credits']==144 and state(p)['crystals']==2
  print('PASS delayed/staggered/off-screen salvage restoration, no clock/offline/harbour exploit, original layout preserved, crystals finite, exact timers after reload and non-regressing first-survey progress')
  # Kill drops collect once and do not become respawn nodes.
  depart(p);fix(p,depth=45,upgrades={'magnet':4,'hull':7},predators=[{'id':'enemy-test','dx':100,'dy':0}]);p.evaluate("AbyssDiagnostics.hurtEnemy('enemy-test',1000)");auto(p)
  assert debug(p)['player']['cargo']['scrap']==2 and not debug(p)['field']['drops']
  assert all(not k.startswith('drop-') for k in debug(p)['field']['salvage']['due'])
  old_elapsed=debug(p)['field']['salvage']['elapsed'];p.evaluate('AbyssDiagnostics.fixtureLevel(1)');move(p,600,2500);pulse(p,15)
  fields=debug(p)['campaignLevels'];assert fields['sunbreak-shelf']['salvage']['elapsed']==old_elapsed+15 and fields['glassbone-rift']['salvage']['elapsed']==15
  print('PASS all visited levels in the active campaign age together; kill drops are excluded from regeneration')
  c.close()
  # Paid dock shop and every free-reload route.
  c,p,e=build(b);errors+=e;p.evaluate('AbyssDiagnostics.grantCredits(20000);AbyssDiagnostics.grantCrystals(1000)');dock(p)
  for kind in ['railgun','torpedo','minePower']:buy(p,kind)
  assert state(p)['weaponAmmo']=={'railgun':0,'torpedo':0} and state(p)['mineAmmo']==0
  p.locator('#ammunitionTab').click();balance=state(p);p.locator('#buyRailBtn').click();p.locator('#buyTorpedoBtn').click();p.locator('#buyMineBtn').click()
  assert state(p)['credits']==balance['credits']-48 and state(p)['crystals']==balance['crystals']
  assert state(p)['weaponAmmo']=={'railgun':1,'torpedo':1} and state(p)['mineAmmo']==1
  for id in ['fillRailBtn','fillTorpedoBtn','fillMinesBtn']:p.locator('#'+id).click()
  assert state(p)['weaponAmmo']=={'railgun':12,'torpedo':3} and state(p)['mineAmmo']==2
  balance=state(p);assert p.locator('#buyRailBtn').is_disabled();assert not p.evaluate("AbyssDiagnostics.buyOrdnance('railgun',true)");assert state(p)['credits']==balance['credits']
  # Upgrade adds empty slots, including unrelated upgrade that previously reloaded all guns.
  p.locator('#upgradesTab').click();buy(p,'railgun');buy(p,'torpedo');buy(p,'hull')
  assert state(p)['weaponAmmo']=={'railgun':12,'torpedo':3} and state(p)['mineAmmo']==2
  p.evaluate('AbyssDiagnostics.weaponStock({railgun:0,torpedo:0});AbyssDiagnostics.grantCredits(17)')
  p.locator('#ammunitionTab').click();assert 'BUY 2' in p.locator('#fillRailBtn').inner_text();p.locator('#fillRailBtn').click()
  assert state(p)['credits']==5 and state(p)['weaponAmmo']['railgun']==2 and state(p)['weaponAmmo']['torpedo']==0
  assert p.locator('#buyRailBtn').is_disabled() and p.locator('#buyTorpedoBtn').is_disabled()
  depart(p);assert not p.evaluate("AbyssDiagnostics.buyOrdnance('railgun')")
  p.evaluate('AbyssDiagnostics.relaunch()');assert state(p)['weaponAmmo']=={'railgun':2,'torpedo':0}
  dock(p);assert state(p)['weaponAmmo']=={'railgun':2,'torpedo':0}
  ss=store(p);c.close();c,p,e=build(b,store=ss);errors+=e;assert state(p)['weaponAmmo']=={'railgun':2,'torpedo':0} and state(p)['credits']==5
  assert not errors,errors;c.close();b.close()
  print('PASS paid single/partial/full gun and mine purchases, no crystal spend, capacity/funds guards, no free installation/upgrade/docking/relaunch/reload stock')
if __name__=='__main__':run()
