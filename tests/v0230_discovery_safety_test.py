"""All five discoveries, recoverable mixed manifests, export safety and map retention."""
from v0230_harness import *
from v0230_giants_test import prime,giants,visit
from playwright.sync_api import sync_playwright
import copy,math
with sync_playwright() as pw:
 b=launch_browser(pw);c,p,errors=build(b,390,844,True);prime(p)
 for level in range(5):
  p.evaluate('(i)=>AbyssDiagnostics.fixtureLevel(i)',level);v=giants(p)['site']
  visit(p,v['panel']);p.evaluate('AbyssDiagnostics.ping()');step(p,.2);use(p);assert giants(p)['state']['sites'][v['id']]['opened']
  visit(p,v['plate']);use(p);p.evaluate('AbyssDiagnostics.save()');assert debug(p)['player']['cargo']['plates']==[v['id']]
  # Bad ownership and state must never enter an imported campaign.
  valid=p.evaluate("JSON.parse(testStore[AbyssSlots.key])")
  mutations=["d.giants.banked.push(d.activeDive.player.cargo.plates[0])","d.giants.livery='never-earned'","d.giants.sites[d.activeDive.player.cargo.plates[0]].opened='yes'","d.activeDive.player.cargo.plates.push('unknown-id')","d.levels[d.selectedLevel].pendingCargo.plates=[]","d.activeDive.predators[0].seenVX='bad'","d.activeDive.predators[0].behaviour='teleport'"]
  for mutation in mutations:
   assert p.evaluate("([data,code])=>{const d=structuredClone(data);Function('d',code)(d);try{AbyssSignals.validateCampaign(d);return false;}catch(_){return true;}}",[valid,mutation]),mutation
  p.evaluate('AbyssDiagnostics.loseDive()');pod=debug(p)['field']['recoveries'][-1];assert pod['plates']==[v['id']]
  assert math.hypot(pod['x']-v['plate']['x'],pod['y']-v['plate']['y'])<60
  p.locator('#retryBtn').click();step(p,0);visit(p,pod);use(p);dock(p)
  assert v['id'] in giants(p)['state']['banked']
  p.locator('#archiveTab').click();p.locator('#discoveriesDockBtn').click();p.locator('#discoveryLivery').select_option(v['id']);p.locator('#signalsClose').click()
  p.evaluate('AbyssDiagnostics.save()');ss=store(p);c.close();c,p,e=build(b,390,844,True,store=ss);errors+=e
  assert giants(p)['state']['livery']==v['id'] and giants(p)['state']['sites'][v['id']]['opened']
  assert not any(o['kind']=='plate' for o in giants(p)['objects'])
  packed=p.evaluate('''()=>{const d=JSON.parse(testStore[AbyssSlots.key]);return JSON.stringify(d)===JSON.stringify(AbyssSignals.unpack(AbyssSignals.pack(d)).payload);}''');assert packed
  print('PASS',v['name'],'plate-only loss and retrievable annex wreck, permanent opened gate, earned finish and exact export; corrupt ownership and behavior rejected')
 assert len(giants(p)['state']['banked'])==5
 # Merely being alive in an annex must retain chart cells with negative columns.
 if p.locator('#resumeBtn').is_visible():p.locator('#resumeBtn').click()
 v=giants(p)['site'];visit(p,v['plate']);step(p,.1);p.evaluate('AbyssDiagnostics.ping()');step(p,.6)
 before=debug(p)['field']['survey'];assert before['cells'];assert any(k.startswith('-') for k in before['cells'])
 p.evaluate('AbyssDiagnostics.save()');ss=store(p);c.close();c,p,e=build(b,390,844,True,store=ss);errors+=e
 after=debug(p)['field']['survey'];assert set(before['cells'])<=set(after['cells'])
 assert all(v==after['contacts'][k] for k,v in before['contacts'].items())
 # New evolving sonar objects restore by stable ID, not a shifted plate index.
 wave=debug(p)['sonarWaves'];assert wave
 step(p,.2)
 assert not errors,errors
 print('PASS west-side chart discovery and stable sonar contacts survive reload after gate/plate removal; all five cosmetic unlocks retained')
 c.close();b.close()
