"""Patch-specific actual UI, release migration and Web Audio transition coverage."""
from v0171_harness import *
from playwright.sync_api import sync_playwright
import zipfile,copy,math

ARCHIVE=ROOT.parent/'the-abyss-below-v0.17.0-complete.zip'
INDEX='abyss-campaign-slots-v1'

def old_build(b,w=390,h=844,store=None):
 with zipfile.ZipFile(ARCHIVE) as z:
  c=b.new_context(viewport={'width':w,'height':h},is_mobile=True,has_touch=True,service_workers='block')
  p=c.new_page();p.set_default_timeout(5000);errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
  html=z.read('index.html').decode();p.set_content(html);p.add_style_tag(content=z.read('styles.css').decode())
  p.evaluate('''data=>{window.ABYSS_TEST_MODE=true;window.testStore=data;Object.defineProperty(window,'localStorage',{value:{getItem:k=>testStore[k]??null,setItem:(k,v)=>testStore[k]=v,removeItem:k=>delete testStore[k]}})}''',store or {})
  for f in re.findall(r'<script\s+[^>]*src=["\']([^"\']+)',html):p.add_script_tag(content=z.read(f.split('?')[0]).decode())
  p.locator('#startBtn').click();p.evaluate('requestAnimationFrame=()=>0');p.wait_for_timeout(70);p.evaluate('AbyssDiagnostics.step(0)')
  return c,p,errors

