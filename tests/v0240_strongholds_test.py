"""Production interactions, gate ownership, hazard persistence and guard attrition."""
from v0240_harness import *
from playwright.sync_api import sync_playwright
import copy, math

def strong(p):return p.evaluate('AbyssDiagnostics.stronghold()')
def point(p,n):move(p,n['x'],n['y'])
def prime(p):
 fix(p,depth=40,upgrades={'hull':7,'oxygen':5,'battery':5,'engine':4,'flashlight':4,'sonar':4,'railgun':4,'torpedo':4})
 p.evaluate('AbyssDiagnostics.relaunch()')
def relay(p,n):
 r=strong(p)['site']['relays'][n];point(p,r)
 p.evaluate('AbyssDiagnostics.setSystems({battery:500})')
 p.evaluate('AbyssDiagnostics.ping()');step(p,.12);use(p)
 # A previous scan may still be cooling; production cooldown is respected.
 if not strong(p)['state']['relays'][n]:
  step(p,5.6);point(p,r);p.evaluate('AbyssDiagnostics.ping()');step(p,.12);use(p)
 assert strong(p)['state']['relays'][n],strong(p)

if __name__=='__main__':
 with sync_playwright() as pw:
  b=launch_browser(pw);c,p,errors=build(b,390,844,True);prime(p)
  for i in range(5):
   p.evaluate('i=>AbyssDiagnostics.fixtureLevel(i)',i)
   for rec in [o for o in debug(p)['items'] if o['type']=='recorder' and not o['collected']]:point(p,rec);use(p)
   dock(p);p.evaluate('AbyssDiagnostics.relaunch()');step(p,0)
   s=strong(p);v=s['site'];original=copy.deepcopy(debug(p)['field']['loot']);g=s['guards']
   assert len(v['layout']['rooms'])==9 and len(g)==[3,4,5,6,8][i]
   assert len(v['traps'])==3+i
   assert all(p.evaluate('id=>AbyssDiagnostics.predatorClear(id)',e['id']) for e in g)
   assert all(e['y']>=8120 for e in g if e['tier']=='reaper')
   point(p,v['plate']);use(p)
   assert not debug(p)['player']['cargo']['plates'] and 'SEALED' in p.locator('#notification').inner_text()
   # Relays require a wave arrival; standing over one and pressing USE is insufficient.
   point(p,v['relays'][0]);use(p);assert not strong(p)['state']['relays'][0]
   relay(p,0);assert not strong(p)['state']['relays'][1]
   assert all(t['stage']=='off' for t in strong(p)['traps'] if t['group']==0)
   assert any(w['gateType']=='vault' for w in p.evaluate('AbyssDiagnostics.giants().walls'))
   relay(p,1);assert not any(w['gateType']=='vault' for w in p.evaluate('AbyssDiagnostics.giants().walls'))
   assert all(t['stage']=='off' for t in strong(p)['traps'])
   # Wound one guard and kill another through the actual shared damage function.
   g=strong(p)['guards'];p.evaluate('id=>AbyssDiagnostics.hurtEnemy(id,17)',g[0]['id']);p.evaluate('id=>AbyssDiagnostics.hurtEnemy(id,9999)',g[1]['id'])
   after=strong(p)['state']['guardHealth'];assert after['guard-0']==g[0]['health']-17 and after['guard-1']==0
   point(p,v['plate']);use(p);assert debug(p)['player']['cargo']['plates']==[v['id']]
   assert strong(p)['state']['alarm'] and strong(p)['state']['opened']
   assert debug(p)['field']['loot']==original
   # A plate-only defeat must leave one persistent cargo wreck, then recovery banks it.
   p.evaluate('AbyssDiagnostics.loseDive()');r=debug(p)['field']['recoveries'][-1];assert r['plates']==[v['id']]
   p.locator('#retryBtn').click();step(p,0)
   assert strong(p)['state']['guardHealth']==after
   assert not any(e['guardId']=='guard-1' for e in strong(p)['guards'])
   assert not any(o['kind']=='plate' for o in p.evaluate('AbyssDiagnostics.giants().objects'))
   point(p,r);use(p);dock(p)
   assert v['id'] in p.evaluate('AbyssDiagnostics.giants().state.banked')
   assert strong(p)['state']['guardHealth']==after
   p.evaluate('AbyssDiagnostics.save()')
   assert p.evaluate('''()=>{const d=JSON.parse(testStore[AbyssSlots.key]);return JSON.stringify(AbyssSignals.unpack(AbyssSignals.pack(d)).payload)===JSON.stringify(d);}''')
   print('PASS',v['name'],len(g),'defenders; both sonar-gated relays, guarded vault, trap isolation, exact persistent wounds/deaths, plate recovery and export')
  assert not errors,errors
  ss=store(p);c.close();c,p,e=build(b,390,844,True,store=ss);errors+=e
  assert len(p.evaluate('AbyssDiagnostics.giants().state.banked'))==5
  assert not errors,errors
  c.close();b.close()
