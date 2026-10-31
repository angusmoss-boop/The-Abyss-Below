/* Tactical Depths. Additive, campaign-local ecology; no rewards, damage or loot.
 * World units are 10 per metre. Large animals are deliberately not combat actors.
 * All movement is bounded and swept through the same solid-water test as fish.
 */
(() => {
  'use strict';
  const buildId='0.26.0-tactical-depths-1',TAU=Math.PI*2,DAY=1200;
  const LEVELS=['sunbreak-shelf','glassbone-rift','drowned-gardens','midnight-cathedral','calypso-abyss'];
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const mix=(a,b,t)=>a+(b-a)*t,angle=(a,b,t)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;
  const finite=(v,min,max)=>Number.isFinite(v)&&v>=min&&v<=max;
  const number=(v,min,max,fallback=0)=>finite(v,min,max)?v:fallback;
  const copy=v=>JSON.parse(JSON.stringify(v));
  const SPECIES=Object.freeze([
    {id:'silver-dart',name:'Silver Darts',kind:'fish',index:0,color:'#b4e8f1',habitat:'Open shelves and rift passages',note:'A loose shoal becomes a silver ribbon when it turns. These fish alternate short feeding stops with brisk journeys between sheltered water.'},
    {id:'sunstripe',name:'Sunstripe Reeflets',kind:'fish',index:1,color:'#efb45e',habitat:'Coral edges and sheltered wrecks',note:'Round-bodied browsers with a surprising curiosity. A quiet vessel can attract a few visitors, but an engine burst ends the inspection.'},
    {id:'ribbonfin',name:'Ribbonfins',kind:'fish',index:2,color:'#67d8c5',habitat:'Kelp forests and flooded structures',note:'Their trailing fins make every turn a slow flourish. Individuals graze separately before the group reforms for its next journey.'},
    {id:'glassfish',name:'Violet Glassfish',kind:'fish',index:3,color:'#baa9ef',habitat:'Sheltered chambers in deep water',note:'The beam catches delicate, translucent flanks. Groups rest in shelter and occasionally accompany a passing gentle giant.'},
    {id:'glider',name:'Sailfin Glider',kind:'giant',color:'#70d9d2',habitat:'Open water across all five levels',note:'A broad, peaceful wanderer with flexible sail-like fins. It banks away from a noisy approach and sometimes tolerates a quiet submarine alongside. Never a weapon target.'},
    {id:'driftback',name:'Driftback',kind:'giant',color:'#91add3',habitat:'Open corridors of the Gardens and deeper levels',note:'Its low call reaches you before its ridged body emerges from the dark. A rare, unhurried traveller, unconcerned with the expedition except when disturbed. Never a weapon target.'},
    {id:'anemone',name:'Crown Anemones',kind:'benthos',index:0,color:'#d899be',habitat:'Sheltered rock faces',note:'A field of soft crowns retracts when a large shadow passes. Once the water settles, each animal ventures out at its own pace.'},
    {id:'fan-coral',name:'Current Fans',kind:'benthos',index:1,color:'#86b9cf',habitat:'Current-swept stone and wreck edges',note:'Branching fans bend with the local flow. Their slow movement reveals the direction of water before the instruments do.'},
    {id:'crab',name:'Crevice Crabs',kind:'benthos',index:2,color:'#d4ae7c',habitat:'Rock ledges and abandoned structures',note:'Briefly visible between cracks, these small scavengers retreat from approaching lights. Patience is better than pursuit.'},
    {id:'tube-colony',name:'Whisper Tubes',kind:'benthos',index:3,color:'#9ed2b9',habitat:'Quiet patches of the seabed',note:'Colonies withdraw in a gentle ripple as a submarine crosses overhead, then gradually unfold. They need no intervention from a visitor.'}
  ]);
  const ANIMALS=Object.freeze({glider:{radius:42,length:84,speed:30,name:'Sailfin Glider'},driftback:{radius:58,length:145,speed:21,name:'Driftback'}});
  const cleanCreature=c=>c&&ANIMALS[c.kind]&&typeof c.id==='string'&&c.id.length<70&&['x','y','homeX','homeY','goalX','goalY'].every(k=>finite(c[k],k.endsWith('Y')||k==='y'?75:-4700,k.endsWith('Y')||k==='y'?18120:5900));
  function normalise(value){
    const v=value?.version===1?value:{};
    const state={version:1,elapsed:number(v.elapsed,0,1e9),observations:{},levels:{}};
    for(const spec of SPECIES){const o=v.observations?.[spec.id];if(o&&finite(o.time,0,1e9)&&LEVELS.includes(o.levelId)&&finite(o.depth,0,1800))state.observations[spec.id]={time:o.time,levelId:o.levelId,depth:o.depth};}
    for(const id of LEVELS){const s=v.levels?.[id];if(!s||!Number.isInteger(s.seed))continue;
      state.levels[id]={seed:s.seed>>>0,creatures:(Array.isArray(s.creatures)?s.creatures:[]).filter(cleanCreature).slice(0,3).map(c=>({id:c.id,kind:c.kind,x:c.x,y:c.y,homeX:c.homeX,homeY:c.homeY,goalX:c.goalX,goalY:c.goalY,heading:number(c.heading,-1e6,1e6),phase:number(c.phase,0,TAU),pace:number(c.pace,0,80),fear:number(c.fear,0,1),goalTimer:number(c.goalTimer,0,180),callTimer:number(c.callTimer,0,200),swim:number(c.swim,0,1e9)}))};
    }
    return state;
  }
  function validateCampaign(campaign){
    const v=campaign?.living;if(v===undefined)return true;
    const fail=()=>{throw new Error('Invalid living-ocean state in campaign backup.');};
    if(!v||v.version!==1||!finite(v.elapsed,0,1e9)||!v.levels||!v.observations||typeof v.levels!=='object'||typeof v.observations!=='object')fail();
    if(Object.keys(v.levels).some(id=>!LEVELS.includes(id))||Object.keys(v.observations).some(id=>!SPECIES.some(s=>s.id===id)))fail();
    for(const [id,l] of Object.entries(v.levels))if(!l||!Number.isInteger(l.seed)||l.seed<0||l.seed>0xffffffff||!Array.isArray(l.creatures)||l.creatures.length>3||!l.creatures.every(cleanCreature)||new Set(l.creatures.map(c=>c.id)).size!==l.creatures.length)fail();
    for(const o of Object.values(v.observations))if(!o||!finite(o.time,0,1e9)||!LEVELS.includes(o.levelId)||!finite(o.depth,0,1800))fail();
    for(const l of Object.values(v.levels))for(const c of l.creatures)if(!['heading','phase','pace','fear','goalTimer','callTimer','swim'].every(k=>finite(c[k],-1e6,1e9)))fail();
    return true;
  }
  const colour=(a,b,t)=>a.map((v,i)=>Math.round(mix(v,b[i],t)));
  const rgb=a=>'rgb('+a.join(',')+')';
  function skyAt(elapsed){
    const phase=((elapsed/DAY+.29)%1+1)%1;
    const keys=[
      {p:0,top:[4,10,29],bottom:[23,46,67],water:[25,63,81],light:.25},
      {p:.20,top:[20,29,61],bottom:[155,132,146],water:[75,99,117],light:.50},
      {p:.30,top:[35,78,112],bottom:[145,207,211],water:[84,159,172],light:.95},
      {p:.55,top:[26,65,104],bottom:[127,190,204],water:[65,149,168],light:1},
      {p:.72,top:[42,34,79],bottom:[233,151,109],water:[139,115,128],light:.70},
      {p:.84,top:[10,18,43],bottom:[47,68,104],water:[43,79,113],light:.30},
      {p:1,top:[4,10,29],bottom:[23,46,67],water:[25,63,81],light:.25}
    ];
    let i=0;while(i<keys.length-2&&phase>keys[i+1].p)i++;
    const a=keys[i],b=keys[i+1],raw=clamp((phase-a.p)/(b.p-a.p),0,1),t=raw*raw*(3-2*raw);
    const segment=Math.floor(elapsed/240),local=elapsed%240,pattern=[0,.48,0,.9,.24,.65,0],from=pattern[((segment%pattern.length)+pattern.length)%pattern.length],to=pattern[(segment+1)%pattern.length],blend=clamp((local-205)/35,0,1);
    const rain=mix(from,to,blend*blend*(3-2*blend)),light=mix(a.light,b.light,t);
    return {phase,top:colour(a.top,b.top,t),bottom:colour(a.bottom,b.bottom,t),water:colour(a.water,b.water,t),light,rain,wind:.15+rain*.85,
      time:phase<.19||phase>.85?'NIGHT':phase<.32?'DAWN':phase<.66?'DAYLIGHT':phase<.82?'SUNSET':'DUSK',weather:rain<.12?'CALM':rain<.62?'LIGHT RAIN':'WIND & RAIN'};
  }
  function drawCreature(g,c,time=0,alpha=1){
    const spec=ANIMALS[c.kind];if(!spec)return;
    g.save();g.translate(c.x,c.y);g.rotate(c.heading||0);g.globalAlpha*=alpha;
    const sway=Math.sin(time*1.65+(c.phase||0)),fin=Math.sin(time*1.1+(c.phase||0));
    if(c.kind==='glider'){
      const body=g.createLinearGradient(0,-48,0,48);body.addColorStop(0,'#234c64');body.addColorStop(.45,'#43838b');body.addColorStop(.65,'#7bb7b1');body.addColorStop(1,'#193b55');
      g.fillStyle=body;g.strokeStyle='#a4d6ce99';g.lineWidth=1.1;
      g.beginPath();g.moveTo(53,0);g.bezierCurveTo(34,-17,9,-22,-18,-38-fin*9);g.quadraticCurveTo(-55,-57-fin*12,-72,-45-fin*8);g.quadraticCurveTo(-34,-17,-49,-4);g.quadraticCurveTo(-52,0,-49,4);g.quadraticCurveTo(-34,17,-72,45+fin*8);g.quadraticCurveTo(-55,57+fin*12,-18,38+fin*9);g.bezierCurveTo(9,22,34,17,53,0);g.fill();g.stroke();
      g.strokeStyle='#5c949b';g.lineWidth=3;g.beginPath();g.moveTo(-42,0);g.bezierCurveTo(-60,sway*6,-76,sway*12,-108,sway*17);g.stroke();
      for(const side of [-1,1]){g.strokeStyle='#a6d6cb55';g.lineWidth=.7;for(let j=0;j<4;j++){g.beginPath();g.moveTo(20-j*11,side*6);g.quadraticCurveTo(-2-j*12,side*(22+fin*4),-45-j*6,side*(32+fin*8-j*3));g.stroke();}g.fillStyle='#d6d6a0';g.beginPath();g.ellipse(34,side*8,2.2,1.7,0,0,TAU);g.fill();}
      g.strokeStyle='#b0d7ca55';g.beginPath();g.moveTo(43,0);g.lineTo(-37,0);g.stroke();
    }else{
      const body=g.createLinearGradient(0,-40,0,38);body.addColorStop(0,'#3f5e7b');body.addColorStop(.4,'#263f60');body.addColorStop(.8,'#52758e');body.addColorStop(1,'#97b6bc');g.fillStyle=body;g.strokeStyle='#9eb6c166';g.lineWidth=1.2;
      g.beginPath();g.moveTo(112,-4);g.bezierCurveTo(109,-35,46,-49,-31,-32);g.quadraticCurveTo(-69,-25,-91,-9);g.lineTo(-117,-8+sway*12);g.lineTo(-145,-36+sway*14);g.quadraticCurveTo(-136,-8+sway*14,-143,29+sway*14);g.lineTo(-117,8+sway*12);g.lineTo(-90,9);g.quadraticCurveTo(-40,37,23,33);g.bezierCurveTo(67,36,112,23,112,-4);g.fill();g.stroke();
      for(const side of [-1,1]){g.fillStyle='#385974';g.beginPath();g.moveTo(42,side*22);g.quadraticCurveTo(9,side*(54+fin*5),-31,side*(52+fin*7));g.lineTo(-10,side*27);g.closePath();g.fill();}
      for(let i=0;i<9;i++){g.strokeStyle=i%2?'#96b5ba44':'#172e4777';g.lineWidth=1.8;const x=74-i*15;g.beginPath();g.moveTo(x,-24);g.quadraticCurveTo(x-12,0,x-7,26);g.stroke();}
      g.fillStyle='#e0c59a';g.beginPath();g.arc(87,-10,2.4,0,TAU);g.fill();g.strokeStyle='#b6c8c657';g.beginPath();g.moveTo(110,8);g.quadraticCurveTo(88,19,72,16);g.stroke();
    }
    g.restore();
  }
  function create(api,state){
    let active=null,progress={},observationTick=0,harbourArrival=-1e9,lastHarbourMessage=-1e9;
    const soundTimers={};
    const radius=c=>ANIMALS[c.kind].radius;
    const clear=(x,y,r)=>api.clear(x,y,r);
    const bodyClear=(c,x,y,heading=c.heading)=>{
      const r=radius(c),long=c.kind==='driftback'?66:26,dx=Math.cos(heading)*long,dy=Math.sin(heading)*long;
      if(!clear(x,y,r)||!clear(x+dx,y+dy,r*.74)||!clear(x-dx,y-dy,r*.74))return false;
      // Keep animated wing tips and the complete trailing tail out of solids,
      // not merely the centre-line capsule used for steering.
      const cs=Math.cos(heading),sn=Math.sin(heading),probe=(u,v,size)=>clear(x+u*cs-v*sn,y+u*sn+v*cs,size);
      return c.kind==='glider'
        ? probe(-58,50,22)&&probe(-58,-50,22)&&probe(-96,0,24)
        : probe(-127,0,50)&&probe(100,0,15);
    };
    function findSite(kind,r){
      const n=api.levelIndex(),min=kind==='driftback'?Math.min(api.bottom()-600,4600):650;
      for(let i=0;i<750;i++){
        const y=mix(min,api.bottom()-300,r()),x=i%4===0?api.lane(y,i%3):mix(api.left(y)+150,api.right(y)-150,r()),heading=r()*TAU;
        const c={kind,heading};if(Math.hypot(x-api.harbour().x,y-api.harbour().y)<500||!bodyClear(c,x,y)||!clear(x,y,radius(c)+15))continue;
        // Require at least one usable stretch of open water, not a sealed pocket.
        if(![0,Math.PI/2,Math.PI,Math.PI*1.5].some(a=>clear(x+Math.cos(a)*130,y+Math.sin(a)*130,radius(c))))continue;
        return {x,y,heading};
      }return null;
    }
    function build(){
      const id=api.levelId(),seed=api.seed()>>>0;
      if(!state.levels[id]||state.levels[id].seed!==seed){
        const r=api.random(seed^0x4c495645),types=api.levelIndex()<2?['glider']:['glider','driftback'],creatures=[];
        for(const [i,kind] of types.entries()){const p=findSite(kind,r);if(p)creatures.push({id:kind+'-'+i,kind,...p,homeX:p.x,homeY:p.y,goalX:p.x,goalY:p.y,phase:r()*TAU,pace:0,fear:0,goalTimer:0,callTimer:12+r()*18,swim:r()*TAU});}
        state.levels[id]={seed,creatures};
      }
      active=state.levels[id];api.setCreatures(active.creatures);progress={};observationTick=0;
      // Existing coordinates are preserved unless a geometry migration obstructs them.
      for(const c of active.creatures)if(!bodyClear(c,c.x,c.y)){const p=findSite(c.kind,api.random(seed^7919));if(p)Object.assign(c,p,{homeX:p.x,homeY:p.y,goalX:p.x,goalY:p.y,pace:0});}
    }
    function emit(name,point,range,cooldown,intensity=1){
      const p=api.player();if(!p||!api.active())return;const d=Math.hypot(point.x-p.x,point.y-p.y),now=state.elapsed;
      if(d>range||now<(soundTimers[name]??-1e9))return;
      soundTimers[name]=now+cooldown;api.sound(name,clamp((point.x-p.x)/350,-1,1),intensity*clamp(1-d/range,.04,1));
    }
    function visible(o,r=0){
      const p=api.player();if(!p||!api.onScreen(o.x,o.y,r))return false;
      const lit=api.ambient(o.y)>.08&&Math.hypot(o.x-p.x,o.y-p.y)<Math.min(650,api.viewRadius())||api.inBeam(o.x,o.y,0);
      return lit&&api.line(p,o,0);
    }
    function observe(id,o,dt){
      if(state.observations[id])return;
      if(!visible(o))return;
      progress[id]=(progress[id]||0)+dt;
      if(progress[id]>=2){const spec=SPECIES.find(s=>s.id===id);state.observations[id]={levelId:api.levelId(),depth:api.depth(o.y),time:state.elapsed};delete progress[id];api.announce('FIELD NOTE · '+spec.name.toUpperCase(),2.7);api.event('Observed '+spec.name+' · read the Wildlife journal');emit('observation',o,700,2,.7);api.save();}
    }
    function chooseGoal(c){
      const t=state.elapsed+c.phase;
      for(let i=0;i<14;i++){
        const a=c.heading+Math.sin(t*.37+i*2.399)*(i<6?1.3:Math.PI),range=140+(i%3)*70;
        const x=c.x+Math.cos(a)*range,y=c.y+Math.sin(a)*range;
        if(Math.hypot(x-c.homeX,y-c.homeY)>700)continue;
        if(bodyClear(c,x,y,a)&&api.line(c,{x,y},20)){c.goalX=x;c.goalY=y;c.goalTimer=8+((i+c.phase)%7);return;}
      }c.goalX=c.homeX;c.goalY=c.homeY;c.goalTimer=3;
    }
    function updateCreature(c,dt){
      const p=api.player(),d=Math.hypot(c.x-p.x,c.y-p.y);
      // Distant wildlife is parked. No expensive off-camera route solving.
      if(d>Math.max(1000,api.viewRadius()+350))return;
      c.goalTimer-=dt;c.callTimer-=dt;c.swim+=dt;
      const alarm=d<(p.boosting?240:100),desiredFear=alarm?(p.boosting?1:.55):0;
      c.fear=mix(c.fear,desiredFear,1-Math.exp(-dt*(alarm?2.2:.35)));
      if(c.goalTimer<=0||Math.hypot(c.x-c.goalX,c.y-c.goalY)<40)chooseGoal(c);
      let goal=Math.atan2(c.goalY-c.y,c.goalX-c.x);
      if(c.fear>.2)goal=Math.atan2(c.y-p.y,c.x-p.x);
      // The nose and tail follow a swept capsule; turns in tight water slow down.
      let heading=angle(c.heading,goal,1-Math.exp(-dt*.72)),valid=false;
      for(const offset of [0,.3,-.3,.65,-.65,1.2,-1.2,Math.PI]){
        const a=heading+offset,x=c.x+Math.cos(a)*45,y=c.y+Math.sin(a)*45;
        if(bodyClear(c,x,y,a)&&bodyClear(c,c.x,c.y,a)){heading=a;valid=true;break;}
      }
      if(valid){const turn=angle(c.heading,heading,Math.min(1,dt*1.5));if(bodyClear(c,c.x,c.y,turn))c.heading=turn;else{valid=false;c.goalTimer=0;}}
      const speed=valid?ANIMALS[c.kind].speed*(1+c.fear*.7):0;c.pace=mix(c.pace,speed,1-Math.exp(-dt*1.2));
      const dx=Math.cos(c.heading)*c.pace*dt,dy=Math.sin(c.heading)*c.pace*dt,steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/4));
      for(let i=0;i<steps;i++){const x=c.x+dx/steps,y=c.y+dy/steps;if(bodyClear(c,x,y)){c.x=x;c.y=y;}else{c.pace=0;c.goalTimer=0;break;}}
      if(c.callTimer<=0){if(c.kind==='driftback')emit('driftbackCall',c,900,28);else if(d<170)emit('gliderPass',c,220,17,.45);c.callTimer=c.kind==='driftback'?36:22;}
    }
    function update(dt){
      if(!api.active()||!active||dt<=0)return;
      state.elapsed+=dt;for(const c of active.creatures)updateCreature(c,dt);
      observationTick+=dt;if(observationTick>=.2){const step=Math.min(.5,observationTick);observationTick=0;const before=new Set(Object.keys(progress)),seenNow=new Set();
        const record=(id,object)=>{if(seenNow.has(id))return;seenNow.add(id);observe(id,object,step);before.delete(id);};
        for(const c of active.creatures)if(visible(c))record(c.kind,c);
        for(const s of api.schools())if(s.fish?.length&&api.onScreen(s.x,s.y,180)){const seen=s.fish.find(f=>visible(f));if(seen){const id=SPECIES[s.species]?.id;if(id)record(id,seen);}}
        for(const b of api.benthos())if(b.retreat<.65&&visible(b)){const spec=SPECIES.find(s=>s.kind==='benthos'&&s.index===b.kind);if(spec)record(spec.id,b);}
        for(const id of before)progress[id]=Math.max(0,progress[id]-step*.5);
      }
      const sky=skyAt(state.elapsed),p=api.player();
      if(p.y<250&&sky.rain>.12)emit(p.airborne?'surfaceRain':'rainUnderwater',{x:p.x,y:70},450,4,sky.rain*.55);
      if(p.y<500&&Math.hypot(p.x-api.harbour().x,p.y-api.harbour().y)<440)emit('harbourLife',api.harbour(),500,18,.35);
    }
    function routine(s,dt,cx,cy){
      if(!api.active())return {pace:1};
      const p=api.player(),speed=Math.hypot(p.vx,p.vy),d=Math.hypot(cx-p.x,cy-p.y),t=state.elapsed;
      if(!s.routine){s.routine=['travelling','feeding','sheltering'][Math.floor(s.phase*10)%3];s.routineLeft=9+s.phase*3;s.routineSerial=0;s.restX=cx;s.restY=cy;}
      s.routineLeft-=dt;
      if(s.fear>.35){s.routine='startled';s.routineLeft=6;return {pace:1};}
      if(s.routine==='startled'){s.routine='regrouping';s.routineLeft=7;}
      if(s.routineLeft<=0){
        s.routineSerial=(s.routineSerial||0)+1;
        const modes=['feeding','travelling','sheltering','travelling'];s.routine=modes[(s.routineSerial+s.species)%modes.length];s.routineLeft=10+(Math.sin(s.phase+s.routineSerial)*.5+.5)*18;
        s.restX=cx;s.restY=cy;
        if(s.routine==='feeding'||s.routine==='sheltering'){
          const near=api.habitats().filter(o=>Math.hypot(o.x-cx,o.y-cy)<230).sort((a,b)=>Math.hypot(a.x-cx,a.y-cy)-Math.hypot(b.x-cx,b.y-cy)).slice(0,5);
          outer:for(const o of near)for(const a of [0,Math.PI/2,Math.PI,Math.PI*1.5]){const x=o.x+Math.cos(a)*((o.radius||45)+43),y=o.y+Math.sin(a)*((o.radius||45)+43);if(clear(x,y,18)&&api.line({x:cx,y:cy},{x,y},8)){s.restX=x;s.restY=y;break outer;}}
        }
      }
      // Only genuinely quiet, close approaches invite a few curious fish.
      if(speed<10&&!p.boosting&&d>75&&d<205&&s.fear<.2&&['travelling','feeding'].includes(s.routine))return {pace:.48,heading:Math.atan2(p.y-cy,p.x-cx),curious:true};
      const companion=active?.creatures.find(c=>Math.hypot(cx-c.x,cy-c.y)<260&&c.fear<.2);
      if(companion&&s.routine==='travelling')return {pace:1.05,heading:Math.atan2(companion.y-Math.sin(companion.heading)*45-cy,companion.x-Math.cos(companion.heading)*80-cx),companion:true};
      if(s.routine==='feeding'||s.routine==='sheltering'){
        const radius=s.routine==='feeding'?42:25,tx=s.restX+Math.cos(t*.08+s.phase)*radius,ty=s.restY+Math.sin(t*.10+s.phase)*radius*.55;
        return {pace:s.routine==='feeding'?.35:.21,heading:Math.atan2(ty-cy,tx-cx),browse:true};
      }
      return {pace:s.routine==='regrouping'?.65:1};
    }
    function idleIntent(enemy,intent,chase){
      if(chase||enemy.wreckId||enemy.tier==='warden'||enemy.aggression>.1||enemy.alertUntil>api.clock()||!api.active())return intent;
      const p=api.player();if(Math.hypot(enemy.x-p.x,enemy.y-p.y)>900)return intent;
      const phase=(state.elapsed+enemy.phase*13)%46;
      if(phase<6)return {x:enemy.x+Math.cos(enemy.phase)*4,y:enemy.y+Math.sin(enemy.phase)*4,speed:intent.speed*.15};
      if(phase>14&&phase<20){
        const s=api.schools().find(s=>Math.hypot(s.x-enemy.x,s.y-enemy.y)<220&&api.line(enemy,s,0));
        if(s)return {x:s.x,y:s.y,speed:Math.min(intent.speed*1.15,75)};
      }return intent;
    }
    function harbourPose(index,n,time){
      const h=api.harbour(),a=state.elapsed*.24+index*1.67,arrival=clamp(1-(state.elapsed-harbourArrival)/14,0,1);
      const routines=[{x:-160,y:45,rx:60,ry:30},{x:145,y:95,rx:24,ry:70},{x:-90,y:180,rx:45,ry:22},{x:105,y:10,rx:65,ry:30},{x:0,y:200,rx:70,ry:22}],r=routines[index%5];
      let x=h.x+r.x+Math.cos(a)*r.rx,y=h.y+r.y+Math.sin(a)*r.ry;
      if(arrival){x=mix(x,h.x-90+n*40,arrival*.65);y=mix(y,h.y+65+Math.sin(a)*12,arrival*.65);}
      return {x,y,heading:Math.atan2(Math.cos(a)*r.ry,-Math.sin(a)*r.rx)*.32,status:'rescued'};
    }
    function dock(real){
      if(!real)return;harbourArrival=state.elapsed;
      if(state.elapsed-lastHarbourMessage<90)return;
      const fleet=api.levelDefinitions().map((l,i)=>api.levels()[l.id]?.rescue?.done?i:null).filter(i=>i!==null);
      if(!fleet.length)return;lastHarbourMessage=state.elapsed;
      const i=fleet[Math.floor(state.elapsed/31)%fleet.length],names=['PIP','MICA','FERN','ECHO','NOVA'];
      const texts=[api.profile().upgrades.engine?'has inspected your thrusters. '+names[i]+' approves.':'reports: all propellers accounted for.','has checked the harbour machinery. Home is holding together.','has found a quiet patch beside the berth.','is listening. No distress calls from the kettle.','welcomes the expedition home.'];
      api.event(names[i]+' '+texts[i]);
    }
    function drawSky(g,cam,view){
      if(cam.y>=70)return;const sky=skyAt(state.elapsed),bottom=Math.min(70,cam.y+view.h);
      const grad=g.createLinearGradient(0,Math.min(-550,cam.y),0,70);grad.addColorStop(0,rgb(sky.top));grad.addColorStop(1,rgb(sky.bottom));g.fillStyle=grad;g.fillRect(cam.x,cam.y,view.w,bottom-cam.y);
      const centre=cam.x+view.w*.72,bodyY=-110-Math.sin(sky.phase*Math.PI)*80;
      g.save();g.globalAlpha=(1-sky.rain*.55)*.65;g.fillStyle=sky.light>.6?'#ffe2b5':'#c8dfeb';g.beginPath();g.arc(centre,bodyY,sky.light>.6?19:12,0,TAU);g.fill();g.restore();
      if(sky.light<.6)for(let x=Math.floor(cam.x/73)*73;x<cam.x+view.w+74;x+=73){g.fillStyle=`rgba(216,232,246,${(.6-sky.light)*(1-sky.rain)*1.1})`;g.fillRect(x,-70-Math.abs(Math.sin(x*.029))*440,1.2,1.2);}
      for(let layer=0;layer<2;layer++){g.fillStyle=layer?'#15334570':'#263d5270';g.beginPath();g.moveTo(cam.x,70);for(let x=cam.x;x<=cam.x+view.w+30;x+=24)g.lineTo(x,56-Math.abs(Math.sin(x*.004+layer)+Math.sin(x*.012))* (layer?13:25));g.lineTo(cam.x+view.w+30,70);g.closePath();g.fill();}
    }
    function drawWaterLight(g,cam,view){
      if(cam.y>1800)return;const sky=skyAt(state.elapsed),a=(1-sky.light)*.20;
      const grad=g.createLinearGradient(0,70,0,1500);grad.addColorStop(0,'rgba('+sky.water.join(',')+','+(.18+a)+')');grad.addColorStop(1,'rgba('+sky.water.join(',')+',0)');g.fillStyle=grad;g.fillRect(cam.x,Math.max(70,cam.y),view.w,Math.max(0,1500-Math.max(70,cam.y)));
    }
    function drawWeather(g,cam,view){
      const sky=skyAt(state.elapsed),t=state.elapsed;if(cam.y>230||cam.y+view.h< -600)return;
      g.save();g.beginPath();g.rect(cam.x,cam.y,view.w,Math.max(0,70-cam.y));g.clip();
      if(sky.rain>.05){g.strokeStyle=`rgba(189,220,236,${sky.rain*.32})`;g.lineWidth=.8;for(let i=0;i<85;i++){const x=cam.x+((i*137.117-t*(80+sky.wind*55))%view.w+view.w)%view.w,y=70-((i*53+t*240)%650);g.beginPath();g.moveTo(x,y);g.lineTo(x-3-sky.wind*4,y+12);g.stroke();}}
      g.restore();
      if(sky.rain>.05){g.strokeStyle=`rgba(184,226,233,${sky.rain*.24})`;g.lineWidth=.8;for(let i=0;i<25;i++){const age=(t*1.6+i*.71)%1,x=cam.x+(i*179.33)%view.w;g.beginPath();g.ellipse(x,73+Math.sin(i)*3,2+age*9,1+age*1.7,0,0,TAU);g.stroke();}}
    }
    function drawHarbour(g){
      const h=api.harbour(),sky=skyAt(state.elapsed),t=state.elapsed;
      g.save();g.translate(h.x,70);
      // Cabin windows warm at dusk; a tiny silhouette crosses behind the glass.
      g.save();g.beginPath();g.rect(-150,-72,59,17);g.clip();
      g.fillStyle=`rgba(255,195,110,${.10+(1-sky.light)*.66})`;g.fillRect(-150,-72,59,17);
      const worker=-157+((t*3)%82);g.fillStyle='#172b36';g.beginPath();g.arc(worker,-65,2.4,0,TAU);g.fill();g.fillRect(worker-2,-63,4,8);g.restore();
      g.strokeStyle='#1d4455';g.lineWidth=3;for(let x=-135;x<-92;x+=16){g.beginPath();g.moveTo(x,-73);g.lineTo(x,-54);g.stroke();}
      // Moving service arms stay outside the navigable central berth.
      const a=Math.sin(t*.3)*.18,welcome=clamp(1-(state.elapsed-harbourArrival)/14,0,1);
      for(const side of [-1,1]){g.save();g.scale(side,1);g.strokeStyle='#6c9fa8';g.lineWidth=3;g.beginPath();g.moveTo(105,50);g.lineTo(80,68+a*20);g.lineTo(66-welcome*12,83);g.stroke();g.fillStyle='#82e0ca';g.fillRect(63-welcome*12,81,7,4);g.restore();}
      const lift=18+Math.sin(t*.17)*13;g.strokeStyle='#88a5ad';g.lineWidth=1;g.beginPath();g.moveTo(79,-94);g.lineTo(79,-56+lift);g.stroke();g.fillStyle='#294b5e';g.strokeStyle='#7996a0';g.fillRect(71,-56+lift,16,11);g.strokeRect(71,-56+lift,16,11);
      if(sky.light<.7){for(const x of [-110,110]){const glow=g.createRadialGradient(x,48,2,x,48,70);glow.addColorStop(0,'rgba(105,226,210,'+(.09+(1-sky.light)*.12)+')');glow.addColorStop(1,'rgba(105,226,210,0)');g.fillStyle=glow;g.fillRect(x-70,-22,140,140);}}
      g.restore();
    }
    function draw(g){for(const c of api.sceneCreatures())if(api.onScreen(c.x,c.y,180))drawCreature(g,c,c.swim);}
    function drawEchoes(g){
      for(const c of api.sceneCreatures())if(c.revealUntil>api.clock()&&api.onScreen(c.x,c.y,180)&&!visible(c)){
        const fade=clamp((c.revealUntil-api.clock())/(c.echoDuration||4.5),0,.6);
        g.save();g.translate(c.x,c.y);g.rotate(c.heading);g.globalAlpha=fade;g.strokeStyle='#83c9cb';g.lineWidth=1;g.setLineDash([5,7]);
        g.beginPath();g.ellipse(0,0,c.kind==='driftback'?118:60,c.kind==='driftback'?37:47,0,0,TAU);g.stroke();g.restore();
      }
    }
    function journal(target){
      const known=Object.keys(state.observations).length,sky=skyAt(state.elapsed);
      target.innerHTML='<section class="field-guide"><header class="field-guide-intro"><div><span class="menu-kicker">NEREID / NATURAL HISTORY</span><h3>A world worth watching.</h3><p>Watch wildlife in clear light for a moment to record a field note. Sonar alone is not a sighting. No rewards, no capture, no grind.</p></div><div class="field-guide-count"><strong>'+known+'<small> / '+SPECIES.length+'</small></strong><span>OBSERVED</span></div></header><div class="field-guide-weather">'+sky.time+' <i></i> '+sky.weather+' <small>Campaign time · pauses with your dive</small></div><div class="field-guide-grid">'+SPECIES.map((s,i)=>{const o=state.observations[s.id];return '<article class="field-card '+(o?'observed':'unobserved')+'" style="--species:'+s.color+'"><div class="field-specimen"><canvas width="320" height="140" data-specimen="'+i+'" aria-label="'+(o?s.name:'Unrecorded wildlife silhouette')+'"></canvas><span>'+String(i+1).padStart(2,'0')+'</span></div><div class="field-card-copy"><span class="field-kind">'+(s.kind==='giant'?'PEACEFUL GIANT':s.kind==='fish'?'SHOAL LIFE':'SEABED LIFE')+'</span><h4>'+(o?s.name:'Unrecorded encounter')+'</h4><p>'+(o?s.note:'A patient observer sees more. Explore with your light on, then pause to look.')+'</p><footer>'+(o?api.levelDefinitions().find(l=>l.id===o.levelId)?.name+' · '+o.depth+' m':s.habitat)+'</footer></div></article>';}).join('')+'</div></section>';
      target.querySelectorAll('[data-specimen]').forEach(canvas=>{const s=SPECIES[+canvas.dataset.specimen],g=canvas.getContext('2d'),seen=state.observations[s.id];g.clearRect(0,0,320,140);g.save();g.translate(160,70);g.globalAlpha=seen?.85:.18;
        if(s.kind==='giant'){g.scale(s.id==='driftback'?.85:1,s.id==='driftback'?.85:1);drawCreature(g,{kind:s.id,x:0,y:0,heading:0,phase:1},2);}
        else if(s.kind==='fish'){for(let j=0;j<5;j++){g.save();g.translate((j-2)*48,Math.sin(j*2.4)*19);g.fillStyle=s.color;g.beginPath();if(s.index===1)g.ellipse(0,0,13,10,0,0,TAU);else if(s.index===3){g.moveTo(15,0);g.lineTo(0,-11);g.lineTo(-13,0);g.lineTo(0,11);g.closePath();}else g.ellipse(0,0,16,s.index===0?4:6,0,0,TAU);g.fill();g.beginPath();g.moveTo(-12,0);g.lineTo(-24,-7);g.lineTo(-22,7);g.closePath();g.fill();g.fillStyle='#031d30';g.beginPath();g.arc(8,-2,1.5,0,TAU);g.fill();g.restore();}}
        else{g.strokeStyle=s.color;g.fillStyle=s.color;g.lineWidth=2;
          if(s.index===2){g.beginPath();g.ellipse(0,4,26,16,0,0,TAU);g.fill();for(const side of [-1,1]){for(let j=0;j<4;j++){g.beginPath();g.moveTo(side*19,j*6-8);g.lineTo(side*(36+j*4),j*10-18);g.lineTo(side*(45+j*4),j*9-8);g.stroke();}g.beginPath();g.moveTo(side*18,-6);g.lineTo(side*39,-29);g.lineTo(side*32,-40);g.moveTo(side*39,-29);g.lineTo(side*49,-38);g.stroke();}}
          else if(s.index===3){for(let j=-3;j<=3;j++){const x=j*18,h=28+Math.sin(j*2)*12;g.strokeStyle='#778caa';g.lineWidth=6;g.beginPath();g.moveTo(x,30);g.lineTo(x,-h+18);g.stroke();g.strokeStyle=s.color;g.lineWidth=1.2;for(let k=-2;k<=2;k++){g.beginPath();g.moveTo(x,-h+18);g.quadraticCurveTo(x+k*6,-h,x+k*8,-h-6);g.stroke();}}}
          else{for(let j=0;j<11;j++){g.beginPath();g.moveTo((j-5)*(s.index?1:5),28);g.quadraticCurveTo((j-5)*14,-8,(j-5)*18,-25+Math.abs(j-5)*4);g.stroke();}g.beginPath();g.ellipse(0,29,35,7,0,0,TAU);g.fill();}
        }g.restore();});
    }
    return {build,update,routine,idleIntent,draw,drawEchoes,drawSky,drawWaterLight,drawWeather,drawHarbour,harbourPose,dock,journal,visible,bodyClear,
      sky:()=>skyAt(state.elapsed),state:()=>copy(state),creatures:()=>active?.creatures||[],resetObservation:()=>{progress={};},rules:()=>({daySeconds:DAY,observationSeconds:2,entries:SPECIES.length}),
      fixture:(values)=>{if(values.elapsed!==undefined)state.elapsed=values.elapsed;if(values.creatures){active.creatures=copy(values.creatures);api.setCreatures(active.creatures);}if(values.observations)state.observations=copy(values.observations);}};
  }
  window.AbyssLiving=Object.freeze({buildId,normalise,validateCampaign,create,species:SPECIES,animals:ANIMALS,skyAt,drawCreature});
})();
