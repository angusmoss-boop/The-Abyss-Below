"""Active clocks, approximate search areas, sonar arrival, saved encounters and opt-out."""
from v0230_rescue_mechanics_test import *
with sync_playwright() as pw:
 b=launch_browser(pw);c,p,errors=build(b)
 before=rescue(p);pulse(p,999,False);assert rescue(p)==before
 pulse(p,999);assert rescue(p)['elapsed']==0 and rescue(p)['drone'] is None
 move(p,600,900);stage(p,{'signalAfter':2,'nextEventAt':99999});pulse(p,1);assert rescue(p)['drone'] is None
 pulse(p,1.1);d=rescue(p)['drone'];assert d
 assert not d['seen'];assert d['search']!={'x':d['x'],'y':d['y']}
 # Sonar must reach the canonical contact; it does not identify on the button press.
 move(p,d['x']-220,d['y']);p.evaluate('AbyssDiagnostics.face(Math.PI);AbyssDiagnostics.ping()')
 assert not rescue(p)['drone']['seen'];step(p,.65);assert rescue(p)['drone']['seen']
 # Leave normal-generation hazards behind for deterministic event fixtures.
 fix(p,depth=80,upgrades={'hull':7});stage(p,{'drone':None,'done':False,'signalAfter':99999})
 for kind in ['migration','silhouette','beacon']:
  p.evaluate('k=>AbyssDiagnostics.rescueEvent(k)',kind);e=rescue(p)['event'];assert e
  pulse(p,2);e=rescue(p)['event'];elapsed=e['age'];pulse(p,999,False);assert rescue(p)['event']['age']==elapsed
  p.evaluate('AbyssDiagnostics.save()');ss=store(p);before=rescue(p);c.close();c,p,e2=build(b,store=ss);errors+=e2
  assert rescue(p)==before and state(p)['paused']
  pulse(p,60);assert rescue(p)['event'] is None
 print('PASS active-only clocks, delayed distress, sonar arrival, safe encounter expiration and exact reload state',flush=True)
 # A silt event starts only deeper, produces no damage, stays out of the harbour.
 p.evaluate('AbyssDiagnostics.fixtureLevel(1)');fix(p,depth=80,upgrades={'hull':7});stage(p,{'signalAfter':99999,'nextEventAt':99999})
 p.evaluate('AbyssDiagnostics.rescueEvent("silt")');assert rescue(p)['event']['kind']=='silt'
 hull=state(p)['hull'];pulse(p,5);assert state(p)['hull']==hull
 move(p,600,160);pulse(p,.1);assert rescue(p)['event'] is None
 assert not errors,errors;c.close();b.close()
 print('PASS shallow silt exclusion, no environmental-event damage and cancellation on harbour entry',flush=True)
