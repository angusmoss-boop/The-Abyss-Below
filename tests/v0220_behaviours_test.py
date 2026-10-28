from v0220_harness import *
from playwright.sync_api import sync_playwright
import math
with sync_playwright() as pw:
 b=launch_browser(pw);c,p,errors=build(b)
 p.evaluate('AbyssDiagnostics.fixtureLevel(4)')
 fix(p,depth=1000,upgrades={'hull':7,'shield':4},predators=[{'id':'a','dx':180,'dy':0,'aggression':1,'alertUntil':20},{'id':'b','dx':210,'dy':45,'aggression':1,'alertUntil':20},{'id':'c','dx':240,'dy':-45,'aggression':1,'alertUntil':20}])
 p.evaluate('AbyssDiagnostics.predatorBehaviour()');step(p,.3)
 enemies=debug(p)['predators'];assert len({e['packId'] for e in enemies})==1
 assert all(e['behaviour']=='pack' and math.hypot(e['vx'],e['vy'])<=96.001 for e in enemies)
 assert len({round(e['vy']) for e in enemies})>1
 print('PASS small Drifter packs use different approach offsets without changing individual speed or health')
 fix(p,depth=900,upgrades={'hull':7,'shield':4},predators=[{'id':'stalker','tier':'apex','dx':220,'dy':0,'aggression':1,'alertUntil':20}])
 p.evaluate('AbyssDiagnostics.predatorBehaviour()');step(p,.1)
 e=debug(p)['predators'][0];assert e['huntPhase']=='windup' and not e['biteAllowed']
 before=(e['x'],e['y']);p.evaluate('AbyssDiagnostics.mutateEnemy("stalker",{stunnedUntil:1})');step(p,.4)
 e=debug(p)['predators'][0];assert (e['x'],e['y'])==before
 step(p,1.6);e=debug(p)['predators'][0];assert e['huntPhase']=='rush' and e['biteAllowed']
 assert math.hypot(e['vx'],e['vy'])<=158.001
 step(p,1.1);e=debug(p)['predators'][0];assert e['huntPhase'] in ['retreat','recover'] and not e['biteAllowed']
 print('PASS Stalker wind-up, committed rush and non-biting retreat; stun freezes movement and phase timer')
 fix(p,depth=1100,upgrades={'hull':7},predators=[{'id':'reaper','tier':'reaper','dx':220,'dy':0,'aggression':1,'alertUntil':20}])
 p.evaluate('AbyssDiagnostics.predatorBehaviour();AbyssDiagnostics.setMotion({vx:0,vy:120})');step(p,.06)
 e=debug(p)['predators'][0];assert e['behaviour']=='interceptor' and e['seenVY']>0 and e['vy']>0
 assert math.hypot(e['vx'],e['vy'])<=state(p)['maxNormalSpeed']+.001
 # A completely occluded submarine never provides coordinates to interception.
 fix(p,depth=1100,upgrades={'hull':7},rocks=[{'dx':100,'dy':0,'radius':46}],predators=[{'id':'hidden','tier':'reaper','dx':220,'dy':0,'aggression':1,'alertUntil':20}])
 p.evaluate('AbyssDiagnostics.predatorBehaviour()');step(p,.25)
 e=debug(p)['predators'][0];assert 'seenX' not in e and not e['biteAllowed']
 assert math.hypot(e['vx'],e['vy'])<=46.001
 print('PASS Reaper intercepts only observed motion; rocks deny target memory and normal speed remains Mk IV speed')
 assert not errors,errors;c.close();b.close()
