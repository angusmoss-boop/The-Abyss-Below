"""Air reserves: manual timed transfer, fair capacity and no menu refill exploit."""
from v0220_rescue_mechanics_test import *
with sync_playwright() as pw:
 b=launch_browser(pw);c,p,errors=build(b)
 fix(p,depth=80,upgrades={'hull':7,'oxygen':0,'engine':2});q=state(p);x,y=q['x'],q['y']
 station=dict(id='air-service-0',x=x+24,y=y,seen=False,spent=0,allowance=0)
 stage(p,{'stations':[station],'signalAfter':9999,'nextEventAt':9999})
 p.evaluate('AbyssDiagnostics.setSystems({oxygen:30,battery:0})');power=state(p)['battery'];stock=state(p)['weaponAmmo']
 step(p,6.5,keys=['e']);s=rescue(p);assert abs(s['stations'][0]['spent']-25)<.06,s
 assert 52.9<state(p)['oxygen']<54, state(p)['oxygen']
 assert state(p)['battery']==power and state(p)['weaponAmmo']==stock
 before=s['stations'][0]['spent'];step(p,3,keys=['e']);assert rescue(p)['stations'][0]['spent']==before
 pulse(p,1000,False);assert rescue(p)['stations'][0]['spent']==before
 assert 'DEPLETED' in p.locator('#interactionPrompt').inner_text() or 'DEPLETED' in debug(p)['field']['survey']['contacts']['rescue:air-service-0']['label']
 print('PASS six-second 25% transfer without power, no auto-use or free refill when held or paused',flush=True)
 p.evaluate('AbyssDiagnostics.save()');snap=store(p);c.close();c,p,e=build(b,store=snap);errors+=e
 assert rescue(p)['stations'][0]['spent']==before
 # Reopen the log and close it; reserves stay depleted.
 p.evaluate('AbyssDiagnostics.rescueLog()');p.locator('#rescueDone').click();assert rescue(p)['stations'][0]['spent']==before
 # Real physical return replenishes, remote menu does not. Fake fixture coords are clear in its original game.
 move(p,600,700);step(p,.01);dock(p);assert rescue(p)['stations'][0]['spent']==0
 depart(p)
 fix(p,depth=80,upgrades={'hull':7,'oxygen':4});q=state(p);station.update(x=q['x']+24,y=q['y'],spent=0,allowance=0)
 stage(p,{'stations':[station]});p.evaluate('AbyssDiagnostics.setSystems({oxygen:100,battery:0})')
 step(p,7,keys=['e']);s=rescue(p);assert abs(s['stations'][0]['spent']-55)<.06,s
 print('PASS depleted reserve persists across reload/log; physical return restocks, upgraded tank gets 55 units at Mk IV',flush=True)
 # Start full: station remains untouched. Partial uses preserve the remaining reserve.
 stage(p,{'stations':[{**station,'spent':0,'allowance':0}]});p.evaluate('AbyssDiagnostics.setSystems({oxygen:220})')
 use(p);assert rescue(p)['stations'][0]['allowance']==0
 p.evaluate('AbyssDiagnostics.save()');payload=p.evaluate('JSON.parse(testStore[AbyssSlots.key])')
 payload['levels'][payload['selectedLevel']]['rescue']['stations'][0]['spent']=99999
 assert p.evaluate('x=>{try{AbyssSignals.validateCampaign(x);return false;}catch(e){return true;}}',payload)
 assert not errors,errors;c.close();b.close()
 print('PASS full-tank protection and corrupt backup rejected',flush=True)
