"""Harbour AI boundary, momentum surfacing and visible upgrade-tier acceptance."""
from v0210_harness import *
from playwright.sync_api import sync_playwright
import math,json

def run():
 with sync_playwright() as pw:
  b=launch_browser(pw);c,p,errors=build(b)
  # Deliberately place aggressive enemies inside the harbour, including at its centre.
  for x,y in [(600,160),(600,419),(859,160),(341,160),(600,75)]:
   p.evaluate('''([x,y])=>{AbyssDiagnostics.fixture({x,y,predators:[{id:'enemy-test',tier:'common',x:x+10,y,health:73,aggression:1,alertUntil:999}]});AbyssDiagnostics.setSystems({hull:100,shield:0,oxygen:100,battery:100});}''',[x,y])
   step(p,2);s=state(p);e=debug(p)['predators'][0]
   assert s['hull']==100 and s['dockSafe'],(x,y,s)
   assert math.hypot(e['x']-600,e['y']-160)>=330 and e['aggression']==0,e
   assert e['health']==73
  # Multiple tiers, stunned hunters and bad patrol homes are ejected before attacks.
  p.evaluate('''()=>{AbyssDiagnostics.fixture({x:600,y:160,predators:['common','apex','reaper'].map((tier,i)=>({id:'enemy-test-'+i,tier,x:600,y:160,aggression:1,alertUntil:999,stunnedUntil:999}))});}''')
  step(p,.1);d=debug(p)
  assert all(math.hypot(e['x']-600,e['y']-160)>330 for e in d['predators'])
  assert all(math.hypot(e['homeX']-600,e['homeY']-160)>330 for e in d['predators'])
  # The protected border is local, not global invulnerability.
  p.evaluate("AbyssDiagnostics.fixture({x:600,y:540,predators:[{id:'enemy-test',tier:'common',x:600,y:550,aggression:1,alertUntil:999}]});AbyssDiagnostics.setSystems({hull:100,shield:0})")
  step(p,.1);assert state(p)['hull']<100
  move(p,600,410);h=state(p)['hull'];p.evaluate('AbyssDiagnostics.ping()');step(p,4)
  assert state(p)['hull']==h and all(e['aggression']==0 for e in debug(p)['predators'])
  assert p.locator('#statusStat').inner_text()=='DOCK SAFE ZONE'
  print('PASS harbour centre/edge protection; pursuit breaks on arrival; all tiers/patrol homes excluded; sonar cannot provoke a safe-zone bite; combat remains active outside')
  # Approach at full normal and boosted speeds; no forced coordinate jump.
  heights=[];traces=[]
  for mark,boost in [(0,False),(4,False),(4,True)]:
   fix(p,depth=45,upgrades={'engine':mark,'shield':0},facing=-math.pi/2)
   trace=p.evaluate('''({boost})=>{const a=[];let jumped=false,landed=false;for(let i=0;i<160;i++){
    const before=AbyssDiagnostics.state(),s=AbyssDiagnostics.step(.05,{heldKeys:landed?[]:boost?['w',' ']:['w']});
    a.push({y:s.y,vy:s.vy,air:s.airborne,boost:s.boosting,battery:s.battery,hull:s.hull,capacity:s.boost});
    if(s.airborne)jumped=true;
    if(jumped&&!s.airborne){landed=true;break;}
   }return a;}''',{'boost':boost})
   assert any(a['air'] for a in trace),(mark,boost,trace[-1])
   assert not trace[-1]['air'] and trace[-1]['y']>=70 and trace[-1]['vy']>0
   assert all(not a['boost'] for a in trace if a['air'])
   assert all(a['hull']==trace[0]['hull'] for a in trace)
   heights.append(70-min(a['y'] for a in trace));traces.append(trace)
  assert 25<heights[0]<60 and 80<heights[1]<140 and 280<heights[2]<450,heights
  assert heights[0]<heights[1]<heights[2]
  # An approach below the breach threshold stays submerged, without a removed silent toggle.
  fix(p,depth=1,upgrades={'engine':0},facing=-math.pi/2);move(p,600,70.5)
  p.evaluate('AbyssDiagnostics.setMotion({vy:-80,airborne:false})');s=step(p,.02,keys=[])
  assert not s['airborne'] and s['y']>=70
  # No engine power or vertical thrust in the air, despite held controls.
  fix(p,depth=45,upgrades={'engine':4});move(p,600,-120)
  p.evaluate('AbyssDiagnostics.setMotion({vx:140,vy:-120,airborne:true})');power=state(p)['battery']
  s=step(p,.4,keys=['w',' ']);assert s['airborne'] and s['vy']>-25 and s['vx']<140 and not s['boosting']
  assert power-s['battery']<.05
  step(p,3,keys=[]);assert not state(p)['airborne']
  # Airborne pause freezes trajectory; holding USE in air cannot bank a dive.
  move(p,600,55);p.evaluate('AbyssDiagnostics.setMotion({vx:0,vy:-150,airborne:true})')
  before=state(p);use(p);assert not p.locator('#modalOverlay').is_visible() and state(p)['airborne']
  p.wait_for_timeout(150);assert state(p)['y']==before['y']
  # Docking arrests momentum and restores a submerged departure state.
  move(p,600,160);p.evaluate('AbyssDiagnostics.setMotion({vx:150,vy:-40,airborne:false})');use(p)
  s=state(p);assert s['paused'] and s['x']==600 and s['y']==160 and s['vx']==s['vy']==0 and not s['airborne']
  print('PASS slow surface approach; base/Mk IV/boosted leaps; gravity despite held thrust; no airborne boost drain; pause/USE isolation; damage-free splashdown; dock clamps ship momentum')
  # Current tier and maximum state are reflected immediately after each real purchase.
  p.evaluate('AbyssDiagnostics.grantCredits(99999);AbyssDiagnostics.grantCrystals(9999)')
  for u in p.evaluate('AbyssDiagnostics.upgradeCatalog()'):
   tile=p.locator('[data-system="'+u['id']+'"]')
   assert int(tile.get_attribute('data-tier'))==u['level']
   tile.click()
   for mark in range(u['level'],u['limit']):
    p.locator('#upgradePurchase').click()
    assert int(tile.get_attribute('data-tier'))==mark+1
    assert (tile.get_attribute('class').find('is-maxed')>=0)==(mark+1==u['limit'])
   assert p.locator('#upgradePurchase').is_disabled()
   p.locator('#upgradeDetailClose').click()
   assert 'MAX' in tile.inner_text() and 'fully upgraded' in tile.get_attribute('aria-label')
   assert tile.evaluate('(e)=>getComputedStyle(e).borderTopColor')=='rgb(217, 186, 107)'
  assert p.locator('.upgrade-tile.is-maxed').count()==14
  assert not errors,errors
  (ROOT/'verification/v0.21.0').mkdir(exist_ok=True,parents=True)
  (ROOT/'verification/v0.21.0/breach-traces.json').write_text(json.dumps({'heightsWorldUnits':heights,'traces':traces},indent=2))
  c.close();b.close()
  print('PASS all twelve fitted tier labels; all purchase transitions; gold maximum outline plus textual MAX; pop-up remains usable; no JavaScript errors')
if __name__=='__main__':run()
