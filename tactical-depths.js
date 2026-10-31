/* Tactical Depths: passive tuning, bounded cosmetic feedback and deterministic
 * trial scoring. Campaign integration lives in game.js. No currency mutations. */
(() => {
  'use strict';
  const buildId='0.26.0-tactical-depths-1';
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const MODS=Object.freeze([
    {id:'pursuit',name:'Pursuit Drive',tag:'PROPULSION',system:'engine',mark:2,benefit:'25% faster boost recharge',cost:'20% more boost power',effect:{recharge:1.25,boostPower:1.20}},
    {id:'quiet',name:'Quiet Propulsion',tag:'ACOUSTICS',system:'quiet',mark:2,benefit:'25% less cruising noise',cost:'8% lower cruising speed',effect:{noise:.75,speed:.92}},
    {id:'frame',name:'Reinforced Frame',tag:'STRUCTURE',system:'hull',mark:3,benefit:'15% more maximum hull health',cost:'20% slower acceleration and braking',effect:{health:1.15,response:.80}},
    {id:'survey',name:'Survey Processor',tag:'SENSORS',system:'sonar',mark:2,benefit:'35% longer sonar echoes',cost:'25% longer scan cooldown',effect:{echo:1.35,sonarCooldown:1.25}},
    {id:'recovery',name:'Recovery Rig',tag:'SALVAGE',system:'magnet',mark:2,benefit:'20% longer scrap magnet reach',cost:'30% more power per remote pickup',effect:{magnetRange:1.20,magnetPower:1.30}}
  ]);
  const COURSES=Object.freeze({
    precision:{name:'Precision Run',tag:'01 / PILOTING',description:'Thread eight ordered gates around fixed barriers and a sweeping buoy. Impacts add 5 seconds. Finish within 180 seconds.',limit:180,reward:'Verdigris'},
    weapons:{name:'Weapons Trial',tag:'02 / MARKSMANSHIP',description:'Destroy nine moving target rigs. Use cover, guided shots and splash damage. Score rewards speed and ammunition efficiency.',limit:120,reward:'Solar Amber'},
    survival:{name:'Survival Drill',tag:'03 / ENDURANCE',description:'Survive 90 seconds against three waves of mechanical hunters. Limited rounds, one repair and no oxygen drain.',limit:90,reward:'Ion Lilac'},
    practice:{name:'Free Practice',tag:'04 / YOUR BUILD',description:'Your fitted ship and tuning, with loaned rounds. USE at the cyan service pad restores the simulator. No score or rewards.',limit:0,reward:null}
  });
  const ACCENTS=Object.freeze({standard:{name:'Factory accent',color:null},verdigris:{name:'Verdigris',color:'#79f0c3',course:'precision'},solar:{name:'Solar Amber',color:'#ffc479',course:'weapons'},ion:{name:'Ion Lilac',color:'#c1a0ff',course:'survival'}});
  const base=()=>({health:1,speed:1,response:1,noise:1,recharge:1,boostPower:1,echo:1,sonarCooldown:1,magnetRange:1,magnetPower:1});
  const unlocked=(m,u)=>Boolean(m&&(u?.[m.system]||0)>=m.mark);
  function cleanSlots(value,u){
    const seen=new Set();return [0,1].map(i=>{const id=Array.isArray(value)?value[i]:null,m=MODS.find(m=>m.id===id);if(!unlocked(m,u)||seen.has(id))return null;seen.add(id);return id;});
  }
  function normalise(v,u){
    const records={};for(const id of ['precision','weapons','survival']){
      const r=v?.records?.[id];if(r&&Number.isFinite(r.score)&&r.score>=0&&r.score<=1000&&['bronze','silver','gold','complete'].includes(r.medal))
        records[id]={score:Math.round(r.score),medal:r.medal,seconds:clamp(Number(r.seconds)||0,0,600),attempts:clamp(Math.floor(Number(r.attempts)||1),1,1e6),date:typeof r.date==='string'?r.date.slice(0,32):''};
    }
    const out={version:1,slots:cleanSlots(v?.slots,u),records,accent:'standard',presets:[null,null,null]};
    const allowed=id=>ACCENTS[id]&&(!ACCENTS[id].course||records[ACCENTS[id].course]?.medal==='gold');
    if(allowed(v?.accent))out.accent=v.accent;
    out.presets=[0,1,2].map(i=>{
      const p=v?.presets?.[i];if(!p||typeof p.name!=='string')return null;
      return {name:p.name.trim().slice(0,28)||'Configuration '+(i+1),slots:cleanSlots(p.slots,u),finish:typeof p.finish==='string'?p.finish.slice(0,40):'standard',accent:allowed(p.accent)?p.accent:'standard'};
    });return out;
  }
  function modifiers(slots,u){const out=base();for(const id of cleanSlots(slots,u)){const m=MODS.find(m=>m.id===id);if(m)for(const [k,v]of Object.entries(m.effect))out[k]*=v;}return out;}
  function result(id,{elapsed=0,collisions=0,shots=0,hull=0,maxHull=1,repairs=0,kills=0,complete=false}={}){
    if(!complete||id==='practice')return {score:0,medal:'unrated',seconds:elapsed,complete:false};
    let score=0;
    if(id==='precision')score=clamp(1000-(elapsed+collisions*5)*7,0,1000);
    if(id==='weapons')score=clamp(1000-elapsed*4-shots*6,0,1000);
    if(id==='survival')score=clamp(350+400*clamp(hull/maxHull,0,1)+kills*20-repairs*60,0,1000);
    score=Math.round(score);return {score,medal:score>=750?'gold':score>=500?'silver':score>=250?'bronze':'complete',seconds:elapsed,complete:true};
  }
  const SETTINGS_KEY='abyss-combat-presentation-v1';
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  let settings={numbers:false,shake:reduced?0:.35,density:'full'};
  try{const s=JSON.parse(localStorage.getItem(SETTINGS_KEY)||'null');if(s){settings.numbers=s.numbers===true;settings.shake=Number.isFinite(s.shake)?clamp(s.shake,0,1):settings.shake;settings.density=['full','balanced','low'].includes(s.density)?s.density:'full';}}catch(_){}
  function setSettings(next){settings={...settings,...next};settings.numbers=settings.numbers===true;settings.shake=clamp(Number(settings.shake)||0,0,1);if(!['full','balanced','low'].includes(settings.density))settings.density='full';try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings));return true;}catch(_){return false;}}
  const density=()=>settings.density==='low'?.32:settings.density==='balanced'?.6:1;
  function feedback(){
    let particles=[],numbers=[],direction=[],shakeEvents=[],shots={railgun:-100,torpedo:-100,mine:-100};
    function shot(kind,time){shots[kind]=time;}
    function impact(x,y,time,amount,armoured=false){
      const n=Math.ceil((armoured?8:6)*density());
      for(let i=0;i<n;i++){const a=i*2.399963+time*.7;particles.push({x,y,birth:time,vx:Math.cos(a)*(25+i*7),vy:Math.sin(a)*(25+i*7),color:armoured?'#ffbf85':'#a5f0ef',life:.32+i*.025});}
      if(settings.numbers)numbers.push({x,y,birth:time,text:(armoured?'ARMOUR ':'')+Math.round(amount),armoured});
      particles=particles.slice(-140);numbers=numbers.slice(-24);
    }
    function incoming(player,source,time){if(source&&Number.isFinite(source.x)&&Number.isFinite(source.y)){direction.push({angle:Math.atan2(source.y-player.y,source.x-player.x),birth:time});direction=direction.slice(-5);} }
    function shake(time,strength=1){shakeEvents.push({birth:time,strength});shakeEvents=shakeEvents.slice(-5);}
    function offset(time){const level=shakeEvents.reduce((n,e)=>n+Math.max(0,1-(time-e.birth)/.32)*e.strength,0)*settings.shake;return {x:Math.sin(time*83)*Math.min(3,level),y:Math.cos(time*69)*Math.min(2,level)};}
    function drawWorld(c,time){
      particles=particles.filter(p=>time-p.birth<p.life&&time>=p.birth);numbers=numbers.filter(p=>time-p.birth<.9&&time>=p.birth);
      c.save();for(const p of particles){const age=time-p.birth;c.globalAlpha=1-age/p.life;c.strokeStyle=p.color;c.lineWidth=1;c.beginPath();const x=p.x+p.vx*age,y=p.y+p.vy*age;c.moveTo(x,y);c.lineTo(x-p.vx*.035,y-p.vy*.035);c.stroke();}c.restore();
    }
    function drawInstruments(c,time,player,camera,visible){
      c.save();if(settings.numbers)for(const n of numbers){if(!visible(n))continue;const age=time-n.birth;if(age<0||age>.9)continue;c.globalAlpha=1-age/.9;c.fillStyle=n.armoured?'#ffbe89':'#bbfff0';c.textAlign='center';c.font='bold 11px monospace';c.fillText(n.text,n.x-camera.x,n.y-camera.y-30-age*28);}
      direction=direction.filter(d=>time-d.birth<.65&&time>=d.birth);for(const d of direction){c.globalAlpha=(1-(time-d.birth)/.65)*.85;c.strokeStyle='#ff8b85';c.lineWidth=2;c.beginPath();c.arc(player.x-camera.x,player.y-camera.y,49,d.angle-.22,d.angle+.22);c.stroke();}c.restore();
    }
    return {shot,impact,incoming,shake,offset,drawWorld,drawInstruments,shots:()=>({...shots}),reset:()=>{particles=[];numbers=[];direction=[];shakeEvents=[];shots={railgun:-100,torpedo:-100,mine:-100};},debug:()=>({particles:particles.length,numbers:numbers.length,directions:direction.length})};
  }
  window.AbyssTactical=Object.freeze({buildId,mods:MODS,courses:COURSES,accents:ACCENTS,unlocked,cleanSlots,normalise,modifiers,result,settings:()=>({...settings}),setSettings,density,feedback});
})();
