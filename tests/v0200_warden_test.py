from playwright.sync_api import sync_playwright
from v0200_harness import *
import json

def sig(p):return p.evaluate('AbyssDiagnostics.signals()')
def boss(p):return next((e for e in debug(p)['predators'] if e['tier']=='warden'),None)
with sync_playwright() as pw:
 b=launch_browser(pw);c,p,errors=build(b,1440,900,False)
 # Synthetic fitted equipment; actual level generation, collect and bank functions unlock the route.
 fix(p,depth=40,upgrades={'hull':7,'engine':4,'shield':4,'battery':4,'oxygen':5,'railgun':4,'torpedo':4,'sonar':4,'flashlight':4})
 for index in range(3):
  p.evaluate('(i)=>AbyssDiagnostics.fixtureLevel(i)',index)
  for item in [x for x in debug(p)['items'] if x['type']=='recorder']:
   move(p,item['x'],item['y']);use(p)
  dock(p)
  if p.locator('#victoryClose').is_visible():p.locator('#victoryClose').click()
  if p.locator('#launchAgain').is_visible():p.locator('#launchAgain').click()
 p.evaluate('AbyssDiagnostics.fixtureLevel(3)');assert boss(p) is None
 site=sig(p)['state']['warden']['site'];assert site and 1100<((site['y']-120)/10)<1330
 # Visit the observation marker: consent is necessary, never triggered by proximity.
 move(p,site['x'],site['y']-170);step(p,.1);assert boss(p) is None
 use(p);assert p.locator('#wakeWarden').is_visible();p.locator('#leaveWarden').click();assert boss(p) is None
 p.evaluate('AbyssDiagnostics.step(0)');use(p);p.locator('#wakeWarden').click();p.evaluate('AbyssDiagnostics.step(0)');assert boss(p)['health']==1200
 p.evaluate('AbyssDiagnostics.debug().predators.filter(e=>e.tier!=="warden").forEach(e=>AbyssDiagnostics.hurtEnemy(e.id,10000))')
 move(p,site['x'],site['y']-80);p.evaluate('AbyssDiagnostics.ping()');step(p,3.1)
 e=boss(p);assert e['wardenPhase']=='windup',e['wardenPhase']
 assert state(p)['hull']==state(p)['maxHull'],'Wind-up damaged the sub'
 # Checkpoint taken mid-tell must retain exact phase, health and resident pose.
 p.evaluate('AbyssDiagnostics.save()');snap=store(p);prior=boss(p)
 c2,q,err2=build(b,1440,900,False,store=snap,launch=False)
 assert state(q)['hasSavedDive'];q.locator('#startBtn').click();assert state(q)['pauseOpen'];assert boss(q)==prior
 q.locator('#resumeBtn').click();q.evaluate('AbyssDiagnostics.step(0)')
 # Armour vs recovery damage through the actual damage function.
 hp=boss(q)['health'];q.evaluate('AbyssDiagnostics.hurtEnemy("cathedral-warden",100)');assert boss(q)['health']==hp-65
 step(q,1.55);assert boss(q)['wardenPhase'] in ['charge','recover'];assert state(q)['hull']>0
 step(q,1.5);assert boss(q)['wardenPhase']=='recover',boss(q)['wardenPhase']
 hp=boss(q)['health'];q.evaluate('AbyssDiagnostics.hurtEnemy("cathedral-warden",100)');assert boss(q)['health']==hp-100
 q.screenshot(path=str(OUT/'warden-test.png'))
 # Leave its territory: no cross-map pursuit or charge while the pilot retreats.
 move(q,600,600);step(q,.4);assert boss(q)['wardenPhase']=='listen' and boss(q)['aggression']==0
 before=boss(q)['health'];dock(q);assert boss(q)['health']==before and sig(q)['state']['warden']['health']==before
 q.locator('#launchAgain').click();move(q,site['x'],site['y']-120);step(q,.05)
 q.evaluate('AbyssDiagnostics.hurtEnemy("cathedral-warden",10000)');assert sig(q)['state']['warden']['defeated'] and sig(q)['state']['warden']['pending']
 assert next(a for a in q.evaluate('AbyssDiagnostics.achievementCatalog()') if a['id']=='warden-breaker')['earned']
 before=state(q)['credits'];crystals=state(q)['crystals'];cargo=debug(q)['player']['cargo']['scrap'];dock(q)
 assert state(q)['credits']==before+1200+cargo*18;assert state(q)['crystals']==crystals+debug(q)['player']['cargo']['crystal']
 assert sig(q)['state']['warden']['claimed'] and sig(q)['state']['warden']['livery']=='hunter'
 assert boss(q) is None
 before=state(q)['credits'];q.locator('#launchAgain').click();move(q,600,600);step(q,.1);dock(q);assert state(q)['credits']==before
 q.locator('#archiveTab').click();q.locator('#wardenDossierBtn').click();q.locator('#hullLivery').select_option('standard');assert sig(q)['state']['warden']['livery']=='standard'
 q.locator('#signalsClose').click();q.evaluate('AbyssDiagnostics.save()');final=store(q)
 c3,r,err3=build(b,store=final);assert boss(r) is None and sig(r)['state']['warden']['claimed']
 assert not errors+err2+err3,(errors,err2,err3)
 print('PASS optional activation/cancel, distinct wind-up/charge/recovery, armour vulnerability, no damage during tell, territorial retreat, wounded boss persistence, exact mid-tell resume, one-time credit/cosmetic reward, no boss respawn or crystal reward.')
 c.close();c2.close();c3.close();b.close()
