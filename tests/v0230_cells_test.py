"""Rare cells: deterministic additive placement, capped pickup, persisted slow recovery."""
from v0230_harness import *
from playwright.sync_api import sync_playwright
import copy,math

def life(p):return p.evaluate('AbyssDiagnostics.lifeline()')
def pulse(p,t,active=True):return p.evaluate('([t,a])=>AbyssDiagnostics.cellPulse(t,a)',[t,active])
def collect(p):p.evaluate('AbyssDiagnostics.cellPickup()')
def cell(p,id):return next(n for n in debug(p)['items'] if n['type']=='battery' and n['id']==id)
with sync_playwright() as pw:
 b=launch_browser(pw);c,p,errors=build(b,390,844,True)
 p.evaluate('AbyssDiagnostics.regenerate(8080)');d=debug(p);base=copy.deepcopy(d['field']['loot']);nodes=life(p)['cells']['nodes']
 assert len(nodes)==3 and len({n['id'] for n in nodes})==3
 assert any(0<(n['y']-120)/10<=120 for n in nodes)
 n=nodes[0];move(p,n['x'],n['y']);p.evaluate('AbyssDiagnostics.setSystems({battery:100})');collect(p)
 assert not cell(p,n['id'])['collected']
 p.evaluate('AbyssDiagnostics.setSystems({battery:99})');collect(p)
 assert not cell(p,n['id'])['collected'],'Negligible idle draw must not waste a full cell'
 p.evaluate('AbyssDiagnostics.setSystems({battery:95})');collect(p);assert state(p)['battery']==100 and cell(p,n['id'])['collected']
 assert debug(p)['player']['cargo']=={'scrap':0,'crystal':0,'recorders':[],'plates':[]}
 assert n['id'] not in debug(p)['field']['looted'] and debug(p)['field']['loot']==base
 assert any(n['kind']=='power' and n['amount']==5 for n in p.evaluate('AbyssDiagnostics.pickups()'))
 assert life(p)['cells']['due'][n['id']]==480
 assert debug(p)['field']['survey']['contacts']['items:'+n['id']]['type']=='battery'
 print('PASS rare battery pickups: full/tiny-deficit protection, +25 maximum, capacity clamp, actual pickup notice, no cargo or crystal contamination',flush=True)
 # At zero power collection has no powered magnet prerequisite. One duplicate collection cannot grant power.
 n2=nodes[1];move(p,n2['x'],n2['y']);p.evaluate('AbyssDiagnostics.setSystems({battery:0})');collect(p)
 assert state(p)['battery']==25;collect(p);assert state(p)['battery']==25
 # Pause, dock and offline clocks cannot restore stock.
 before=life(p)['cells'];pulse(p,10000,False);assert life(p)['cells']==before
 move(p,600,160);pulse(p,10000);assert life(p)['cells']==before
 dock(p);assert life(p)['cells']==before and cell(p,n['id'])['collected'];depart(p)
 move(p,n['x'],n['y']);pulse(p,479);assert len(life(p)['cells']['due'])==2
 # The visible cell stays depleted. A distant eligible one may return instead.
 pulse(p,1);assert cell(p,n['id'])['collected']
 move(p,600,3100-100);count=len(life(p)['cells']['due']);pulse(p,91);assert len(life(p)['cells']['due'])==max(0,count-1)
 pulse(p,90);assert len(life(p)['cells']['due'])==0
 assert debug(p)['field']['loot']==base
 # Persistence includes the original locations and countdown, not just the icon.
 move(p,n['x'],n['y']);p.evaluate('AbyssDiagnostics.setSystems({battery:0})');collect(p);pulse(p,37)
 p.evaluate('AbyssDiagnostics.save()');snap=store(p);before=debug(p);before_cells=life(p)['cells'];c.close()
 c,p,e=build(b,390,844,True,store=snap);errors+=e
 assert state(p)['paused'] and life(p)['cells']==before_cells and state(p)['battery']==before['player']['battery']
 assert cell(p,n['id'])['collected'];assert debug(p)['field']['loot']==base
 # Real export/import validator accepts the new optional state and rejects corrupt cell data.
 p.evaluate('AbyssSignals.validateCampaign(JSON.parse(testStore[AbyssSlots.key]))')
 rejected=p.evaluate('''()=>{const x=JSON.parse(testStore[AbyssSlots.key]);x.levels[x.selectedLevel].batteryCells.nodes[0].x=1e9;try{AbyssSignals.validateCampaign(x);return false}catch(e){return true}}''');assert rejected
 # Close range with clear line is required. A nearby object across a wall is not a remote rescue.
 target=nodes[2]
 p.evaluate('AbyssDiagnostics.setSystems({battery:0})');move(p,target['x']-61,target['y']);collect(p);assert state(p)['battery']==0
 move(p,target['x'],target['y']);collect(p);assert state(p)['battery']==25
 # Crystal stocks and achievement survey totals remain exactly the previous fixed deposits.
 assert debug(p)['levels'][0]['resources']['crystalTotal']==36
 assert all(n['type']!='battery' for n in debug(p)['field']['loot'])
 print('PASS zero-power rescue, no dock/pause/offline bypass, 8-minute cooldown + staggering, no on-screen respawn, reload persistence, portable-backup validation and finite crystal stocks',flush=True)
 c.close()
 # Multiple seeds/levels: full count, no obstruction, no hazards, no moved deposits after reset.
 c,p,e=build(b);errors+=e
 for level in range(5):
  p.evaluate('i=>AbyssDiagnostics.fixtureLevel(i)',level)
  for seed in [123,41072,8080,65535,4294967295]:
   p.evaluate('s=>AbyssDiagnostics.regenerate(s)',seed);d=debug(p);cells=life(p)['cells'];assert len(cells['nodes'])==level+3,(level,seed,cells)
   for n in cells['nodes']:
    assert n['y']<120+d['levels'][level]['depth']*10-50
    assert not p.evaluate('n=>AbyssDiagnostics.giantSolid(n.x,n.y,42)',n)
    assert all(math.hypot(n['x']-i['x'],n['y']-i['y'])>=79.9 for i in d['items'] if i['type']!='battery')
    assert math.hypot(n['x']-600,n['y']-160)>=450
   before=copy.deepcopy(cells);loot=copy.deepcopy(d['field']['loot'])
   p.evaluate('AbyssDiagnostics.relaunch()');assert life(p)['cells']==before and debug(p)['field']['loot']==loot
 assert not errors,errors;c.close();b.close()
 print('PASS 25 seeded levels: 3/4/5/6/7 rare stable cells, first reachable above 120 m, clear of original resources/harbour/wreck walls, no replenishment on relaunch')
