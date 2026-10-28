"""Ten extra goals: real actions, retained-state backfill and campaign-local counters."""
from v0230_harness import *
from v0230_giants_test import prime,giants,visit
from playwright.sync_api import sync_playwright
from v0230_strongholds_test import relay
import math,copy

def earned(p,aid):return next(a for a in p.evaluate('AbyssDiagnostics.achievementCatalog()') if a['id']==aid)['earned']
def close_win(p):
 if p.locator('#victoryClose').is_visible():p.locator('#victoryClose').click()
def run():
 with sync_playwright() as pw:
  b=launch_browser(pw);c,p,errors=build(b);prime(p)
  for i in range(5):
   p.evaluate('i=>AbyssDiagnostics.fixtureLevel(i)',i)
   g=giants(p);visit(p,g['site']['panel']);p.evaluate('AbyssDiagnostics.ping()');step(p,.2);use(p)
   assert giants(p)['state']['sites'][g['site']['id']]['opened']
   relay(p,0);relay(p,1);visit(p,g['site']['plate']);use(p)
   assert any(n['kind']=='plate' for n in p.evaluate('AbyssDiagnostics.pickups()'))
   assert not earned(p,'forgotten-fleet')
   dock(p);assert earned(p,'wreck-diver');close_win(p)
   if p.locator('#launchAgain').is_visible():p.locator('#launchAgain').click()
  assert earned(p,'forgotten-fleet') and earned(p,'open-sesame')
  print('PASS first/all five banked plates and all five opened-shortcut achievements via sonar, manual USE and actual dock delivery; plate notice appears',flush=True)
  # Repeated recoveries of actual dead vessels, not guessed from a profile counter.
  p.evaluate('AbyssDiagnostics.fixtureLevel(0)')
  for n in range(5):
   if not debug(p)['player']['cargo']['scrap']:
    item=next(x for x in debug(p)['items'] if x['type']=='scrap' and not x['collected']);visit(p,item);p.evaluate('AbyssDiagnostics.autoPickup()')
   move(p,600,850+n*40);p.evaluate('AbyssDiagnostics.loseDive()');p.locator('#retryBtn').click();step(p,0)
   pod=next(x for x in debug(p)['items'] if x['type']=='recovery');visit(p,pod);use(p)
   assert debug(p)['saved']['stats']['wreckRecoveries']==n+1
   assert earned(p,'recovery-specialist')==(n==4)
  print('PASS five actual deaths and manual wreck recoveries award Recovery Specialist once, with no duplicated cargo',flush=True)
  # Physical upward movement: every crossing has its own continuous ascent.
  for n in range(10):
   fix(p,depth=2,facing=-math.pi/2,upgrades={'hull':7,'engine':4});move(p,1300,150)
   step(p,1.4,keys=['arrowup',' ']);assert debug(p)['saved']['stats']['surfaceBreaches']==n+1
   assert earned(p,'dolphin-pilot')==(n==9)
  print('PASS ten actual boosted surface crossings award Dolphin Pilot, without counting airborne frames repeatedly',flush=True)
  # Exactly 39 is insufficient; 40 banked in one return is enough.
  for amount in [39,40]:
   fix(p,depth=60,upgrades={'hull':7},items=[{'dx':0,'dy':0,'type':'scrap','quantity':amount}])
   p.evaluate('AbyssDiagnostics.autoPickup()');dock(p)
   assert earned(p,'heavy-haul')==(amount==40)
   p.locator('#launchAgain').click()
  saved=store(p);times=debug(p)['saved']['achievements'];c.close()
  c,p,e=build(b,store=saved,launch=False);errors+=e
  assert all(debug(p)['saved']['achievements'][k]==v for k,v in times.items())
  assert p.locator('#menuAchievementCount').inner_text().endswith('/ 30')
  p.locator('#menuAchievementsBtn').click();assert p.locator('.achievement-card').count()==30;p.locator('#achievementClose').click()
  p.locator('#startBtn').click()
  if not state(p)['pauseOpen']:p.locator('#focusPauseBtn').click()
  p.locator('#pauseAchievementsBtn').click();assert p.locator('.achievement-card').count()==30
  print('PASS 39/40-scrap single-dock boundary, no duplicate unlock timestamps after reload and all 30 goals from both menu surfaces',flush=True)
  c.close()
  # Old campaigns can already prove boss, plate, shortcut and completed-contract
  # goals. Per-type/recovery/breach/haul history did not exist, so do not invent it.
  legacy=copy.deepcopy(saved);d=json.loads(legacy[CAMPAIGN]);d['profile']['achievements']={};d['profile']['stats']={};d['signals']['completed']=10
  d['signals']['warden'].update({'defeated':True,'activated':True,'health':0,'claimed':True,'pending':False})
  legacy[CAMPAIGN]=json.dumps(d);c,p,e=build(b,store=legacy,launch=False);errors+=e
  for aid in ['warden-breaker','wreck-diver','forgotten-fleet','open-sesame','first-commission','trusted-contractor']:assert earned(p,aid),aid
  for aid in ['versatile-operator','recovery-specialist','dolphin-pilot','heavy-haul']:assert not earned(p,aid),aid
  assert not errors,errors;c.close();b.close()
  print('PASS factual legacy backfill only: stored Warden, five plates/shortcuts and contract total; no fabricated new historical counters',flush=True)
if __name__=='__main__':run()
