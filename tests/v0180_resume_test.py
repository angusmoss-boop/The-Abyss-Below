"""Atomic dive saves exercised with production collection, mine, scan and docking paths."""
from v0180_harness import *
from playwright.sync_api import sync_playwright
import copy, json, math

def take(p,n):
 move(p,n['x'],n['y'])
 if n['type']=='scrap':p.evaluate('AbyssDiagnostics.autoPickup()')
 else:use(p)
def run():
 with sync_playwright() as pw:
  b=launch_browser(pw);c,p,errors=build(b,390,844,True)
  fix(p,depth=45,upgrades={'hull':7,'engine':3,'battery':2,'minePower':2,'mineCapacity':4,'shield':2,'sonar':1},mineAmmo=8)
  p.evaluate('AbyssDiagnostics.relaunch()')
  # Real fixed nodes and a real recorder, not injected cargo.
  items=debug(p)['items'];nodes=[next(n for n in items if n['type']==kind) for kind in ['scrap','crystal','recorder']]
  for n in nodes:take(p,n)
  enemy=debug(p)['predators'][0];p.evaluate('([id,dmg])=>AbyssDiagnostics.hurtEnemy(id,dmg)',[enemy['id'],25])
  move(p,820,160) # outside berth launch lock, inside protected water; no accidental live-enemy detonation
  assert p.evaluate('AbyssDiagnostics.mine()')
  step(p,.8,keys=[' '])
  p.evaluate('AbyssDiagnostics.setSystems({hull:201,oxygen:74,battery:98,shield:19});AbyssDiagnostics.ping();AbyssDiagnostics.save()')
  before=debug(p);snap=store(p);active=json.loads(snap[CAMPAIGN])['activeDive']
  assert active and len(active['mines'])==1 and active['player']['mineAmmo']==7
  assert active['player']['cargo']=={'scrap':2,'crystal':2,'recorders':[0]}
  c.close();c,p,errors2=build(b,390,844,True,store=snap,launch=False)
  assert state(p)['hasSavedDive'] and state(p)['menuOpen'] and not state(p)['running']
  assert p.locator('#menuHubBtn').is_disabled() and 'CONTINUE' in p.locator('#startBtn').inner_text()
  # Preview/menu saving must never overwrite the retained active expedition.
  p.locator('#menuAudioBtn').click();p.locator('#audioClose').click()
  assert json.loads(store(p)[CAMPAIGN])['activeDive']['player']['cargo']==active['player']['cargo']
  p.locator('#startBtn').click();s=state(p);d=debug(p)
  assert s['running'] and s['paused'] and s['pauseOpen'] and not s['hasSavedDive']
  assert p.locator('#pauseTitle').inner_text()=='EXPEDITION RESTORED'
  for key in ['x','y','vx','vy','hull','battery','oxygen','shield','mineAmmo','boost','cargo','scanCooldown','mineCooldown','lastRepair','trip']:
   assert d['player'][key]==before['player'][key],(key,d['player'][key],before['player'][key])
  assert d['clock']==before['clock'] and d['items']==before['items'] and d['mines']==before['mines']
  assert d['predators']==before['predators'] and len(d['sonarWaves'])==len(before['sonarWaves'])
  assert d['field']['seed']==before['field']['seed'] and d['field']['cycle']==before['field']['cycle'] and s['recoveryPods']==0
  p.wait_for_timeout(220);assert debug(p)['clock']==d['clock'] and state(p)['hull']==s['hull']
  p.locator('#resumeBtn').click();assert not state(p)['paused'];step(p,.1);assert debug(p)['clock']>d['clock']
  assert not errors+errors2,errors+errors2
  print('PASS actual fixed loot + recorder + bought-stock fixture; hull/air/power/shield, cargo, ammo, mines, enemy wounds/positions, sonar, clock and population restore exactly; starts paused and no recovery duplicate')
  # Dock commits currencies exactly once. Reload at the berth cannot redeposit cargo.
  dock(p);bank=state(p);assert bank['credits']==36 and bank['crystals']==2 and bank['secured']==1
  assert not debug(p)['player']['cargo']['recorders']
  dockstore=store(p);c.close();c,p,e=build(b,store=dockstore)
  assert state(p)['paused'] and state(p)['credits']==36 and state(p)['crystals']==2
  p.locator('#resumeBtn').click();dock(p);assert state(p)['credits']==36 and state(p)['crystals']==2
  print('PASS docking and reloading do not duplicate delivered scrap, crystals or recorders; owned ammo remains spent')
  c.close()
  # Explicit quit and defeat still produce one recovery, unlike save/resume.
  for action in ['quit','defeat']:
   c,p,e=build(b,store=snap)
   if action=='quit':p.locator('#quitBtn').click();p.locator('#confirmQuitBtn').click()
   else:p.evaluate('AbyssDiagnostics.loseDive()')
   deadstore=store(p);assert json.loads(deadstore[CAMPAIGN])['activeDive'] is None
   c.close();c,p,e=build(b,store=deadstore);assert state(p)['recoveryPods']==1
   pod=next(i for i in debug(p)['items'] if i['type']=='recovery');assert pod['scrap']==2 and pod['crystal']==2
   assert debug(p)['player']['mineAmmo']==7
   take(p,pod);dock(p);assert state(p)['credits']==36 and state(p)['crystals']==2
   assert state(p)['recoveryPods']==0 and json.loads(store(p)[CAMPAIGN])['levels'][state(p)['levelId']]['pendingCargo'] is None
   c.close()
  print('PASS explicit abandon/defeat retains one persistent recovery pod, returns recorder, and never refunds mine ammunition')
  # Invalid snapshot falls back to journalled cargo, not silent destruction.
  broken=copy.deepcopy(snap);v=json.loads(broken[CAMPAIGN]);v['activeDive']['player']['x']='invalid';broken[CAMPAIGN]=json.dumps(v)
  c,p,e=build(b,store=broken,launch=False);assert not state(p)['hasSavedDive'] and state(p)['recoveryPods']==1
  assert not e,e;c.close()
  # Airborne state is resumable, not converted into an underwater pod.
  c,p,e=build(b,store=snap);p.evaluate('AbyssDiagnostics.moveTo(860,-170);AbyssDiagnostics.setMotion({vx:40,vy:-100,airborne:true});AbyssDiagnostics.save()')
  air=store(p);c.close();c,p,e=build(b,store=air);assert state(p)['airborne'] and state(p)['y']==-170 and state(p)['vy']==-100 and state(p)['paused']
  p.locator('#resumeBtn').click();step(p,2);assert not state(p)['airborne']
  c.close();print('PASS corrupt snapshot falls back to journalled recovery; airborne save restores actual flight with gravity and safe splashdown')
  # Browser hiding pauses and saves without letting the ocean advance.
  c,p,e=build(b);p.evaluate('AbyssDiagnostics.unfreeze();AbyssDiagnostics.backgroundPause()');assert state(p)['paused'] and state(p)['pauseOpen']
  assert json.loads(store(p)[CAMPAIGN])['activeDive'] is not None
  c.close();b.close();print('PASS background/blur path freezes simulation, clears steering, writes a resumable snapshot')
if __name__=='__main__':run()
