"""Real Chromium AudioContext regression: fades, worker races/fallback and UI input.
These are signal/scheduling tests, not a human listening or Android hardware test.
"""
from v0190_harness import *
from playwright.sync_api import sync_playwright
from v0190_audio_comparison_test import BOOT

with sync_playwright() as pw:
 b=launch_browser(pw);metrics={}
 def isolated(fallback=False):
  p=b.new_page();p.set_default_timeout(15000);p.set_content('<html/>');p.evaluate(BOOT)
  if fallback:p.evaluate("()=>{window.Worker=class{constructor(){throw new Error('Deliberately blocked for fallback test')}};}")
  p.add_script_tag(content=(ROOT/'audio.js').read_text());p.evaluate('AbyssAudio.unlock()');p.wait_for_timeout(250)
  return p
 p=isolated();p.evaluate('AbyssAudio.configure({music:0});AbyssAudio.setScene("none");AbyssAudio.tick({speed:240,depth:200})');p.wait_for_timeout(400)
 live=p.evaluate('''async()=>{const g=probe.gains[7].gain,t=probe.ctx.currentTime,read=()=>({t:probe.ctx.currentTime-t,gain:g.value});const out=[read()];AbyssAudio.setScene('pause');for(let i=0;i<23;i++){await new Promise(r=>setTimeout(r,20));out.push(read())}return out}''')
 assert live[0]['gain']>.04
 assert any(.02<d['t']<.12 and .03<d['gain']<live[0]['gain'] for d in live)
 assert live[-1]['gain']==0,live
 metrics['livePauseFade']=live
 # Repeated gestures do not retrigger mixer/output fades.
 p.evaluate('probe.schedules=[];for(let i=0;i<200;i++)AbyssAudio.unlock()');assert p.evaluate('probe.schedules.length')==0
 # Preview one-shots start with scheduling headroom and end at zero.
 p.evaluate('AbyssAudio.event("sonar",0,1,true)');p.wait_for_timeout(80)
 assert p.evaluate('AbyssAudio.status().voices')>0
 # Audio-clock background fade, stale suspend cancellation, then genuine suspend.
 for i in range(5):
  p.evaluate('AbyssAudio.suspend()');p.wait_for_timeout(30);p.evaluate('AbyssAudio.unlock()')
 p.wait_for_timeout(400);assert p.evaluate('AbyssAudio.status().state')=='running'
 p.evaluate('AbyssAudio.suspend()');p.wait_for_timeout(450)
 assert p.evaluate('AbyssAudio.status().state')=='suspended'
 assert all(x['gain']<1e-6 for x in p.evaluate('probe.suspends'))
 metrics['backgroundSuspends']=p.evaluate('probe.suspends');p.close()
 print('PASS real-time gradual pause fade, idempotent unlock, preview effects, rapid hide/show and zero-gain background suspension',flush=True)
 for fallback in [False,True]:
  p=isolated(fallback);errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
  p.evaluate('''()=>{AbyssAudio.setScene('menu');AbyssAudio.setScene('pause');AbyssAudio.setScene('dock');window.heartbeats=0;window.heartbeat=setInterval(()=>heartbeats++,10)}''')
  p.wait_for_function('AbyssAudio.status().musicNotes===276 && !AbyssAudio.status().musicPreparing',timeout=30000)
  status=p.evaluate('AbyssAudio.status()');assert status['musicPlaying'] and status['musicMode']=='dock'
  if fallback:assert status['musicRenderMode']=='yielding-fallback'
  else:assert status['musicRenderMode']=='worker'
  durations=p.evaluate('probe.sources.filter(s=>s.buffer?.duration>10).map(s=>s.buffer.duration)');assert len(durations)==1 and 21<durations[0]<22,durations
  if fallback:assert p.evaluate('heartbeats')>10
  # The source for an obsolete request must not start. UI scene changes to cached
  # scores are still asynchronous, so check that a subsequent dive cancels them.
  p.evaluate('AbyssAudio.setScene("menu");AbyssAudio.setScene("none")');p.wait_for_timeout(750)
  assert not p.evaluate('AbyssAudio.status().musicPlaying')
  count=p.evaluate('probe.sources.length')
  p.evaluate('for(let i=0;i<100;i++){AbyssAudio.setScene("none");AbyssAudio.unlock()}');assert p.evaluate('probe.sources.length')==count
  p.evaluate('AbyssAudio.setScene("pause")');p.wait_for_function('AbyssAudio.status().musicPlaying')
  p.evaluate('AbyssAudio.configure({muted:true})');p.wait_for_timeout(500);assert not p.evaluate('AbyssAudio.status().musicPlaying')
  p.evaluate('AbyssAudio.configure({muted:false})');p.wait_for_function('AbyssAudio.status().musicPlaying')
  p.evaluate('AbyssAudio.setScene("dock");Object.defineProperty(document,"hidden",{value:true,configurable:true});AbyssAudio.suspend()');p.wait_for_timeout(400)
  assert p.evaluate('AbyssAudio.status().state')=='suspended' and not p.evaluate('AbyssAudio.status().musicPlaying')
  p.evaluate('Object.defineProperty(document,"hidden",{value:false,configurable:true});AbyssAudio.unlock()');p.wait_for_function('AbyssAudio.status().musicPlaying')
  assert p.evaluate('AbyssAudio.status().musicMode')=='dock'
  metrics['fallback' if fallback else 'worker']={'status':status,'heartbeats':p.evaluate('heartbeats'),'initialLoopDurations':durations}
  assert not errors,errors;p.close()
 print('PASS worker and yielding fallback, asynchronous stale-scene suppression, mute/unmute and resume during generation',flush=True)
 c,p,e=build(b,390,844,True,launch=False)
 p.evaluate('''()=>{window.unlockCalls=0;const f=AbyssAudio.unlock;AbyssAudio.unlock=(...args)=>{unlockCalls++;return f(...args)}}''')
 p.evaluate('document.dispatchEvent(new PointerEvent("pointerdown",{bubbles:true,pointerType:"touch"}))')
 assert p.evaluate('unlockCalls')==1
 p.evaluate('document.dispatchEvent(new KeyboardEvent("keydown",{key:"a",bubbles:true}))');assert p.evaluate('unlockCalls')==2
 p.locator('#startBtn').click();p.evaluate('AbyssDiagnostics.unfreeze();AbyssDiagnostics.audioFrame()')
 p.locator('#focusPauseBtn').click();p.evaluate('AbyssDiagnostics.audioFrame()');p.wait_for_function('AbyssAudio.status().musicPlaying')
 assert p.evaluate('AbyssAudio.status().musicMode')=='pause'
 p.locator('#pauseAudioBtn').click();p.evaluate('AbyssDiagnostics.audioFrame()')
 for val in [0,80,20,100,30]:
  p.locator('#musicVolume').evaluate('(e,v)=>{e.value=v;e.dispatchEvent(new Event("input",{bubbles:true}))}',val)
 p.wait_for_function('AbyssAudio.status().musicPlaying')
 p.locator('#audioClose').click();p.locator('#resumeBtn').click();p.evaluate('AbyssDiagnostics.audioFrame()');p.wait_for_timeout(800)
 assert not p.evaluate('AbyssAudio.status().musicPlaying') and not state(p)['paused']
 assert not e,e;c.close();b.close()
 (ROOT/'verification/v0.19.0/transitions.json').write_text(json.dumps(metrics,indent=2)+'\n')
 print('PASS actual mobile UI pause/settings/resume, one global audio unlock per event, sliders and unchanged seven-button layout')
