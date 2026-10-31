"""Five real level states: rescue all recorders, bank to unlock, leave independent recoveries and revisit."""
from v0250_harness import *
from v0250_recovery_test import take, respawn, assert_no_origin
from playwright.sync_api import sync_playwright
import math

def run():
 with sync_playwright() as pw:
  b=launch_browser(pw);c,p,errors=build(b)
  fix(p,depth=45,upgrades={'hull':7,'oxygen':5,'battery':5});p.evaluate('AbyssDiagnostics.relaunch()')
  retained={};layouts={}
  for index in range(5):
   d=debug(p);level=d['levels'][index];assert state(p)['levelId']==level['id']
   layouts[level['id']]=d['field']['loot']
   for n in [x for x in d['items'] if x['type']=='recorder' and not x['collected']]:take(p,n)
   assert len(debug(p)['player']['cargo']['recorders'])==len(level['recorders'])
   for kind in ['scrap','crystal']:take(p,next(n for n in debug(p)['items'] if n['type']==kind and not n['collected']))
   y=120+(level['depth']-25)*10;move(p,600,y);p.evaluate('AbyssDiagnostics.loseDive()')
   pod=debug(p)['field']['recoveries'][0];assert len(pod['recorders'])==len(level['recorders'])
   assert pod['y']<=120+level['depth']*10-45
   respawn(p);assert_no_origin(p,range(len(level['recorders'])))
   assert not state(p)['levelComplete'];take(p,next(n for n in debug(p)['items'] if n['type']=='recovery'))
   assert not state(p)['levelComplete'];dock(p);assert state(p)['levelComplete']
   p.locator('#victoryClose').click()
   # Leave one unbanked scrap/crystal wreck in this completed level.
   depart(p)
   for kind in ['scrap','crystal']:take(p,next(n for n in debug(p)['items'] if n['type']==kind and not n['collected']))
   move(p,600,1120);p.evaluate('AbyssDiagnostics.loseDive()');retained[level['id']]=debug(p)['field']['recoveries'][0]
   assert retained[level['id']]['recorders']==[];respawn(p);dock(p)
   if index<4:
    p.locator('#expeditionsTab').click();p.locator('[data-travel="'+d['levels'][index+1]['id']+'"]').click()
  assert state(p)['totalRecorders']==20
  p.evaluate('AbyssDiagnostics.save()');ss=store(p);c.close();c,p,e=build(b,store=ss);errors+=e
  d=debug(p)
  for id,pod in retained.items():assert d['campaignLevels'][id]['recoveries']==[pod] and d['campaignLevels'][id]['loot']==layouts[id]
  # No crystal units disappear or regenerate: bank + pending wrecks + untouched nodes.
  remaining=sum(sum(n['quantity'] for n in f['loot'] if n['type']=='crystal' and n['id'] not in f['looted']) for f in d['campaignLevels'].values())
  pods=sum(sum(n['crystal'] for n in f['recoveries']) for f in d['campaignLevels'].values())
  assert remaining+pods+d['saved']['crystals']+d['player']['cargo']['crystal']==496
  assert sum(len(f['secured']) for f in d['campaignLevels'].values())==20
  dock(p);p.locator('#expeditionsTab').click();p.locator('[data-travel="sunbreak-shelf"]').click()
  assert debug(p)['field']['recoveries']==[retained['sunbreak-shelf']]
  p.locator('#launchAgain').click();r=next(n for n in debug(p)['items'] if n['type']=='recovery');take(p,r)
  assert debug(p)['player']['cargo']=={'scrap':2,'crystal':2,'recorders':[],'plates':[]}
  assert not state(p)['recoveryPods'] and len(debug(p)['campaignLevels']['calypso-abyss']['recoveries'])==1
  print('PASS all five maps: 2/3/4/5/6 recorders move into wrecks and unlock only after recovery and banking; completed maps retain independent losses through travel/reload; all 496 crystals conserved')
  assert not errors,errors;c.close()
  # Real pressure-damage update path, not a synthetic defeat call.
  c,p,e=build(b);errors+=e
  r=next(n for n in debug(p)['items'] if n['type']=='recorder');take(p,r)
  move(p,600,2420);p.evaluate('AbyssDiagnostics.setSystems({hull:0.001,shield:0})');step(p,.1)
  assert not state(p)['running'] and state(p)['recoveryPods']==1
  assert debug(p)['field']['recoveries'][0]['recorders']==[0]
  assert state(p)['weaponAmmo']=={'railgun':10,'torpedo':3} and state(p)['mineAmmo']==3
  print('PASS actual pressure damage produces one cargo wreck and one fixed rescue loadout')
  assert not errors,errors;c.close();b.close()
if __name__=='__main__':run()
