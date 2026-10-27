/* Arsenal & Archives: original procedural audio, no downloads or permissions.
   Start/resume only after user input. Settings persist independently of campaigns. */
(() => {
  'use strict';
  const KEY='abyss-audio-v1', BUILD='0.16.0-arsenal-archives-1';
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  let settings={effects:.5,ambience:.35,music:.3,muted:false};
  try { const v=JSON.parse(localStorage.getItem(KEY)||'null'); if(v){
    for(const k of ['effects','ambience','music'])if(Number.isFinite(v[k]))settings[k]=clamp(v[k],0,1);
    settings.muted=v.muted===true;
  }} catch(_){}
  let context=null, master=null, fx=null, bed=null, engineGain=null, engine=null, motor=null, motorGain=null, waterGain=null, waterFilter=null;
  let unlocked=false, blocked=false, active=false, lastTick=0, lastThreat=-99,lastCreak=-99,lastEcho=-99;
  const voices=new Set(),eventTimes=new Map();
  let noiseBuffer=null;const counts={};
  function ramp(param,value,seconds=.12){if(!param||!context)return;param.setTargetAtTime(value,context.currentTime,seconds);}
  function apply(){if(!context)return;ramp(master.gain,settings.muted?0:.65,.04);ramp(fx.gain,settings.effects,.04);ramp(bed.gain,settings.ambience,.08);ramp(musicBus?.gain,settings.music,.08);}
  function init(){
    if(context)return true;
    const AudioContext=window.AudioContext||window.webkitAudioContext;
    if(!AudioContext){blocked=true;return false;}
    try{
      context=new AudioContext();master=context.createGain();fx=context.createGain();bed=context.createGain();musicBus=context.createGain();musicBus.gain.value=settings.music;musicBus.connect(master);
      master.gain.value=0;fx.gain.value=settings.effects;bed.gain.value=settings.ambience;
      const limiter=context.createDynamicsCompressor();limiter.threshold.value=-18;limiter.knee.value=20;limiter.ratio.value=5;
      fx.connect(master);bed.connect(master);master.connect(limiter);limiter.connect(context.destination);
      engine=context.createOscillator();engine.type='sine';engine.frequency.value=45;
      engineGain=context.createGain();engineGain.gain.value=0;engine.connect(engineGain);engineGain.connect(bed);engine.start();
      motor=context.createOscillator();motor.type='triangle';motor.frequency.value=90;
      motorGain=context.createGain();motorGain.gain.value=0;motor.connect(motorGain);motorGain.connect(bed);motor.start();
      const buffer=context.createBuffer(1,Math.floor(context.sampleRate*3),context.sampleRate),data=buffer.getChannelData(0);
      let previous=0;for(let i=0;i<data.length;i++){previous=(previous+Math.random()*.04-.02)/1.02;data[i]=previous*3;}
      const noise=context.createBufferSource();noise.buffer=buffer;noise.loop=true;
      waterFilter=context.createBiquadFilter();waterFilter.type='lowpass';waterFilter.frequency.value=400;
      waterGain=context.createGain();waterGain.gain.value=0;noise.connect(waterFilter);waterFilter.connect(waterGain);waterGain.connect(bed);noise.start();
      apply();return true;
    }catch(_){blocked=true;return false;}
  }
  function unlock(){
    if(!init())return;
    unlocked=true;
    apply();
    if(context.state==='suspended')return context.resume().then(()=>{blocked=false;}).catch(()=>{blocked=true;});
    blocked=false;return Promise.resolve();
  }
  function configure(values){
    for(const k of ['effects','ambience','music'])if(Number.isFinite(values[k]))settings[k]=clamp(values[k],0,1);
    if(typeof values.muted==='boolean')settings.muted=values.muted;
    try{localStorage.setItem(KEY,JSON.stringify(settings));}catch(_){}
    apply();if(settings.muted||settings.music<=0)stopMusic();else setScene(musicMode);return {...settings};
  }
  function tone(freq,endFreq,duration=.3,gain=.12,pan=0,type='sine',delay=0,bus='effects'){
    if(!context||context.state!=='running'||settings.muted||voices.size>=28)return;
    const t=context.currentTime+delay,o=context.createOscillator(),g=context.createGain();
    o.type=type;o.frequency.setValueAtTime(Math.max(10,freq),t);o.frequency.exponentialRampToValueAtTime(Math.max(10,endFreq),t+duration);
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,gain),t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+duration);
    o.connect(g);let p=null;
    if(context.createStereoPanner){p=context.createStereoPanner();p.pan.value=clamp(pan,-1,1);g.connect(p);p.connect(bus==='ambience'?bed:fx);}else g.connect(bus==='ambience'?bed:fx);
    voices.add(o);o.onended=()=>{voices.delete(o);o.disconnect();g.disconnect();p?.disconnect();};o.start(t);o.stop(t+duration+.025);
  }
  // Shared noise texture, filtered per event. No decoded assets, network or per-tick buffers.
  function noise(duration,gain,pan=0,frequency=600,type='lowpass',delay=0,bus='effects'){
    if(!context||context.state!=='running'||settings.muted||voices.size>=24)return;
    if(!noiseBuffer){noiseBuffer=context.createBuffer(1,Math.floor(context.sampleRate*2.4),context.sampleRate);const data=noiseBuffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;}
    const source=context.createBufferSource(),filter=context.createBiquadFilter(),g=context.createGain(),t=context.currentTime+delay;
    source.buffer=noiseBuffer;filter.type=type;filter.frequency.value=frequency;filter.Q.value=.65;
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,gain),t+Math.min(.08,duration/4));g.gain.exponentialRampToValueAtTime(.0001,t+duration);
    source.connect(filter);filter.connect(g);let p=null;
    if(context.createStereoPanner){p=context.createStereoPanner();p.pan.value=clamp(pan,-1,1);g.connect(p);p.connect(bus==='ambience'?bed:fx);}else g.connect(bus==='ambience'?bed:fx);
    voices.add(source);source.onended=()=>{voices.delete(source);source.disconnect();filter.disconnect();g.disconnect();p?.disconnect();};source.start(t);source.stop(t+duration+.03);
  }
  function event(kind,pan=0,intensity=1){
    if(!unlocked||!context||context.state!=='running'||settings.muted||voices.size>=24)return;
    const gaps={echo:.14,chain:2.5,ventWarning:1.6,ventErupt:.7,harbour:4,wreckGroan:5,kelp:1.5,schoolRush:2.5,derelictBlast:.10};
    const now=context.currentTime;
    if(now-(eventTimes.get(kind)??-100)<(gaps[kind]??.035))return;
    eventTimes.set(kind,now);counts[kind]=(counts[kind]||0)+1;
    const strength=clamp(intensity,0,1),variation=.96+Math.random()*.08;
    const play=(f,e,d,g,p=pan,type='sine',delay=0,bus='effects')=>tone(f*variation,e*variation,d,g*strength,p,type,delay,bus);
    const hiss=(d,g,f=600,type='lowpass',delay=0,bus='effects')=>noise(d,g*strength,pan,f,type,delay,bus);
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
  const musicBuffers=new Map();let musicMode='none',musicSource=null,musicVoiceGain=null,musicBus=null,musicNotes=0;
  function composeMusic(mode){
    if(musicBuffers.has(mode))return musicBuffers.get(mode);
    const rate=22050,beat=mode==='dock'?60/88:60/80,bars=8,length=bars*4*beat,n=Math.round(length*rate);
    const buffer=context.createBuffer(2,n,rate),L=buffer.getChannelData(0),R=buffer.getChannelData(1);
    const chords=mode==='dock'?[[60,64,67,71],[57,60,64,67],[53,57,60,64],[55,59,62,69]]:[[57,60,64,67],[53,57,60,64],[60,64,67,71],[55,59,62,69]];
    function note(midi,start,duration,amplitude,pan=0,pad=false){
      const frequency=440*Math.pow(2,(midi-69)/12),samples=Math.ceil(duration*rate),offset=Math.round(start*rate);
      const left=Math.sqrt((1-pan)/2),right=Math.sqrt((1+pan)/2);
      for(let i=0;i<samples;i++){
        const t=i/rate,phase=2*Math.PI*frequency*t;
        const envelope=pad?Math.min(1,t/.35)*Math.max(0,Math.min(1,(duration-t)/.65)):Math.min(1,t/.012)*Math.exp(-t*4/duration)*Math.min(1,(duration-t)/.12);
        const wave=Math.sin(phase)+(pad?.08:.22)*Math.sin(phase*2)+.035*Math.sin(phase*3);
        const v=wave*envelope*amplitude,k=(offset+i)%n;
        L[k]+=v*left;R[k]+=v*right;
        if(!pad){const echo=(k+Math.round(beat*.75*rate))%n;L[echo]+=v*right*.15;R[echo]+=v*left*.15;}
      }
      musicNotes++;
    }
    for(let bar=0;bar<bars;bar++){
      const chord=chords[bar%4],start=bar*4*beat;
      for(let j=0;j<3;j++)note(chord[j],start,4.4*beat,.022,(j-1)*.5,true);
      note(chord[0]-24,start,2.8*beat,.105,0);note(chord[0]-12,start+2*beat,1.7*beat,.045,-.1);
      const pattern=mode==='dock'?[0,2,1,3,2,1,3,2]:[0,2,3,1,2,0,3,2];
      for(let j=0;j<8;j++)note(chord[pattern[j]]+12,start+j*.5*beat,.95*beat,mode==='dock'?.074:.058,(j%3-1)*.24);
      if(bar%2===1){note(chord[2]+12,start+beat,1.8*beat,.042,.3);note(chord[1]+12,start+2.5*beat,1.4*beat,.038,-.3);}
    }
    musicBuffers.set(mode,buffer);return buffer;
  }
  function stopMusic(immediate=false){
    if(!context||!musicSource)return;
    const source=musicSource,gain=musicVoiceGain;musicSource=null;musicVoiceGain=null;
    try{gain.gain.cancelScheduledValues(context.currentTime);gain.gain.setValueAtTime(gain.gain.value,context.currentTime);gain.gain.linearRampToValueAtTime(0,context.currentTime+(immediate?.01:.3));source.stop(context.currentTime+(immediate?.02:.32));}catch(_){}
  }
  function setScene(mode){
    mode=['menu','dock'].includes(mode)?mode:'none';
    const changed=mode!==musicMode;musicMode=mode;
    if(!context||!unlocked)return;
    if(mode==='none'){if(musicSource)stopMusic();return;}
    // An interface is deliberately quiet underwater, but the menu/dock may resume
    // its own music after a user action without resuming the game simulation.
    ramp(engineGain.gain,0,.06);ramp(motorGain.gain,0,.06);ramp(waterGain.gain,0,.08);active=false;
    if(changed&&musicSource)stopMusic();
    if(settings.muted||settings.music<=0||context.state!=='running'||document.hidden)return;
    if(!musicSource){
      const source=context.createBufferSource(),g=context.createGain();source.buffer=composeMusic(mode);source.loop=true;
      g.gain.value=0;source.connect(g);g.connect(musicBus);source.onended=()=>{source.disconnect();g.disconnect();};
      source.start();g.gain.linearRampToValueAtTime(1,context.currentTime+.6);musicSource=source;musicVoiceGain=g;
    }
  }

  function suspend(){
    active=false;
    if(!context)return;
    stopMusic(true);
    ramp(engineGain.gain,0,.025);ramp(motorGain.gain,0,.025);ramp(waterGain.gain,0,.025);
    // Cancel queued notes as well as continuous sounds. No surprise echo on resume.
    for(const voice of voices){try{voice.stop();}catch(_){}}
    if(context.state==='running')context.suspend().catch(()=>{});
  }
  function tick(data){
    if(!context||!unlocked||context.state!=='running'||document.hidden)return;
    active=true;
    const now=context.currentTime;if(now-lastTick<.06)return;lastTick=now;
    const speed=clamp(data.speed/260,0,1.5),isAir=data.airborne===true;
    ramp(engine.frequency,38+speed*25+(data.boost?35:0),.2);
    ramp(motor.frequency,76+speed*60+(data.boost?100:0),.15);
    ramp(engineGain.gain,isAir?.018:data.quiet?.025:.035+speed*.035,.15);
    ramp(motorGain.gain,isAir?0:data.boost?.035:.008*speed,.13);
    ramp(waterGain.gain,isAir?.025:data.harbour?.035:.055+Math.min(1800,data.depth)*.000012,.3);
    ramp(waterFilter.frequency,isAir?1600:Math.max(150,480-data.depth*.15),.2);
    if(data.threat&&now-lastThreat>4.6){lastThreat=now;tone(95,70,.6,.09,data.pan||0,'triangle');tone(120,80,.5,.045,data.pan||0,'sine',.25);}
    if(data.pressure>.86&&!data.harbour&&now-lastCreak>9){lastCreak=now;tone(75,48,.9,.08,Math.sin(now),'triangle');}
  }
  const status=()=>({buildId:BUILD,...settings,available:Boolean(window.AudioContext||window.webkitAudioContext),unlocked,state:context?.state||'not-started',blocked,voices:voices.size,active,eventCounts:{...counts},maxVoices:28,musicMode,musicPlaying:Boolean(musicSource),musicNotes,musicDuration:musicSource?.buffer?.duration||0});
  window.AbyssAudio={unlock,event,tick,suspend,setScene,configure,settings:()=>({...settings}),status};
})();
