"""Actual Web Audio loops and production scene routing, not a listening review."""
from v0210_harness import *
from playwright.sync_api import sync_playwright

def run():
 with sync_playwright() as pw:
  b=launch_browser(pw);c,p,e=build(b,launch=False)
  p.evaluate('''()=>{const Native=AudioContext;window.AudioContext=class extends Native{
   constructor(...a){super(...a);window.ac=this;window.loopSources=[];}
   createBufferSource(){const n=super.createBufferSource();const start=n.start.bind(n);n.start=(...a)=>{if(n.loop&&n.buffer?.duration>10)loopSources.push(n);return start(...a)};return n;}
   createDynamicsCompressor(){const n=super.createDynamicsCompressor(),a=super.createAnalyser();a.fftSize=2048;window.signal=a;const connect=n.connect.bind(n);n.connect=d=>{connect(a);a.connect(d);return d;};return n;}
  };}''')
  assert p.evaluate('AbyssAudio.status().state')=='not-started'
  p.locator('#menuAudioBtn').click();p.evaluate('AbyssAudio.configure({effects:0,ambience:0,music:.5});AbyssDiagnostics.audioFrame()');p.wait_for_function('AbyssAudio.status().musicPlaying && !AbyssAudio.status().musicPreparing');p.wait_for_timeout(750)
  a=p.evaluate('AbyssAudio.status()');assert a['musicMode']=='menu' and a['musicPlaying'] and a['musicDuration']==24,a
  peak=p.evaluate('''()=>{const a=new Float32Array(2048);signal.getFloatTimeDomainData(a);return Math.max(...a.map(Math.abs))}''');assert peak>1e-4,peak
  first=p.evaluate('loopSources.length');p.evaluate('''()=>{for(let i=0;i<50;i++)AbyssDiagnostics.audioFrame()}''');assert p.evaluate('loopSources.length')==first
  p.locator('#musicVolume').evaluate('(e)=>{e.value=19;e.dispatchEvent(new Event("input",{bubbles:true}))}')
  assert p.evaluate('AbyssAudio.settings().music')==.19 and p.evaluate('AbyssAudio.settings().effects')==0
  p.locator('#audioClose').click();p.locator('#startBtn').click();p.evaluate('AbyssDiagnostics.audioFrame()');assert not p.evaluate('AbyssAudio.status().musicPlaying')
  dock(p);p.wait_for_timeout(120);p.evaluate('AbyssDiagnostics.audioFrame()');p.wait_for_function('AbyssAudio.status().musicPlaying && !AbyssAudio.status().musicPreparing');p.wait_for_timeout(750)
  a=p.evaluate('AbyssAudio.status()');assert a['musicMode']=='dock' and a['musicPlaying'] and 21<a['musicDuration']<22,a
  metrics=p.evaluate('''()=>loopSources.map(s=>{const a=s.buffer.getChannelData(0),n=a.length;let peak=0,sum=0;for(let i=0;i<n;i++){peak=Math.max(peak,Math.abs(a[i]));sum+=a[i]*a[i];}return {duration:s.buffer.duration,channels:s.buffer.numberOfChannels,loop:s.loop,peak,rms:Math.sqrt(sum/n),seam:Math.abs(a[0]-a[n-1])};})''')
  assert len(metrics)==2 and all(m['loop'] and m['channels']==2 and m['rms']>.001 and m['peak']<.8 and m['seam']<.03 for m in metrics),metrics
  depart(p);p.evaluate('AbyssDiagnostics.unfreeze();AbyssDiagnostics.audioFrame()');assert not p.evaluate('AbyssAudio.status().musicPlaying')
  p.evaluate('AbyssDiagnostics.backgroundPause();AbyssDiagnostics.audioFrame()');p.wait_for_timeout(360);assert p.evaluate('AbyssAudio.status().state')=='suspended'
  settings=store(p);c.close();c,p,e2=build(b,store=settings,launch=False)
  assert p.evaluate('AbyssAudio.settings().music')==.19 and p.evaluate('AbyssAudio.status().state')=='not-started'
  p.locator('#menuAudioBtn').click();p.wait_for_timeout(120);p.evaluate('AbyssDiagnostics.audioFrame()');p.wait_for_function('AbyssAudio.status().musicPlaying && !AbyssAudio.status().musicPreparing')
  p.evaluate('Object.defineProperty(document,"hidden",{configurable:true,value:true});AbyssDiagnostics.audioFrame()');p.wait_for_timeout(360)
  assert p.evaluate('AbyssAudio.status().state')=='suspended' and not p.evaluate('AbyssAudio.status().musicPlaying')
  assert not e+e2,e+e2
  (ROOT/'verification/v0.21.0/music-signal.json').write_text(json.dumps({'menu_peak':peak,'loops':metrics,'notes':'Actual Web Audio signals and loop buffers. No human listening, device-speaker or musical-balance verdict.'},indent=2)+'\n')
  c.close();b.close();print('PASS menu and dock original stereo loops produce signal; independent persistent music slider; no duplicated sources; loop seam samples; music absent on dives and faded before background suspension; gesture unlock required')
if __name__=='__main__':run()
