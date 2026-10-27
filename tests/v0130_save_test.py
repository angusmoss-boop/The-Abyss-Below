"""v0.12 campaign preservation and underwater recovery after an interrupted breach."""
from v0130_harness import *
from playwright.sync_api import sync_playwright
import json

def run():
 fixture=json.loads((ROOT/'tests/fixtures/v0120_campaign.json').read_text());old=json.loads(fixture[CAMPAIGN])
 with sync_playwright() as pw:
  b=launch_browser(pw);c,p,errors=build(b,store=fixture)
  new=json.loads(store(p)[CAMPAIGN]);assert new['id']==old['id'] and new['selectedLevel']==old['selectedLevel']
  assert new['profile']==old['profile'],(new['profile'],old['profile'])
  for key,prior in old['levels'].items():
   normalised={'legacyLayout':False,'crystalTopUp':False,'recorderDepths':None,**prior}
   assert new['levels'][key]==normalised,key
  assert len(new['levels'])==5
  assert state(p)['mineAmmo']==old['profile']['mineAmmo']==1
  assert not errors,errors;c.close()
  print('PASS actual v0.12 runtime fixture: all five levels, selected level, resource positions/depletion, recorder progress, campaign ID, credits, crystals, stats, achievements, upgrades, ammunition and predator damage are unchanged')
  # Actual finite pickups, then an interrupted airborne position. Recovery must stay valid.
  for interruption in ['reload','quit','defeat']:
   c,p,errors=build(b)
   nodes=[next(n for n in debug(p)['items'] if n['type']==kind) for kind in ['scrap','crystal']]
   for n in nodes:move(p,n['x'],n['y']);use(p)
   move(p,860,-170);p.evaluate('AbyssDiagnostics.setMotion({vx:40,vy:-100,airborne:true});AbyssDiagnostics.save()')
   snapshot=json.loads(store(p)[CAMPAIGN]);assert snapshot['levels'][state(p)['levelId']]['pendingCargo']['y']>=300
   if interruption=='defeat':p.evaluate('AbyssDiagnostics.loseDive()')
   elif interruption=='quit':
    p.evaluate('AbyssDiagnostics.unfreeze()');p.locator('#focusPauseBtn').click();p.locator('#quitBtn').click()
    # Use the real confirmation button discovered from the current modal.
    if p.locator('#confirmQuitBtn').count():p.locator('#confirmQuitBtn').click()
    elif p.locator('#confirmQuit').count():p.locator('#confirmQuit').click()
    else:raise AssertionError('Missing quit confirmation')
   snapshot=store(p);assert not errors,errors;c.close();c,p,errors=build(b,store=snapshot)
   assert state(p)['recoveryPods']==1,interruption
   pod=next(n for n in debug(p)['items'] if n['type']=='recovery')
   assert pod['y']>=300 and pod['scrap']==2 and pod['crystal']==2
   assert all(next(i for i in debug(p)['items'] if i['id']==n['id'])['collected'] for n in nodes)
   move(p,pod['x'],pod['y']);use(p);dock(p)
   assert state(p)['credits']==36 and state(p)['crystals']==2 and state(p)['recoveryPods']==0
   saved=store(p);c.close();c,p,errors=build(b,store=saved)
   assert state(p)['credits']==36 and state(p)['crystals']==2 and state(p)['recoveryPods']==0
   assert not errors,errors;c.close()
  b.close();print('PASS airborne reload/quit/defeat: finite cargo recovers underwater exactly once, no lost crystals, no duplicate banked currency and no resource respawn')
if __name__=='__main__':run()
