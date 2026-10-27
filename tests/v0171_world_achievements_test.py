"""Physical floors, deterministic resource stocks, achievements and soft-lock protection."""
from v0171_harness import *
from playwright.sync_api import sync_playwright
import math,json,time

def run():
 with sync_playwright() as pw:
  b=launch_browser(pw);c,p,errors=build(b)
  if '--achievements-only' not in __import__('sys').argv:
   # A synthetic outfitted ship isolates physical floor collision from fatal pressure.
   for index,depth in enumerate([300,600,1000,1400,1800]):
    p.evaluate('(i)=>AbyssDiagnostics.fixtureLevel(i)',index)
    for facing in [0,math.pi/2,-math.pi/2,math.pi/4]:
     fix(p,depth=depth-1,facing=facing,upgrades={'hull':7,'engine':4},lights=True)
     step(p,.3,keys=['s',' ']);d=debug(p);pl=d['player']
     bottom=pl['y']+15*abs(math.sin(pl['facing']))+10.5
     assert bottom<=120+depth*10+.001,(index,facing,bottom)
    assert debug(p)['field']['floorReached'],index
    # The seabed is solid in the world layer and visible as an echo with lamps off.
    fix(p,depth=depth-15,facing=math.pi/2,upgrades={'hull':7,'engine':4},lights=False)
    p.evaluate('AbyssDiagnostics.ping()');step(p,.5)
    assert any(x.get('echoKind')=='floor' for x in debug(p)['sonarTerrainEchoes']),depth
   assert next(a for a in p.evaluate('AbyssDiagnostics.achievementCatalog()') if a['id']=='bottom')['earned']
   print('PASS five capsule-safe floors at four headings, boosted floor collision, floor discovery achievement and sonar arrival on seabed')
   # Across eight seeds per level, goals and deposits lie above the floor and outside polygons.
   stocks=[]
   for index in range(5):
    p.evaluate('(i)=>AbyssDiagnostics.fixtureLevel(i)',index)
    for seed in range(1,9):
     p.evaluate('(s)=>AbyssDiagnostics.regenerate(s)',seed)
     d=p.evaluate('()=>{const d=AbyssDiagnostics.debug();return {wrecks:d.wrecks,field:{loot:d.field.loot},rocks:d.rocks.map(({x,y,radius})=>({x,y,radius}))}}');floor=120+[300,600,1000,1400,1800][index]*10
     assert len(d['wrecks'])==index+2
     assert all(120<w['y']<floor-100 for w in d['wrecks'])
     # Same conservative collision reach as the population generator.
     for n in d['field']['loot']:
      assert n['y']<floor-40
      assert not any(math.hypot(n['x']-r['x'],n['y']-r['y'])<r['radius']+5 for r in d['rocks']), (index,seed,n)
     starter=[n for n in d['field']['loot'] if n['y']<=1420]
     assert sum(n['quantity'] for n in starter if n['type']=='crystal')>=12
     assert sum(n['quantity']*18 for n in starter if n['type']=='scrap')>=288
   print('PASS 40 seeded maps: objective counts, reachable clear deposits, within-floor placements, starter 288+ credits and 12+ crystals inside standard-hull depth')
   if '--geometry-only' in __import__('sys').argv:c.close();b.close();return
  # Real counter triggers, not direct award injection.
  p.evaluate('AbyssDiagnostics.fixtureLevel(0)')
  p.evaluate("""()=>{
   for(let i=0;i<50;i++){AbyssDiagnostics.simulationFixture({depth:45,upgrades:{magnet:4,hull:7,shield:0},items:[{id:'fixture-'+i,dx:90,dy:0,quantity:2}]});AbyssDiagnostics.autoPickup();}
   for(let i=0;i<50;i++){AbyssDiagnostics.simulationFixture({depth:45,upgrades:{disruptor:0},battery:100});AbyssDiagnostics.ping();}
   for(let i=0;i<50;i++){AbyssDiagnostics.simulationFixture({depth:45,predators:[{id:'fixture-'+i,dx:60,dy:0,tier:i<10?'reaper':'common'}]});AbyssDiagnostics.hurtEnemy('fixture-'+i,10000);}
   for(let i=0;i<10;i++){AbyssDiagnostics.simulationFixture({depth:45,upgrades:{shield:4,hull:7}});AbyssDiagnostics.hit(50);}
  }""")
  assert next(a for a in p.evaluate('AbyssDiagnostics.achievementCatalog()') if a['id']=='attraction')['earned']
  cats=p.evaluate('AbyssDiagnostics.achievementCatalog()')
  for aid in ['echoes','first-blood','reapers','demolition','shield']:
   assert next(a for a in cats if a['id']==aid)['earned'],aid
  # No-damage return counts only after a genuine excursion of >=200m and cargo bank.
  fix(p,depth=210,upgrades={'hull':7,'shield':4},items=[{'dx':0,'dy':0,'quantity':2}])
  step(p,.02);use(p);p.evaluate('AbyssDiagnostics.hit(10)');dock(p)
  assert next(a for a in p.evaluate('AbyssDiagnostics.achievementCatalog()') if a['id']=='getaway')['earned']
  earned=debug(p)['saved']['achievements'].copy();stats=debug(p)['saved']['stats'].copy()
  snapshot=store(p);c.close();c,p,errors=build(b,store=snapshot)
  assert all(debug(p)['saved']['achievements'][k]==v for k,v in earned.items())
  assert all(debug(p)['saved']['stats'][k]==v for k,v in stats.items())
  print('PASS real sonar, kill/reaper, magnet and shield counters; safe cargo-return award; unlock timestamps and counters persist without re-awards')
  # Modal access from both surfaces, keyboard cancellation and underlying pause invariance.
  p.locator('#resumeBtn').click();p.locator('#focusPauseBtn').click();p.locator('#pauseAchievementsBtn').click()
  before=state(p);p.wait_for_timeout(120);assert state(p)['oxygen']==before['oxygen']
  p.keyboard.press('Escape');assert not p.locator('#achievementsDialog').evaluate('(e)=>e.open') and state(p)['paused']
  p.locator('#pauseMenuBtn').click();p.locator('#menuAchievementsBtn').click();assert p.locator('.achievement-card').count()==20
  p.locator('#achievementClose').click();assert state(p)['menuOpen'] and state(p)['paused']
  assert not errors,errors;c.close()
  print('PASS 20 distinct achievement cards, both entry points, accessible native dialog, Escape and suspended-dive state preserved')
  # Last-available-crystals guard prevents optional upgrades stranding a hull gate.
  c,p,errors=build(b);data=json.loads(store(p)[CAMPAIGN]);f=data['levels']['sunbreak-shelf'];f['looted']=[n['id'] for n in f['loot'] if n['type']=='crystal'];data['profile']['crystals']=2;data['profile']['credits']=1000
  c.close();c,p,errors=build(b,store={CAMPAIGN:json.dumps(data)});dock(p)
  p.locator('[data-system="oxygen"]').click();assert p.locator('#upgradePurchase').is_disabled() and 'Hull reserve' in p.locator('#upgradePriceNote').inner_text();p.locator('#upgradeDetailClose').click()
  buy(p,'hull');assert state(p)['hullLevel']==1 and state(p)['crystals']==0
  # Deep, uncollected crystals must not fund optional gear before the first hull gate.
  deep_data=json.loads(store(p)[CAMPAIGN]);deep_data['profile']['upgrades']['hull']=0;deep_data['profile']['crystals']=4;deep_data['profile']['credits']=1000
  df=deep_data['levels']['sunbreak-shelf'];df['looted']=[n['id'] for n in df['loot'] if n['type']=='crystal' and n['y']<=1420]
  assert any(n['type']=='crystal' and n['y']>1420 for n in df['loot'])
  c.close();c,p,errors=build(b,store={CAMPAIGN:json.dumps(deep_data)});dock(p)
  p.locator('[data-system="minePower"]').click()
  assert p.locator('#upgradePurchase').is_disabled() and 'Hull reserve' in p.locator('#upgradePriceNote').inner_text()
  p.locator('#upgradeDetailClose').click();buy(p,'hull');assert state(p)['crystals']==2 and state(p)['hullLevel']==1
  # New Game opens the slot selector without changing this existing campaign.
  before=state(p);p.locator('#launchAgain').click();p.locator('#focusPauseBtn').click();p.locator('#pauseMenuBtn').click();p.locator('#newGameBtn').click()
  assert p.locator('#slotsDialog').evaluate('(e)=>e.open')
  assert state(p)['campaignId']==before['campaignId'] and state(p)['credits']==before['credits'] and state(p)['hullLevel']==before['hullLevel']
  assert p.locator('[data-new-slot]').count()==2
  assert not errors,errors;c.close();b.close()
  print('PASS per-pressure-gate crystal reserve and non-destructive New Game slot selection')
if __name__=='__main__':run()
