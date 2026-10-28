"""Actual production rescue interactions, following, failure and one-time rewards."""
from v0230_harness import *
from playwright.sync_api import sync_playwright
import copy,math

def rescue(p):return p.evaluate('AbyssDiagnostics.rescue()')
def stage(p,data):p.evaluate('x=>AbyssDiagnostics.rescueFixture(x)',data)
def pulse(p,dt=.1,active=True):p.evaluate('([t,a])=>AbyssDiagnostics.rescuePulse(t,a)',[dt,active])
def drone_at(x,y,status='stranded'):
 return dict(id='rescue-drone',x=x,y=y,status=status,seen=False,search=dict(x=x+45,y=y+30),heading=0,restart=0,trail=[])

def run():
 with sync_playwright() as pw:
  b=launch_browser(pw);c,p,errors=build(b,390,844,True)
  # Fixture clears unrelated hazards but retains real USE / state / save handlers.
  fix(p,depth=80,upgrades={'hull':7,'oxygen':5,'engine':4});s=state(p);x,y=s['x'],s['y']
  stage(p,{'drone':drone_at(x+32,y),'signalAfter':9999,'nextEventAt':9999})
  step(p,.65,keys=['e']);assert rescue(p)['drone']['status']=='stranded'
  step(p,1.3,keys=['e']);assert rescue(p)['drone']['status']=='follow',rescue(p)
  step(p,1,keys=['e']);assert rescue(p)['drone']['status']=='follow','Held USE must not toggle FOLLOW / WAIT repeatedly'
  step(p,.5);use(p);assert rescue(p)['drone']['status']=='wait'
  step(p,.5);use(p);assert rescue(p)['drone']['status']=='follow'
  start=rescue(p)['drone'];step(p,2,keys=['d']);end=rescue(p)['drone'];assert end['x']>start['x']+150
  assert math.hypot(end['x']-state(p)['x'],end['y']-state(p)['y'])<140
  print('PASS held restart, stable held input, release-to-toggle and normal-speed following',flush=True)
  # Save/load keeps canonical drone state and reserve quantities, not a regenerated mission.
  p.evaluate('AbyssDiagnostics.save()');snap=store(p);d_before=rescue(p);c.close()
  c,p,e=build(b,390,844,True,store=snap);errors+=e
  assert state(p)['paused'] and rescue(p)==d_before,(rescue(p),d_before)
  p.evaluate('AbyssDiagnostics.loseDive()');d=rescue(p)['drone'];assert d['status']=='wait'
  old=(d['x'],d['y']);p.locator('#retryBtn').click();step(p,0)
  assert (rescue(p)['drone']['x'],rescue(p)['drone']['y'])==old and rescue(p)['drone']['status']=='wait'
  print('PASS save/resume exact state and death leaves a recoverable waiting drone',flush=True)
  # Return can settle only the near follower, never a remote waiting drone.
  move(p,600,700);step(p,.01);before=state(p)['credits'];dock(p)
  assert not rescue(p)['done'] and rescue(p)['lastReport']['rescueCredit']==0,(state(p)['credits'],before,rescue(p))
  depart(p);stage(p,{'drone':drone_at(610,275,'follow'),'trip':{'seconds':220,'depth':80,'damage':0,'airAdded':0,'startKnown':0,'startContracts':0,'startCredits':before}})
  before=state(p)['credits'];dock(p);assert rescue(p)['done'] and state(p)['credits']==before+180+rescue(p)['lastReport']['credits']+rescue(p)['lastReport']['contractCredit'],(before,state(p)['credits'],rescue(p))
  r=rescue(p)['lastReport'];assert r['rescued']==1 and r['rescueCredit']==180 and r['seconds']==220
  p.locator('#rescueLogBtn').click();assert 'PIP recovered' in p.locator('#rescueBody').inner_text();p.locator('#rescueDone').click()
  paid=state(p)['credits'];use(p);assert state(p)['credits']==paid
  depart(p);dock(p);assert rescue(p)['lastReport']['rescueCredit']==0 and rescue(p)['done']
  p.evaluate('AbyssDiagnostics.save()');export=p.evaluate('AbyssSignals.pack(JSON.parse(testStore[AbyssSlots.key]))');assert '"rescueCredit": 0' in export
  assert not errors,errors;c.close();b.close()
  print('PASS one-time physical harbour payment, honest debrief, fleet journal and repeated-dock anti-duplication',flush=True)
if __name__=='__main__':run()
