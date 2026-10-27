/* Living Depths: original procedural audio, no downloads or permissions.
   Start/resume only after user input. Settings persist independently of campaigns. */
(() => {
  'use strict';
  const KEY='abyss-audio-v1', BUILD='0.14.0-living-depths-1';
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  let settings={effects:.5,ambience:.35,muted:false};
  try { const v=JSON.parse(localStorage.getItem(KEY)||'null'); if(v){
    for(const k of ['effects','ambience'])if(Number.isFinite(v[k]))settings[k]=clamp(v[k],0,1);
    settings.muted=v.muted===true;
  }} catch(_){}
  let context=null, master=null, fx=null, bed=null, engineGain=null, engine=null, motor=null, motorGain=null, waterGain=null, waterFilter=null;
  let unlocked=false, blocked=false, active=false, lastTick=0, lastThreat=-99,lastCreak=-99,lastEcho=-99;
  const voices=new Set();
  function ramp(param,value,seconds=.12){if(!param||!context)return;param.setTargetAtTime(value,context.currentTime,seconds);}
  function apply(){if(!context)return;ramp(master.gain,settings.muted?0:.65,.04);ramp(fx.gain,settings.effects,.04);ramp(bed.gain,settings.ambience,.08);}
  function init(){
    if(context)return true;
    const AudioContext=window.AudioContext||window.webkitAudioContext;
    if(!AudioContext){blocked=true;return false;}
    try{
      context=new AudioContext();master=context.createGain();fx=context.createGain();bed=context.createGain();
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
    for(const k of ['effects','ambience'])if(Number.isFinite(values[k]))settings[k]=clamp(values[k],0,1);
    if(typeof values.muted==='boolean')settings.muted=values.muted;
    try{localStorage.setItem(KEY,JSON.stringify(settings));}catch(_){}
    apply();return {...settings};
  }
  function tone(freq,endFreq,duration=.3,gain=.12,pan=0,type='sine',delay=0){
    if(!context||context.state!=='running'||settings.muted||voices.size>=28)return;
    const t=context.currentTime+delay,o=context.createOscillator(),g=context.createGain();
    o.type=type;o.frequency.setValueAtTime(Math.max(10,freq),t);o.frequency.exponentialRampToValueAtTime(Math.max(10,endFreq),t+duration);
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,gain),t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+duration);
    o.connect(g);let p=null;
    if(context.createStereoPanner){p=context.createStereoPanner();p.pan.value=clamp(pan,-1,1);g.connect(p);p.connect(fx);}else g.connect(fx);
    voices.add(o);o.onended=()=>{voices.delete(o);o.disconnect();g.disconnect();p?.disconnect();};o.start(t);o.stop(t+duration+.025);
  }
  function event(kind,pan=0){
    if(!unlocked||!context||context.state!=='running'||settings.muted)return;
    switch(kind){
      case 'sonar': tone(780,620,.52,.14,pan);tone(620,500,.48,.045,-pan,'sine',.22);break;
      case 'echo': if(context.currentTime-lastEcho>.13){lastEcho=context.currentTime;tone(1100,950,.13,.035,pan);}break;
      case 'pickup':tone(410,620,.15,.10,pan);tone(640,850,.18,.07,pan,'sine',.08);break;
      case 'recorder':tone(330,440,.35,.1,pan);tone(660,880,.4,.08,pan,'sine',.16);break;
      case 'mine':tone(210,95,.2,.14,pan,'triangle');break;
      case 'explosion':tone(100,24,.65,.25,pan,'triangle');tone(270,35,.32,.08,pan,'sawtooth');break;
      case 'damage':tone(140,55,.27,.16,pan,'triangle');break;
      case 'shield':tone(240,540,.22,.10,pan);break;
      case 'dock':[0,1,2].forEach((i)=>tone([330,440,660][i],[330,440,660][i],.34,.085,0,'sine',i*.12));break;
      case 'breach':tone(100,490,.5,.11,0,'triangle');break;
      case 'splash':tone(250,32,.7,.20,0,'triangle');tone(620,90,.4,.04,0);break;
      case 'lights':tone(170,310,.09,.035,0);break;
    }
  }
  function suspend(){
    active=false;
    if(!context)return;
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
  const status=()=>({buildId:BUILD,...settings,available:Boolean(window.AudioContext||window.webkitAudioContext),unlocked,state:context?.state||'not-started',blocked,voices:voices.size,active});
  window.AbyssAudio={unlock,event,tick,suspend,configure,settings:()=>({...settings}),status};
})();
