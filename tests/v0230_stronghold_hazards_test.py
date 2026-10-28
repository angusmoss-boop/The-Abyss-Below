"""Real hazard states, sound cues, health, pause clocks and sonar/darkness coverage."""
from v0230_harness import *
from v0230_strongholds_test import strong,point,prime,relay
from playwright.sync_api import sync_playwright
import json
with sync_playwright() as pw:
 b=launch_browser(pw);c,p,errors=build(b);prime(p)
 t=strong(p)['site']['traps'][0];point(p,t)
 p.evaluate('AbyssDiagnostics.strongholdClock(0)');hp=state(p)['hull'];step(p,.5)
 assert state(p)['hull']==hp and strong(p)['traps'][0]['stage']=='warning'
 p.evaluate('AbyssDiagnostics.strongholdClock(2)');step(p,.08)
 assert state(p)['hull']<hp and state(p)['damageFlashing']
 after=state(p)['hull'];elapsed=strong(p)['state']['hazardClock'];p.evaluate('AbyssDiagnostics.strongholdPulse(10)')
 assert state(p)['hull']==after and strong(p)['state']['hazardClock']==elapsed # paused must freeze
 p.evaluate('AbyssDiagnostics.save()');ss=store(p);c.close();c,p,e=build(b,store=ss);errors+=e
 assert state(p)['pauseOpen'] and strong(p)['state']['hazardClock']==elapsed
 assert strong(p)['traps'][0]['stage']=='active'
 step(p,.1);assert state(p)['hull']==after # hit cooldown survives reload
 # Pressure vents apply actual force and the shared hull/shield damage path.
 g=p.evaluate('AbyssDiagnostics.giants()');v=g['site'];jet=v['traps'][1]
 point(p,{'x':jet['x'],'y':jet['y']});p.evaluate('AbyssDiagnostics.strongholdClock(1);AbyssDiagnostics.setSystems({damageCooldown:0})');h=state(p)['hull'];step(p,.08)
 assert state(p)['vy']<0 and state(p)['hull']<h
 relay(p,0);relay(p,1);point(p,t);h=state(p)['hull'];step(p,.2)
 assert state(p)['hull']==h and all(t['stage']=='off' for t in strong(p)['traps'])
 # Invalid archive states and inconsistent guard ownership are rejected.
 p.evaluate('AbyssDiagnostics.save()');data=p.evaluate('JSON.parse(testStore[AbyssSlots.key])')
 mutations=["d.giants.sites.wayfarer.relays=['yes',true]", "d.giants.sites.wayfarer.hazardClock=-3", "d.giants.sites.wayfarer.guardHealth['guard-0']=-1", "d.activeDive.predators.find(e=>e.wreckId).wreckId='__proto__'", "d.activeDive.predators.find(e=>e.wreckId).health=999"]
 for m in mutations:
  assert p.evaluate("([d,m])=>{try{Function('d',m)(d);AbyssSignals.validateCampaign(d);return false;}catch(_){return true;}}",[data,m]),m
 assert not errors,errors;c.close()
 # Deep blackout: hazards and room art must stay invisible without a beam/echo.
 c,p,e=build(b,1440,900);errors+=e;prime(p);p.evaluate('AbyssDiagnostics.fixtureLevel(3)')
 v=strong(p)['site'];t=v['traps'][0];p.evaluate('AbyssDiagnostics.lightingFixture({depth:1190,lights:false,battery:100})');point(p,{'x':t['x']+170*v['direction'],'y':t['y']})
 assert not state(p)['lights']
 def sample():
  return p.evaluate('''t=>{const d=AbyssDiagnostics.debug(),c=document.querySelector('#gameCanvas'),g=c.getContext('2d'),q=d.viewport;const x=(t.x-d.camera.x)*q.zoom*q.dpr,y=(t.y-d.camera.y)*q.zoom*q.dpr,a=g.getImageData(x-30,y-30,60,60).data;let n=0;for(let i=0;i<a.length;i+=4)n+=a[i]+a[i+1]+a[i+2];return n;}''',t)
 assert sample()==0,sample()
 p.evaluate('AbyssDiagnostics.ping()');step(p,.6);assert sample()>0
 assert not errors,errors;c.close();b.close()
 print('PASS warning before damage, shield/hull path and red pulse; frozen pause, saved hazard phase/hit cooldown, jet force, permanent shutoffs; malformed checkpoints rejected; deep blackout and sonar arrival')
