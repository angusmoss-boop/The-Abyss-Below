"""Render each added cue through real Chromium OfflineAudioContext; not a listening review."""
from v0250_harness import *
from v0250_audio_comparison_test import OFFLINE
from playwright.sync_api import sync_playwright
with sync_playwright() as pw:
 b=launch_browser(pw);rows=[]
 for name in ['distress','droneHello','rescueLocated','airTransfer','rescueHome','distantCall','siltLift','driftbackCall','gliderPass','surfaceRain','rainUnderwater','harbourLife','observation']:
  p=b.new_page();p.set_content('<html/>');p.evaluate(OFFLINE.replace('48000*1.5','48000*5'));p.add_script_tag(content=(ROOT/'audio.js').read_text())
  # Disconnect background loops to measure the new cue, not the engine.
  out=p.evaluate('''async kind=>{await AbyssAudio.unlock();AbyssAudio.configure({music:0,ambience:1,effects:1});AbyssAudio.setScene('none');for(const n of probe.sources)n.disconnect();for(const n of probe.osc)n.disconnect();AbyssAudio.event(kind,.25,1,true);const audio=await probe.ctx.startRendering(),a=audio.getChannelData(0);let peak=0,energy=0,jump=0,tail=0;for(let i=1;i<a.length;i++){peak=Math.max(peak,Math.abs(a[i]));energy+=a[i]*a[i];jump=Math.max(jump,Math.abs(a[i]-a[i-1]));if(i>a.length-4800)tail=Math.max(tail,Math.abs(a[i]));}return {peak,rms:Math.sqrt(energy/a.length),jump,tail,frames:a.length}}''',name)
  assert out['peak']>1e-5 and out['peak']<.9 and out['rms']>1e-7 and out['tail']<1e-5,(name,out)
  rows.append({'cue':name,**out});p.close()
 b.close();(ROOT/'verification/v0.25.0/rescue-audio.json').write_text(json.dumps(rows,indent=2)+'\n')
 print('PASS thirteen rescue/ecology cues: nonzero finite Web Audio output, no full-scale clipping, tails return to silence. Musical quality and phone speakers not reviewed.')
