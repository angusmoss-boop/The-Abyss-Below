"""Deepwater helpers cannot light the abyss, sonar reveals them on arrival only."""
from v0240_rescue_mechanics_test import *
with sync_playwright() as pw:
 b=launch_browser(pw);c,p,errors=build(b,1440,900,False)
 for level in range(3):p.evaluate('i=>AbyssDiagnostics.fixtureLevel(i)',level)
 p.evaluate('AbyssDiagnostics.fixtureLevel(3)')
 fix(p,depth=1190,lights=False,upgrades={'hull':7,'engine':4,'flashlight':4})
 q=state(p);x,y=q['x'],q['y']
 stage(p,{'stations':[dict(id='air-service-0',x=x+180,y=y,seen=False,spent=0,allowance=0)],'drone':drone_at(x-180,y),'signalAfter':99999,'nextEventAt':99999})
 p.evaluate('AbyssDiagnostics.renderWorld()')
 def sample():
  return p.evaluate('''()=>{const d=AbyssDiagnostics.debug(),c=document.querySelector('canvas'),g=c.getContext('2d');const vals=[];for(const sign of [-1,1]){const x=(d.player.x+sign*180-d.camera.x)*d.viewport.zoom,y=(d.player.y-d.camera.y)*d.viewport.zoom;const a=g.getImageData(Math.floor(x-32),Math.floor(y-32),64,64).data;let sum=0;for(let i=0;i<a.length;i+=4)sum+=a[i]+a[i+1]+a[i+2];vals.push(sum);}return vals}''')
 dark=sample();assert dark==[0,0],dark
 p.evaluate('AbyssDiagnostics.ping()');assert sample()==dark
 step(p,.55);p.evaluate('AbyssDiagnostics.renderWorld()');echo=sample();assert all(v>1000 for v in echo),(dark,echo)
 p.evaluate('AbyssDiagnostics.save()');ss=store(p);before=rescue(p)
 # Synthetic unlocked gates make the deep-level fixture a valid load target.
 save=json.loads(ss[CAMPAIGN])
 for l in debug(p)['levels'][:3]:save['levels'][l['id']]['secured']=list(range(len(l['recorders'])))
 ss[CAMPAIGN]=json.dumps(save);c.close();c,p,e=build(b,store=ss);errors+=e;assert rescue(p)==before,(state(p)['levelId'],rescue(p),before)
 assert any(n['kind']=='rescueObjects' and n['hit'] for w in debug(p)['sonarWaves'] for n in w['contacts'])
 assert not errors,errors;c.close();b.close()
 print('PASS deep blackout hides drone/station; wave arrival reveals both; saved sonar contacts restore by stable IDs')