def run():
 with sync_playwright() as pw:
  b=launch_browser(pw);measurements=[]
  for w,h in [(320,568),(390,844),(568,320),(844,390)]:
   c,p,e=old_build(b,w,h)
   before=p.locator('.mobile-actions').bounding_box();old_icon=p.locator('#mobileRail .action-glyph').bounding_box()['width']
   c.close();c,p,e2=build(b,w,h,True)
   after=p.locator('.mobile-actions').bounding_box();icon=p.locator('#mobileRail .action-glyph').bounding_box()['width']
   assert after['height']<before['height'] and after['width']*after['height']<before['width']*before['height'],(before,after)
   assert after['height']<=168 and after['width']<=202 and icon>old_icon
   assert all(not t for t in p.locator('.action-circle').all_inner_texts())
   assert all(p.locator('#'+id).get_attribute('aria-label') for id in ['mobileRail','mobileTorpedo','mobileMine','mobileInteract','mobileBoost'])
   rects=[p.locator('#'+id).bounding_box() for id in ['mobileRail','mobileTorpedo','mobileMine']]
   assert len({r['x'] for r in rects})==1 and rects[0]['y']<rects[1]['y']<rects[2]['y']
   for id in ['mobileRail','mobileTorpedo','mobileMine','mobileBoost']:
    assert 'equipment-locked' in p.locator('#'+id).get_attribute('class')
    assert p.locator('#'+id).evaluate('e=>getComputedStyle(e).color')=='rgb(104, 118, 128)'
   assert not e+e2,e+e2
   measurements.append({'width':w,'height':h,'before':before,'after':after,'rail_icon_before':old_icon,'rail_icon_after':icon})
   if w==390:
    p.evaluate('AbyssDiagnostics.grantCredits(9000);AbyssDiagnostics.grantCrystals(100)');dock(p)
    for u in ['railgun','torpedo','minePower','engine']:buy(p,u)
    p.locator('#ammunitionTab').click();p.locator('#buyRailBtn').click();p.locator('#buyTorpedoBtn').click();p.locator('#buyMineBtn').click()
    depart(p);p.evaluate('AbyssDiagnostics.step(0,{freezeAfter:false})')
    for id in ['mobileRail','mobileTorpedo','mobileMine','mobileBoost']:assert 'equipment-locked' not in p.locator('#'+id).get_attribute('class')
    assert p.locator('#mobileRail').evaluate('e=>Number(e.style.getPropertyValue("--stock"))')>0
    assert not p.locator('#mobileRail').inner_text()
   c.close()
  (ROOT/'verification/v0.17.1/control-measurements.json').write_text(json.dumps(measurements,indent=2)+'\n')
  print('PASS four measured before/after control footprints; larger icons, no rendered labels, vertical weapon ordering, grey unfitted equipment and real dock unlock transitions',flush=True)
  # Actual v0.17 campaign and economy preserved in each of the three slots.
  c,p,e=old_build(b);p.evaluate('AbyssDiagnostics.grantCredits(1750);AbyssDiagnostics.grantCrystals(100)');dock(p)
  for u in ['hull','railgun','engine']:buy(p,u)
  p.locator('#ammunitionTab').click();p.locator('#fillRailBtn').click();depart(p)
  for kind in ['scrap','crystal']:
   n=next(n for n in debug(p)['items'] if n['type']==kind);move(p,n['x'],n['y'])
   if kind=='scrap':p.evaluate('AbyssDiagnostics.autoPickup()')
   else:use(p)
  move(p,600,870);p.evaluate('AbyssDiagnostics.save()');data=store(p);prices=p.evaluate('AbyssDiagnostics.costs()');c.close()
  profile=json.loads(data[CAMPAIGN])
  for i in [2,3]:
   value=copy.deepcopy(profile);value['id']='patch-fixture-'+str(i);value['profile']['credits']+=i*111;value['title']='Patch slot '+str(i)
   data[f'the-abyss-below-slot-{i}-v1']=json.dumps(value)
  for i in [1,2,3]:
   index=json.loads(data[INDEX]);index['active']=i;data[INDEX]=json.dumps(index);key=f'the-abyss-below-slot-{i}-v1';before=json.loads(data[key]);others={k:v for k,v in data.items() if 'slot-' in k and not k.startswith(key)}
   lc,lp,le=old_build(b,store=data);baseline=debug(lp);assert not le,le;lc.close()
   c,p,e2=build(b,store=data);d=debug(p)
   assert state(p)['paused'] and state(p)['slot']==i
   assert p.evaluate('AbyssDiagnostics.costs()')==prices
   for k in ['credits','crystals','upgrades','mineAmmo','weaponAmmo','achievements','stats']:assert d['saved'][k]==before['profile'][k],(i,k)
   # Compare with the same save normalised by the actual prior runtime, not
   # omitted/default-only JSON fields (legacyLayout, crystalTopUp, recorderDepths).
   assert d['campaignLevels']==baseline['campaignLevels'],i
   for k in ['x','y','cargo','hull','battery','oxygen','weaponAmmo','mineAmmo']:assert d['player'][k]==before['activeDive']['player'][k],(i,k)
   for k,v in others.items():assert store(p)[k]==v,(i,k)
   assert not e+e2,e+e2;c.close()
  print('PASS actual v0.17 saves in all three slots preserve resources, regeneration state, active dive, stock, achievements and all credit/crystal prices',flush=True)
  # Native Web Audio: scheduling evidence, signal, rapid resume and preview isolation.
  c,p,e=build(b,launch=False)
  p.evaluate('''()=>{const Native=AudioContext;window.audioStops=[];window.suspends=[];window.loopProbes=[];window.gainProbes=[];window.audioSchedule=[];
   window.AudioContext=class extends Native{
    constructor(...args){super(...args);window.ac=this;}
    createGain(){const g=super.createGain(),id=gainProbes.length;gainProbes.push(g);const ramp=g.gain.linearRampToValueAtTime.bind(g.gain);g.gain.linearRampToValueAtTime=(v,t)=>{audioSchedule.push({id,v,t,now:this.currentTime});return ramp(v,t)};return g;}
    createOscillator(){const n=super.createOscillator(),stop=n.stop.bind(n);n.stop=(at)=>{audioStops.push({at:at??this.currentTime,now:this.currentTime});return stop(at)};return n;}
    createBufferSource(){const n=super.createBufferSource(),start=n.start.bind(n);n.start=(...args)=>{if(n.loop&&n.buffer?.duration>10){loopProbes.push({source:n,ended:false});const item=loopProbes.at(-1);n.addEventListener('ended',()=>item.ended=true)}return start(...args)};return n;}
    createDynamicsCompressor(){const n=super.createDynamicsCompressor(),a=super.createAnalyser(),connect=n.connect.bind(n);a.fftSize=2048;window.signal=a;n.connect=d=>{connect(a);a.connect(d);return d};return n;}
    suspend(){suspends.push({t:this.currentTime,output:AbyssAudio.status().outputGain});return super.suspend();}
   };}''')
  assert p.evaluate('AbyssAudio.status().state')=='not-started'
  p.locator('#startBtn').click();p.evaluate('AbyssDiagnostics.unfreeze();AbyssDiagnostics.audioFrame()');p.wait_for_timeout(700)
  p.evaluate('AbyssAudio.event("sonar");audioStops=[];audioSchedule=[]')
  p.locator('#focusPauseBtn').click();p.wait_for_timeout(650)
  a=p.evaluate('AbyssAudio.status()');assert a['state']=='running' and a['musicMode']=='pause' and a['musicPlaying'] and a['musicDuration']==40,a
  assert a['worldMuted'] and a['worldGain']==0 and not p.evaluate('suspends.length'),a
  stops=p.evaluate('audioStops');assert stops and all(s['at']-s['now']>=.35 for s in stops),stops
  ramps=p.evaluate('audioSchedule');assert any(r['id']==3 and r['v']==0 and .37<r['t']-r['now']<.4 for r in ramps),ramps
  before=state(p);p.wait_for_timeout(300);after=state(p)
  assert all(before[k]==after[k] for k in ['x','y','hull','oxygen','battery'])
  loops=p.evaluate('''()=>loopProbes.map(({source:s})=>{const a=s.buffer.getChannelData(0);let sum=0,peak=0;for(const v of a){sum+=v*v;peak=Math.max(peak,Math.abs(v))}return {duration:s.buffer.duration,peak,rms:Math.sqrt(sum/a.length),seam:Math.abs(a[0]-a.at(-1))}})''')
  pause=next(l for l in loops if l['duration']==40);assert pause['rms']>.001 and pause['peak']<.2 and pause['seam']<.01,pause
  peak=p.evaluate('''()=>{const a=new Float32Array(2048);signal.getFloatTimeDomainData(a);return Math.max(...a.map(Math.abs))}''');assert peak>1e-5,peak
  # Repeated scene refresh must not allocate additional themes.
  n=p.evaluate('loopProbes.length');p.evaluate('for(let i=0;i<100;i++)AbyssDiagnostics.audioFrame()');assert p.evaluate('loopProbes.length')==n
  p.evaluate('Object.defineProperty(document,"hidden",{configurable:true,value:true});AbyssDiagnostics.audioFrame()');assert p.evaluate('AbyssAudio.status().suspendPending')
  p.wait_for_timeout(380);assert p.evaluate('AbyssAudio.status().state')=='suspended'
  assert p.evaluate('suspends.at(-1).output')==0
  p.evaluate('Object.defineProperty(document,"hidden",{configurable:true,value:false})');p.locator('#resumeBtn').click();p.wait_for_timeout(150)
  for _ in range(3):
   p.evaluate('AbyssAudio.suspend()');p.wait_for_timeout(35);p.evaluate('AbyssAudio.unlock();AbyssDiagnostics.audioFrame()');p.wait_for_timeout(50)
  p.wait_for_timeout(650);assert p.evaluate('AbyssAudio.status().state')=='running' and not p.evaluate('AbyssAudio.status().suspendPending')
  assert not p.evaluate('AbyssAudio.status().musicPlaying') and p.evaluate('loopProbes.filter(x=>!x.ended).length')==0
  p.locator('#focusPauseBtn').click();p.locator('#pauseAudioBtn').click();p.evaluate('AbyssAudio.configure({music:0,effects:.6,ambience:.5})');p.wait_for_timeout(650)
  p.locator('#audioTest').click();p.wait_for_timeout(90)
  previewPeak=p.evaluate('''()=>{const a=new Float32Array(2048);signal.getFloatTimeDomainData(a);return Math.max(...a.map(Math.abs))}''');assert previewPeak>1e-4,previewPeak
  assert p.evaluate('AbyssAudio.status().worldGain')==0
  p.evaluate('AbyssAudio.configure({muted:true})');p.wait_for_timeout(500)
  mutedPeak=p.evaluate('''()=>{const a=new Float32Array(2048);signal.getFloatTimeDomainData(a);return Math.max(...a.map(Math.abs))}''');assert mutedPeak<1e-5,mutedPeak
  assert not e,e
  report={'pause_loop':pause,'pause_signal_peak':peak,'preview_signal_peak':previewPeak,'muted_signal_peak':mutedPeak,'pause_stop_schedules':stops,'notes':'Real Chromium Web Audio node/time-domain checks. Not human listening or phone-speaker evidence.'}
  (ROOT/'verification/v0.17.1/pause-audio.json').write_text(json.dumps(report,indent=2)+'\n')
  c.close();b.close()
  print('PASS pause: .38s gameplay fade, no abrupt stops or context suspension, 40s stereo theme, quiet loop seam; background fades to zero before suspend; rapid resume cancels pending suspension; no duplicate music; independent sound preview and mute',flush=True)
if __name__=='__main__':run()
