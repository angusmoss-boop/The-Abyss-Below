"""Actual production wreck interactions, preservation, recovery and return flow."""
from v0250_harness import *
from playwright.sync_api import sync_playwright
from collections import deque
import math, copy

def giants(p):return p.evaluate('AbyssDiagnostics.giants()')
def visit(p,point):move(p,point['x'],point['y'])
def prime(p):
 fix(p,depth=40,upgrades={'hull':7,'oxygen':5,'battery':5,'engine':4,'flashlight':4,'sonar':4,'railgun':4,'torpedo':4,'shield':4})
 p.evaluate('AbyssDiagnostics.relaunch()')

def run():
 with sync_playwright() as pw:
  b=launch_browser(pw);c,p,errors=build(b,390,844,True);prime(p)
  initial=debug(p);g=giants(p);v=g['site'];assert len(g['definitions'])==5
  assert not g['state']['banked'] and not g['state']['sites'][v['id']]['opened']
  # The new model lives wholly outside original rocks and resource sites.
  for wall in g['walls']:
   assert not [r for r in initial['rocks'] if abs(r['x']-wall['x'])<r['radius']+(wall['right']-wall['left'])/2 and abs(r['y']-wall['y'])<r['radius']+(wall['bottom']-wall['top'])/2]
  old_loot=copy.deepcopy(initial['field']['loot']);old_stock=copy.deepcopy(initial['saved'])
  panel=v['panel'];visit(p,panel);use(p)
  assert not giants(p)['state']['sites'][v['id']]['opened']
  assert 'SONAR' in p.locator('#notification').inner_text()
  p.evaluate('AbyssDiagnostics.ping()');step(p,.15)
  assert giants(p)['state']['sites'][v['id']]['scanned']
  assert not giants(p)['state']['sites'][v['id']]['opened']
  visit(p,panel);use(p)
  assert giants(p)['state']['sites'][v['id']]['opened']
  assert not [w for w in giants(p)['walls'] if w['gate']]
  assert debug(p)['saved']['credits']==old_stock['credits'] and debug(p)['saved']['crystals']==old_stock['crystals']
  assert debug(p)['field']['loot']==old_loot
  print('PASS real sonar arrival identifies service panel, USE opens persistent door without currency or ammo; original resources untouched')
  # Plate stays manual even with a fitted magnet, and provides no instant reward.
  visit(p,v['plate']);p.evaluate('AbyssDiagnostics.autoPickup()');assert not debug(p)['player']['cargo']['plates']
  use(p);assert debug(p)['player']['cargo']['plates']==[v['id']]
  assert not giants(p)['state']['banked']
  use(p);assert debug(p)['player']['cargo']['plates']==[v['id']]
  p.evaluate('AbyssDiagnostics.save()');saved=store(p);c.close()
  c,p,e=build(b,390,844,True,store=saved);errors+=e
  assert state(p)['paused'] and debug(p)['player']['cargo']['plates']==[v['id']]
  assert giants(p)['state']['sites'][v['id']]['opened']
  assert not [o for o in giants(p)['objects'] if o['kind']=='plate']
  # Plate-only death creates a wreck, resets ammunition to exactly the rescue stock.
  p.evaluate('AbyssDiagnostics.loseDive()');r=debug(p)['field']['recoveries'][0]
  assert r['scrap']==r['crystal']==0 and r['recorders']==[] and r['plates']==[v['id']]
  assert 'ID PLATE' in p.locator('.recovery-manifest').inner_text()
  assert state(p)['weaponAmmo']=={'railgun':10,'torpedo':3} and state(p)['mineAmmo']==3
  p.locator('#retryBtn').click();step(p,0)
  assert not [o for o in giants(p)['objects'] if o['kind']=='plate']
  visit(p,r);use(p);assert debug(p)['player']['cargo']['plates']==[v['id']]
  assert not debug(p)['field']['recoveries']
  p.evaluate('AbyssDiagnostics.loseDive()');r2=debug(p)['field']['recoveries'][0];assert r2['id']!=r['id'] and r2['plates']==[v['id']]
  p.locator('#retryBtn').click();step(p,0);visit(p,r2);use(p)
  before=debug(p)['saved'];dock(p)
  assert giants(p)['state']['banked']==[v['id']]
  assert debug(p)['saved']['credits']==before['credits'] and debug(p)['saved']['crystals']==before['crystals']
  assert debug(p)['player']['cargo']['plates']==[]
  print('PASS plate-only and repeat deaths preserve exact one-owner cargo, origin stays depleted, dock archives plate with no currency creation')
  p.locator('#archiveTab').click();p.locator('#discoveriesDockBtn').click()
  assert p.locator('.discovery-card').count()==5 and p.locator('.is-archived').count()==1
  p.locator('#discoveryLivery').select_option(v['id']);assert giants(p)['state']['livery']==v['id']
  p.locator('#signalsClose').click();p.evaluate('AbyssDiagnostics.save()')
  res=p.evaluate('''()=>{const d=JSON.parse(testStore['the-abyss-below-slot-1-v1']);return {original:d,read:AbyssSignals.unpack(AbyssSignals.pack(d)).payload};}''')
  assert res['original']==res['read']
  assert res['read']['giants']['banked']==[v['id']]
  assert res['read']['giants']['livery']==v['id']
  p.locator('#launchAgain').click();step(p,0);assert not [o for o in giants(p)['objects'] if o['kind']=='plate']
  assert giants(p)['state']['sites'][v['id']]['opened']
  p.evaluate('AbyssDiagnostics.loseDive()');assert not debug(p)['field']['recoveries']
  assert giants(p)['state']['banked']==[v['id']]
  print('PASS five discovery cards, earned finish selection, exact portable backup round-trip and permanent shortcut/reward through death and docking')
  assert not errors,errors;c.close();b.close()
if __name__=='__main__':run()
