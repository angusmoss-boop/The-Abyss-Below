"""Campaign permanence, upgrade economy, purchased rounds, migration and boosts."""
from v0110_harness import *
from playwright.sync_api import sync_playwright
from math import isclose

def run():
 with sync_playwright() as pw:
  b=launch_browser(pw)
  c,p,errors=build(b)
  assert state(p)['boostUnlocked']==False and state(p)['boostCapacity']==0
  fix(p,depth=40,upgrades={'engine':0});s=step(p,1,keys=['d',' ']);assert not s['boosting'] and s['boost']==0
  assert p.locator('#boostValue').inner_text()=='LOCKED'
  assert not state(p)['mineAmmo']
  capacities=[0,75,100,125,150]; multipliers=[1,1.45,1.6,1.75,1.85]
  speeds=[]
  for mark in range(1,5):
   fix(p,depth=40,upgrades={'engine':mark,'hull':7},battery=100)
   s=step(p,.5,keys=['d',' ']);assert s['boosting'] and isclose(s['boost'],capacities[mark]-12.5,abs_tol=1e-6)
   assert s['boostCapacity']==capacities[mark] and s['boostSeconds']==mark+2
   assert isclose(s['boostMultiplier'],multipliers[mark]);speeds.append(s['normalSpeed']*s['boostMultiplier'])
   assert s['battery']<97
   fix(p,depth=40,upgrades={'engine':mark,'hull':7});s=step(p,mark+2.01,keys=['s',' ']);assert s['boostLocked'] and s['boostNeedsRelease'] and not s['boosting']
   # Full depletion requires recharge and a release; no held-key boost loop.
   s=step(p,25,keys=[' ']);assert s['boost']==capacities[mark] and not s['boostLocked'] and s['boostNeedsRelease']
   step(p,.1);s=step(p,.1,keys=['w',' ']);assert s['boosting']
  assert speeds==sorted(speeds) and len(set(speeds))==4
  tiers=p.evaluate('AbyssDiagnostics.tiers()');assert isclose(tiers['reaper']['speed'],state(p)['maxNormalSpeed'])
  fix(p,depth=40,upgrades={'engine':2,'battery':0});base=state(p)
  fix(p,depth=40,upgrades={'engine':2,'battery':5});efficient=state(p)
  assert efficient['boostPowerRate']<base['boostPowerRate'] and efficient['boostRechargeRate']>base['boostRechargeRate']
  assert not errors,errors;c.close();print('PASS boost locked at standard drive; all 4 speed/capacity/duration tiers; exhaustion/rearm; battery efficiency; Reaper speed')

  # Exercise actual dock buttons, not a simulated purchase function.
  c,p,errors=build(b,store={SAVE:json.dumps({'credits':3000,'upgrades':{'engine':0}})})
  dock(p);assert state(p)['mineAmmo']==0
  buy(p,'engine');assert state(p)['boostUnlocked'] and state(p)['boostCapacity']==75
  buy(p,'minePower');assert state(p)['minePower']==1 and state(p)['mineAmmo']==0
  p.locator('#ammunitionTab').click();credits=state(p)['credits'];p.locator('#buyMineBtn').click()
  assert state(p)['mineAmmo']==1 and state(p)['credits']==credits-12
  p.locator('#fillMinesBtn').click();assert state(p)['mineAmmo']==2 and p.locator('#buyMineBtn').is_disabled()
  p.locator('#upgradesTab').click();buy(p,'mineCapacity');assert state(p)['mineCapacity']==4 and state(p)['mineAmmo']==2
  buy(p,'minePower');assert state(p)['mineAmmo']==2
  buy(p,'flashlight');assert state(p)['mineAmmo']==2
  depart(p);assert p.evaluate('AbyssDiagnostics.mine()');assert state(p)['mineAmmo']==1
  persisted=json.loads(store(p)[CAMPAIGN]);assert persisted['profile']['mineAmmo']==1
  dock(p);assert state(p)['mineAmmo']==1
  depart(p);p.evaluate('AbyssDiagnostics.relaunch()');assert state(p)['mineAmmo']==1
  data=store(p);c.close();c,p,errors=build(b,store=data);assert state(p)['mineAmmo']==1
  dock(p);p.locator('#ammunitionTab').click();credits=state(p)['credits'];p.locator('#fillMinesBtn').click()
  assert state(p)['mineAmmo']==4 and state(p)['credits']==credits-36
  assert p.locator('#fillMinesBtn').is_disabled()
  p.locator('#upgradesTab').click();buy(p,'mineCapacity');assert state(p)['mineAmmo']==4 and state(p)['mineCapacity']==6
  p.evaluate('AbyssDiagnostics.grantCredits(19)');p.locator('#ammunitionTab').click();p.locator('#fillMinesBtn').click()
  assert state(p)['mineAmmo']==5 and state(p)['credits']==7 and p.locator('#buyMineBtn').is_disabled()
  assert not errors,errors;c.close();print('PASS real dock Upgrades/Ammunition tabs; unlock without free rounds; buy/fill costs; empty new slots; no docking/relaunch/reload refills; affordability')

  c,p,errors=build(b)
  d=debug(p);layout=d['field']['loot'];assert len(layout)==234
  resources=[n for n in layout if n['type']!='air'];assert len(resources)==204
  total=sum(n['quantity']*(18 if n['type']=='scrap' else 45) for n in resources);assert total==8640 and .72<total/11924<.73
  assert all(n['quantity']==2 for n in resources)
  assert sum(n['quantity']*18 for n in resources if n['type']=='scrap' and n['y']<=1420)>=288
  # Depart first; menus/new launches alone must not create a new dock cycle.
  dock(p);assert state(p)['populationCycle']==0;depart(p)
  picked=[next(n for n in layout if n['type']==kind) for kind in ['scrap','crystal','air']]
  for n in picked:move(p,n['x'],n['y']);use(p)
  assert debug(p)['player']['cargo']['scrap']==2 and debug(p)['player']['cargo']['crystal']==2
  enemy=debug(p)['predators'][0];p.evaluate('id=>AbyssDiagnostics.hurtEnemy(id,1000)',enemy['id'])
  d=debug(p);assert len(d['field']['drops'])==1 and d['field']['drops'][0]['quantity']==2
  dead=enemy['id'];drop=d['field']['drops'][0]
  p.evaluate('id=>AbyssDiagnostics.hurtEnemy(id,1000)',dead);assert len(debug(p)['field']['drops'])==1
  # Uncollected bounty persists while docking only resets predators/caches.
  dock(p);after=debug(p);assert state(p)['populationCycle']==1
  assert after['field']['loot']==layout and len(after['field']['drops'])==1
  assert state(p)['credits']==126
  byid={n['id']:n for n in after['items']}
  assert all(byid[n['id']]['collected'] for n in picked[:2]);assert not byid[picked[2]['id']]['collected']
  assert state(p)['predators']==186
  p.locator('#launchAgain').click();dock(p);assert state(p)['populationCycle']==1
  depart(p);move(p,drop['x'],drop['y']);use(p);assert not debug(p)['field']['drops']
  assert debug(p)['player']['cargo']['scrap']==2
  dock(p);assert state(p)['credits']==162 and state(p)['populationCycle']==2
  data=store(p);cid=state(p)['campaignId'];c.close();c,p,errors=build(b,store=data)
  assert state(p)['campaignId']==cid and debug(p)['field']['loot']==layout and state(p)['credits']==162
  assert all(n['id'] in debug(p)['field']['looted'] for n in picked[:2])
  assert not debug(p)['field']['drops']
  # Destroy each tier. Amount is salvage to collect, not instant credits.
  for tier,count in [('common',2),('apex',4),('reaper',8)]:
   enemy=next(e for e in debug(p)['predators'] if e['tier']==tier);cash=state(p)['credits']
   p.evaluate('id=>AbyssDiagnostics.hurtEnemy(id,9999)',enemy['id'])
   assert debug(p)['field']['drops'][-1]['quantity']==count and state(p)['credits']==cash
  data=store(p);c.close();c,p,errors=build(b,store=data)
  assert len(debug(p)['field']['drops'])==3 and state(p)['predators']==183
  assert not errors,errors;c.close();print('PASS fixed 234 placements; 8,640-credit floor economy; generous shallow supply; permanent scrap/crystals; dock-only enemy/cache refresh; repeat-visit guard; all tier bounties; reload persistence')

  # Migrate an actual v0.9 generated population, not a hand-written approximation.
  import zipfile
  z=zipfile.ZipFile(ROOT.parent/'the-abyss-below-v0.9.0-complete.zip') if (ROOT.parent/'the-abyss-below-v0.9.0-complete.zip').exists() else None
  if z:
   oldstore={SAVE:json.dumps({'credits':444,'xp':777,'bestDepth':650,'secured':[0,2],'upgrades':{'engine':4,'minePower':3,'mineCapacity':4,'hull':4}}),FIELD:json.dumps({'schema':1,'seed':91827,'cycle':4,'looted':['loot-0','loot-190','loot-220'],'health':{'enemy-0':0,'enemy-2':50}})}
   oc=b.new_context(service_workers='block');op=oc.new_page();op.set_content(z.read('index.html').decode());op.add_style_tag(content=z.read('styles.css').decode())
   op.evaluate('''store=>{window.ABYSS_TEST_MODE=true;Object.defineProperty(window,'localStorage',{value:{getItem:k=>store[k]??null,setItem:(k,v)=>store[k]=v}})}''',oldstore)
   op.add_script_tag(content=z.read('game.js').decode());oldnodes=op.evaluate('AbyssDiagnostics.debug().items.filter(n=>n.type!=="recorder").map(({id,x,y,type,collected})=>({id,x,y,type,collected}))');oc.close()
   c,p,errors=build(b,store=oldstore)
   newnodes=p.evaluate('AbyssDiagnostics.debug().items.filter(n=>n.type!=="recorder").map(({id,x,y,type,collected})=>({id,x,y,type,collected}))')
   assert oldnodes==newnodes,'Migration shifted legacy placements'
   s=state(p);assert s['credits']==444 and s['secured']==2 and s['mineAmmo']==0 and s['minePower']==3 and s['mineCapacity']==8 and s['boostCapacity']==150
   canonical=store(p);assert CAMPAIGN in canonical
   backup=dict(canonical);backup[CAMPAIGN+'.backup']=canonical[CAMPAIGN];backup[CAMPAIGN]='{broken'
   c.close();c,p,errors=build(b,store=backup)
   assert state(p)['credits']==444 and state(p)['storageHealthy'] and 'RECOVERED' in p.locator('#saveStatus').inner_text()
   assert json.loads(store(p)[CAMPAIGN])['profile']['credits']==444
   p.evaluate('AbyssDiagnostics.unfreeze()');p.locator('#focusPauseBtn').click();p.locator('#pauseMenuBtn').click();p.locator('#newGameBtn').click();p.locator('#cancelNewGameBtn').click()
   assert state(p)['credits']==444
   oldid=state(p)['campaignId'];p.locator('#newGameBtn').click();p.locator('#confirmNewGameBtn').click()
   assert state(p)['credits']==0 and state(p)['campaignId']!=oldid and state(p)['mineAmmo']==0 and not state(p)['boostUnlocked']
   assert not debug(p)['field']['looted'] and not debug(p)['field']['drops']
   assert not errors,errors;c.close();print('PASS v0.9 migration keeps exact seed/cycle/node IDs/coordinates/depletion and banked upgrades; empty purchased-ammo migration; corrupt-primary backup recovery; confirmed fresh campaign')
  else:print('SKIP legacy-byte comparison: place the v0.9.0 complete ZIP beside the source directory to run it')
  b.close()
if __name__=='__main__':run()
