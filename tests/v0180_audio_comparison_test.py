from playwright.sync_api import sync_playwright
from pathlib import Path
import json
import zipfile
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'verification/v0.18.0';OUT.mkdir(parents=True,exist_ok=True)
BASE=ROOT.parent/'the-abyss-below-v0.17.2-complete.zip'
with zipfile.ZipFile(BASE) as archive: BEFORE=archive.read('audio.js').decode()
BOOT='''()=>{Object.defineProperty(window,'localStorage',{value:{getItem:()=>null,setItem:()=>{}}});let seed=6173;Math.random=()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296};const Native=AudioContext;window.probe={sources:[],gains:[],schedules:[],stops:[],suspends:[]};window.AudioContext=class extends Native{constructor(){super();probe.ctx=this;}createGain(){let g=super.createGain(),id=probe.gains.length;probe.gains.push(g);for(const name of ['setTargetAtTime','linearRampToValueAtTime','cancelAndHoldAtTime']){let fn=g.gain[name]?.bind(g.gain);if(fn)g.gain[name]=(...args)=>{probe.schedules.push({id,name,args,now:this.currentTime});return fn(...args)}}return g;}createBufferSource(){let s=super.createBufferSource();probe.sources.push(s);const stop=s.stop.bind(s);s.stop=t=>{probe.stops.push({at:t,now:this.currentTime});return stop(t)};return s;}suspend(){probe.suspends.push({time:this.currentTime,gain:AbyssAudio.status().outputGain});return super.suspend()}};}'''
OFFLINE='''()=>{Object.defineProperty(window,'localStorage',{value:{getItem:()=>null,setItem:()=>{}}});window.probe={gains:[],osc:[],sources:[]};window.AudioContext=function(){const ctx=new OfflineAudioContext(1,48000*1.5,48000);probe.ctx=ctx;return new Proxy(ctx,{get(t,k){if(k==='state')return 'running';if(k==='createGain')return()=>{const g=t.createGain();probe.gains.push(g);return g};if(k==='createOscillator')return()=>{const s=t.createOscillator();probe.osc.push(s);return s};if(k==='createBufferSource')return()=>{const s=t.createBufferSource();probe.sources.push(s);return s};const value=Reflect.get(t,k,t);return typeof value==='function'?value.bind(t):value;}})}}'''
RAPID='''async()=>{await AbyssAudio.unlock();AbyssAudio.configure({music:0,ambience:1,effects:0});AbyssAudio.setScene('none');const ctx=probe.ctx;
 for(const g of probe.gains)g.disconnect();for(const o of probe.osc)o.disconnect();for(const s of probe.sources)s.disconnect();const constant=ctx.createConstantSource();constant.offset.value=1;constant.connect(probe.gains[7]);probe.gains[7].connect(ctx.destination);constant.start();
 const jobs=[];function at(t,f){jobs.push(ctx.suspend(t).then(()=>{f();return ctx.resume()}));}
 for(let t=.10;t<.49;t+=.06)at(t,()=>AbyssAudio.tick({speed:240,depth:200}));at(.50,()=>AbyssAudio.setScene('pause'));at(.55,()=>{AbyssAudio.unlock();AbyssAudio.setScene('none');AbyssAudio.tick({speed:240,depth:200})});
 for(let t=.62;t<1.4;t+=.06)at(t,()=>AbyssAudio.tick({speed:240,depth:200}));const audio=await ctx.startRendering();await Promise.all(jobs);const a=audio.getChannelData(0);let min=Infinity,maxJump=0;for(let i=Math.floor(.8*48000);i<Math.floor(1.1*48000);i++){min=Math.min(min,a[i]);maxJump=Math.max(maxJump,Math.abs(a[i]-a[i-1]))}let pauseEdge=0;for(let i=Math.floor(.49*48000);i<Math.floor(.56*48000);i++)pauseEdge=Math.max(pauseEdge,Math.abs(a[i]-a[i-1]));return {pauseEdgeJump:pauseEdge,minEngineGainAfterResume:min,maxSampleJump:maxJump,samples:[.49,.5,.55,.6,.7,.8,.85,.88,.9,1,1.1].map(t=>({t,gain:a[Math.floor(t*48000)]}))};}'''
def run():
 with sync_playwright() as pw:
  b=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--autoplay-policy=no-user-gesture-required']);results={}
  for label,src in [('before',BEFORE),('after',(ROOT/'audio.js').read_text())]:
   p=b.new_page();p.set_content('<html/>');p.evaluate(BOOT);p.add_script_tag(content=src)
   p.evaluate('AbyssAudio.unlock()');p.wait_for_timeout(400)
   metrics=p.evaluate('''()=>{probe.schedules=[];for(let i=0;i<100;i++)AbyssAudio.unlock();return{redundantGestureAutomation:probe.schedules.length,water:(()=>{const a=probe.sources[0].buffer.getChannelData(0);let max=0;for(let i=1;i<a.length;i++)max=Math.max(max,Math.abs(a[i]-a[i-1]));return{joinJump:Math.abs(a[0]-a.at(-1)),maximumInteriorJump:max}})()}}''')
   modes=[]
   for mode in ['menu','dock','pause']:
    ms=p.evaluate('m=>{const t=performance.now();AbyssAudio.setScene(m);return performance.now()-t}',mode)
    p.wait_for_function('(mode)=>AbyssAudio.status().musicPlaying && AbyssAudio.status().musicMode===mode && !AbyssAudio.status().musicPreparing',arg=mode,timeout=15000)
    modes.append({'mode':mode,'handlerMilliseconds':ms})
   metrics['sceneHandlers']=modes;metrics['status']=p.evaluate('AbyssAudio.status()')
   metrics['musicHashes']=p.evaluate('''()=>probe.sources.filter(s=>s.buffer?.duration>10).map(s=>{const hashes=[];for(let c=0;c<2;c++){const a=new Uint32Array(s.buffer.getChannelData(c).buffer);let h=2166136261;for(const v of a)h=Math.imul(h^v,16777619);hashes.push(h>>>0)}return{duration:s.buffer.duration,hashes}})''');p.close()
   p=b.new_page();p.set_content('<html/>');p.evaluate(OFFLINE);p.add_script_tag(content=src);metrics['rapidResume']=p.evaluate(RAPID);p.close();results[label]=metrics
  assert results['before']['rapidResume']['pauseEdgeJump']>.04
  assert results['after']['rapidResume']['pauseEdgeJump']<.0001
  assert results['before']['rapidResume']['minEngineGainAfterResume']==0
  assert results['after']['rapidResume']['minEngineGainAfterResume']>.045
  assert results['before']['redundantGestureAutomation']>=700
  assert results['after']['redundantGestureAutomation']==0
  assert results['before']['water']['joinJump']>results['before']['water']['maximumInteriorJump']*3
  assert results['after']['water']['joinJump']<results['after']['water']['maximumInteriorJump']
  assert results['after']['musicHashes']==results['before']['musicHashes'], 'Existing musical scores must stay bit-identical'
  assert results['after']['status']['musicRenderMode']=='worker'
  print(json.dumps(results,indent=2));(OUT/'comparison.json').write_text(json.dumps(results,indent=2)+'\n');b.close()
 
 print('PASS native offline envelope reproduces old pause step and eliminates it; rapid resume no longer remutes; running gestures are no-ops; water join repaired; worker-generated scores bit-identical to v0.17.2')

if __name__=='__main__':run()
