"""Production loss/recovery, unique recorder ownership and banked-cargo conservation."""
from v0182_harness import *
from playwright.sync_api import sync_playwright
import copy, math

def take(p,n):
 move(p,n['x'],n['y'])
 if n['type']=='scrap':p.evaluate('AbyssDiagnostics.autoPickup()')
 else:use(p)

def collect_set(p,recorder=0):
 items=debug(p)['items']
 nodes=[next(n for n in items if n['type']==k and not n['collected']) for k in ['scrap','crystal']]
 nodes.append(next(n for n in items if n['type']=='recorder' and n['index']==recorder and not n['collected']))
 for n in nodes:take(p,n)
 return nodes

def respawn(p):
 p.locator('#retryBtn').click();p.evaluate('AbyssDiagnostics.step(0)')

def assert_no_origin(p,indices):
 assert not [i for i in debug(p)['items'] if i['type']=='recorder' and i['index'] in indices and not i['collected']]

def run():
 with sync_playwright() as pw:
  b=launch_browser(pw);c,p,errors=build(b,390,844,True)
  p.evaluate('AbyssDiagnostics.regenerate(41072)')
  before=debug(p);layout=copy.deepcopy(before['field']['loot']);nodes=collect_set(p)
  assert debug(p)['player']['cargo']=={'scrap':2,'crystal':2,'recorders':[0]}
  # Actual damage path, no test-only assignment to the cargo or field.
  move(p,600,1120);loss=state(p)
  p.evaluate('AbyssDiagnostics.hit(10000)')
  d=debug(p);pod=d['field']['recoveries'][0]
  assert not state(p)['running'] and len(d['field']['recoveries'])==1
  assert pod['kind']=='wreck' and (pod['scrap'],pod['crystal'],pod['recorders'])==(2,2,[0])
  assert math.hypot(pod['x']-loss['x'],pod['y']-loss['y'])<100
  assert d['player']['cargo']=={'scrap':0,'crystal':0,'recorders':[]}
  assert d['saved']['credits']==0 and d['saved']['crystals']==0 and d['saved']['secured']==[]
  assert d['field']['pendingCargo'] is None and json.loads(store(p)[CAMPAIGN])['activeDive'] is None
  assert d['field']['survey']['contacts']['items:'+pod['id']]['type']=='recovery'
  assert d['field']['survey']['waypoint']=={'x':pod['x'],'y':pod['y']}
  assert p.locator('.recovery-manifest').inner_text().split()==['2','SCRAP','2','CRYSTALS','1','RECORDERS']
  assert '10 RAIL' in p.locator('.rescue-loadout').inner_text()
  # Extra death notifications in one frame cannot reset stock or create more pods.
  assert p.evaluate('AbyssDiagnostics.loseDive()') is False
  assert debug(p)['field']['recoveries']==[pod]
  deadstore=store(p);c.close();c,p,e=build(b,390,844,True,store=deadstore);errors+=e
  assert_no_origin(p,[0]);assert debug(p)['field']['loot']==layout
  assert all(n['id'] in debug(p)['field']['looted'] for n in nodes[:2])
  assert state(p)['weaponAmmo']=={'railgun':10,'torpedo':3} and state(p)['mineAmmo']==3
  r=next(n for n in debug(p)['items'] if n['type']=='recovery')
  # Proximity/magnet does not auto-collect the recorder-bearing rescue cargo.
  move(p,r['x'],r['y']);p.evaluate('AbyssDiagnostics.autoPickup()')
  assert state(p)['recoveryPods']==1
  use(p);d=debug(p)
  assert d['player']['cargo']=={'scrap':2,'crystal':2,'recorders':[0]} and not d['field']['recoveries']
  assert d['field']['survey']['waypoint'] is None
  for _ in range(3):assert not p.evaluate('id=>AbyssDiagnostics.collectById(id)',r['id'])
  assert debug(p)['player']['cargo']==d['player']['cargo']
  assert state(p)['secured']==0 and not state(p)['levelComplete']
  p.evaluate('AbyssDiagnostics.save()');carry=store(p);c.close();c,p,e=build(b,store=carry);errors+=e
  assert state(p)['paused'] and debug(p)['player']['cargo']==d['player']['cargo']
  assert_no_origin(p,[0]);dock(p);assert state(p)['credits']==36 and state(p)['crystals']==2 and state(p)['secured']==1
  # Once banked, a later empty loss leaves balances alone and no empty wreck.
  depart(p);p.evaluate('AbyssDiagnostics.hit(10000)');assert state(p)['recoveryPods']==0
  assert state(p)['credits']==36 and state(p)['crystals']==2 and state(p)['secured']==1
  print('PASS real damage death retains scrap, crystals and recorders; automatic beacon; manual single transfer; reload/paused resume; unique banked delivery; empty loss preserves banked progress')
  c.close()

  # Two losses keep both manifests. Dying after a recovery moves only the cargo aboard.
  c,p,e=build(b);errors+=e;fix(p,depth=40,upgrades={'hull':7});p.evaluate('AbyssDiagnostics.relaunch()')
  collect_set(p,0);move(p,600,1120);p.evaluate('AbyssDiagnostics.loseDive()');first=debug(p)['field']['recoveries'][0];respawn(p)
  collect_set(p,1);move(p,600,1720);p.evaluate('AbyssDiagnostics.loseDive()');second=debug(p)['field']['recoveries'][1];respawn(p)
  assert state(p)['recoveryPods']==2;assert_no_origin(p,[0,1]);assert not state(p)['levelComplete']
  r=next(n for n in debug(p)['items'] if n['id']==first['id']);take(p,r)
  assert debug(p)['player']['cargo']=={'scrap':2,'crystal':2,'recorders':[0]}
  move(p,600,2220);p.evaluate('AbyssDiagnostics.loseDive()');pods=debug(p)['field']['recoveries']
  assert len(pods)==2 and pods[0]['id']==second['id'] and pods[1]['id'] not in [first['id'],second['id']]
  assert sorted(x for r in pods for x in r['recorders'])==[0,1]
  assert sum(r['scrap'] for r in pods)==4 and sum(r['crystal'] for r in pods)==4
  respawn(p)
  for r in list(n for n in debug(p)['items'] if n['type']=='recovery'):take(p,r)
  assert sorted(debug(p)['player']['cargo']['recorders'])==[0,1]
  assert not state(p)['levelComplete'];dock(p)
  assert state(p)['credits']==72 and state(p)['crystals']==4 and state(p)['secured']==2 and state(p)['levelComplete']
  assert debug(p)['levels'][1]['unlocked'] and not state(p)['recoveryPods']
  print('PASS repeated losses keep earlier wrecks; re-loss creates one new manifest with no duplication; only banking both recovered recorders unlocks Level 2')
  c.close()

  # A recorder-only loss is a real objective, not an empty cargo discarded by truthiness.
  c,p,e=build(b);errors+=e
  r=next(n for n in debug(p)['items'] if n['type']=='recorder');take(p,r);move(p,600,1120)
  p.evaluate('AbyssDiagnostics.loseDive()');pod=debug(p)['field']['recoveries'][0]
  assert pod['scrap']==pod['crystal']==0 and pod['recorders']==[0]
  respawn(p);assert_no_origin(p,[0]);take(p,next(n for n in debug(p)['items'] if n['type']=='recovery'));dock(p)
  assert state(p)['secured']==1 and state(p)['credits']==0 and state(p)['crystals']==0
  print('PASS recorder-only cargo survives as an independently recoverable wreck')
  c.close()

  # Position safety: surface breach, obstacle collision and over-pressure deaths.
  for name,position in [('surface',(820,-80)),('surfaceAboveBerth',(600,-80)),('harbour',(600,160)),('pressure',(600,2420)),('rock',None)]:
   c,p,e=build(b);errors+=e
   r=next(n for n in debug(p)['items'] if n['type']=='recorder');take(p,r)
   if name=='rock':
    rock=next(k for k in debug(p)['rocks'] if 700<k['y']<2600);position=(rock['x'],rock['y'])
   move(p,*position);p.evaluate('AbyssDiagnostics.loseDive()');pod=debug(p)['field']['recoveries'][0]
   assert 140<=pod['y']<=3075
   if name=='pressure':assert pod['y']>2000 # No teleport back above the pressure rating.
   if name=='rock':assert math.hypot(pod['x']-position[0],pod['y']-position[1])<400
   respawn(p);r=next(n for n in debug(p)['items'] if n['type']=='recovery');take(p,r)
   assert debug(p)['player']['cargo']['recorders']==[0],name
   c.close()
  print('PASS surface losses settle underwater; obstacle losses move to nearby clear water; pressure deaths preserve actual loss depth')

  # Ordinary quit preserves recorders too, but does not mint rescue ammunition.
  c,p,e=build(b);errors+=e;collect_set(p);p.evaluate('AbyssDiagnostics.unfreeze()');p.locator('#focusPauseBtn').click();p.locator('#quitBtn').click();p.locator('#confirmQuitBtn').click()
  assert state(p)['weaponAmmo']=={'railgun':0,'torpedo':0} and state(p)['mineAmmo']==0
  assert debug(p)['field']['recoveries'][0]['recorders']==[0]
  p.locator('#startBtn').click();assert_no_origin(p,[0])
  print('PASS explicit quit keeps all cargo but does not grant defeat stock')
  assert not errors,errors;c.close();b.close()
if __name__=='__main__':run()
