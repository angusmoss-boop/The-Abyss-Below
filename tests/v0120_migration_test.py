"""Migrate a synthetic save produced by the archived v0.11 runtime; never reads a real user save."""
from v0120_harness import *
from playwright.sync_api import sync_playwright
import json

def complete(p):
 if p.locator('#launchAgain').count():p.locator('#launchAgain').click()
 move(p,600,700);step(p,.01)
 for n in debug(p)['items']:
  if n['type']=='recorder' and not n['collected']:move(p,n['x'],n['y']);use(p)
 dock(p)
 if p.locator('#victoryClose').count():p.locator('#victoryClose').click()

def run():
 fixture=json.loads((ROOT/'tests/fixtures/v0110_campaign.json').read_text());legacy=json.loads(fixture['the-abyss-below-campaign-v2']);profile=legacy['profile'];old=legacy['levels']['calypso-trench']
 with sync_playwright() as pw:
  b=launch_browser(pw);c,p,errors=build(b,store=fixture);d=debug(p)
  assert d['saved']['credits']==profile['credits'] and d['saved']['mineAmmo']==profile['mineAmmo']
  assert d['saved']['upgrades']==profile['upgrades'] and d['saved']['xp']==profile['xp']
  assert d['saved']['crystals']==0
  imported=d['campaignLevels']['calypso-abyss']
  assert imported['loot']==old['loot'] and imported['looted']==old['looted'] and imported['seed']==old['seed'] and imported['health']==old['health']
  assert imported['secured']==profile['secured'] and imported['recorderDepths']==[75,260,470,725,1100,1500]
  assert state(p)['levelId']=='sunbreak-shelf' and not d['levels'][4]['unlocked']
  assert store(p)['the-abyss-below-campaign-v2']==fixture['the-abyss-below-campaign-v2']
  # Earn access normally; migration never unlocks later levels out of order.
  dock(p)
  for i in range(4):
   complete(p)
   sid=debug(p)['levels'][i+1]['id'];p.locator('[data-travel="'+sid+'"]').click()
  d=debug(p);new=d['field']
  assert new['loot'][:len(old['loot'])]==old['loot']
  assert new['looted']==old['looted'] and new['secured']==profile['secured']
  assert sum(n['quantity'] for n in new['loot'] if n['type']=='crystal')==160
  assert new['crystalTopUp'] and len(new['loot'])==len(old['loot'])+56
  assert new['health']==old['health']
  wounded=next(e for e in d['predators'] if e['id'] in old['health']);assert wounded['health']==old['health'][wounded['id']]
  saved=store(p);count=len(new['loot']);c.close();c,p,errors2=build(b,store=saved);errors+=errors2
  assert len(debug(p)['field']['loot'])==count and state(p)['levelId']=='calypso-abyss'
  assert debug(p)['field']['secured']==profile['secured']
  assert not errors,errors;c.close()
  # Malformed primary falls back to the previous atomic campaign snapshot.
  saved[CAMPAIGN]='{broken';c,p,errors=build(b,store=saved)
  assert state(p)['storageHealthy'] and 'RECOVERED CAMPAIGN BACKUP' in p.locator('#saveStatus').inner_text()
  assert state(p)['totalRecorders']>=14
  assert not errors,errors;c.close();b.close()
  print('PASS actual v0.11 profile migration; credits, XP, upgrades and owned ammo preserved; old trench IDs/locations/depletion and damage retained in level 5; old recorders retained; no skipped unlocks; one-time crystal top-up; reload idempotence; corrupted-primary backup recovery')
if __name__=='__main__':run()
