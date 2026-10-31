"""Real production pickups: contact capsule, substeps, exact healing, no magnet crystal."""
from v0250_harness import *
from playwright.sync_api import sync_playwright
import math

def contacts(p):p.evaluate('AbyssDiagnostics.contactPickups()')
def systems(p,**s):p.evaluate('s=>AbyssDiagnostics.setSystems(s)',s)

def run():
 with sync_playwright() as pw:
  b=launch_browser(pw);c,p,errors=build(b)
  # Every hull tier receives exactly a quarter of maximum health, capped.
  for mark in range(8):
   fix(p,depth=45,upgrades={'hull':mark,'magnet':4},items=[{'id':'pack','dx':0,'dy':0,'type':'air'}])
   mx=state(p)['maxHull'];systems(p,hull=mx*.4,oxygen=23,battery=12,shield=0)
   contacts(p);s=state(p)
   assert abs(s['hull']-mx*.65)<1e-8 and s['oxygen']==23 and s['battery']==12 and s['shield']==0,(mark,s)
   assert debug(p)['items'][0]['collected'] and debug(p)['player']['cargo']['scrap']==0
   assert p.evaluate('AbyssDiagnostics.pickups()[0].kind')=='hull'
   fix(p,depth=45,upgrades={'hull':mark},items=[{'dx':0,'dy':0,'type':'air'}]);contacts(p)
   assert not debug(p)['items'][0]['collected'],'full health must not consume pack'
   systems(p,hull=mx-1,oxygen=13,battery=0);contacts(p)
   assert state(p)['hull']==mx and state(p)['oxygen']==13 and state(p)['battery']==0
  print('PASS all eight hull specifications: repair pack restores 25% maximum HP, caps at full, no oxygen/power/shield/currency reward, full-health packs remain',flush=True)
  for mark in range(5):
   fix(p,depth=45,facing=0,upgrades={'hull':7,'magnet':mark},battery=0,items=[{'dx':80,'dy':0,'type':'crystal','quantity':2}])
   before=debug(p);use(p);contacts(p)
   assert not debug(p)['items'][0]['collected'] and state(p)['battery']==0
   move(p,before['player']['x']+80,before['player']['y']);contacts(p)
   assert debug(p)['player']['cargo']['crystal']==2 and state(p)['crystals']==0 and state(p)['battery']==0
  # USE ignores both automatic pickup types; objective interactions still work.
  fix(p,depth=45,facing=0,upgrades={'hull':7,'magnet':4},items=[{'dx':0,'dy':0,'type':'crystal','quantity':2},{'dx':0,'dy':0,'type':'air'},{'dx':45,'dy':0,'type':'recorder','index':0}])
  systems(p,hull=60);use(p);d=debug(p)
  assert d['player']['cargo']['recorders']==[0] and d['player']['cargo']['crystal']==0 and d['player']['hull']==60
  contacts(p);d=debug(p);assert d['player']['cargo']['crystal']==2 and d['player']['hull']==134
  # Contact reaches the ends of the narrow capsule, not a circular magnet area.
  for dx,dy,want in [(0,0,True),(34,0,True),(38,0,False),(0,24,False),(0,18,True)]:
   fix(p,depth=45,facing=0,upgrades={'hull':7,'magnet':4},items=[{'dx':dx,'dy':dy,'type':'crystal'}]);contacts(p)
   assert debug(p)['items'][0]['collected']==want,(dx,dy)
  # A thin wall between the centre and pickup prevents a through-wall collection.
  fix(p,depth=45,facing=0,upgrades={'hull':7,'magnet':4},items=[{'dx':28,'dy':0,'type':'crystal'}],rocks=[{'dx':16,'dy':0,'radius':7}]);contacts(p)
  assert not debug(p)['items'][0]['collected']
  # Substepping checks contact on the actual travelled path, even above normal boost speed.
  fix(p,depth=45,facing=0,upgrades={'hull':7,'engine':4},items=[{'dx':65,'dy':0,'type':'crystal','quantity':2}])
  p.evaluate('AbyssDiagnostics.setMotion({vx:1500,vy:0,airborne:false})');step(p,.13)
  assert debug(p)['items'][0]['collected'] and debug(p)['player']['cargo']['crystal']==2
  # Darkness and empty battery do not make a physical contact cost power.
  p.evaluate('AbyssDiagnostics.fixtureLevel(4)')
  fix(p,depth=1100,lights=False,battery=0,upgrades={'hull':7,'magnet':4},items=[{'dx':0,'dy':0,'type':'crystal'}]);contacts(p)
  assert debug(p)['items'][0]['collected'] and state(p)['battery']==0
  print('PASS five magnet marks never collect remote crystals; USE reserved for objectives; hull capsule geometry, wall guard, high-speed sweep and dark/empty-battery pickup',flush=True)
  # Actual seeded crystal state persists through defeat and reload without duplicating stock.
  c.close();c,p,e=build(b);errors+=e
  node=next(n for n in debug(p)['items'] if n['type']=='crystal');layout=debug(p)['field']['loot']
  move(p,node['x'],node['y']);contacts(p)
  assert node['id'] in debug(p)['field']['looted']
  p.evaluate('AbyssDiagnostics.loseDive()');manifest=debug(p)['field']['recoveries']
  assert sum(n['crystal'] for n in manifest)==2
  ss=store(p);c.close();c,p,e=build(b,store=ss);errors+=e
  assert debug(p)['field']['loot']==layout and debug(p)['field']['recoveries']==manifest
  assert next(n for n in debug(p)['items'] if n['id']==node['id'])['collected']
  assert not errors,errors;c.close();b.close()
  print('PASS actual finite crystal ownership and coordinates retained through destruction, recovery manifest and save/reload')
if __name__=='__main__':run()
