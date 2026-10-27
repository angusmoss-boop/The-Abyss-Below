"""Partial map discovery, sonar timing, waypoints, saved charts and safe currents."""
from v0160_harness import *
from playwright.sync_api import sync_playwright
import json,math

def living(p):return p.evaluate('AbyssDiagnostics.living()')
def run():
 with sync_playwright() as pw:
  b=launch_browser(pw);c,p,e=build(b,390,844,True)
  for i in range(5):p.evaluate('i=>AbyssDiagnostics.fixtureLevel(i)',i)
  fix(p,depth=1100,lights=False,upgrades={'hull':7,'sonar':2,'flashlight':4},items=[{'dx':180,'dy':0,'type':'crystal','id':'loot-test-a'},{'dx':-180,'dy':0,'type':'scrap','id':'loot-test-b'}],predators=[{'dx':0,'dy':250,'id':'enemy-test','tier':'common'}])
  p.evaluate('AbyssDiagnostics.surveyNow()');l=living(p)
  assert 'items:loot-test-a' not in l['survey']['contacts'] and 'items:loot-test-b' not in l['survey']['contacts']
  p.evaluate('AbyssDiagnostics.ping()');step(p,.1)
  assert 'items:loot-test-a' not in living(p)['survey']['contacts']
  step(p,.4);l=living(p)
  assert 'items:loot-test-a' in l['survey']['contacts'] and 'items:loot-test-b' in l['survey']['contacts']
  assert l['threats'] and l['threats'][0]['until']>l['clock']
  count=len(l['survey']['cells']);step(p,15);l=living(p)
  assert not l['threats'],l['threats']
  assert len(l['survey']['cells'])>=count
  print('PASS blackout conceals map objects; sonar logs contacts only on wave arrival; terrain remains charted but predator contacts expire')
  s=state(p)
  assert not p.evaluate('([x,y])=>AbyssDiagnostics.setWaypoint(x,y)',[s['x'],17000])
  assert p.evaluate('([x,y])=>AbyssDiagnostics.setWaypoint(x,y)',[s['x']+50,s['y']])
  assert p.locator('#waypointHint').is_visible()
  p.locator('#surveyBtn').click();assert p.locator('#surveyDialog').is_visible() and state(p)['paused']
  before=debug(p)['clock'];p.wait_for_timeout(100);assert debug(p)['clock']==before
  p.locator('#mapZoomIn').click();p.locator('#mapZoomOut').click();p.locator('#mapOverview').click();p.locator('#mapCentre').click()
  assert p.locator('#mapMessage').is_visible()
  p.keyboard.press('Escape');assert not p.locator('#surveyDialog').is_visible() and state(p)['paused']
  chart=living(p)['survey'];saved=store(p)
  # The depth fixture bypasses ordinary level gates. Supply synthetic completed
  # prerequisites before testing reload so production unlock validation is exercised.
  campaign=json.loads(saved[CAMPAIGN])
  for i,l in enumerate(debug(p)['levels'][:4]):campaign['levels'][l['id']]['secured']=list(range(i+2))
  saved[CAMPAIGN]=json.dumps(campaign)
  c.close();c,p,e=build(b,390,844,True,store=saved)
  assert living(p)['survey']==chart and state(p)['paused']
  assert p.locator('#waypointHint').is_visible();p.locator('#resumeBtn').click();p.keyboard.press('m')
  assert state(p)['paused'] and p.locator('#surveyDialog').is_visible()
  p.locator('#mapClear').click();assert living(p)['survey']['waypoint'] is None
  p.locator('#surveyClose').click();assert not state(p)['paused']
  assert not e,e;c.close()
  print('PASS only surveyed open water accepts waypoints; HUD direction pin, zoom/overview/centre and clear; M/Escape modal preserves pause; chart survives actual reload')
  # Visual discovery respects the facing beam with lights on in total darkness.
  c,p,e=build(b);p.evaluate('AbyssDiagnostics.fixtureLevel(4)')
  fix(p,depth=1100,lights=True,facing=0,upgrades={'hull':7,'flashlight':4},items=[{'dx':300,'dy':0,'type':'crystal','id':'loot-front'},{'dx':-300,'dy':0,'type':'scrap','id':'loot-rear'}])
  p.evaluate('AbyssDiagnostics.surveyNow()');contacts=living(p)['survey']['contacts']
  assert 'items:loot-front' in contacts and 'items:loot-rear' not in contacts
  assert not e,e;c.close();print('PASS visual survey uses the actual forward lamp cone, not a full-radius reveal in dark water')
  # Stable decorative RNG and currents leave finite stocks/terrain untouched.
  c,p,e=build(b)
  for index in range(5):
   p.evaluate('i=>AbyssDiagnostics.fixtureLevel(i)',index);d=debug(p);initial=living(p)['environment'];seed=d['field']['seed'];loot=d['field']['loot'];rocks=d['rocks']
   p.evaluate('AbyssDiagnostics.enableEnvironment()');assert living(p)['environment']==initial
   assert debug(p)['field']['loot']==loot and debug(p)['rocks']==rocks
   assert len(initial['landmarks'])==3
   assert p.evaluate('AbyssDiagnostics.currentAt(600,160,0)')['strength']==0
   current_queries=[[cur['x'],cur['y'],t] for cur in initial['currents'] for t in [0,1,3,7]]
   vectors=p.evaluate('queries=>queries.map(a=>AbyssDiagnostics.currentAt(...a))',current_queries)
   assert all(v['strength']<=44 and v['strength']<68 for v in vectors)
   assert max(v['strength'] for v in vectors)>0
   # Batch coordinates, rather than hundreds of automation round trips.
   central=[]
   for y in range(600,d['levels'][index]['depth']*10,200):
    center=600+math.sin(y*.0017)*94+math.sin(y*.0051)*39+math.sin(y*.004)*85
    central.append([center,y,2])
   assert all(v['strength']==0 for v in p.evaluate('queries=>queries.map(a=>AbyssDiagnostics.currentAt(...a))',central))
  assert not e,e;c.close();b.close()
  print('PASS five distinct seeded environments, three landmarks each, no changes to fixed resources/rocks; currents weaker than base quiet thrust; harbour and central route sheltered')
if __name__=='__main__':run()
