/* Crystal Descent: original procedural audio, no downloads or permissions.
   Start/resume only after user input. Settings persist independently of campaigns. */
(() => {
  'use strict';
  const KEY='abyss-audio-v1', BUILD='0.17.4-crystal-descent-1';
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  let settings={effects:.5,ambience:.35,music:.3,muted:false};
  try { const v=JSON.parse(localStorage.getItem(KEY)||'null'); if(v){
    for(const k of ['effects','ambience','music'])if(Number.isFinite(v[k]))settings[k]=clamp(v[k],0,1);
    settings.muted=v.muted===true;
  }} catch(_){}
  let context=null, master=null, fx=null, bed=null, worldGain=null, lifecycleGain=null, previewFx=null, engineGain=null, engine=null, motor=null, motorGain=null, waterGain=null, waterFilter=null;
  let unlocked=false, blocked=false, active=false, lastTick=0, lastThreat=-99,lastCreak=-99,lastEcho=-99;
  const voices=new Set(),voiceGains=new Map(),eventTimes=new Map();
  let suspensionRequested=false,suspendTimer=null,lifecycleToken=0,worldMuted=null,resumePending=null;
  // Pause crossfades on the audio clock. Stop/suspend only AFTER reaching zero.
  const PAUSE_FADE=.38,BACKGROUND_FADE=.22;
  const automationTargets=new WeakMap();
  function hold(param,now){
    // Cancel the old ENDPOINT too. Otherwise a quick resume can leave a pause
    // ramp scheduled to mute the engine later, after thrust has already resumed.
    const value=param.value;
    if(typeof param.cancelAndHoldAtTime==='function')param.cancelAndHoldAtTime(now);
    else param.cancelScheduledValues(now);
    // Explicitly anchor the rendered value: in Chromium, switching a running
    // setTarget envelope directly to a linear ramp can otherwise snap to zero.
    param.setValueAtTime(value,now);
  }
  function fade(param,target,seconds=.3){
    if(!param||!context)return;
    const now=context.currentTime;
    hold(param,now);param.linearRampToValueAtTime(target,now+seconds);
    automationTargets.set(param,{kind:'fade',target});
  }
  function releaseVoices(seconds=PAUSE_FADE){
    for(const voice of voices){
      fade(voiceGains.get(voice)?.gain,0,seconds);
      try{voice.stop(context.currentTime+seconds+.025);}catch(_){}
    }
  }
  let noiseBuffer=null;const counts={};
  function ramp(param,value,seconds=.12){
    if(!param||!context)return;
    const previous=automationTargets.get(param);
    if(previous?.kind==='target'&&previous.target===value&&previous.seconds===seconds)return;
    const now=context.currentTime;hold(param,now);param.setTargetAtTime(value,now,seconds);
    automationTargets.set(param,{kind:'target',target:value,seconds});
  }
  function apply(){if(!context)return;ramp(master.gain,settings.muted?0:.65,.04);ramp(fx.gain,settings.effects,.04);ramp(previewFx?.gain,settings.effects,.04);ramp(bed.gain,settings.ambience,.08);ramp(musicBus?.gain,settings.music,.08);}
  function init(){
    if(context)return true;
    const AudioContext=window.AudioContext||window.webkitAudioContext;
    if(!AudioContext){blocked=true;return false;}
    try{
      context=new AudioContext();master=context.createGain();fx=context.createGain();bed=context.createGain();worldGain=context.createGain();lifecycleGain=context.createGain();previewFx=context.createGain();musicBus=context.createGain();musicBus.gain.value=settings.music;musicBus.connect(master);
      master.gain.value=0;fx.gain.value=settings.effects;previewFx.gain.value=settings.effects;bed.gain.value=settings.ambience;worldGain.gain.value=1;lifecycleGain.gain.value=0;
      const limiter=context.createDynamicsCompressor();limiter.threshold.value=-18;limiter.knee.value=20;limiter.ratio.value=5;
      fx.connect(worldGain);bed.connect(worldGain);worldGain.connect(master);previewFx.connect(master);master.connect(lifecycleGain);lifecycleGain.connect(limiter);limiter.connect(context.destination);
      engine=context.createOscillator();engine.type='sine';engine.frequency.value=45;
      engineGain=context.createGain();engineGain.gain.value=0;engine.connect(engineGain);engineGain.connect(bed);engine.start();
      motor=context.createOscillator();motor.type='triangle';motor.frequency.value=90;
      motorGain=context.createGain();motorGain.gain.value=0;motor.connect(motorGain);motorGain.connect(bed);motor.start();
      const n=Math.floor(context.sampleRate*3),join=Math.floor(context.sampleRate*.15);
      const buffer=context.createBuffer(1,n,context.sampleRate),data=buffer.getChannelData(0),raw=new Float32Array(n+join);
      let previous=0;for(let i=0;i<raw.length;i++){previous=(previous+Math.random()*.04-.02)/1.02;raw[i]=previous*3;}
      data.set(raw.subarray(0,n));
      // Overlap the tail's continuation into the head. The loop boundary is now
      // two adjacent filtered-noise samples, not unrelated endpoints. No dip to silence.
      for(let i=0;i<join;i++){const mix=.5-.5*Math.cos(Math.PI*i/(join-1));data[i]=raw[n+i]*(1-mix)+raw[i]*mix;}
      const noise=context.createBufferSource();noise.buffer=buffer;noise.loop=true;
      waterFilter=context.createBiquadFilter();waterFilter.type='lowpass';waterFilter.frequency.value=400;
      waterGain=context.createGain();waterGain.gain.value=0;noise.connect(waterFilter);waterFilter.connect(waterGain);waterGain.connect(bed);noise.start();
      apply();return true;
    }catch(_){blocked=true;return false;}
  }
  function unlock(){
    if(document.hidden||!init())return Promise.resolve();
    // Most pointer/key events are not audio lifecycle events. Never restart
    // fades or reapply mixer automation for an already-running context.
    if(unlocked&&context.state==='running'&&!suspensionRequested&&!blocked)return Promise.resolve();
    if(resumePending&&!suspensionRequested)return resumePending;
    unlocked=true;suspensionRequested=false;
    const token=++lifecycleToken;
    if(suspendTimer!==null){clearTimeout(suspendTimer);suspendTimer=null;}
    const ready=()=>{
      if(token!==lifecycleToken||suspensionRequested||document.hidden)return;
      blocked=false;apply();fade(lifecycleGain.gain,1,.2);setScene(musicMode);
    };
    if(context.state==='running'){ready();return Promise.resolve();}
    const pending=context.resume().then(ready).catch(()=>{blocked=true;}).finally(()=>{if(resumePending===pending)resumePending=null;});
    resumePending=pending;return pending;
  }
  function configure(values){
    for(const k of ['effects','ambience','music'])if(Number.isFinite(values[k]))settings[k]=clamp(values[k],0,1);
    if(typeof values.muted==='boolean')settings.muted=values.muted;
    try{localStorage.setItem(KEY,JSON.stringify(settings));}catch(_){}
    apply();if(settings.muted||settings.music<=0){cancelMusicRequest();stopMusic();}else setScene(musicMode);return {...settings};
  }
  function tone(freq,endFreq,duration=.3,gain=.12,pan=0,type='sine',delay=0,bus='effects'){
    if(!context||context.state!=='running'||settings.muted||voices.size>=28)return;
    const t=context.currentTime+.02+delay,o=context.createOscillator(),g=context.createGain();
    g.gain.value=0; // A delayed voice must remain silent if its attack is cancelled by pause.
    o.type=type;o.frequency.setValueAtTime(Math.max(10,freq),t);o.frequency.exponentialRampToValueAtTime(Math.max(10,endFreq),t+duration);
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,gain),t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+duration);g.gain.linearRampToValueAtTime(0,t+duration+.015);
    o.connect(g);let p=null;
    if(context.createStereoPanner){p=context.createStereoPanner();p.pan.value=clamp(pan,-1,1);g.connect(p);p.connect(bus==='ambience'?bed:bus==='preview'?previewFx:fx);}else g.connect(bus==='ambience'?bed:bus==='preview'?previewFx:fx);
    voices.add(o);voiceGains.set(o,g);o.onended=()=>{voices.delete(o);voiceGains.delete(o);o.disconnect();g.disconnect();p?.disconnect();};o.start(t);o.stop(t+duration+.025);
  }
  // Shared noise texture, filtered per event. No decoded assets, network or per-tick buffers.
  function noise(duration,gain,pan=0,frequency=600,type='lowpass',delay=0,bus='effects'){
    if(!context||context.state!=='running'||settings.muted||voices.size>=24)return;
    if(!noiseBuffer){noiseBuffer=context.createBuffer(1,Math.floor(context.sampleRate*2.4),context.sampleRate);const data=noiseBuffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;}
    const source=context.createBufferSource(),filter=context.createBiquadFilter(),g=context.createGain(),t=context.currentTime+.02+delay;
    g.gain.value=0;source.buffer=noiseBuffer;filter.type=type;filter.frequency.value=frequency;filter.Q.value=.65;
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,gain),t+Math.min(.08,duration/4));g.gain.exponentialRampToValueAtTime(.0001,t+duration);g.gain.linearRampToValueAtTime(0,t+duration+.015);
    source.connect(filter);filter.connect(g);let p=null;
    if(context.createStereoPanner){p=context.createStereoPanner();p.pan.value=clamp(pan,-1,1);g.connect(p);p.connect(bus==='ambience'?bed:bus==='preview'?previewFx:fx);}else g.connect(bus==='ambience'?bed:bus==='preview'?previewFx:fx);
    voices.add(source);voiceGains.set(source,g);source.onended=()=>{voices.delete(source);voiceGains.delete(source);source.disconnect();filter.disconnect();g.disconnect();p?.disconnect();};source.start(t);source.stop(t+duration+.03);
  }
  function event(kind,pan=0,intensity=1,preview=false){
    if(!unlocked||!context||context.state!=='running'||settings.muted||suspensionRequested||voices.size>=24)return;
    const gaps={echo:.14,chain:2.5,ventWarning:1.6,ventErupt:.7,harbour:4,wreckGroan:5,kelp:1.5,schoolRush:2.5,derelictBlast:.10};
    const now=context.currentTime;
    if(now-(eventTimes.get(kind)??-100)<(gaps[kind]??.035))return;
    eventTimes.set(kind,now);counts[kind]=(counts[kind]||0)+1;
    const strength=clamp(intensity,0,1),variation=.96+Math.random()*.08;
    const play=(f,e,d,g,p=pan,type='sine',delay=0,bus='effects')=>tone(f*variation,e*variation,d,g*strength,p,type,delay,preview||kind==='dock'?'preview':bus);
    const hiss=(d,g,f=600,type='lowpass',delay=0,bus='effects')=>noise(d,g*strength,pan,f,type,delay,preview||kind==='dock'?'preview':bus);
    switch(kind){
      case 'railgun':play(740,170,.16,.095,pan,'triangle');hiss(.09,.045,2400,'bandpass');break;
      case 'railHit':play(360,100,.12,.10,pan,'triangle');break;
      case 'torpedo':play(130,52,.35,.14,pan,'triangle');hiss(.3,.08,650);break;
      case 'torpedoHit':play(90,23,.75,.19,pan,'triangle');hiss(.65,.17,420);break;
      case 'sonar':play(780,620,.52,.14);play(620,500,.48,.045,-pan,'sine',.22);break;
      case 'echo':play(1100,950,.13,.035);break;
      case 'pickup':play(410,620,.15,.10);play(640,850,.18,.07,pan,'sine',.08);break;
      case 'recorder':play(330,440,.35,.1);play(660,880,.4,.08,pan,'sine',.16);break;
      case 'mine':play(210,95,.2,.14,pan,'triangle');hiss(.13,.07,1500,'bandpass');break;
      case 'explosion':play(100,24,.65,.25,pan,'triangle');hiss(.5,.2,450);break;
      case 'derelictBlast':play(68,20,1.15,.27,pan,'triangle');hiss(.9,.26,310);hiss(.43,.09,1850,'bandpass',.18);play(240,70,.38,.065,pan,'triangle',.3);break;
      case 'damage':play(140,55,.27,.16,pan,'triangle');hiss(.13,.08,1100,'bandpass');break;
      case 'shield':play(240,540,.22,.10);break;
      case 'dock':hiss(.24,.11,800,'bandpass');play(110,64,.2,.12,0,'triangle');[0,1,2].forEach(i=>play([330,440,660][i],[330,440,660][i],.34,.085,0,'sine',.13+i*.12));break;
      case 'breach':hiss(.55,.15,1800);play(100,490,.5,.09,0,'triangle');break;
      case 'splash':hiss(.9,.24,600);play(100,32,.7,.13,0,'triangle');break;
      case 'lights':play(170,310,.09,.035);break;
      // Spatial background details go through the ambience bus, not the effects slider.
      case 'chain':play(178,165,.6,.055,pan,'triangle',0,'ambience');play(420,330,.16,.022,pan,'sine',.24,'ambience');break;
      case 'ventWarning':hiss(.95,.085,440,'lowpass',0,'ambience');play(62,84,1.15,.045,pan,'sine',0,'ambience');break;
      case 'ventErupt':hiss(1.8,.18,720,'lowpass',0,'ambience');play(70,39,1.7,.055,pan,'triangle',0,'ambience');break;
      case 'kelp':hiss(.75,.045,1000,'bandpass',0,'ambience');break;
      case 'schoolRush':hiss(.33,.045,1600,'bandpass',0,'ambience');break;
      case 'wreckGroan':play(83,49,1.8,.055,pan,'triangle',0,'ambience');play(139,112,1.4,.024,pan,'sine',.2,'ambience');break;
      case 'harbour':play(54,54,1.6,.025,pan,'triangle',0,'ambience');play(220,196,.38,.019,pan,'sine',.4,'ambience');break;
    }
  }

  // Original eight-bar interface themes, rendered once into seamless stereo loops.
  // Rounded sine/triangle keys, a soft bass, and a restrained three-note pad.
  // All voices wrap into the loop buffer, including their release tails.
  const musicBuffers=new Map(),musicJobs=new Map();
  let musicMode='none',musicSource=null,musicVoiceGain=null,musicBus=null,musicNotes=0;
  let musicWorker=null,workerURL=null,workerFailed=false,pendingMusic=null,musicRequestId=0;
  let musicRenderMode='not-started';
  // Synthesis runs in a worker, never inside a button or scene handler. The
  // generator also provides a bounded, yielding fallback if workers are blocked.
  function* renderMusic(mode){
    const restful=mode==='pause',rate=22050,beat=restful?60/48:mode==='dock'?60/88:60/80,bars=8,length=bars*4*beat,n=Math.round(length*rate);
    const L=new Float32Array(n),R=new Float32Array(n);let notes=0;
    const chords=mode==='dock'?[[60,64,67,71],[57,60,64,67],[53,57,60,64],[55,59,62,69]]:[[57,60,64,67],[53,57,60,64],[60,64,67,71],[55,59,62,69]];
    function* note(midi,start,duration,amplitude,pan=0,pad=false){
      const frequency=440*Math.pow(2,(midi-69)/12),samples=Math.ceil(duration*rate),offset=Math.round(start*rate);
      const left=Math.sqrt((1-pan)/2),right=Math.sqrt((1+pan)/2);
      for(let i=0;i<samples;i++){
        if(i>0&&i%4096===0)yield;
        const t=i/rate,phase=2*Math.PI*frequency*t;
        const envelope=pad?Math.min(1,t/(restful?1.1:.35))*Math.max(0,Math.min(1,(duration-t)/(restful?1.7:.65))):Math.min(1,t/(restful?.08:.012))*Math.exp(-t*(restful?2.6:4)/duration)*Math.min(1,(duration-t)/(restful?.6:.12));
        const wave=Math.sin(phase)+(restful?.045:pad?.08:.22)*Math.sin(phase*2)+(restful?.012:.035)*Math.sin(phase*3);
        const v=wave*envelope*amplitude,k=(offset+i)%n;
        L[k]+=v*left;R[k]+=v*right;
        if(!pad){const echo=(k+Math.round(beat*.75*rate))%n;L[echo]+=v*right*.15;R[echo]+=v*left*.15;}
      }
      notes++;
    }
    for(let bar=0;bar<bars;bar++){
      const chord=chords[bar%4],start=bar*4*beat;
      if(restful){
        // Slow, warm suspended harmonies and a sparse rounded-key melody. No beat.
        for(let j=0;j<4;j++)yield* note(chord[j],start+j*.09,5.1*beat,.018,(j-1.5)*.34,true);
        yield* note(chord[0]-24,start,4.8*beat,.048,0,true);
        yield* note(chord[2]+12,start+.9*beat,2.9*beat,.041,-.24);
        if(bar%2===1)yield* note(chord[1]+12,start+2.6*beat,3.2*beat,.033,.27);
        continue;
      }
      for(let j=0;j<3;j++)yield* note(chord[j],start,4.4*beat,.022,(j-1)*.5,true);
      yield* note(chord[0]-24,start,2.8*beat,.105,0);yield* note(chord[0]-12,start+2*beat,1.7*beat,.045,-.1);
      const pattern=mode==='dock'?[0,2,1,3,2,1,3,2]:[0,2,3,1,2,0,3,2];
      for(let j=0;j<8;j++)yield* note(chord[pattern[j]]+12,start+j*.5*beat,.95*beat,mode==='dock'?.074:.058,(j%3-1)*.24);
      if(bar%2===1){yield* note(chord[2]+12,start+beat,1.8*beat,.042,.3);yield* note(chord[1]+12,start+2.5*beat,1.4*beat,.038,-.3);}
    }
    return {rate,L,R,notes};
  }
  function finishMusic(mode,result){
    const job=musicJobs.get(mode);if(!job)return;
    const buffer=context.createBuffer(2,result.L.length,result.rate);
    buffer.copyToChannel(result.L,0);buffer.copyToChannel(result.R,1);
    musicNotes+=result.notes;musicBuffers.set(mode,buffer);musicJobs.delete(mode);job.resolve(buffer);
  }
  function renderMusicFallback(mode){
    const job=musicJobs.get(mode);if(!job||job.fallback)return;
    job.fallback=true;musicRenderMode='yielding-fallback';const iterator=renderMusic(mode);
    const advance=()=>{
      if(!musicJobs.has(mode))return;
      try{
        const until=performance.now()+3;let result;
        do{result=iterator.next();if(result.done){finishMusic(mode,result.value);return;}}while(performance.now()<until);
        setTimeout(advance,0);
      }catch(error){musicJobs.delete(mode);job.reject(error);}
    };
    setTimeout(advance,0);
  }
  function failMusicWorker(){
    workerFailed=true;musicWorker?.terminate();musicWorker=null;
    if(workerURL){URL.revokeObjectURL(workerURL);workerURL=null;}
    for(const mode of musicJobs.keys())renderMusicFallback(mode);
  }
  function prepareMusic(mode){
    if(musicBuffers.has(mode))return Promise.resolve(musicBuffers.get(mode));
    if(musicJobs.has(mode))return musicJobs.get(mode).promise;
    let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});
    musicJobs.set(mode,{promise,resolve,reject,fallback:false});
    if(!workerFailed&&!musicWorker){
      try{
        const code='const renderMusic='+renderMusic.toString()+`;self.onmessage=({data:mode})=>{try{const it=renderMusic(mode);let result;do{result=it.next();}while(!result.done);const value=result.value;self.postMessage({mode,value},[value.L.buffer,value.R.buffer]);}catch(error){self.postMessage({mode,error:String(error)});}};self.postMessage({ready:true});`;
        workerURL=URL.createObjectURL(new Blob([code],{type:'text/javascript'}));musicWorker=new Worker(workerURL);musicRenderMode='worker';
        musicWorker.onmessage=({data})=>{
          if(data.ready){if(workerURL){URL.revokeObjectURL(workerURL);workerURL=null;}return;}
          if(data.error){renderMusicFallback(data.mode);return;}
          finishMusic(data.mode,data.value);
        };
        musicWorker.onerror=event=>{event.preventDefault();failMusicWorker();};
        musicWorker.onmessageerror=failMusicWorker;
      }catch(_){failMusicWorker();}
    }
    if(musicWorker)musicWorker.postMessage(mode);else renderMusicFallback(mode);
    return promise;
  }
  function cancelMusicRequest(){musicRequestId++;pendingMusic=null;}
  function requestMusic(mode){
    if(pendingMusic?.mode===mode)return;
    const id=++musicRequestId;pendingMusic={mode,id};
    prepareMusic(mode).then(buffer=>{
      if(id!==musicRequestId)return;
      pendingMusic=null;
      if(musicMode!==mode||settings.muted||settings.music<=0||suspensionRequested||document.hidden||context.state!=='running')return;
      // Keep the previous interface theme until its replacement is ready, then
      // crossfade on one audio-clock boundary. No stale asynchronous scene starts.
      stopMusic(.65);
      const source=context.createBufferSource(),g=context.createGain(),start=context.currentTime+.02;
      source.buffer=buffer;source.loop=true;g.gain.value=0;source.connect(g);g.connect(musicBus);
      source.onended=()=>{source.disconnect();g.disconnect();};
      g.gain.setValueAtTime(0,start);g.gain.linearRampToValueAtTime(mode==='pause'?.72:1,start+(mode==='pause'?1.1:.65));source.start(start);
      musicSource=source;musicVoiceGain=g;
    }).catch(()=>{if(id===musicRequestId){pendingMusic=null;musicRenderMode='unavailable';}});
  }
  function stopMusic(seconds=.4){
    if(!context||!musicSource)return;
    const source=musicSource,gain=musicVoiceGain;musicSource=null;musicVoiceGain=null;
    fade(gain.gain,0,seconds);
    try{source.stop(context.currentTime+seconds+.025);}catch(_){}
  }
  function setScene(mode){
    mode=['menu','dock','pause'].includes(mode)?mode:'none';
    const changed=mode!==musicMode;musicMode=mode;
    if(!context||!unlocked||suspensionRequested||document.hidden)return;
    const silenceWorld=mode!=='none';
    if(silenceWorld!==worldMuted){
      worldMuted=silenceWorld;
      fade(worldGain.gain,silenceWorld?0:1,PAUSE_FADE);
      if(silenceWorld){
        releaseVoices(PAUSE_FADE);
        fade(engineGain.gain,0,PAUSE_FADE);fade(motorGain.gain,0,PAUSE_FADE);fade(waterGain.gain,0,PAUSE_FADE);
      }
    }
    if(mode==='none'){if(changed||pendingMusic)cancelMusicRequest();if(musicSource)stopMusic(.45);return;}
    active=false;
    if(changed){cancelMusicRequest();requestMusicIfReady();}
    else if(!musicSource&&!pendingMusic)requestMusicIfReady();
    function requestMusicIfReady(){
      if(settings.muted||settings.music<=0||context.state!=='running')return;
      requestMusic(mode);
    }
  }
  function suspend(){
    active=false;
    if(!context||suspensionRequested)return;
    suspensionRequested=true;worldMuted=null;
    const token=++lifecycleToken;
    cancelMusicRequest();stopMusic(BACKGROUND_FADE);releaseVoices(BACKGROUND_FADE);
    fade(lifecycleGain.gain,0,BACKGROUND_FADE);
    fade(engineGain.gain,0,BACKGROUND_FADE);fade(motorGain.gain,0,BACKGROUND_FADE);fade(waterGain.gain,0,BACKGROUND_FADE);
    // The fade runs in Web Audio even if background timers are throttled. A new
    // gesture invalidates this timer; a stale suspend cannot silence a resumed dive.
    const silentAt=context.currentTime+BACKGROUND_FADE;
    const suspendWhenQuiet=()=>{
      suspendTimer=null;
      if(token!==lifecycleToken||!suspensionRequested||context.state!=='running')return;
      const remaining=silentAt-context.currentTime;
      if(remaining>0){suspendTimer=setTimeout(suspendWhenQuiet,Math.max(20,remaining*1000+20));return;}
      context.suspend().then(()=>{
        if(token!==lifecycleToken&&!suspensionRequested&&!document.hidden)context.resume().catch(()=>{blocked=true;});
      }).catch(()=>{});
    };
    suspendTimer=setTimeout(suspendWhenQuiet,(BACKGROUND_FADE+.06)*1000);
  }

  function tick(data){
    if(!context||!unlocked||context.state!=='running'||document.hidden||suspensionRequested||musicMode!=='none')return;
    active=true;
    const now=context.currentTime;if(now-lastTick<.06)return;lastTick=now;
    const speed=clamp(data.speed/260,0,1.5),isAir=data.airborne===true;
    ramp(engine.frequency,38+speed*25+(data.boost?35:0),.2);
    ramp(motor.frequency,76+speed*60+(data.boost?100:0),.15);
    ramp(engineGain.gain,isAir?.018:.018+speed*.045,.15);
    ramp(motorGain.gain,isAir?0:data.boost?.035:.008*speed,.13);
    ramp(waterGain.gain,isAir?.025:data.harbour?.035:.055+Math.min(1800,data.depth)*.000012,.3);
    ramp(waterFilter.frequency,isAir?1600:Math.max(150,480-data.depth*.15),.2);
    if(data.threat&&now-lastThreat>4.6){lastThreat=now;tone(95,70,.6,.09,data.pan||0,'triangle');tone(120,80,.5,.045,data.pan||0,'sine',.25);}
    if(data.pressure>.86&&!data.harbour&&now-lastCreak>9){lastCreak=now;tone(75,48,.9,.08,Math.sin(now),'triangle');}
  }
  const status=()=>({buildId:BUILD,...settings,available:Boolean(window.AudioContext||window.webkitAudioContext),unlocked,state:context?.state||'not-started',blocked,suspendPending:suspensionRequested,worldMuted,worldGain:worldGain?.gain.value??0,outputGain:lifecycleGain?.gain.value??0,voices:voices.size,active,eventCounts:{...counts},maxVoices:28,musicMode,musicPreparing:pendingMusic?.mode||null,musicRenderMode,musicPlaying:Boolean(musicSource),musicNotes,musicDuration:musicSource?.buffer?.duration||0});
  window.AbyssAudio={unlock,event,tick,suspend,setScene,configure,settings:()=>({...settings}),status};
})();
