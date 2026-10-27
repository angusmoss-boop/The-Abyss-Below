"""Actual Chromium Web Audio nodes and time-domain signal, not an audible balance review."""
from v0150_harness import *
from playwright.sync_api import sync_playwright

def run():
 with sync_playwright() as pw:
  b=launch_browser(pw);c,p,e=build(b,launch=False)
  p.evaluate('''()=>{
    const Native=window.AudioContext;
    window.AudioContext=class extends Native {
      constructor(...args){super(...args);window.probeContext=this;}
      createDynamicsCompressor(){const n=super.createDynamicsCompressor(),a=super.createAnalyser();a.fftSize=2048;window.probeAnalyser=a;const connect=n.connect.bind(n);n.connect=dest=>{connect(a);a.connect(dest);return dest;};return n;}
    };
  }''')
  p.locator('#startBtn').click();p.evaluate('requestAnimationFrame=()=>0');p.wait_for_timeout(70)
  p.evaluate('AbyssAudio.unlock();AbyssAudio.configure({effects:.6,ambience:.6,muted:false})');p.wait_for_timeout(120)
  assert p.evaluate('AbyssAudio.status().state')=='running'
  peaks={};baselines={}
  for kind in ['chain','ventWarning','ventErupt','kelp','schoolRush','wreckGroan','harbour','derelictBlast','dock','explosion','pickup','sonar']:
   p.evaluate('AbyssAudio.suspend()');p.wait_for_timeout(30);p.evaluate('AbyssAudio.unlock()');p.wait_for_timeout(300)
   baselines[kind]=p.evaluate('''()=>{const a=new Float32Array(2048);probeAnalyser.getFloatTimeDomainData(a);return Math.max(...a.map(Math.abs));}''')
   p.evaluate('kind=>AbyssAudio.event(kind,.4,1)',kind);p.wait_for_timeout(90)
   peaks[kind]=p.evaluate('''()=>{const a=new Float32Array(2048);probeAnalyser.getFloatTimeDomainData(a);return Math.max(...a.map(Math.abs));}''')
  assert all(v>max(1e-5,baselines[k]*2) for k,v in peaks.items()),(peaks,baselines)
  counts=p.evaluate('AbyssAudio.status().eventCounts');assert all(counts.get(k,0)>0 for k in peaks),counts
  # A crowded encounter cannot exceed the voice cap, even with many simultaneous event requests.
  p.evaluate('''()=>{for(let i=0;i<50;i++){AbyssAudio.event('derelictBlast');AbyssAudio.event('ventErupt');AbyssAudio.event('chain');AbyssAudio.event('schoolRush');}}''')
  assert p.evaluate('AbyssAudio.status().voices')<=28
  before=p.evaluate('AbyssAudio.status().eventCounts.chain');p.evaluate('''()=>{for(let i=0;i<20;i++)AbyssAudio.event('chain');}''')
  assert p.evaluate('AbyssAudio.status().eventCounts.chain')==before
  p.evaluate('AbyssAudio.suspend()');p.wait_for_timeout(100);assert p.evaluate('AbyssAudio.status().state')=='suspended'
  p.evaluate('AbyssAudio.unlock()');p.wait_for_timeout(100);p.evaluate('AbyssAudio.configure({muted:true})');before=p.evaluate('AbyssAudio.status().eventCounts')
  p.evaluate('AbyssAudio.event("derelictBlast");AbyssAudio.event("sonar")');assert p.evaluate('AbyssAudio.status().eventCounts')==before
  p.evaluate('AbyssAudio.configure({effects:.2,ambience:.7,muted:true})');s=store(p);c.close();c,p,e2=build(b,store=s,launch=False)
  a=p.evaluate('AbyssAudio.settings()');assert a=={'effects':.2,'ambience':.7,'muted':True},a
  assert not e+e2,e+e2
  (ROOT/'verification/v0.15.0/audio-signal.json').write_text(json.dumps({'peaks':peaks,'baselines':baselines,'notes':'Actual Chromium analyser samples. This is NOT a human listening, headphone, phone-speaker or perceptual-mix test.'},indent=2)+'\n')
  c.close();b.close();print('PASS actual AudioContext signal for new and revised effects; voices capped at 28, repeated ambient cues throttled, pause suspension, mute and independent persisted bus settings')
if __name__=='__main__':run()
