(() => {
  'use strict';
  const BUILD = Object.freeze({version:'0.10.0',name:'Persistent Depths',id:'0.10.0-persistent-depths-1'});
  window.AbyssBuild=BUILD;
  const $ = id => document.getElementById(id);
  const canvas = $('gameCanvas');
  const ctx = canvas.getContext('2d');
  const radar = $('radarCanvas');
  const rctx = radar.getContext('2d');
  const TAU = Math.PI * 2;
  const THRUST = Object.freeze({normal:146,quiet:68,perMark:.17,maxMark:4});
  const normalSpeedAt = mark => THRUST.normal*(1+mark*THRUST.perMark);
  const MINES = Object.freeze({damage:[0,60,110,180,240],capacity:[0,2,4,6,8],
    armDelay:.65,deployCooldown:1.1,triggerRadius:52,blastRadius:108,radius:8});
  const roman = mark => ['0','I','II','III','IV'][mark]||String(mark);
  const BOOST = Object.freeze({capacities:[0,75,100,125,150],multipliers:[1,1.45,1.60,1.75,1.85],drain:25,recharge:12.5,rechargeDelay:1.5,powerPerSecond:7});
  const AMMO_PRICE = 12;
  const PREDATOR_SALVAGE = Object.freeze({common:2,apex:4,reaper:8});
  const SONAR = Object.freeze({waveSpeed:520,echoSeconds:4.5,cooldown:5.5});
  const LIGHTING = Object.freeze({blackoutDepth:1000,fadeExponent:1.35,bowOffset:30,nearHalfWidth:5});
  const FLASHLIGHT = Object.freeze([
    null,
    Object.freeze({length:260,halfAngle:.29,power:.04}),
    Object.freeze({length:360,halfAngle:.38,power:.055}),
    Object.freeze({length:480,halfAngle:.48,power:.075}),
    Object.freeze({length:620,halfAngle:.60,power:.10})
  ]);
  const MOBILE_ZOOM = .70; // World-only zoom. DOM instruments and touch targets keep their size.
  const WORLD = Object.freeze({widthMultiplier:3,rockAttempts:1440,scrap:180,crystal:24,caches:30,
    common:138,apex:33,reaper:15});
  const FIELD_KEY = 'the-abyss-below-field-v1'; // Read-only legacy migration source.
  const CAMPAIGN_KEY = 'the-abyss-below-campaign-v2';
  const LEVEL_ID = 'calypso-trench';
  const freshField = () => ({schema:2,seed:(Math.random()*0xffffffff)>>>0,cycle:0,
    looted:[],health:{},loot:null,drops:[],awaitingDock:false});
  let field=freshField(),campaignId='campaign-'+Date.now().toString(36)+'-'+field.seed.toString(36);
  let campaignLevels={},storageHealthy=true,storageRecovery=false;
  const readJSON=key=>{try{return JSON.parse(localStorage.getItem(key)||'null');}catch(_){return null;}};
  function validateField(data){
    if(!data||![1,2].includes(data.schema)||!Number.isInteger(data.seed)||data.seed<0||data.seed>0xffffffff)return null;
    const integer=(value,fallback=0)=>Number.isInteger(value)&&value>=0?value:fallback;
    const validNode=n=>n&&typeof n.id==='string'&&Number.isFinite(n.x)&&Number.isFinite(n.y)&&n.y>=58&&n.y<=18120&&['scrap','crystal','air'].includes(n.type);
    const normalise=n=>({id:n.id,x:n.x,y:n.y,type:n.type,quantity:Number.isInteger(n.quantity)&&n.quantity>0&&n.quantity<=100?n.quantity:(n.type==='air'?1:2)});
    return {schema:2,seed:data.seed,cycle:integer(data.cycle),
      looted:Array.isArray(data.looted)?[...new Set(data.looted.filter(x=>typeof x==='string'&&/^loot-\d+$/.test(x)))]:[],
      health:Object.fromEntries(Object.entries(data.health||{}).filter(([k,v])=>/^enemy-\d+$/.test(k)&&Number.isFinite(v)&&v>=0)),
      loot:Array.isArray(data.loot)&&data.loot.length===234&&data.loot.every(validNode)&&new Set(data.loot.map(n=>n.id)).size===234?data.loot.map(normalise):null,
      drops:Array.isArray(data.drops)?data.drops.filter(n=>validNode(n)&&n.type==='scrap'&&/^drop-/.test(n.id)).map(normalise):[],
      awaitingDock:data.awaitingDock===true};
  }
  field=validateField(readJSON(FIELD_KEY))||field;
  let dockVisitActive=!field.awaitingDock;
  // Reuse one mask and one small, pre-baked beam texture. No per-frame pixel loops.
  const darknessCanvas = document.createElement('canvas');
  const darknessCtx = darknessCanvas.getContext('2d');
  let beamTexture = null, lastAmbient = -1;
  const beamTextures = new Map();
  const SAVE_KEY = 'the-abyss-below-v01'; // Read-only legacy banked profile migration source.
  // World coordinates are scaled at 10 units per metre; the new trench extends to 1,800 m.
  const MAX_WORLD_Y = 18120;
  const RECORDER_DEPTHS = [75,260,470,725,1100,1500];
  const RECORDERS_TOTAL = RECORDER_DEPTHS.length;
  const ZONES = [
    {start:0, name:'THE SHALLOWS', code:'01', color:'#5ca1b2'},
    {start:180, name:'MIDNIGHT RIFT', code:'02', color:'#639dbf'},
    {start:400, name:'GLASSBONE TRENCH', code:'03', color:'#9b86cc'},
    {start:650, name:'THE HOLLOW', code:'04', color:'#b9799a'},
    {start:925, name:'DROWNED CATHEDRAL', code:'05', color:'#b78eec'},
    {start:1210, name:'THE PALE DESCENT', code:'06', color:'#77bad5'},
    {start:1510, name:'THE LAST DARK', code:'07', color:'#d16aab'}
  ];
  const PREDATOR_TIERS = {
    common:{name:'DRIFTER',level:1,health:100,speed:96,patrolSpeed:25,detectionCap:245,leash:345,awareness:1,damage:13,cooldown:1.7,reach:35},
    apex:{name:'ABYSS STALKER',level:2,health:200,speed:158,patrolSpeed:36,detectionCap:370,leash:505,awareness:1.52,damage:27,cooldown:1.35,reach:43},
    reaper:{name:'CRIMSON REAPER',level:3,health:400,speed:normalSpeedAt(THRUST.maxMark),patrolSpeed:46,detectionCap:440,leash:610,awareness:1.85,damage:42,cooldown:1.15,reach:48}
  };
  const UPGRADES = [
    {id:'hull', name:'REINFORCED HULL', desc:'Adds 28 max hull HP and 200 m to safe depth (maximum 1,530 m).', base:80, limit:7},
    {id:'oxygen', name:'AIR RECYCLER', desc:'Expand oxygen capacity and slow oxygen consumption.', base:70, limit:5},
    {id:'battery', name:'DEEP-CELL BATTERY', desc:'More energy, cheaper boost bursts and 10% faster boost recharge per level.', base:65, limit:5},
    {id:'engine', name:'MAGNETIC THRUSTERS', desc:'Mk I unlocks boost. Every mark improves normal speed, boost speed and boost endurance: 3 / 4 / 5 / 6 seconds.', base:75, limit:4},
    {id:'flashlight', name:'EXPLORATION FLASHLIGHT', desc:'Mk I fitted. Upgrade the forward beam for longer reach and a wider view. Uses power slowly while switched on.', prices:[0,75,150,300], limit:4},
    {id:'sonar', name:'WIDEBAND SONAR', desc:'Wider scans, longer-lived echoes, lower power cost and shorter cooldowns.', base:90, limit:4},
    {id:'quiet', name:'SILENT DRIVE', desc:'Suppress engine noise and reduce predator detection.', base:95, limit:4},
    {id:'minePower', name:'SEA MINE WARHEADS', desc:'Buy Mk I to unlock mines. Four warhead tiers: 60 / 110 / 180 / 240 damage.', prices:[100,180,320,520], limit:4},
    {id:'mineCapacity', name:'MINE AMMO RACK', desc:'Separate capacity upgrade: 2 / 4 / 6 / 8 mines. Mk I rack is standard. Extra slots are empty; buy ammunition in the dock Ammunition tab.', prices:[0,90,160,280], limit:4}
  ];
  const defaults = () => ({credits:0,xp:0,bestDepth:0,mineAmmo:0,secured:[],upgrades:{hull:0,oxygen:0,battery:0,engine:0,sonar:0,quiet:0,minePower:0,mineCapacity:1,flashlight:1}});
  let saved = defaults();
  try {
    const data = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (data && typeof data === 'object') {
      saved = {...defaults(),...data,upgrades:{...defaults().upgrades,...data.upgrades}};
      saved.secured = Array.isArray(saved.secured) ? saved.secured.filter(x => Number.isInteger(x) && x>=0 && x<RECORDERS_TOTAL) : [];
    }
  } catch (_) { /* local storage is optional */ }
  // A campaign is one atomic record: profile, purchased rounds, level seed,
  // permanent placements, depletion and predator drops cannot split across saves.
  const validCampaign=data=>Boolean(data?.schema===2&&data.profile&&typeof data.profile==='object'&&validateField(data.levels?.[LEVEL_ID])?.loot);
  let campaign=readJSON(CAMPAIGN_KEY);
  if(!validCampaign(campaign)){
    const backup=readJSON(CAMPAIGN_KEY+'.backup');
    if(validCampaign(backup)){campaign=backup;storageRecovery=true;}
  }
  if(validCampaign(campaign)){
    saved={...defaults(),...campaign.profile,upgrades:{...defaults().upgrades,...campaign.profile.upgrades}};
    field=validateField(campaign.levels[LEVEL_ID]);campaignLevels=campaign.levels;
    campaignId=typeof campaign.id==='string'?campaign.id:campaignId;
  }
  for(const u of UPGRADES){
    const fallback=defaults().upgrades[u.id],mark=saved.upgrades[u.id];
    saved.upgrades[u.id]=Number.isInteger(mark)&&mark>=fallback&&mark<=u.limit?mark:fallback;
  }
  for(const key of ['credits','xp','bestDepth','mineAmmo']){
    const value=saved[key];saved[key]=Number.isFinite(value)&&value>=0?Math.floor(value):0;
  }
  saved.mineAmmo=saved.upgrades.minePower?Math.min(saved.mineAmmo,MINES.capacity[saved.upgrades.mineCapacity]):0;
  saved.secured=Array.isArray(saved.secured)?[...new Set(saved.secured.filter(x=>Number.isInteger(x)&&x>=0&&x<RECORDERS_TOTAL))]:[];
  dockVisitActive=!field.awaitingDock;
  function persist(){
    campaignLevels[LEVEL_ID]=field;
    const snapshot=JSON.stringify({schema:2,id:campaignId,selectedLevel:LEVEL_ID,profile:saved,levels:campaignLevels});
    try{
      const previous=localStorage.getItem(CAMPAIGN_KEY);
      if(previous&&validCampaign(readJSON(CAMPAIGN_KEY)))localStorage.setItem(CAMPAIGN_KEY+'.backup',previous);
      localStorage.setItem(CAMPAIGN_KEY,snapshot);
      storageHealthy=true;return true;
    }catch(_){storageHealthy=false;return false;}
  }
  const persistField=()=>persist();
  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
  const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
  function randGen(seed) { let s=seed>>>0; return () => {s=(s*1664525+1013904223)>>>0;return s/4294967296;}; }
  const rand = randGen(227136);
  const lerp = (a,b,t) => a + (b-a)*t;
  const centerAt = y => 600 + Math.sin(y*.0017)*94 + Math.sin(y*.0051)*39;
  const widthAt = y => WORLD.widthMultiplier*(320 + Math.sin(y*.0031+1)*41 + Math.sin(y*.0072)*22);
  const leftAt = y => centerAt(y)-widthAt(y);
  const rightAt = y => centerAt(y)+widthAt(y);
  const depthOf = y => Math.max(0,Math.round((y-120)/10));
  // Use fractional metres for a continuous fade, not the rounded HUD depth.
  const ambientLightAt = y => Math.pow(1-clamp((y-120)/(10*LIGHTING.blackoutDepth),0,1),LIGHTING.fadeExponent);
  const flashlightSpec = () => FLASHLIGHT[saved.upgrades.flashlight]||FLASHLIGHT[1];
  const flashlightPowerRate = () => flashlightSpec().power/(1+saved.upgrades.battery*.12);
  const headlightsActive = () => Boolean(player && player.lights && player.battery>0);
  const smoothstep = (lo,hi,v) => {const t=clamp((v-lo)/(hi-lo),0,1);return t*t*(3-2*t);};
  function beamIntersects(x,y,radius=0){
    if(!headlightsActive())return false;
    const dx=x-player.x,dy=y-player.y,cos=Math.cos(player.facing),sin=Math.sin(player.facing);
    const forward=dx*cos+dy*sin-LIGHTING.bowOffset,side=-dx*sin+dy*cos;
    return forward>=-radius && forward<=flashlightSpec().length+radius &&
      Math.abs(side)<=LIGHTING.nearHalfWidth+Math.max(0,forward)*Math.tan(flashlightSpec().halfAngle)+radius;
  }
  function buildBeamTexture(){
    // Finite, feathered cone: no all-round visibility bubble and no stray blur outside it.
    const mark=saved.upgrades.flashlight;
    if(beamTextures.has(mark))return beamTextures.get(mark);
    const length=flashlightSpec().length,halfHeight=Math.ceil(LIGHTING.nearHalfWidth+length*Math.tan(flashlightSpec().halfAngle));
    const scale=2,texture=document.createElement('canvas');
    texture.width=length*scale;texture.height=halfHeight*2*scale;
    const target=texture.getContext('2d'),pixels=target.createImageData(texture.width,texture.height);
    for(let py=0;py<texture.height;py++){
      const side=Math.abs((py+.5)/scale-halfHeight);
      for(let px=0;px<texture.width;px++){
        const forward=(px+.5)/scale,halfWidth=LIGHTING.nearHalfWidth+forward*Math.tan(flashlightSpec().halfAngle);
        const lateral=1-smoothstep(.55,1,side/halfWidth);
        const reach=1-smoothstep(.10,1,forward/length);
        const i=(py*texture.width+px)*4;
        pixels.data[i]=150;pixels.data[i+1]=226;pixels.data[i+2]=238;
        pixels.data[i+3]=Math.round(255*lateral*reach);
      }
    }
    target.putImageData(pixels,0,0);
    const beam={canvas:texture,width:length,height:halfHeight*2};beamTextures.set(mark,beam);return beam;
  }
  const zoneFor = depth => {let z=ZONES[0];for(const v of ZONES)if(depth>=v.start)z=v;return z;};
  const levelOf = xp => 1 + Math.floor(Math.sqrt(xp/90));
  const rankName = level => level < 3?'DECKHAND':level<5?'PATHFINDER':level<8?'TRENCH DIVER':'ABYSS VETERAN';
  const maxHull = () => 100 + saved.upgrades.hull*28;
  const maxOxygen = () => 100 + saved.upgrades.oxygen*30;
  const maxBattery = () => 100 + saved.upgrades.battery*30;
  const safeDepth = () => 130 + saved.upgrades.hull*200;
  const sonarRange = () => 230 + saved.upgrades.sonar*55;
  const sonarCost = () => Math.max(4,12-saved.upgrades.sonar*2);
  const sonarCooldown = () => SONAR.cooldown-saved.upgrades.sonar*.35;
  const sonarEchoSeconds = () => SONAR.echoSeconds+saved.upgrades.sonar*.45;
  const boostCapacity = () => BOOST.capacities[saved.upgrades.engine]||0;
  const boostMultiplier = () => BOOST.multipliers[saved.upgrades.engine]||1;
  const boostUnlocked = () => saved.upgrades.engine>0;
  const boostPowerRate = () => BOOST.powerPerSecond/(1+saved.upgrades.battery*.12);
  const boostRechargeRate = () => BOOST.recharge*(1+saved.upgrades.battery*.10);
  const mineCapacity = () => MINES.capacity[saved.upgrades.mineCapacity];
  const mineDamage = () => MINES.damage[saved.upgrades.minePower];
  const upgradeCost = (upgrade,level) => upgrade.prices?.[level]??Math.floor(upgrade.base*Math.pow(1.55,level));
  const predatorAlive = enemy => !enemy.dead && enemy.health>0;
  function createPredator(data){
    const tier=PREDATOR_TIERS[data.tier]?data.tier:'common',maxHealth=PREDATOR_TIERS[tier].health;
    return {...data,tier,maxHealth,health:clamp(data.health??maxHealth,0,maxHealth),dead:false};
  }
  const primaryPointer = window.matchMedia('(pointer: coarse)');
  let touchControls = primaryPointer.matches;
  const vesselLabel = () => 'NEREID // MK-II · LIMIT '+safeDepth().toLocaleString('en-GB')+'m';
  const SHIP_RADIUS = 10.5; // Three small circles form a narrow capsule that matches the submarine silhouette.
  const SHIP_OFFSETS = [-15,0,15];
  let scene = {rocks:[],items:[],predators:[],vents:[],dust:[],wrecks:[],mines:[],blasts:[]};
  let player = null;
  const keys = new Set();
  // Joystick is analogue (-1..1 on each axis). Cruise stores the last steering vector.
  const joystick = {x:0,y:0,pointerId:null,originX:0,originY:0,radius:44};
  const cruiseHeading = {x:0,y:0};
  // Pointer coordinates remain in screen space while the follow camera moves.
  const mouseHelm = {pointerId:null,clientX:0,clientY:0};
  let boostHeld=false,boostPointerId=null;
  let cruiseEnabled=false;
  let installPrompt=null;
  let running = false, paused = false, showingDock = false;
  let dialogReturnPause = false;
  let camera = {x:0,y:0};
  let viewport = {w:700,h:550,dpr:1};
  let previousTime=0, clock=0, uiTimer=0, lastZone='';
  let toastUntil=0, eventLines=[], sonarWaves=[], sonarTerrainEchoes=[];
  let pointerSilent = false, victoryShown = false;
  let useHeld = false, useHoldTimer = 0, usePointerId = null;
  let idCounter = 0;
  function makeItem(x,y,type,extra={}) {const id=idCounter++;return {id,animationSeed:id,x,y,type,collected:false,revealUntil:0,...extra};}
  function rockPolygon(rock) {
    const verts=[],cos=Math.cos(rock.rot),sin=Math.sin(rock.rot);
    for(let i=0;i<rock.spikes;i++){
      const a=i/rock.spikes*TAU, radius=rock.radius*(.78+Math.sin(i*10+rock.seed*99)*.19);
      const x=Math.cos(a)*radius,y=Math.sin(a)*radius;
      verts.push({x:rock.x+x*cos-y*sin,y:rock.y+x*sin+y*cos});
    }
    return verts;
  }
  function segmentClosest(px,py,a,b) {
    const dx=b.x-a.x,dy=b.y-a.y;
    const t=clamp(((px-a.x)*dx+(py-a.y)*dy)/(dx*dx+dy*dy||1),0,1);
    return {x:a.x+t*dx,y:a.y+t*dy};
  }
  function insidePolygon(x,y,verts) {
    let inside=false;
    for(let i=0,j=verts.length-1;i<verts.length;j=i++){
      const a=verts[i],b=verts[j];
      if((a.y>y)!==(b.y>y) && x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)inside=!inside;
    }
    return inside;
  }
  // Resolve collision along the visible rock outline, retaining tangential momentum.
  // Iterating handles corners and adjacent rocks; substeps avoid skipping thin obstacles.
  function resolveWorldCollision() {
    let impactSpeed=0;
    const cos=Math.cos(player.facing),sin=Math.sin(player.facing);
    for(let iteration=0;iteration<4;iteration++){
      let moved=false;
      for(const offset of SHIP_OFFSETS){
        let sx=player.x+offset*cos,sy=player.y+offset*sin;
        for(const side of [-1,1]){
          // Rock walls vary with depth, so sample at the actual capsule point.
          const edge=side<0?leftAt(sy)+SHIP_RADIUS:rightAt(sy)-SHIP_RADIUS;
          const overlap=side<0?edge-sx:sx-edge;
          if(overlap>0){
            const nx=-side,amount=overlap+.02;
            player.x+=nx*amount;
            const inward=player.vx*nx;
            if(inward<0){impactSpeed=Math.max(impactSpeed,-inward);player.vx-=inward*nx;}
            sx=player.x+offset*cos;
            moved=true;
          }
        }
        for(const rock of scene.rocks){
          sx=player.x+offset*cos;sy=player.y+offset*sin;
          if(Math.abs(sx-rock.x)>rock.radius+SHIP_RADIUS+4||Math.abs(sy-rock.y)>rock.radius+SHIP_RADIUS+4)continue;
          const vertices=rock.vertices;
          let point=null,distSq=Infinity;
          for(let i=0;i<vertices.length;i++){
            const cp=segmentClosest(sx,sy,vertices[i],vertices[(i+1)%vertices.length]);
            const ds=(cp.x-sx)**2+(cp.y-sy)**2;
            if(ds<distSq){distSq=ds;point=cp;}
          }
          const inside=insidePolygon(sx,sy,vertices),dist=Math.sqrt(distSq);
          if(!inside&&dist>=SHIP_RADIUS)continue;
          // Outside: away from polygon; inside: through the nearest polygon boundary.
          let nx=(inside?point.x-sx:sx-point.x),ny=(inside?point.y-sy:sy-point.y);
          const norm=Math.hypot(nx,ny);
          if(norm<.0001){nx=sx-rock.x;ny=sy-rock.y;const d=Math.hypot(nx,ny)||1;nx/=d;ny/=d;}
          else{nx/=norm;ny/=norm;}
          const penetration=inside?dist+SHIP_RADIUS:SHIP_RADIUS-dist;
          player.x+=nx*(penetration+.02);player.y+=ny*(penetration+.02);
          const inward=player.vx*nx+player.vy*ny;
          if(inward<0){impactSpeed=Math.max(impactSpeed,-inward);player.vx-=inward*nx;player.vy-=inward*ny;}
          moved=true;
        }
      }
      player.y=clamp(player.y,58,MAX_WORLD_Y);
      if(!moved)break;
    }
    return impactSpeed;
  }
  const laneAt = (y,lane=1) => centerAt(y)+(lane-1)*widthAt(y)*2/3+Math.sin(y*.004)*85;
  function populationPoint(r,y,{margin=42,lane=null}={}){
    for(let attempt=0;attempt<120;attempt++){
      const x=lane===null?lerp(leftAt(y)+margin,rightAt(y)-margin,r()):
        clamp(laneAt(y,lane)+(r()-.5)*150,leftAt(y)+margin,rightAt(y)-margin);
      if(!scene.rocks.some(k=>Math.hypot(x-k.x,y-k.y)<k.radius+27))return {x,y};
    }
    // Three protected navigation lanes make this fallback reachable.
    return {x:laneAt(y,lane??Math.floor(r()*3)),y};
  }
  function populateWorld(){
    scene.items=[];scene.predators=[];scene.mines=[];scene.blasts=[];
    sonarWaves=[];sonarTerrainEchoes=[];
    for(const kind of ['rocks','wrecks','vents'])for(const object of scene[kind])object.revealUntil=0;
    const looted=new Set(field.looted);
    for(const w of scene.wrecks){
      if(!saved.secured.includes(w.index))scene.items.push(makeItem(w.x,w.y,'recorder',{id:'recorder-'+w.index,index:w.index}));
    }
    if(!field.loot){
      // Freeze the existing v0.9 population at migration, including its cycle.
      // Quantity changes do not consume RNG, so existing IDs/positions survive.
      const r=randGen((field.seed^Math.imul(field.cycle+1,2654435761))>>>0);
      field.loot=[];
      const add=(point,type)=>field.loot.push({id:'loot-'+field.loot.length,...point,type,quantity:type==='air'?1:2});
      for(let i=0;i<8;i++)add(populationPoint(r,410+i*115,{lane:1}),'scrap');
      for(const w of scene.wrecks){add({x:w.x-65,y:w.y+38},'scrap');add({x:w.x+65,y:w.y-38},'scrap');}
      for(let i=0;i<WORLD.scrap-20;i++)add(populationPoint(r,400+(i+r())/(WORLD.scrap-20)*(MAX_WORLD_Y-610)),'scrap');
      for(let i=0;i<WORLD.crystal;i++)add(populationPoint(r,1920+(i+r())/WORLD.crystal*(MAX_WORLD_Y-2140)),'crystal');
      for(let i=0;i<WORLD.caches;i++)add(populationPoint(r,600+(i+r())/WORLD.caches*(MAX_WORLD_Y-820)),'air');
    }
    for(const node of field.loot)scene.items.push(makeItem(node.x,node.y,node.type,{...node,collected:looted.has(node.id)}));
    for(const node of field.drops)scene.items.push(makeItem(node.x,node.y,'scrap',{...node,predatorDrop:true}));
    const r=randGen((field.seed^Math.imul(field.cycle+1,2246822519))>>>0);
    const addPredator=(y,tier,lane)=>{
      const point=populationPoint(r,y,{lane}),id='enemy-'+scene.predators.length;
      const health=field.health[id]??PREDATOR_TIERS[tier].health;
      const enemy=createPredator({id,tier,...point,homeX:point.x,homeY:y,vx:0,vy:0,phase:r()*TAU,aggression:0,lastHit:-10,alertUntil:0,forgetUntil:0,revealUntil:0,health});
      enemy.dead=enemy.health<=0;scene.predators.push(enemy);
    };
    for(let lane=0;lane<3;lane++){
      for(let i=0;i<46;i++)addPredator(510+i*370+r()*110,'common',lane);
      for(let i=0;i<11;i++)addPredator(4490+i*1190+r()*220,'apex',lane);
      for(let i=0;i<5;i++)addPredator(8220+i*2090+r()*400,'reaper',lane);
    }
    scene.predators=scene.predators.filter(predatorAlive);
  }
  function createWorld() {
    idCounter=0;
    const r=randGen(field.seed);
    scene={rocks:[],items:[],predators:[],vents:[],dust:[],wrecks:[],mines:[],blasts:[]};
    RECORDER_DEPTHS.forEach((depth,index)=>{
      const y=120+depth*10;
      scene.wrecks.push({x:centerAt(y)+(index%2?105:-105),y,index});
    });
    for(let i=0;i<WORLD.rockAttempts;i++){
      const y=370+r()*(MAX_WORLD_Y-530),x=lerp(leftAt(y)+25,rightAt(y)-25,r());
      const radius=20+r()*52;
      if(scene.wrecks.some(w=>Math.hypot(x-w.x,y-w.y)<radius+130))continue;
      if([0,1,2].some(lane=>Math.abs(x-laneAt(y,lane))<radius+51))continue;
      const rock={x,y,radius,rot:r()*TAU,seed:r(),spikes:6+Math.floor(r()*4)};
      rock.vertices=rockPolygon(rock);scene.rocks.push(rock);
    }
    for(let i=0;i<207;i++){
      const y=150+r()*(MAX_WORLD_Y-270);
      scene.vents.push({x:lerp(leftAt(y)+30,rightAt(y)-30,r()),y,phase:r()*TAU});
    }
    for(let i=0;i<2370;i++){
      const y=r()*MAX_WORLD_Y;
      scene.dust.push({x:lerp(leftAt(y)-120,rightAt(y)+120,r()),y,phase:r()*TAU,size:.5+r()*1.7});
    }
    populateWorld();persistField();
  }
  function refreshDockPopulation(){
    field.cycle++;field.health={};
    const supplies=new Set(field.loot.filter(n=>n.type==='air').map(n=>n.id));
    field.looted=field.looted.filter(id=>!supplies.has(id));field.awaitingDock=false;
    populateWorld();persistField();
    addEvent('Dock cycle complete · predators and supply caches refreshed; resource deposits unchanged');
  }
  function newDive() {
    // Relaunches restore the depleted population. Only physical docking resets it.
    createWorld();dockVisitActive=!field.awaitingDock;
    player={x:600,y:160,vx:0,vy:0,facing:-Math.PI/2,hull:maxHull(),oxygen:maxOxygen(),battery:maxBattery(),noise:0,lights:true,quiet:false,damageCooldown:0,scanCooldown:0,boost:boostCapacity(),boosting:false,boostLocked:false,boostNeedsRelease:false,boostRechargeDelay:0,cargo:{scrap:0,crystal:0,recorders:[]},lastRepair:-100,mineAmmo:0,mineCooldown:0,kills:0};
    resupplyMines();
    sonarWaves=[];sonarTerrainEchoes=[];clock=0;lastZone='';eventLines=[];useHoldTimer=0;victoryShown=saved.secured.length===RECORDERS_TOTAL;pointerSilent=false;resetPilotInput();camera.x=player.x-viewport.w/2;camera.y=player.y-viewport.h/2;
    addEvent('Dive systems initialised.');
    addEvent('Six recorders lost as deep as 1,500 m.');
    running=true;paused=false;showingDock=false;
    $('menuOverlay').classList.add('hidden');$('modalOverlay').classList.add('hidden');$('pauseOverlay').classList.add('hidden');
    canvas.focus({preventScroll:true});syncPauseButtons();
    announce('EXPEDITION ACTIVE · LOCATE THE RECORDERS');
    updateUI();
  }
  function addEvent(msg) {eventLines.unshift(msg);eventLines=eventLines.slice(0,3);$('eventLog').innerHTML=eventLines.map(x=>'<div>◈ '+x+'</div>').join('');}
  function announce(message,duration=2.8) { $('notification').textContent=message;$('notification').classList.remove('hidden');toastUntil=clock+duration; }
  function nearestInteractable() {
    if(!player)return null;
    const station = {x:600,y:160};
    if(distance(player,station)<128 && depthOf(player.y)<30)return {type:'station',x:station.x,y:station.y};
    let candidate=null,range=60; // Responsive salvage pick-up while gliding past an item.
    for (const item of scene.items) if(!item.collected) {
      const d=distance(player,item);
      if(d<range) {range=d;candidate=item;}
    }
    return candidate;
  }
  function interact(silentMiss=false) {
    if(!running||paused)return;
    const item=nearestInteractable();
    if(!item) {if(!silentMiss)announce('NOTHING IN SALVAGE RANGE',1.25);return;}
    if(item.type==='station') {depositAndDock();return;}
    item.collected=true;
    const quantity=item.quantity||1;
    if(item.predatorDrop){field.drops=field.drops.filter(n=>n.id!==item.id);}
    else if(item.type!=='recorder'&&typeof item.id==='string'&&!field.looted.includes(item.id))field.looted.push(item.id);
    if(item.type==='scrap') {player.cargo.scrap+=quantity;addEvent('Scrap recovered (+'+quantity+')');announce('SALVAGE +'+quantity+' SCRAP',1.8);}
    else if(item.type==='crystal') {player.cargo.crystal+=quantity;addEvent('Abyss crystals recovered (+'+quantity+')');announce('RARE CRYSTALS +'+quantity,2);}
    else if(item.type==='air') {player.oxygen=Math.min(maxOxygen(),player.oxygen+35);player.battery=Math.min(maxBattery(),player.battery+12);addEvent('Emergency supply cache');announce('OXYGEN +35 · ENERGY +12',2);}
    else if(item.type==='recorder') {player.cargo.recorders.push(item.index);addEvent('ENCRYPTED RECORDER FOUND');announce('FLIGHT RECORDER RECOVERED · RETURN TO STATION',4);}
    persist();updateUI();
  }
  function scan() {
    if(!running||paused)return;
    if(player.scanCooldown>0) {announce('SONAR RECHARGING · '+Math.ceil(player.scanCooldown)+'s',.85);return;}
    if(player.battery<sonarCost()) {announce('INSUFFICIENT BATTERY',1.5);return;}
    // Cover every corner of the CURRENT viewport, even on a large desktop.
    // Additional sonar levels extend detection beyond it, rather than making
    // wide displays silently hide contacts outside a small fixed-radius scan.
    const dx=Math.max(Math.abs(camera.x-player.x),Math.abs(camera.x+viewport.w-player.x));
    const dy=Math.max(Math.abs(camera.y-player.y),Math.abs(camera.y+viewport.h-player.y));
    const range=Math.max(sonarRange(),Math.hypot(dx,dy)+70+saved.upgrades.sonar*55);
    const origin={x:player.x,y:player.y},contacts=[];
    const add=(kind,object)=>{
      if(object.collected||object.dead||object.detonated)return;
      const d=distance(origin,object);
      if(d<=range+100)contacts.push({kind,object,previousDistance:d,hit:false});
    };
    for(const kind of ['items','predators','rocks','wrecks','vents','mines'])for(const object of scene[kind])add(kind,object);
    for(let y=Math.floor((camera.y-30)/24)*24;y<=camera.y+viewport.h+30;y+=24){
      if(y<120)continue;
      for(const side of [-1,1])add('wall',{x:side<0?leftAt(y):rightAt(y),y,side});
    }
    const duration=range/SONAR.waveSpeed;
    player.battery-=sonarCost();player.scanCooldown=Math.max(sonarCooldown(),duration+.4);
    player.scanDuration=player.scanCooldown; // UI ring uses the actual screen-sized scan duration.
    player.noise=Math.min(100,player.noise+27);
    sonarWaves.push({...origin,birth:clock,radius:range,front:0,duration,echoSeconds:sonarEchoSeconds(),contacts});
    addEvent('Sonar sweeping · contacts appear on wave arrival');
    updateUI();
  }
  function updateSonar() {
    for(const wave of sonarWaves){
      const previous=wave.front;
      wave.front=Math.min(wave.radius,Math.max(0,clock-wave.birth)*SONAR.waveSpeed);
      for(const contact of wave.contacts){
        if(contact.hit||contact.object.collected||contact.object.dead||contact.object.detonated)continue;
        const object=contact.object,d=distance(wave,object);
        // Crossing test handles moving predators and large simulation steps.
        if(d<=wave.front&&(contact.previousDistance>=previous||previous===0)){
          contact.hit=true;
          object.revealUntil=Math.max(object.revealUntil||0,clock+wave.echoSeconds);
          object.echoDuration=wave.echoSeconds;
          if(contact.kind==='predators')object.alertUntil=Math.max(object.alertUntil||0,clock+5);
          if(contact.kind==='wall')sonarTerrainEchoes.push(object);
        }
        contact.previousDistance=d;
      }
    }
    sonarWaves=sonarWaves.filter(w=>clock-w.birth<w.duration);
    sonarTerrainEchoes=sonarTerrainEchoes.filter(e=>e.revealUntil>clock);
  }
  function resupplyMines(){
    player.mineAmmo=saved.mineAmmo;player.mineCooldown=0;
  }
  function minePositionClear(x,y){
    if(y<58||y>MAX_WORLD_Y||x<leftAt(y)+MINES.radius+2||x>rightAt(y)-MINES.radius-2)return false;
    for(const rock of scene.rocks){
      if(Math.hypot(x-rock.x,y-rock.y)>rock.radius+MINES.radius+2)continue;
      if(insidePolygon(x,y,rock.vertices))return false;
      for(let i=0;i<rock.vertices.length;i++){
        const near=segmentClosest(x,y,rock.vertices[i],rock.vertices[(i+1)%rock.vertices.length]);
        if(Math.hypot(x-near.x,y-near.y)<MINES.radius+2)return false;
      }
    }
    return true;
  }
  function deployMine(){
    if(!running||paused)return false;
    if(saved.upgrades.minePower<1){announce('BUY MK I SEA MINES AT THE DOCK',1.8);return false;}
    if(player.mineAmmo<=0){announce('MINES EMPTY · BUY AMMO AT THE DOCK',1.8);return false;}
    if(player.mineCooldown>0){announce('MINE LAUNCHER CYCLING',.8);return false;}
    if(distance(player,{x:600,y:160})<128){announce('DOCK SAFETY · MOVE AWAY TO DEPLOY',1.5);return false;}
    let drop=null;
    for(const offset of [54,46,38]){
      const x=player.x-Math.cos(player.facing)*offset,y=player.y-Math.sin(player.facing)*offset;
      if(minePositionClear(x,y)&&distance({x,y},{x:600,y:160})>=128){drop={x,y};break;}
    }
    if(!drop){announce('STERN OBSTRUCTED · MOVE TO CLEAR WATER',1.5);return false;}
    scene.mines.push({...drop,id:idCounter++,mark:saved.upgrades.minePower,damage:mineDamage(),
      birth:clock,armedAt:clock+MINES.armDelay,detonated:false,revealUntil:0});
    player.mineAmmo--;saved.mineAmmo=player.mineAmmo;player.mineCooldown=MINES.deployCooldown;persist();
    addEvent('Mk '+roman(saved.upgrades.minePower)+' mine deployed · '+player.mineAmmo+' remaining');
    updateUI();return true;
  }
  function mineContactTime(mine,enemy,dt){
    // Sweep the armed part of this frame so a fast hunter cannot skip a mine.
    const armedFraction=clamp((mine.armedAt-(clock-dt))/dt,0,1);
    const x0=enemy.previousX??enemy.x,y0=enemy.previousY??enemy.y;
    const ax=lerp(x0,enemy.x,armedFraction)-mine.x,ay=lerp(y0,enemy.y,armedFraction)-mine.y;
    const dx=enemy.x-(ax+mine.x),dy=enemy.y-(ay+mine.y);
    const c=ax*ax+ay*ay-MINES.triggerRadius**2;
    if(c<=0)return armedFraction;
    const a=dx*dx+dy*dy;if(a<1e-12)return null;
    const b=2*(ax*dx+ay*dy),discriminant=b*b-4*a*c;
    if(discriminant<0)return null;
    const t=(-b-Math.sqrt(discriminant))/(2*a);
    return t>=0&&t<=1?armedFraction+(1-armedFraction)*t:null;
  }
  function damagePredator(enemy,amount){
    if(!predatorAlive(enemy)||!Number.isFinite(amount)||amount<=0)return;
    enemy.health=Math.max(0,enemy.health-amount);enemy.lastDamaged=clock;
    if(typeof enemy.id==='string')field.health[enemy.id]=enemy.health;
    if(enemy.health===0){
      enemy.dead=true;enemy.aggression=0;enemy.alertUntil=0;player.kills++;
      const quantity=PREDATOR_SALVAGE[enemy.tier]||2;
      const id='drop-'+field.cycle+'-'+(enemy.id??('fixture-'+idCounter++));
      if(!field.drops.some(n=>n.id===id)){
        // Hunters can overlap rock outlines. Keep the reward accessible.
        let point={x:enemy.x,y:enemy.y};
        if(!minePositionClear(point.x,point.y))point=populationPoint(randGen(field.seed+field.cycle+idCounter),enemy.y);
        const drop={...point,id,type:'scrap',quantity};
        field.drops.push(drop);scene.items.push(makeItem(point.x,point.y,'scrap',{...drop,predatorDrop:true}));
      }
      addEvent(PREDATOR_TIERS[enemy.tier].name+' neutralised · '+quantity+' scrap to recover');
    }else{
      enemy.aggression=Math.max(.5,enemy.aggression);enemy.alertUntil=clock+4;enemy.forgetUntil=0;
    }
    persist();
  }
  function updateMines(dt){
    for(const mine of scene.mines){
      if(mine.detonated||clock<mine.armedAt)continue;
      let contact=null;
      for(const enemy of scene.predators)if(predatorAlive(enemy)){
        const t=mineContactTime(mine,enemy,dt);
        if(t!==null&&(contact===null||t<contact))contact=t;
      }
      if(contact===null)continue;
      mine.detonated=true;
      scene.blasts.push({x:mine.x,y:mine.y,birth:clock,radius:MINES.blastRadius});
      let hits=0;
      for(const enemy of scene.predators)if(predatorAlive(enemy)){
        const x=lerp(enemy.previousX??enemy.x,enemy.x,contact),y=lerp(enemy.previousY??enemy.y,enemy.y,contact);
        if(Math.hypot(x-mine.x,y-mine.y)<=MINES.blastRadius){damagePredator(enemy,mine.damage);hits++;}
      }
      player.noise=Math.min(100,player.noise+24);
      if(hits)announce('MINE HIT · '+mine.damage+' DAMAGE · '+hits+' CONTACT'+(hits===1?'':'S'),1.8);
    }
    scene.mines=scene.mines.filter(m=>!m.detonated);
    scene.predators=scene.predators.filter(predatorAlive);
    scene.blasts=scene.blasts.filter(b=>clock-b.birth<.65);
  }
  function repair() {
    if(!running||paused)return;
    if(player.hull>=maxHull()-1) {announce('HULL ALREADY INTACT',1.2);return;}
    if(player.cargo.scrap<2) {announce('REPAIR REQUIRES 2 SCRAP',1.6);return;}
    if(clock-player.lastRepair<4) {announce('REPAIR TOOL COOLING',1);return;}
    player.cargo.scrap-=2;player.lastRepair=clock;player.hull=Math.min(maxHull(),player.hull+30);player.noise=Math.min(100,player.noise+10);
    announce('FIELD REPAIR COMPLETE · HULL +30',2);addEvent('Used 2 scrap for repairs');updateUI();
  }
  function toggleLights(){if(!running||paused)return;player.lights=!player.lights;addEvent('External lamps '+(player.lights?'activated':'disabled'));updateUI();}
  function depositAndDock() {
    if(!running||paused||nearestInteractable()?.type!=='station')return;
    const gained=player.cargo.scrap*18+player.cargo.crystal*45;
    const earnedXP=player.cargo.scrap*9+player.cargo.crystal*23+player.cargo.recorders.length*90;
    saved.credits+=gained;saved.xp+=earnedXP;
    for(const i of player.cargo.recorders)if(!saved.secured.includes(i))saved.secured.push(i);
    const delivered=player.cargo.recorders.length;
    player.cargo={scrap:0,crystal:0,recorders:[]};
    player.hull=maxHull();player.oxygen=maxOxygen();player.battery=maxBattery();player.noise=0;resetBoost();resupplyMines();
    persist();
    if(!dockVisitActive){refreshDockPopulation();dockVisitActive=true;}
    addEvent('Docking completed · systems restored; ammunition sold separately');
    if(gained||delivered)announce('SALVAGE BANKED: +'+gained+' CREDITS · +'+earnedXP+' XP',4);
    if(saved.secured.length===RECORDERS_TOTAL&&!victoryShown){openVictory();return;}
    showDock();
  }
  function syncPauseButtons(){
    $('pauseBtn').textContent=paused?'▶ RESUME':'Ⅱ PAUSE';
    $('focusPauseBtn').innerHTML=paused?'<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7Z" fill="currentColor"/></svg>':`<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 5v14M16 5v14" stroke-width="3"/></svg>`;
    $('focusPauseBtn').setAttribute('aria-label',paused?'Resume game':'Pause game');
  }
  function openDialog(kicker,title,body,footer='') {
    dialogReturnPause=paused;
    paused=true;resetPilotInput();
    $('modalKicker').textContent=kicker;$('modalTitle').textContent=title;$('modalBody').innerHTML=body;$('modalFooter').innerHTML=footer;
    $('modalOverlay').classList.remove('hidden');syncPauseButtons();
  }
  function closeDialog() {
    $('modalOverlay').classList.add('hidden');showingDock=false;
    paused=running?dialogReturnPause:false;
    syncPauseButtons();updateUI();
  }
  let dockTab='upgrades';
  function showDock() {
    showingDock=true;dockTab='upgrades';
    openDialog('SURFACE OPERATIONS // DOCKED','NEREID STATION',
      '<p class="dialog-info">Hull, oxygen and power restored. <strong>Ammunition is purchased, never refilled automatically.</strong></p><div id="dockBalance" class="dock-balance"></div><div class="dock-tabs" role="tablist" aria-label="Dock services"><button id="upgradesTab" role="tab" aria-controls="dockPanel">UPGRADES</button><button id="ammunitionTab" role="tab" aria-controls="dockPanel">AMMUNITION</button></div><div id="dockPanel" role="tabpanel"></div>',
      '<div class="dialog-actions"><button class="alt-btn" id="launchAgain">RETURN TO THE WATER</button></div>');
    for(const [id,tab] of [['upgradesTab','upgrades'],['ammunitionTab','ammunition']]){
      $(id).addEventListener('click',()=>{dockTab=tab;drawDockPanel();});
      $(id).addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();dockTab=e.key==='Home'?'upgrades':e.key==='End'?'ammunition':dockTab==='upgrades'?'ammunition':'upgrades';drawDockPanel();$(dockTab==='upgrades'?'upgradesTab':'ammunitionTab').focus();}});
    }
    drawDockPanel();
    $('launchAgain').addEventListener('click',()=>{closeDialog();addEvent('Station departure authorised');});
  }
  function drawDockPanel(){
    if(!showingDock||!$('dockPanel'))return;
    $('dockBalance').textContent=saved.credits+' CREDITS · '+player.mineAmmo+'/'+mineCapacity()+' MINES · '+saved.secured.length+'/'+RECORDERS_TOTAL+' RECORDERS';
    for(const [id,tab] of [['upgradesTab','upgrades'],['ammunitionTab','ammunition']]){
      $(id).setAttribute('aria-selected',String(dockTab===tab));$(id).tabIndex=dockTab===tab?0:-1;
    }
    $('dockPanel').setAttribute('aria-labelledby',dockTab==='upgrades'?'upgradesTab':'ammunitionTab');
    if(dockTab==='upgrades'){$('dockPanel').innerHTML='<div class="upgrade-list" id="upgradeList"></div>';drawUpgrades();}
    else drawAmmunition();
  }
  function buyAmmunition(fill=false){
    if(!showingDock||nearestInteractable()?.type!=='station'||saved.upgrades.minePower<1)return false;
    const available=mineCapacity()-saved.mineAmmo;
    const count=fill?Math.min(available,Math.floor(saved.credits/AMMO_PRICE)):1;
    if(count<=0||count>available||saved.credits<count*AMMO_PRICE)return false;
    saved.credits-=count*AMMO_PRICE;saved.mineAmmo+=count;player.mineAmmo=saved.mineAmmo;
    persist();drawDockPanel();updateUI();addEvent(count+' mine'+(count===1?'':'s')+' purchased · '+(count*AMMO_PRICE)+' credits');return true;
  }
  function drawAmmunition(){
    const fitted=saved.upgrades.minePower>0,missing=mineCapacity()-saved.mineAmmo;
    const affordable=Math.min(missing,Math.floor(saved.credits/AMMO_PRICE));
    $('dockPanel').innerHTML=`<section class="ammo-shop"><div class="ammo-symbol" aria-hidden="true">✧</div><div class="panel-label">PROXIMITY MINE AMMUNITION</div><h3>${saved.mineAmmo}<span> / ${mineCapacity()} LOADED</span></h3><div class="ammo-slots" aria-label="${saved.mineAmmo} loaded rounds">${Array.from({length:mineCapacity()},(_,i)=>'<span class="'+(i<saved.mineAmmo?'loaded':'')+'">◆</span>').join('')}</div><p>Each round costs <strong>${AMMO_PRICE} credits</strong>. Uses your fitted ${fitted?'Mk '+roman(saved.upgrades.minePower)+' warheads ('+mineDamage()+' damage)':'warhead upgrade'}. Loaded ammunition survives docking and reloads. Capacity upgrades only add empty slots.</p>${!fitted?'<p class="ammo-warning">Fit Mk I Sea Mine Warheads in Upgrades first.</p>':''}<div class="ammo-purchases"><button id="buyMineBtn" class="alt-btn" ${!fitted||!missing||saved.credits<AMMO_PRICE?'disabled':''}>BUY 1 · ${AMMO_PRICE} CR</button><button id="fillMinesBtn" class="primary-btn" ${!fitted||!affordable?'disabled':''}>${!missing?'RACK FULL':affordable===missing?'FILL RACK':'BUY '+affordable} ${missing&&affordable?'· '+affordable*AMMO_PRICE+' CR':''}</button></div><p class="ammo-footnote">No free rounds on docking, launch, death, reload or upgrade.</p></section>`;
    $('buyMineBtn').addEventListener('click',()=>buyAmmunition(false));$('fillMinesBtn').addEventListener('click',()=>buyAmmunition(true));
  }
  function drawUpgrades() {
    const list=$('upgradeList');if(!list)return;
    list.innerHTML=UPGRADES.map(u=>{
      const level=saved.upgrades[u.id],maxed=level>=u.limit,cost=upgradeCost(u,level);
      const mineUpgrade=u.id.startsWith('mine'),markedUpgrade=mineUpgrade||u.id==='flashlight'||u.id==='engine';
      const label=markedUpgrade?(level?'MK '+roman(level)+'/IV':'NOT FITTED'):'MK '+level+'/'+u.limit;
      const lampText=mark=>{const lamp=FLASHLIGHT[mark];return (lamp.length/10)+' m reach / '+Math.round(lamp.halfAngle*360/Math.PI)+'° cone';};
      const thrusterText=mark=>mark?'Mk '+roman(mark)+': '+(normalSpeedAt(mark)/10).toFixed(1)+' m/s · '+(normalSpeedAt(mark)*BOOST.multipliers[mark]/10).toFixed(1)+' m/s boosted · '+BOOST.capacities[mark]/BOOST.drain+'s boost':'Standard drive · boost locked';
      const detail=u.id==='engine'?thrusterText(level)+(maxed?'':' → '+thrusterText(level+1)):
        u.id==='flashlight'?lampText(level)+(maxed?'':' → '+lampText(level+1))+' · '+(FLASHLIGHT[level].power*60).toFixed(1)+' power/min before battery efficiency':
        u.id==='minePower'?(level?MINES.damage[level]+' damage':'Buy Mk I to unlock sea mines')+(maxed?'':' → Mk '+roman(level+1)+': '+MINES.damage[level+1]+' damage'):
        u.id==='mineCapacity'?MINES.capacity[level]+' slots'+(maxed?'':' → Mk '+roman(level+1)+': '+MINES.capacity[level+1]+' slots'):' '; 
      return `<div class="upgrade ${mineUpgrade?'ordnance-upgrade':''}"><div><h3>${u.name} <small>${label}</small></h3><p>${u.desc}</p>${detail.trim()?'<p class="upgrade-preview">'+detail+'</p>':''}</div><button data-upgrade="${u.id}" ${maxed||saved.credits<cost?'disabled':''}>${maxed?'MAX':cost+' CR'}</button></div>`;
    }).join('');
    list.querySelectorAll('[data-upgrade]').forEach(b=>b.addEventListener('click',()=>{
      const upgrade=UPGRADES.find(x=>x.id===b.dataset.upgrade);
      if(!upgrade||!showingDock||nearestInteractable()?.type!=='station')return;
      const lv=saved.upgrades[upgrade.id],cost=upgradeCost(upgrade,lv);
      if(lv>=upgrade.limit||saved.credits<cost)return;
      saved.credits-=cost;saved.upgrades[upgrade.id]++;
      if(upgrade.id==='flashlight')beamTexture=buildBeamTexture();
      player.hull=maxHull();player.oxygen=maxOxygen();player.battery=maxBattery();resetBoost();resupplyMines();
      persist();drawDockPanel();updateUI();addEvent(upgrade.name+' upgraded');
    }));
  }
  function openVictory() {
    victoryShown=true;
    openDialog('TRANSMISSION // RESTORED','THE SIGNAL RETURNS',`<div class="briefing"><p>All six flight recorders are secured. The <em>Calypso</em> went silent because it found something beneath the final trench, something that appeared to be listening.</p><p><strong>MISSION COMPLETE.</strong> Your expedition rank is now ${levelOf(saved.xp)}. You may keep exploring, collect salvage and upgrade the NEREID, or start a brand-new expedition from the main menu.</p><p>The story continues in future builds of The Abyss Below.</p></div>`, '<div class="dialog-actions"><button class="alt-btn" id="victoryClose">CONTINUE EXPLORING</button></div>');
    $('victoryClose').addEventListener('click',closeDialog);
  }
  function defeat(reason) {
    running=false;paused=true;player.hull=Math.max(0,player.hull);persist();
    openDialog('SIGNAL LOST // EMERGENCY','VESSEL LOST',`<div class="briefing"><p>${reason}</p><p>Unbanked cargo and undelivered recorders were lost. Your secured recorders, credits, upgrades and expedition rank remain saved.</p><p><strong>Best depth:</strong> ${saved.bestDepth} m · <strong>Secured recorders:</strong> ${saved.secured.length}/${RECORDERS_TOTAL}</p></div>`, '<div class="dialog-actions"><button class="primary-btn" id="retryBtn">LAUNCH RESCUE VESSEL <span>→</span></button><button class="alt-btn" id="defeatMenuBtn">MAIN MENU</button></div>');
    $('retryBtn').addEventListener('click',newDive);
    $('defeatMenuBtn').addEventListener('click',()=>returnToMenu(false));
  }
  function takeDamage(amount,reason='Hull breach') {
    if(player.damageCooldown>0)return;
    player.hull-=amount;player.damageCooldown=.7;
    if(amount>=8) {addEvent(reason);announce(reason.toUpperCase(),2);}
    if(player.hull<=0)defeat(reason+' destroyed the NEREID.');
  }
  function resetBoost(){
    player.boost=boostCapacity();player.boosting=false;player.boostLocked=false;
    player.boostNeedsRelease=false;player.boostRechargeDelay=0;
  }
  function updateBoost(dt,hasInput){
    if(!boostUnlocked()){resetBoost();return 0;}
    const requested=keys.has(' ')||boostHeld;
    if(!requested)player.boostNeedsRelease=false;
    player.boosting=false;
    const eligible=requested&&hasInput&&!player.boostLocked&&!player.boostNeedsRelease&&player.battery>.5&&player.boost>0;
    if(eligible){
      const activeTime=Math.min(dt,player.boost/BOOST.drain,Math.max(0,player.battery-.5)/boostPowerRate());
      if(activeTime>0){
        player.boost=Math.max(0,player.boost-activeTime*BOOST.drain);
        player.battery=Math.max(0,player.battery-activeTime*boostPowerRate());
        player.boosting=true;player.boostRechargeDelay=BOOST.rechargeDelay;
        if(player.boost<.0001){
          player.boost=0;player.boostLocked=true;player.boostNeedsRelease=true;
          announce('BOOST DEPLETED · RECHARGING',1.7);
        }
        return activeTime/dt;
      }
    }
    // The capacitor recovers, not the ship battery. Pause freezes both timers.
    const rechargeTime=Math.max(0,dt-player.boostRechargeDelay);
    player.boostRechargeDelay=Math.max(0,player.boostRechargeDelay-dt);
    if(player.battery>.5){
      player.boost=Math.min(boostCapacity(),player.boost+rechargeTime*boostRechargeRate());
      if(player.boost>=boostCapacity()-.0001){player.boost=boostCapacity();player.boostLocked=false;}
    }
    return 0;
  }
  function mouseSteering(){
    if(mouseHelm.pointerId===null)return {x:0,y:0,distance:0,angle:player.facing};
    const rect=canvas.getBoundingClientRect();
    const targetX=(mouseHelm.clientX-rect.left)*viewport.w/(rect.width||1)+camera.x;
    const targetY=(mouseHelm.clientY-rect.top)*viewport.h/(rect.height||1)+camera.y;
    const dx=targetX-player.x,dy=targetY-player.y,d=Math.hypot(dx,dy);
    // Ease off near the cursor rather than circling it at full thrust.
    const amount=d<12?0:clamp((d-12)/75,0,1);
    return {x:dx/(d||1)*amount,y:dy/(d||1)*amount,distance:d,angle:Math.atan2(dy,dx)};
  }
  function releaseMouseHelm(){
    const id=mouseHelm.pointerId;mouseHelm.pointerId=null;
    canvas.classList.remove('mouse-piloting');
    if(id!==null&&canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);
  }
  function releaseBoostInput(){
    const id=boostPointerId;boostHeld=false;boostPointerId=null;
    const b=$('mobileBoost');b.classList.remove('held');
    if(id!==null&&b.hasPointerCapture(id))b.releasePointerCapture(id);
    if(player)player.boosting=false;
  }
  function resetPilotInput(){
    releaseMouseHelm();releaseBoostInput();keys.clear();
    const id=usePointerId;useHeld=false;usePointerId=null;
    $('mobileInteract').classList.remove('held');
    if(id!==null&&$('mobileInteract').hasPointerCapture(id))$('mobileInteract').releasePointerCapture(id);
    resetJoystick(true);
  }
  function update(dt) {
    clock+=dt;
    if(!player)return;
    player.scanCooldown=Math.max(0,player.scanCooldown-dt);
    player.mineCooldown=Math.max(0,player.mineCooldown-dt);
    player.damageCooldown=Math.max(0,player.damageCooldown-dt);
    const keyX=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft'));
    const keyY=Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'));
    const helm=mouseSteering();
    // Mouse and joystick are direct helm commands, not additive inputs.
    const steering=joystick.pointerId!==null?joystick:mouseHelm.pointerId!==null?helm:
      (keyX||keyY)?{x:keyX,y:keyY}:cruiseEnabled?cruiseHeading:{x:0,y:0};
    const x=clamp(steering.x,-1,1),y=clamp(steering.y,-1,1);
    const magnitude=Math.hypot(x,y),hasInput=magnitude>.04;
    const boostFraction=updateBoost(dt,hasInput);
    const quiet=(keys.has('shift')||pointerSilent)&&!player.boosting;
    player.quiet=quiet;
    const maxSpeed=(quiet?THRUST.quiet*(1+saved.upgrades.engine*THRUST.perMark):normalSpeedAt(saved.upgrades.engine))*lerp(1,boostMultiplier(),boostFraction);
    const thrustPower=hasInput&&player.battery>.5?1:0;
    const divisor=Math.max(1,magnitude);
    const desiredX=x/divisor*maxSpeed*thrustPower,desiredY=y/divisor*maxSpeed*thrustPower;
    const factor=1-Math.exp(-(3.5+saved.upgrades.engine*.2)*dt);
    player.vx=lerp(player.vx,desiredX,factor);player.vy=lerp(player.vy,desiredY,factor);
    // Aim the bow (and lamp) towards a held cursor, even while momentum turns.
    if(mouseHelm.pointerId!==null&&helm.distance>8&&joystick.pointerId===null){
      player.facing=lerpAngle(player.facing,helm.angle,Math.min(1,dt*7));
    }else if(Math.hypot(player.vx,player.vy)>9){
      player.facing=lerpAngle(player.facing,Math.atan2(player.vy,player.vx),Math.min(1,dt*5));
    }
    const speed=Math.hypot(player.vx,player.vy);
    const noiseTarget=player.boosting?100:hasInput&&!quiet?45+speed*.2:quiet&&hasInput?8:0;
    const noise=player.boosting?Math.max(82,noiseTarget/(1+saved.upgrades.quiet*.32)):
      Math.min(95,noiseTarget)/(1+saved.upgrades.quiet*.32);
    player.noise=lerp(player.noise,noise,1-Math.exp(-dt*(hasInput?2.8:1.6)));
    if(!hasInput)player.noise=Math.max(0,player.noise-dt*4);
    const steps=Math.max(1,Math.ceil(speed*dt/7));
    let impactSpeed=0;
    for(let step=0;step<steps;step++){
      player.x+=player.vx*dt/steps;
      player.y+=player.vy*dt/steps;
      impactSpeed=Math.max(impactSpeed,resolveWorldCollision());
    }
    if(impactSpeed>43)takeDamage(Math.min(7,1+impactSpeed*.025),'Rock impact');
    // Hold USE with a second finger while steering: collect immediately on entering range.
    if(useHeld){useHoldTimer-=dt;if(useHoldTimer<=0){interact(true);useHoldTimer=.12;}}
    if(!running||paused)return;
    if(distance(player,{x:600,y:160})>=145&&!field.awaitingDock){dockVisitActive=false;field.awaitingDock=true;persist();}
    const energyDrain=dt*((.018+(hasInput?(quiet?.028:.075):0))/(1+saved.upgrades.battery*.12)+(headlightsActive()?flashlightPowerRate():0));
    player.battery=clamp(player.battery-energyDrain,0,maxBattery());
    player.oxygen=clamp(player.oxygen-dt*(.22/(1+saved.upgrades.oxygen*.2)),0,maxOxygen());
    if(player.oxygen<=0){player.hull-=dt*7;if(player.hull<=0){defeat('The oxygen supply ran dry.');return;}}
    const depth=depthOf(player.y),over=Math.max(0,depth-safeDepth());
    if(over>0) {
      player.hull-=dt*(.26+Math.pow(over/30,1.7)*1.5); // Overshooting a tier is risky; deep skips are lethal.
      if(player.hull<=0){defeat('Crushing pressure breached the hull.');return;}
    }
    if(depth>saved.bestDepth) {saved.bestDepth=depth;if(depth%10===0)persist();}
    const zone=zoneFor(depth);
    if(zone.name!==lastZone){if(lastZone)addEvent('Entered '+zone.name);lastZone=zone.name;}
    for(const enemy of scene.predators){
      if(!predatorAlive(enemy))continue;
      enemy.previousX=enemy.x;enemy.previousY=enemy.y;
      const tier=PREDATOR_TIERS[enemy.tier]||PREDATOR_TIERS.common;
      const d=distance(player,enemy);
      // Every tier has a finite pursuit leash; higher tiers track farther.
      if(d>tier.leash){
        if(enemy.aggression>.15&&d<tier.leash+80)addEvent(tier.name+' contact lost');
        enemy.aggression=0;
        enemy.alertUntil=0;
        enemy.forgetUntil=clock+2.5;
      }else{
        const detectable=Math.min(tier.detectionCap,(75+player.noise*2.8+(headlightsActive()?40:0))*tier.awareness);
        const hearsSonar=enemy.alertUntil>clock&&d<Math.max(sonarRange()+50,tier.detectionCap);
        if(clock>=enemy.forgetUntil&&(d<detectable||hearsSonar)){
          enemy.aggression=clamp(enemy.aggression+dt*.85*tier.awareness,0,1);
          enemy.alertUntil=Math.max(enemy.alertUntil,clock+1.4);
        }else if(enemy.alertUntil<=clock||clock<enemy.forgetUntil){
          enemy.aggression=clamp(enemy.aggression-dt*.7,0,1);
        }
      }
      const chase=enemy.aggression>.13;
      const tx=chase?player.x:enemy.homeX+Math.sin(clock*.33+enemy.phase)*85;
      const ty=chase?player.y:enemy.homeY+Math.cos(clock*.27+enemy.phase)*65;
      const ed=Math.hypot(tx-enemy.x,ty-enemy.y)||1;
      const es=chase?tier.speed:tier.patrolSpeed;
      enemy.vx=lerp(enemy.vx,(tx-enemy.x)/ed*es,1-Math.exp(-dt*2));
      enemy.vy=lerp(enemy.vy,(ty-enemy.y)/ed*es,1-Math.exp(-dt*2));
      enemy.x=clamp(enemy.x+enemy.vx*dt,leftAt(enemy.y)+34,rightAt(enemy.y)-34);
      enemy.y=clamp(enemy.y+enemy.vy*dt,58,MAX_WORLD_Y);
      // Tier-3 encounters never leak into the upper 800 m, even in pursuit.
      if(enemy.tier==='reaper'&&enemy.y<8120){enemy.y=8120;enemy.vy=Math.max(0,enemy.vy);enemy.aggression=0;enemy.alertUntil=0;enemy.forgetUntil=clock+1;}
    }
    // Resolve armed mines before bites: a hunter killed on this frame cannot attack.
    updateMines(dt);
    for(const enemy of scene.predators){
      const tier=PREDATOR_TIERS[enemy.tier];
      if(enemy.aggression>.13&&distance(player,enemy)<tier.reach&&clock-enemy.lastHit>tier.cooldown){
        enemy.lastHit=clock;
        takeDamage(tier.damage,tier.name+' attack');
        if(!running)return;
        player.vx+=(player.x-enemy.x)*2;player.vy+=(player.y-enemy.y)*2;
      }
    }
    updateSonar();
    camera.x=lerp(camera.x,player.x-viewport.w/2,Math.min(1,dt*3.4));
    camera.y=lerp(camera.y,player.y-viewport.h*.52,Math.min(1,dt*3.4));
    if(clock>toastUntil)$('notification').classList.add('hidden');
    uiTimer+=dt;if(uiTimer>.13){uiTimer=0;updateUI();}
  }
  function lerpAngle(a,b,t){const diff=Math.atan2(Math.sin(b-a),Math.cos(b-a));return a+diff*t;}
  function resize(){
    const rect=canvas.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1);
    const zoom=touchControls?MOBILE_ZOOM:1,screenW=Math.max(1,rect.width),screenH=Math.max(1,rect.height);
    const old=viewport;
    viewport={w:screenW/zoom,h:screenH/zoom,screenW,screenH,zoom,dpr};
    // Keep the same follow anchor through rotation, expansion and pointer-mode changes.
    camera.x+=(old.w-viewport.w)/2;camera.y+=(old.h-viewport.h)*.52;
    canvas.width=Math.round(screenW*dpr);canvas.height=Math.round(screenH*dpr);
    ctx.setTransform(dpr*zoom,0,0,dpr*zoom,0,0);
    darknessCanvas.width=canvas.width;darknessCanvas.height=canvas.height;
    darknessCtx.setTransform(dpr*zoom,0,0,dpr*zoom,0,0);
  }
  const onscreen=(x,y,pad=140)=>x>=camera.x-pad&&x<=camera.x+viewport.w+pad&&y>=camera.y-pad&&y<=camera.y+viewport.h+pad;
  function render() {
    const W=viewport.w,H=viewport.h;if(!W||!H)return;
    ctx.clearRect(0,0,W,H);
    const ambient=player?ambientLightAt(player.y):1;
    if(ambient!==lastAmbient){canvas.parentElement.style.setProperty('--ambient-light',String(ambient));lastAmbient=ambient;}
    // Water colour also blends continuously; no sudden colour jumps between zones.
    const tint=1-ambient;
    ctx.fillStyle=`rgb(${Math.round(lerp(9,3,tint))},${Math.round(lerp(42,17,tint))},${Math.round(lerp(57,26,tint))})`;
    ctx.fillRect(0,0,W,H);
    const bg=ctx.createRadialGradient(W*.52,H*.38,10,W*.52,H*.55,Math.max(W,H)*.75);
    bg.addColorStop(0,'#10405766');bg.addColorStop(1,'#00101b00');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
    ctx.save();ctx.translate(-camera.x,-camera.y);
    // Navigation lines and depth contours.
    const top=Math.floor(camera.y/100)*100;
    for(let y=top;y<camera.y+H+120;y+=100){
      ctx.beginPath();ctx.moveTo(camera.x,y);ctx.lineTo(camera.x+W,y);
      ctx.strokeStyle='rgba(74,151,163,.065)';ctx.lineWidth=1;ctx.stroke();
      ctx.fillStyle='#4c819488';ctx.font='10px monospace';ctx.fillText(Math.max(0,depthOf(y))+'m',camera.x+W-47,y-7);
    }
    // Surface light and station.
    if(camera.y<410){
      ctx.fillStyle='#398ca522';ctx.fillRect(camera.x,0,W,155);
      ctx.beginPath();for(let x=camera.x-30;x<camera.x+W+30;x+=8){const y=70+Math.sin(x*.028+clock*.6)*4;if(x===camera.x-30)ctx.moveTo(x,y);else ctx.lineTo(x,y);}
      ctx.strokeStyle='#78e7df99';ctx.lineWidth=2;ctx.stroke();
      for(let i=0;i<8;i++){let x=200+i*130;ctx.beginPath();ctx.moveTo(x,75);ctx.lineTo(x-50,400);ctx.strokeStyle='#6bcfda09';ctx.lineWidth=25;ctx.stroke();}
      drawStation();
    }
    drawTrench();
    for(const particle of scene.dust)if(onscreen(particle.x,particle.y)){
      const x=particle.x+Math.sin(clock*.28+particle.phase)*17,y=particle.y+Math.cos(clock*.37+particle.phase)*7;
      ctx.beginPath();ctx.arc(x,y,particle.size,0,TAU);ctx.fillStyle='#83dfe12a';ctx.fill();
    }
    for(const vent of scene.vents)if(onscreen(vent.x,vent.y)){
      const gl=ctx.createRadialGradient(vent.x,vent.y,2,vent.x,vent.y,48);
      gl.addColorStop(0,'#2ef1de60');gl.addColorStop(1,'#2ef1de00');ctx.fillStyle=gl;ctx.beginPath();ctx.arc(vent.x,vent.y,48,0,TAU);ctx.fill();
      for(let j=0;j<5;j++){const yy=vent.y-((clock*(17+j*3)+j*11+vent.phase*9)%110);const xx=vent.x+Math.sin(yy*.1+j)*10;ctx.beginPath();ctx.arc(xx,yy,1+j%2,0,TAU);ctx.fillStyle='#76dfd46a';ctx.fill();}
    }
    for(const rock of scene.rocks)if(onscreen(rock.x,rock.y,rock.radius+20))drawRock(rock);
    for(const wreck of scene.wrecks)if(onscreen(wreck.x,wreck.y))drawWreck(wreck);
    if(headlightsActive())drawLightBeam();
    for(const item of scene.items)if(!item.collected&&onscreen(item.x,item.y)){
      const d=player?distance(player,item):0;
      const shown=d<(headlightsActive()?155:80)||item.revealUntil>clock||item.type==='recorder'&&d<225||beamIntersects(item.x,item.y,44);
      if(shown)drawItem(item,item.revealUntil>clock);
    }
    for(const mine of scene.mines)if(onscreen(mine.x,mine.y))drawMine(mine);
    for(const blast of scene.blasts)if(onscreen(blast.x,blast.y))drawMineBlast(blast);
    for(const enemy of scene.predators)if(predatorAlive(enemy)&&onscreen(enemy.x,enemy.y)){
      const d=distance(player,enemy);
      if(d<250 || enemy.alertUntil>clock || beamIntersects(enemy.x,enemy.y,60)){drawEnemy(enemy);drawPredatorHealth(enemy);}
    }
    if(player)drawPlayer();
    ctx.restore();
    const edge=ctx.createRadialGradient(W*.5,H*.48,Math.min(W,H)*.1,W*.5,H*.5,Math.max(W,H)*.77);
    edge.addColorStop(0,'#00132000');edge.addColorStop(.75,'#000e1c33');edge.addColorStop(1,'#00050dd1');ctx.fillStyle=edge;ctx.fillRect(0,0,W,H);
    if(!running && player && player.hull<=0){ctx.fillStyle='#7e22241c';ctx.fillRect(0,0,W,H);}
    // World illumination stays black at 1,000 m. Sonar is a separate, timed
    // instrument echo layer: silhouettes only, never an ambient-light reset.
    applyDepthDarkness(ambient);
    drawSonarEchoes();
    drawMouseTarget();
    drawEdgeArrows();
  }
  function applyDepthDarkness(ambient){
    if(ambient>=1)return;
    const m=darknessCtx,w=viewport.w+1,h=viewport.h+1;
    m.clearRect(0,0,w,h);
    m.globalCompositeOperation='source-over';m.globalAlpha=1-ambient;
    m.fillStyle='#000';m.fillRect(0,0,w,h);m.globalAlpha=1;
    if(headlightsActive()){
      m.save();m.globalCompositeOperation='destination-out';
      m.translate(player.x-camera.x,player.y-camera.y);m.rotate(player.facing);
      m.drawImage(beamTexture.canvas,LIGHTING.bowOffset,-beamTexture.height/2,beamTexture.width,beamTexture.height);
      m.restore();
    }
    // Copy backing pixels 1:1 to avoid a faint seam at fractional CSS sizes.
    ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(darknessCanvas,0,0);ctx.restore();
  }
  function drawStation(){
    ctx.save();ctx.translate(600,149);
    const g=ctx.createRadialGradient(0,0,15,0,0,140);g.addColorStop(0,'#57c8ce3d');g.addColorStop(1,'#57c8ce00');ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,140,0,TAU);ctx.fill();
    ctx.fillStyle='#18394a';ctx.fillRect(-89,-16,178,31);ctx.fillStyle='#326777';ctx.fillRect(-76,-25,152,10);
    ctx.fillStyle='#48a6a8';ctx.fillRect(-12,-49,24,27);ctx.strokeStyle='#91e6d5';ctx.lineWidth=2;ctx.strokeRect(-89,-16,178,31);
    for(const xx of [-72,-47,-22,22,47,72]){ctx.fillStyle='#8de9d5';ctx.fillRect(xx,-7,9,4);}
    ctx.fillStyle='#a5ddd8';ctx.textAlign='center';ctx.font='bold 10px monospace';ctx.fillText('NEREID / SURFACE STATION',0,-58);
    ctx.restore();
  }
  function drawTrench(){
    const ymin=Math.max(110,Math.floor((camera.y-80)/25)*25),ymax=camera.y+viewport.h+100;
    for(let side=0;side<2;side++){
      ctx.beginPath();
      for(let y=ymin;y<=ymax;y+=18){const x=side===0?leftAt(y):rightAt(y);if(y===ymin)ctx.moveTo(x,y);else ctx.lineTo(x,y);}
      const ex=side===0?Math.min(camera.x-200,leftAt(ymin)-200):Math.max(camera.x+viewport.w+200,rightAt(ymin)+200);
      ctx.lineTo(ex,ymax);ctx.lineTo(ex,ymin);ctx.closePath();
      const grad=ctx.createLinearGradient(side===0?leftAt(ymin)-130:rightAt(ymin)+130,0,side===0?leftAt(ymin)+75:rightAt(ymin)-75,0);
      if(side===0){grad.addColorStop(0,'#020b16');grad.addColorStop(1,'#173746');}
      else{grad.addColorStop(0,'#020b16');grad.addColorStop(1,'#173746');}
      ctx.fillStyle=grad;ctx.fill();
      ctx.beginPath();for(let y=ymin;y<=ymax;y+=18){const x=side===0?leftAt(y):rightAt(y);if(y===ymin)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.strokeStyle='#3d718044';ctx.lineWidth=5;ctx.stroke();
      ctx.strokeStyle='#76d2d51b';ctx.lineWidth=1;ctx.stroke();
    }
  }
  function drawRock(rock){
    ctx.save();ctx.translate(rock.x,rock.y);ctx.rotate(rock.rot);
    ctx.beginPath();for(let i=0;i<rock.spikes;i++){const a=i/rock.spikes*TAU;const radius=rock.radius*(.78+Math.sin(i*10+rock.seed*99)*.19);const x=Math.cos(a)*radius,y=Math.sin(a)*radius;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.closePath();
    ctx.fillStyle='#102938';ctx.fill();ctx.strokeStyle='#2c576b';ctx.lineWidth=2;ctx.stroke();
    ctx.beginPath();ctx.moveTo(-rock.radius*.55,-rock.radius*.14);ctx.lineTo(-rock.radius*.14,-rock.radius*.52);ctx.lineTo(rock.radius*.5,-rock.radius*.31);ctx.strokeStyle='#4170834a';ctx.stroke();
    ctx.restore();
  }
  function drawWreck(w){
    ctx.save();ctx.translate(w.x,w.y);ctx.rotate(-.5);
    ctx.fillStyle='#183541';ctx.strokeStyle='#54798b';ctx.lineWidth=2;
    ctx.beginPath();ctx.ellipse(0,0,49,17,0,0,TAU);ctx.fill();ctx.stroke();
    ctx.fillRect(-7,-27,14,17);ctx.strokeRect(-7,-27,14,17);
    for(let i=0;i<4;i++){ctx.fillStyle=i%2?'#c47b4f':'#547f87';ctx.fillRect(-24+i*13,-4,6,6);}
    ctx.restore();
  }
  function drawItem(item,sonared){
    const {x,y,type}=item,phase=clock*1.8+(item.animationSeed||0);
    ctx.save();ctx.translate(x,y);
    const color=type==='recorder'?'#efbd77':type==='crystal'?'#ab96f5':type==='air'?'#60d5f6':'#8ce4c9';
    const glow=ctx.createRadialGradient(0,0,0,0,0,type==='recorder'?44:27);glow.addColorStop(0,color+'66');glow.addColorStop(1,color+'00');ctx.fillStyle=glow;ctx.beginPath();ctx.arc(0,0,type==='recorder'?44:27,0,TAU);ctx.fill();
    ctx.rotate(Math.sin(phase)*.15);
    if(type==='recorder'){
      ctx.fillStyle='#ad7844';ctx.strokeStyle='#ffe0a0';ctx.lineWidth=2;ctx.fillRect(-12,-9,24,18);ctx.strokeRect(-12,-9,24,18);ctx.beginPath();ctx.moveTo(-5,0);ctx.lineTo(5,0);ctx.stroke();
      ctx.save();ctx.rotate(clock*.4);ctx.strokeStyle='#ffd28d77';ctx.strokeRect(-20,-20,40,40);ctx.restore();
    } else if(type==='crystal'){
      ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(0,-14);ctx.lineTo(10,-4);ctx.lineTo(5,10);ctx.lineTo(-7,13);ctx.lineTo(-11,-4);ctx.closePath();ctx.fill();
    } else if(type==='air'){
      ctx.strokeStyle=color;ctx.fillStyle='#14516d';ctx.lineWidth=2;ctx.fillRect(-10,-11,20,22);ctx.strokeRect(-10,-11,20,22);ctx.fillStyle='#8addf6';ctx.fillRect(-2,-6,4,12);ctx.fillRect(-6,-2,12,4);
    } else {
      ctx.fillStyle='#4b807f';ctx.strokeStyle='#b2e8d1';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(-12,-7);ctx.lineTo(4,-12);ctx.lineTo(13,1);ctx.lineTo(7,11);ctx.lineTo(-10,9);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#d2ffec';ctx.fillRect(-4,-3,7,3);
    }
    if(sonared){ctx.strokeStyle=color+'aa';ctx.lineWidth=1;ctx.beginPath();ctx.arc(0,0,17+Math.sin(clock*5)*2,0,TAU);ctx.stroke();}
    ctx.restore();
  }
  function mineOutline(){
    ctx.beginPath();ctx.arc(0,0,8,0,TAU);
    for(let i=0;i<8;i++){const a=i*TAU/8;ctx.moveTo(Math.cos(a)*8,Math.sin(a)*8);ctx.lineTo(Math.cos(a)*13,Math.sin(a)*13);}
  }
  function drawMine(mine){
    ctx.save();ctx.translate(mine.x,mine.y);
    mineOutline();ctx.fillStyle='#243740';ctx.strokeStyle=clock>=mine.armedAt?'#f3c489':'#82bac9';ctx.lineWidth=1.6;ctx.fill();ctx.stroke();
    ctx.fillStyle=clock>=mine.armedAt?(Math.sin(clock*7)>0?'#ffc76d':'#a66b35'):'#6ebbd5';
    ctx.beginPath();ctx.arc(0,0,3,0,TAU);ctx.fill();
    ctx.font='bold 8px monospace';ctx.textAlign='center';ctx.fillStyle='#e6c99d';if(distance(player,mine)>85)ctx.fillText('MK '+roman(mine.mark),0,24);ctx.restore();
  }
  function drawMineBlast(blast){
    const age=clamp((clock-blast.birth)/.65,0,1),r=Math.max(2,blast.radius*Math.sqrt(age));
    ctx.save();ctx.translate(blast.x,blast.y);ctx.globalAlpha=1-age;
    const g=ctx.createRadialGradient(0,0,0,0,0,r);g.addColorStop(0,'#fff0bca0');g.addColorStop(.35,'#ffc67458');g.addColorStop(1,'#ef815800');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,r,0,TAU);ctx.fill();
    ctx.strokeStyle='#ffe1a4';ctx.lineWidth=2*(1-age)+.5;ctx.beginPath();ctx.arc(0,0,r,0,TAU);ctx.stroke();
    for(let i=0;i<10;i++){const a=i*TAU/10;ctx.fillStyle='#a7e3df';ctx.beginPath();ctx.arc(Math.cos(a)*r*.7,Math.sin(a)*r*.7,2*(1-age)+.5,0,TAU);ctx.fill();}
    ctx.restore();
  }
  function drawPredatorHealth(enemy,local=false){
    if(!predatorAlive(enemy))return;
    const tier=PREDATOR_TIERS[enemy.tier],w=46+tier.level*8;
    ctx.save();if(!local)ctx.translate(enemy.x,enemy.y);
    ctx.fillStyle='#05121cd9';ctx.fillRect(-w/2-3,-50,w+6,22);
    ctx.fillStyle=enemy.tier==='reaper'?'#ff9a86':enemy.tier==='apex'?'#d3a1ff':'#a5e0df';
    ctx.font='bold 8px monospace';ctx.textAlign='center';ctx.fillText('T'+tier.level+' · '+Math.ceil(enemy.health)+'/'+enemy.maxHealth,0,-39);
    ctx.fillStyle='#314352';ctx.fillRect(-w/2,-34,w,3);
    ctx.fillStyle=clock-(enemy.lastDamaged??-100)<.2?'#fff1d1':enemy.tier==='reaper'?'#fa7e70':enemy.tier==='apex'?'#c991f4':'#78cbbb';
    ctx.fillRect(-w/2,-34,w*clamp(enemy.health/enemy.maxHealth,0,1),3);ctx.restore();
  }
  function drawEnemy(enemy){
    if(enemy.tier==='reaper'){drawReaper(enemy);return;}
    const alert=enemy.aggression>.15,apex=enemy.tier==='apex';
    const a=Math.atan2(enemy.vy,enemy.vx);
    ctx.save();ctx.translate(enemy.x,enemy.y);ctx.rotate(a);
    if(apex)ctx.scale(1.25,1.25);
    const aura=apex?(alert?'#b249ff85':'#844bd060'):(alert?'#d75b5c50':'#487a8750');
    const glow=ctx.createRadialGradient(0,0,0,0,0,48);
    glow.addColorStop(0,aura);glow.addColorStop(1,'#00000000');
    ctx.fillStyle=glow;ctx.beginPath();ctx.arc(0,0,48,0,TAU);ctx.fill();
    ctx.fillStyle=apex?'#3e174f':'#143341';
    ctx.strokeStyle=apex?'#e28bff':alert?'#d37979':'#527d88';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(24,0);ctx.quadraticCurveTo(2,-14,-17,-10);
    ctx.lineTo(-31,-19);ctx.lineTo(-27,0);ctx.lineTo(-31,19);
    ctx.lineTo(-17,10);ctx.quadraticCurveTo(2,14,24,0);ctx.fill();ctx.stroke();
    if(apex){
      ctx.strokeStyle='#ab6be4';ctx.beginPath();ctx.moveTo(-4,-8);ctx.lineTo(4,-19);ctx.lineTo(11,-7);
      ctx.moveTo(-4,8);ctx.lineTo(4,19);ctx.lineTo(11,7);ctx.stroke();
    }
    ctx.fillStyle=apex?'#ffdbff':'#f88079';ctx.beginPath();ctx.arc(11,-4,apex?3.2:2.6,0,TAU);ctx.fill();
    ctx.restore();
  }
  function reaperOutline(){
    ctx.beginPath();ctx.moveTo(35,0);ctx.lineTo(18,-7);ctx.lineTo(12,-12);
    ctx.lineTo(-2,-26);ctx.lineTo(-7,-12);ctx.lineTo(-23,-8);
    ctx.lineTo(-43,-20);ctx.lineTo(-32,0);ctx.lineTo(-43,20);
    ctx.lineTo(-23,8);ctx.lineTo(-7,12);ctx.lineTo(-2,26);
    ctx.lineTo(12,12);ctx.lineTo(18,7);ctx.closePath();
  }
  function drawReaper(enemy){
    ctx.save();ctx.translate(enemy.x,enemy.y);ctx.rotate(Math.atan2(enemy.vy,enemy.vx));
    const glow=ctx.createRadialGradient(0,0,1,0,0,63);
    glow.addColorStop(0,enemy.aggression>.13?'#ff453b66':'#b532402e');glow.addColorStop(1,'#00000000');
    ctx.fillStyle=glow;ctx.beginPath();ctx.arc(0,0,63,0,TAU);ctx.fill();
    reaperOutline();ctx.fillStyle='#37151e';ctx.strokeStyle='#ff796e';ctx.lineWidth=2;ctx.fill();ctx.stroke();
    ctx.strokeStyle='#efae78';ctx.lineWidth=1.2;
    for(const y of [-1,1]){
      ctx.beginPath();ctx.moveTo(10,y*7);ctx.lineTo(-8,y*9);ctx.lineTo(-25,y*3);ctx.stroke();
      for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(28-i*5,y*3);ctx.lineTo(24-i*5,0);ctx.stroke();}
    }
    ctx.fillStyle='#fff0c2';ctx.beginPath();ctx.arc(18,-5,3,0,TAU);ctx.arc(18,5,3,0,TAU);ctx.fill();
    ctx.restore();
  }
  function drawLightBeam(){
    ctx.save();ctx.translate(player.x,player.y);ctx.rotate(player.facing);
    // The visible light scatter and the mask use exactly the same cone texture.
    ctx.globalAlpha=.20;
    ctx.drawImage(beamTexture.canvas,LIGHTING.bowOffset,-beamTexture.height/2,beamTexture.width,beamTexture.height);
    ctx.restore();
  }
  // NEREID MK-II concept: compact hydrodynamic ceramic hull, titanium spine,
  // observation canopy, swept fins and a softly animated dual-jet stern.
  // Visual footprint preserves the original 3-circle collision capsule.
  function drawPlayer(){
    ctx.save();ctx.translate(player.x,player.y);ctx.rotate(player.facing);
    const thrust=clamp(Math.hypot(player.vx,player.vy)/145,0,1);
    if(player.damageCooldown>0&&Math.sin(clock*30)>0)ctx.globalAlpha=.67;

    // Propulsion shimmer and micro-bubble trail live behind the moving hull.
    if(player.boosting){
      const jet=ctx.createLinearGradient(-31,0,-88,0);
      jet.addColorStop(0,'#dcffffdd');jet.addColorStop(.3,'#65eaff88');jet.addColorStop(1,'#34b5ff00');
      ctx.fillStyle=jet;ctx.beginPath();ctx.moveTo(-30,-7);ctx.lineTo(-92-Math.sin(clock*38)*6,0);ctx.lineTo(-30,7);ctx.closePath();ctx.fill();
    }
    if(thrust>.09){
      const engineGlow=ctx.createRadialGradient(-30,0,1,-37,0,23+thrust*9);
      engineGlow.addColorStop(0,'rgba(155,248,250,.5)');engineGlow.addColorStop(1,'rgba(57,195,229,0)');
      ctx.fillStyle=engineGlow;ctx.beginPath();ctx.ellipse(-34,0,24+thrust*11,13,0,0,TAU);ctx.fill();
      for(let i=0;i<3;i++){
        const drift=(clock*(24+thrust*30)+i*12)%38;
        const by=(i-1)*5+Math.sin(clock*8+i*3)*2;
        ctx.fillStyle=`rgba(135,232,239,${(.42+thrust*.3)*(1-drift/42)})`;
        ctx.beginPath();ctx.arc(-33-drift,by,1.1+i*.35,0,TAU);ctx.fill();
      }
    }

    // Tail planes, keel and armour silhouette.
    ctx.fillStyle='#1b4657';ctx.strokeStyle='#69b9c5';ctx.lineWidth=1.15;
    ctx.beginPath();ctx.moveTo(-23,-6);ctx.lineTo(-32,-18);ctx.lineTo(-21,-12);ctx.lineTo(-12,-7);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.moveTo(-23,6);ctx.lineTo(-32,18);ctx.lineTo(-21,12);ctx.lineTo(-12,7);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.fillStyle='#102d3b';ctx.beginPath();ctx.moveTo(-30,-8);ctx.lineTo(-34,-9);ctx.lineTo(-34,9);ctx.lineTo(-30,8);ctx.closePath();ctx.fill();
    ctx.strokeStyle='#ace9e6';ctx.lineWidth=1.1;ctx.beginPath();ctx.moveTo(-34,-10);ctx.lineTo(-34,10);ctx.stroke();
    // Two thruster vanes rotate in opposite visual phases, independent of game mechanics.
    for(const yy of [-5.7,5.7]){
      ctx.save();ctx.translate(-34,yy);ctx.rotate(clock*(thrust>.06?21:2));
      ctx.strokeStyle=thrust>.1?'#c6fdf2':'#70c9d1';ctx.lineWidth=1.2;
      ctx.beginPath();ctx.moveTo(-3,0);ctx.lineTo(3,0);ctx.moveTo(0,-3);ctx.lineTo(0,3);ctx.stroke();ctx.restore();
    }

    const shell=ctx.createLinearGradient(0,-13,0,14);
    shell.addColorStop(0,'#d2edf0');shell.addColorStop(.15,'#6dabb8');shell.addColorStop(.43,'#285e70');shell.addColorStop(.72,'#15394e');shell.addColorStop(1,'#092837');
    ctx.shadowColor='#0e070f';ctx.shadowBlur=10;ctx.shadowOffsetY=3;
    ctx.beginPath();ctx.moveTo(-26,-7);
    ctx.bezierCurveTo(-17,-12,10,-13,20,-8);
    ctx.quadraticCurveTo(30,-4,31,0);
    ctx.quadraticCurveTo(30,4,20,8);
    ctx.bezierCurveTo(10,13,-17,12,-26,7);
    ctx.quadraticCurveTo(-30,0,-26,-7);ctx.closePath();
    ctx.fillStyle=shell;ctx.fill();ctx.shadowBlur=0;ctx.shadowOffsetY=0;
    ctx.strokeStyle='#b2f2ec';ctx.lineWidth=1.5;ctx.stroke();

    // Sleek top ridge, segmented pressure ribs, and glowing cyan equipment rail.
    ctx.strokeStyle='#edffff';ctx.lineWidth=.75;ctx.globalAlpha*=.5;
    ctx.beginPath();ctx.moveTo(-19,-8);ctx.bezierCurveTo(-4,-11,16,-8,23,-5);ctx.stroke();
    ctx.globalAlpha=player.damageCooldown>0&&Math.sin(clock*30)>0?.67:1;
    ctx.strokeStyle='#4fa4b1';ctx.lineWidth=1.1;
    for(const xx of [-14,-9,0]){
      ctx.beginPath();ctx.moveTo(xx,-9.8);ctx.lineTo(xx+1,-5.5);
      ctx.moveTo(xx,9.8);ctx.lineTo(xx+1,5.5);ctx.stroke();
    }
    ctx.strokeStyle='#69f4dc';ctx.lineWidth=1.25;
    ctx.beginPath();ctx.moveTo(-11,8.5);ctx.quadraticCurveTo(7,10,22,5.5);ctx.stroke();
    ctx.fillStyle='#9bffdc';ctx.beginPath();ctx.arc(-17,6,1.6,0,TAU);ctx.fill();

    // Dark smoked wraparound canopy with a curved specular reflection.
    const glass=ctx.createLinearGradient(2,-8,18,7);
    glass.addColorStop(0,'#d6fff5');glass.addColorStop(.24,'#4ccce3');glass.addColorStop(.57,'#176780');glass.addColorStop(1,'#072a40');
    ctx.beginPath();ctx.moveTo(4,-6);ctx.quadraticCurveTo(16,-8,21,-1);
    ctx.quadraticCurveTo(22,4,15,6);ctx.lineTo(4,5);
    ctx.quadraticCurveTo(0,0,4,-6);ctx.closePath();
    ctx.fillStyle=glass;ctx.fill();ctx.strokeStyle='#a1ffff';ctx.lineWidth=1;ctx.stroke();
    ctx.strokeStyle='#e0ffffaa';ctx.lineWidth=.9;ctx.beginPath();ctx.moveTo(5,-5);ctx.quadraticCurveTo(11,-6,17,-3);ctx.stroke();
    // Navigation lights and angled twin bow lamps.
    ctx.fillStyle='#ffc67c';ctx.shadowColor='#ffb866';ctx.shadowBlur=7;
    for(const yy of [-5.1,5.1]){ctx.beginPath();ctx.arc(25,yy,1.8,0,TAU);ctx.fill();}
    ctx.shadowBlur=0;
    ctx.fillStyle='#d6fcf5';ctx.beginPath();ctx.moveTo(28,-2.2);ctx.lineTo(32,-1);ctx.lineTo(32,1);ctx.lineTo(28,2.2);ctx.closePath();ctx.fill();
    // Subtle bow chevron and mission stripes.
    ctx.strokeStyle='#eece89';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-4,-4);ctx.lineTo(-1,0);ctx.lineTo(-4,4);ctx.stroke();
    ctx.restore();
  }
  function drawWave(w){
    const t=clamp((clock-w.birth)/w.duration,0,1),r=w.front;
    ctx.beginPath();ctx.arc(w.x,w.y,r,0,TAU);ctx.strokeStyle=`rgba(114,237,225,${.85*(1-t)})`;ctx.lineWidth=2.3;ctx.stroke();
    ctx.beginPath();ctx.arc(w.x,w.y,Math.max(0,r-15),0,TAU);ctx.strokeStyle=`rgba(114,237,225,${.25*(1-t)})`;ctx.lineWidth=12;ctx.stroke();
  }
  function drawSonarEchoes(){
    ctx.save();ctx.translate(-camera.x,-camera.y);
    for(const wave of sonarWaves)drawWave(wave);
    const echo=(object,kind)=>{
      if(object.collected||object.dead||object.detonated||!(object.revealUntil>clock)||!onscreen(object.x,object.y,110))return;
      const remaining=clamp((object.revealUntil-clock)/(object.echoDuration||SONAR.echoSeconds),0,1);
      ctx.save();ctx.translate(object.x,object.y);ctx.globalAlpha=Math.min(.92,remaining*1.5);
      ctx.strokeStyle='#7debd9';ctx.lineWidth=1.35;
      if(kind==='items'){
        const type=object.type;
        ctx.strokeStyle=type==='recorder'?'#ffd28d':type==='crystal'?'#bea5ff':type==='air'?'#7ee5ff':'#8debd3';
        if(type==='recorder'){ctx.strokeRect(-12,-9,24,18);ctx.strokeRect(-5,-2,10,4);}
        else if(type==='crystal'){ctx.beginPath();ctx.moveTo(0,-13);ctx.lineTo(10,0);ctx.lineTo(0,13);ctx.lineTo(-10,0);ctx.closePath();ctx.stroke();}
        else if(type==='air'){ctx.strokeRect(-9,-11,18,22);ctx.beginPath();ctx.moveTo(-5,0);ctx.lineTo(5,0);ctx.moveTo(0,-5);ctx.lineTo(0,5);ctx.stroke();}
        else{ctx.strokeRect(-8,-8,16,16);ctx.beginPath();ctx.moveTo(-8,4);ctx.lineTo(8,-4);ctx.stroke();}
        ctx.beginPath();ctx.arc(0,0,21,0,TAU);ctx.stroke();
      }else if(kind==='predators'){
        const tier=PREDATOR_TIERS[object.tier]||PREDATOR_TIERS.common;
        ctx.strokeStyle=object.tier==='reaper'?'#ff796e':object.tier==='apex'?'#d597ff':'#ffac99';
        ctx.save();ctx.rotate(Math.atan2(object.vy,object.vx));
        if(object.tier==='reaper')reaperOutline();
        else{
          if(object.tier==='apex')ctx.scale(1.25,1.25);
          ctx.beginPath();ctx.moveTo(24,0);ctx.quadraticCurveTo(2,-14,-17,-10);ctx.lineTo(-31,-19);ctx.lineTo(-27,0);ctx.lineTo(-31,19);ctx.lineTo(-17,10);ctx.quadraticCurveTo(2,14,24,0);
        }
        ctx.stroke();ctx.restore();
        ctx.font='bold 9px monospace';ctx.textAlign='center';ctx.fillStyle=ctx.strokeStyle;
        ctx.fillText('T'+tier.level+' '+tier.name,0,-58);
        drawPredatorHealth(object,true);
      }else if(kind==='mines'){
        ctx.strokeStyle='#ffd598';mineOutline();ctx.stroke();
        ctx.font='bold 8px monospace';ctx.textAlign='center';ctx.fillStyle='#ffd598';if(distance(player,object)>85)ctx.fillText('MINE '+roman(object.mark),0,23);
      }else if(kind==='rocks'){
        ctx.beginPath();object.vertices.forEach((p,i)=>{if(i===0)ctx.moveTo(p.x-object.x,p.y-object.y);else ctx.lineTo(p.x-object.x,p.y-object.y);});ctx.closePath();ctx.stroke();
      }else if(kind==='wrecks'){
        ctx.rotate(-.5);ctx.beginPath();ctx.ellipse(0,0,49,17,0,0,TAU);ctx.stroke();ctx.strokeRect(-7,-27,14,17);
      }else if(kind==='vents'){
        ctx.beginPath();ctx.ellipse(0,0,13,6,0,0,TAU);ctx.moveTo(-4,-4);ctx.lineTo(-7,-22);ctx.moveTo(5,-5);ctx.lineTo(8,-30);ctx.stroke();
      }else if(kind==='wall'){
        ctx.beginPath();const edge=object.side<0?leftAt:rightAt;
        ctx.moveTo(edge(object.y-12)-object.x,-12);ctx.lineTo(0,0);ctx.lineTo(edge(object.y+12)-object.x,12);ctx.stroke();
      }
      ctx.restore();
    };
    for(const kind of ['rocks','wrecks','vents','items','predators','mines'])for(const object of scene[kind])echo(object,kind);
    for(const wall of sonarTerrainEchoes)echo(wall,'wall');
    ctx.restore();
  }
  function drawMouseTarget(){
    if(mouseHelm.pointerId===null||!running||paused)return;
    const rect=canvas.getBoundingClientRect(),x=(mouseHelm.clientX-rect.left)*viewport.w/(rect.width||1),y=(mouseHelm.clientY-rect.top)*viewport.h/(rect.height||1);
    ctx.save();ctx.strokeStyle=player.boosting?'#b5f2ff':'#8adfce';ctx.lineWidth=1.2;ctx.globalAlpha=.8;
    ctx.beginPath();ctx.arc(x,y,10,0,TAU);ctx.moveTo(x-15,y);ctx.lineTo(x-7,y);ctx.moveTo(x+7,y);ctx.lineTo(x+15,y);ctx.moveTo(x,y-15);ctx.lineTo(x,y-7);ctx.moveTo(x,y+7);ctx.lineTo(x,y+15);ctx.stroke();ctx.restore();
  }
  function drawEdgeArrows(){
    if(!player||!running)return;
    const missing=scene.items.filter(i=>i.type==='recorder'&&!i.collected);
    if(!missing.length)return;
    let target=missing[0],best=Infinity;
    for(const item of missing){const d=distance(player,item);if(d<best){target=item;best=d;}}
    const dx=target.x-player.x,dy=target.y-player.y;
    const a=Math.atan2(dy,dx);
    const px=viewport.screenW/2+Math.cos(a)*Math.min(viewport.screenW*.34,170),py=viewport.screenH*.5+Math.sin(a)*Math.min(viewport.screenH*.35,125);
    ctx.save();ctx.setTransform(viewport.dpr,0,0,viewport.dpr,0,0);ctx.translate(px,py);ctx.rotate(a);ctx.globalAlpha=.72+Math.sin(clock*3)*.18;ctx.fillStyle='#e8b776';ctx.beginPath();ctx.moveTo(11,0);ctx.lineTo(-5,-6);ctx.lineTo(-2,0);ctx.lineTo(-5,6);ctx.closePath();ctx.fill();ctx.restore();
  }
  function drawRadar(){
    if(!player)return;
    const W=radar.width,H=radar.height,cx=W/2,cy=H/2;
    rctx.clearRect(0,0,W,H);rctx.fillStyle='#071824';rctx.fillRect(0,0,W,H);
    rctx.strokeStyle='#1a4556';rctx.lineWidth=1;
    for(let rr=32;rr<=98;rr+=33){rctx.beginPath();rctx.ellipse(cx,cy,rr*1.8,rr,0,0,TAU);rctx.stroke();}
    rctx.beginPath();rctx.moveTo(cx,0);rctx.lineTo(cx,H);rctx.moveTo(0,cy);rctx.lineTo(W,cy);rctx.stroke();
    const range=sonarRange()*1.8;
    const dot=(x,y,color,size=4)=>{
      const px=cx+(x-player.x)/range*(W*.47),py=cy+(y-player.y)/range*(H*.43);
      if(px<4||px>W-4||py<4||py>H-4)return;
      rctx.fillStyle=color;rctx.beginPath();rctx.arc(px,py,size,0,TAU);rctx.fill();
    };
    for(const item of scene.items)if(!item.collected&&(item.revealUntil>clock||distance(player,item)<120)){
      if(item.type==='recorder')dot(item.x,item.y,'#f4c685',5);
      else dot(item.x,item.y,'#4f9d9e',2);
    }
    for(const enemy of scene.predators)if(distance(player,enemy)<(enemy.tier==='reaper'?260:enemy.tier==='apex'?205:130)||enemy.revealUntil>clock)dot(enemy.x,enemy.y,enemy.tier==='reaper'?'#ff665b':enemy.tier==='apex'?'#d683ff':'#ed7873',enemy.tier==='reaper'?7:enemy.tier==='apex'?6:4);
    for(const mine of scene.mines)dot(mine.x,mine.y,'#f2bc74',3);
    dot(player.x,player.y,'#b8ffe9',6);
    rctx.save();rctx.translate(cx,cy);rctx.rotate(player.facing);rctx.strokeStyle='#b7ffe8';rctx.beginPath();rctx.moveTo(14,0);rctx.lineTo(4,-6);rctx.moveTo(14,0);rctx.lineTo(4,6);rctx.stroke();rctx.restore();
    const sweep=(clock*.55)%TAU;
    rctx.save();rctx.translate(cx,cy);rctx.rotate(sweep);const g=rctx.createLinearGradient(0,0,140,0);g.addColorStop(0,'#68d2d226');g.addColorStop(1,'#68d2d200');rctx.fillStyle=g;rctx.beginPath();rctx.moveTo(0,0);rctx.arc(0,0,190,-.2,.2);rctx.closePath();rctx.fill();rctx.restore();
  }
  function updateUI(){
    if(!player)return;
    const depth=depthOf(player.y),rating=safeDepth(),zone=zoneFor(depth);
    $('depthStat').textContent=depth;$('ratingStat').textContent=rating.toLocaleString('en-GB');
    $('depthBar').style.width=clamp(depth/rating*100,0,100)+'%';
    $('pressureTab').classList.toggle('alert',depth>rating);
    $('depthTab').classList.toggle('alert',depth>rating);
    $('pressureTab').setAttribute('aria-label','Safe pressure limit '+rating+' metres'+(depth>rating?', exceeded':''));
    const enemyClose=scene.predators.some(e=>e.aggression>.15&&distance(player,e)<240);
    const apexClose=scene.predators.some(e=>e.tier==='apex'&&e.aggression>.15&&distance(player,e)<300);
    const reaperClose=scene.predators.some(e=>e.tier==='reaper'&&e.aggression>.15&&distance(player,e)<360);
    const st=depth>rating?'PRESSURE ALERT':reaperClose?'REAPER CONTACT':apexClose?'APEX CONTACT':enemyClose?'PREDATOR ALERT':player.oxygen<20?'LOW OXYGEN':player.battery<15?'LOW POWER':'NOMINAL';
    $('statusStat').textContent=st;$('statusStat').className=(st==='NOMINAL'?'status-safe':st==='PREDATOR ALERT'||st==='APEX CONTACT'||st==='REAPER CONTACT'||st==='PRESSURE ALERT'?'status-danger':'status-warning');
    $('signalText').textContent=st==='NOMINAL'?'VESSEL ONLINE':'VESSEL WARNING';
    const setGauge=(kind,value,max)=>{const pct=clamp(value/max*100,0,100);$(kind+'Value').textContent=Math.round(pct)+'%';$(kind+'Bar').style.width=pct+'%';
      $(kind+'Tab').classList.toggle('alert',kind==='noise'?pct>75:pct<(kind==='hull'?35:kind==='oxygen'?25:20));};
    setGauge('hull',player.hull,maxHull());setGauge('oxygen',player.oxygen,maxOxygen());setGauge('battery',player.battery,maxBattery());setGauge('noise',player.noise,100);
    $('coordsText').textContent=zone.code+' · '+zone.name;
    const sonarCooling=player.scanCooldown>0;
    $('sonarText').textContent=sonarCooling?Math.ceil(player.scanCooldown)+'s':player.battery<sonarCost()?'LOW':'READY';
    const sonarPct=sonarCooling?clamp(1-player.scanCooldown/(player.scanDuration||sonarCooldown()),0,1)*100:100;
    $('sonarBar').style.width=sonarPct+'%';
    $('mobileSonar').style.setProperty('--ring',sonarPct);
    $('sonarStatus').textContent=sonarCooling?'RECHARGING':player.battery<sonarCost()?'LOW POWER':sonarCost()+' POWER / PING';
    $('sonarMeter').classList.toggle('cooling',sonarCooling);
    $('sonarButtonLabel').textContent=sonarCooling?Math.ceil(player.scanCooldown)+'s':player.battery<sonarCost()?'LOW':'READY';
    $('mobileSonar').classList.toggle('cooling',sonarCooling);
    $('mobileSonar').setAttribute('aria-disabled',String(sonarCooling||player.battery<sonarCost()));
    $('mobileSonar').setAttribute('aria-label',sonarCooling?'Sonar recharging, '+Math.ceil(player.scanCooldown)+' seconds':'Ping sonar, costs '+sonarCost()+' power');
    const boostPct=boostCapacity()?Math.round(clamp(player.boost/boostCapacity(),0,1)*100):0;
    const boostStatus=!boostUnlocked()?'BUY MK I THRUSTERS':player.battery<=.5?'NO POWER':player.boosting?'BOOSTING':player.boostLocked?'RECHARGING':player.boostNeedsRelease?'RELEASE TO REARM':player.boost>=boostCapacity()?'READY':player.boostRechargeDelay>0?'COOLING':'CHARGING';
    $('boostStatus').textContent=boostStatus;
    $('boostValue').textContent=boostUnlocked()?boostPct+'%':'LOCKED';$('boostBar').style.width=boostPct+'%';
    $('boostMeter').classList.toggle('boost-active',Boolean(player.boosting));
    $('boostMeter').classList.toggle('boost-locked',Boolean(player.boostLocked));
    $('mobileBoostLabel').textContent=boostUnlocked()?boostPct+'%':'LOCKED';
    $('mobileBoost').classList.toggle('equipment-locked',!boostUnlocked());
    $('boostMeter').classList.toggle('equipment-locked',!boostUnlocked());
    $('mobileBoost').style.setProperty('--ring',boostPct);
    $('mobileBoost').setAttribute('aria-disabled',String(!boostUnlocked()||player.boostLocked||player.battery<=.5||paused||!running));
    $('mobileBoost').classList.toggle('active',Boolean(player.boosting));
    $('mobileBoost').classList.toggle('cooling',Boolean(player.boostLocked));
    $('mobileBoost').setAttribute('aria-label','Hold to boost, '+boostPct+' percent charge, '+boostStatus.toLowerCase());
    const minesReady=saved.upgrades.minePower>0,mineCooling=player.mineCooldown>0;
    const mineStatus=!minesReady?'NOT FITTED':player.mineAmmo<=0?'BUY AT DOCK':mineCooling?'CYCLING':'READY';
    $('mineAmmoValue').textContent=minesReady?player.mineAmmo+'/'+mineCapacity():'LOCKED';
    $('mineState').textContent=minesReady?'MK '+roman(saved.upgrades.minePower)+' · '+mineStatus:'BUY AT DOCK';
    $('mobileMineLabel').textContent=minesReady?player.mineAmmo+'/'+mineCapacity():'LOCKED';
    $('mineBar').style.width=(minesReady?player.mineAmmo/mineCapacity()*100:0)+'%';
    $('mineReadout').classList.toggle('empty',!minesReady||player.mineAmmo<=0);
    for(const id of ['mobileMine']){
      const b=$(id);b.classList.toggle('empty',!minesReady||player.mineAmmo<=0);b.classList.toggle('cooling',mineCooling);
      b.setAttribute('aria-disabled',String(!minesReady||player.mineAmmo<=0||mineCooling||paused||!running));
      b.setAttribute('aria-label',minesReady?'Deploy sea mine. '+player.mineAmmo+' of '+mineCapacity()+' remaining. '+mineStatus:'Buy Mk I sea mines at the dock');
    }
    $('radarStatus').textContent=player.scanCooldown>0?'COOLDOWN':'ACTIVE';
    const count=saved.secured.length,loose=player.cargo.recorders.length;
    $('fragmentCount').textContent=count+' / '+RECORDERS_TOTAL;
    $('fragmentIcons').innerHTML=RECORDER_DEPTHS.map((_,i)=>`<span class="${saved.secured.includes(i)?'filled':player.cargo.recorders.includes(i)?'loose':''}">${saved.secured.includes(i)?'◆':player.cargo.recorders.includes(i)?'◈':'◇'}</span>`).join('');
    $('scrapCount').textContent=player.cargo.scrap;$('crystalCount').textContent=player.cargo.crystal;$('looseCount').textContent=loose;$('creditCount').textContent=saved.credits;
    const waiting=scene.items.filter(x=>x.type==='recorder'&&!x.collected);
    if(waiting.length){waiting.sort((a,b)=>distance(player,a)-distance(player,b));$('targetInfo').textContent='NEXT SIGNAL · '+RECORDER_DEPTHS[waiting[0].index]+' m DEPTH · '+Math.round(distance(player,waiting[0])/10)+' m AWAY';}
    else $('targetInfo').textContent=loose?'RETURN TO STATION TO SECURE RECORDER'+(loose>1?'S':''):count===RECORDERS_TOTAL?'EXPEDITION COMPLETED':'ALL SIGNALS SECURED · RETURN TO STATION';
    const lv=levelOf(saved.xp),prev=90*Math.pow(lv-1,2),next=90*Math.pow(lv,2);
    $('rankText').textContent='LV. '+lv+' · '+rankName(lv);
    $('rankFill').style.width=(clamp((saved.xp-prev)/(next-prev)*100,0,100))+'%';
    $('xpText').textContent=saved.xp+' / '+next+' XP';$('bestDepth').textContent='BEST: '+saved.bestDepth+' m';
    const station=nearestInteractable()?.type==='station';
    $('dockBtn').disabled=!station;$('dockBtn').textContent=station?'◈ DOCK · BANK SALVAGE · UPGRADE':'◈ RETURN TO STATION TO UPGRADE';
    const close=nearestInteractable();const prompt=$('interactionPrompt');
    if(running&&!paused&&close){
      prompt.textContent=(touchControls?'HOLD USE · ':'[ E ] ')+(close.type==='station'?'DOCK & UPGRADE':close.type==='recorder'?'RECOVER BLACK BOX':close.type==='air'?'CLAIM SUPPLY CACHE':'SALVAGE '+close.type.toUpperCase());prompt.classList.remove('hidden');
    } else prompt.classList.add('hidden');
    $('mobileSilent').classList.toggle('active',pointerSilent);
    $('mobileSilent').setAttribute('aria-pressed',String(pointerSilent));
    $('mobileInteract').classList.toggle('available',Boolean(running&&!paused&&close));
    $('mobileRepair').setAttribute('aria-disabled',String(paused||!running||player.cargo.scrap<2||player.hull>=maxHull()));
    $('lightsLabel').textContent=!player.lights?'OFF':headlightsActive()?'ON':'EMPTY';
    $('mobileLights').classList.toggle('active',headlightsActive());
    $('mobileLights').setAttribute('aria-pressed',String(player.lights));
    $('mobileLights').title='Flashlight Mk '+roman(saved.upgrades.flashlight)+' · '+(flashlightSpec().length/10)+' m reach';
    $('mobileLights').setAttribute('aria-label',!player.lights?'Turn flashlight on':headlightsActive()?'Turn flashlight off':'Flashlight has no battery power');
    const cruiseButton=$('mobileCruise');cruiseButton.classList.toggle('active',cruiseEnabled);cruiseButton.setAttribute('aria-pressed',String(cruiseEnabled));$('cruiseLabel').textContent=cruiseEnabled?'ON':'OFF';
    drawRadar();
  }
  let focusMode=false;
  function setFocusMode(on){
    focusMode=Boolean(on);
    document.body.classList.toggle('game-focus',focusMode);
    const toggle=$('focusToggleBtn');
    toggle.innerHTML=focusMode?`<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8h5V3m8 0v5h5M8 21v-5H3m18 0h-5v5"/></svg>`:`<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3H3v5m13-5h5v5M3 16v5h5m8 0h5v-5"/></svg>`;
    toggle.title=focusMode?'Exit expanded play view':'Expand play view';
    toggle.setAttribute('aria-label',focusMode?'Exit expanded play view':'Expand play view');
    toggle.setAttribute('aria-pressed',String(focusMode));
    // Let mobile layout finish, then update both canvas backing dimensions and camera.
    requestAnimationFrame(()=>resize());
  }
  function toggleFocusMode(){
    const willFocus=!focusMode;
    setFocusMode(willFocus);
    if(willFocus && document.fullscreenEnabled && !document.fullscreenElement && document.documentElement.requestFullscreen){
      document.documentElement.requestFullscreen({navigationUI:'hide'}).catch(()=>{});
    } else if(!willFocus && document.fullscreenElement && document.exitFullscreen){
      document.exitFullscreen().catch(()=>{});
    }
  }
  function resumeDive(){
    if(!running)return;
    paused=false;resetPilotInput();canvas.focus({preventScroll:true});
    $('pauseOverlay').classList.add('hidden');$('menuOverlay').classList.add('hidden');
    $('notification').classList.add('hidden');syncPauseButtons();updateUI();
  }
  function updateMainMenu(){
    $('saveStatus').textContent=storageHealthy?(storageRecovery?'RECOVERED CAMPAIGN BACKUP':'CAMPAIGN SAVED ON THIS DEVICE'):'STORAGE UNAVAILABLE · PROGRESS WILL NOT BE SAVED';
    $('saveStatus').classList.toggle('save-warning',!storageHealthy||storageRecovery);
    window.dispatchEvent(new Event('abyss-menu'));
    $('startBtn').innerHTML=running?'CONTINUE EXPEDITION <span>→</span>':'BEGIN EXPEDITION <span>→</span>';
    const existing=saved.bestDepth>0||saved.credits>0||saved.xp>0||saved.secured.length>0||Object.entries(saved.upgrades).some(([id,v])=>v>(defaults().upgrades[id]??0));
    $('menuProgress').textContent=running?'DIVE SUSPENDED · '+depthOf(player.y)+'m · '+player.cargo.recorders.length+' RECORDER(S) ABOARD':
      existing?'BANKED PROGRESS · '+saved.secured.length+'/'+RECORDERS_TOTAL+' RECORDERS · BEST '+saved.bestDepth+'m':'NEW CAPTAIN · NO SAVED PROGRESS';
  }
  function returnToMenu(preserveDive){
    resetPilotInput();
    $('modalOverlay').classList.add('hidden');$('pauseOverlay').classList.add('hidden');
    if(!preserveDive) {running=false;paused=false;persist();}
    else paused=true;
    syncPauseButtons();updateMainMenu();
    $('menuOverlay').classList.remove('hidden');updateUI();
  }
  function showPause(){
    if(!running||!$('menuOverlay').classList.contains('hidden'))return;
    paused=true;resetPilotInput();
    $('pauseStats').textContent='DEPTH '+depthOf(player.y)+'m  ·  HULL '+Math.round(player.hull/maxHull()*100)+'%  ·  RECORDERS '+player.cargo.recorders.length+' ABOARD';
    $('pauseOverlay').classList.remove('hidden');
    $('notification').classList.add('hidden');syncPauseButtons();updateUI();
  }
  function togglePause(){
    if(!$('modalOverlay').classList.contains('hidden')){closeDialog();return;}
    if(!running||!$('menuOverlay').classList.contains('hidden'))return;
    if(paused)resumeDive();else showPause();
  }
  function quitDiveConfirmation(){
    openDialog('MISSION CONTROL // ABORT','ABANDON THIS DIVE?',
      '<p class="dialog-info">Unbanked salvage and undelivered recorders will be lost. Secured recorders, upgrades, credits, rank and best depth will remain saved.</p>',
      '<div class="dialog-actions"><button id="cancelQuitBtn" class="alt-btn">GO BACK</button><button id="confirmQuitBtn" class="danger-btn">QUIT DIVE</button></div>');
    $('cancelQuitBtn').addEventListener('click',closeDialog);
    $('confirmQuitBtn').addEventListener('click',()=>returnToMenu(false));
  }
  function newGameConfirmation(){
    openDialog('EXPEDITION CONTROL // RESET','START A NEW GAME?',
      '<p class="dialog-info">This begins again from zero. <strong>All saved credits, upgrades, secured recorders, rank and best-depth records will be erased.</strong> Any current unbanked cargo will also be lost.</p>',
      '<div class="dialog-actions"><button id="cancelNewGameBtn" class="alt-btn">KEEP PROGRESS</button><button id="confirmNewGameBtn" class="danger-btn">START FRESH</button></div>');
    $('cancelNewGameBtn').addEventListener('click',closeDialog);
    $('confirmNewGameBtn').addEventListener('click',()=>{saved=defaults();field=freshField();campaignLevels={};campaignId='campaign-'+Date.now().toString(36)+'-'+field.seed.toString(36);storageRecovery=false;beamTexture=buildBeamTexture();launchDive();});
  }
  function launchDive(){newDive();enterMobileCockpit();}
  function enterMobileCockpit(){
    if(touchControls){
      setFocusMode(true);
      if(document.fullscreenEnabled&&!document.fullscreenElement&&document.documentElement.requestFullscreen){
        document.documentElement.requestFullscreen({navigationUI:'hide'}).catch(()=>{});
      }
    }
  }
  function briefing(){
    const body=`<div class="briefing"><p>You pilot the <strong>NEREID MK-II</strong>. Recover six golden recorders at 75, 260, 470, 725, 1,100 and 1,500 m and bring them to the surface.</p><ul>
      <li><strong>PC helm:</strong> hold the left mouse button over the water and move the cursor. The sub points and travels towards it, easing off when close. Release to coast to a stop. <kbd>WASD</kbd> / arrow keys still work.</li>
      <li><strong>Mobile:</strong> touch and drag anywhere over the water that is not a button. A minimal transparent joystick appears only after dragging and disappears on release. The left-side CRUISE button retains your heading after release; the large left USE button salvages while you steer.</li>
      <li><kbd>Space</kbd> / hold <strong>BOOST</strong>: requires Mk I magnetic thrusters. Mk I / II / III / IV offer 3 / 4 / 5 / 6 seconds of boost and progressively faster boosted speeds. Costs battery and boost charge. Charge recovers after 1.5 seconds; a fully emptied meter locks until full. Release to rearm. Boost is loud and overrides quiet running. Battery upgrades reduce its power drain and speed up recharge.</li>
      <li><kbd>Q</kbd> / <strong>PING</strong>: a sonar wave sweeps the entire current screen. Salvage, recorders, caches, predators, rocks, wrecks, vents and walls appear as fading echoes <strong>when the wave reaches them</strong>, even with lights off. It uses power, alerts reached predators and has a visible cooldown. It does not light up the water permanently.</li>
      <li><kbd>E</kbd> / <strong>USE</strong>: recover nearby objects or dock to bank cargo, refill systems and upgrade. <kbd>R</kbd> repairs 30 hull for 2 scrap. <kbd>L</kbd> toggles lights. <kbd>Shift</kbd> / <strong>SILENT</strong> reduces speed and noise.</li>
      <li>The water darkens gradually to total darkness at <strong>1,000 m</strong>. Only your forward lamp and temporary sonar echoes reveal the surroundings. Vessel name, class and pressure limit are pinned to the top of the screen, alongside depth and systems. The pressure tab turns red beyond your rating.</li>
      <li><kbd>F</kbd> / <strong>MINE</strong>: drop one proximity mine astern while steering or boosting. It arms after 0.65 seconds, then damages predators within its blast radius without harming your submarine. Mines remain until triggered, docking resets the field, or this expedition ends. The launcher cycles for 1.1 seconds; hold does not auto-fire. If the stern is obstructed, no ammo is spent.</li>
      <li><strong>Dock ordnance:</strong> buy Mk I warheads to unlock mines, then upgrade damage separately from the ammo rack. Warheads deal 60 / 110 / 180 / 240 damage; racks hold <strong>2 / 4 / 6 / 8 mines</strong>. The two-slot Mk I rack comes fitted. Buy rounds for 12 credits each in the dock AMMUNITION tab. Docking, launch, upgrades, death and reload never refill ammunition for free.</li>
      <li><strong>Three threat tiers:</strong> common blue drifters; rarer purple stalkers below 400 m; 15 rare crimson reapers across the wider trench, all below 800 m. Drifters have 100 HP, stalkers 200 HP and reapers 400 HP. Reaper chase speed matches Mk IV magnetic thrusters exactly: normal thrust cannot pull away in open water. Boost to create distance, or leave mines in its path. All tiers retain finite pursuit ranges. Health bars respect darkness and sonar visibility.</li>
      <li><strong>Exploration:</strong> mobile sees 43% farther in each direction; PC zoom is unchanged. The trench is three times wider, with more obstacles and hunters but fewer salvage pieces and much rarer crystals. The three clear navigation lanes keep descent routes open.</li>
      <li><strong>Flashlight Mk I–IV:</strong> the standard Mk I lamp reaches 26 m. Dock upgrades extend this to 36 / 48 / 62 m and widen the beam. The lamp draws power slowly only while on; battery upgrades improve efficiency. Switch it off with <kbd>L</kbd> / LIGHTS to conserve energy.</li>
      <li><strong>Persistent campaign resources:</strong> salvage and crystals are placed once for this campaign level. Collected deposits never return, even after docking or reloading. Scrap and crystal deposits each yield 2 units. The full untouched map banks 8,640 credits, about 92% of all upgrade costs before ammunition and repairs. Predators drop 2 / 4 / 8 scrap when destroyed; collect and dock to bank it. Predators and supply caches refresh on a genuine return to dock after departure. Drops persist until collected. Secured recorders never respawn. New Game resets the campaign; active dives still do not survive page reloads, so bank cargo first.</li>
      <li><kbd>Esc</kbd> / <strong>PAUSE</strong> freezes the dive. MENU suspends it for this session; QUIT loses unbanked cargo. NEW GAME asks before erasing saved progress. Refreshing the page does not preserve an active dive.</li>
    </ul></div>`;
    openDialog('OPERATIONS MANUAL // NEREID','PILOT BRIEFING',body,'<div class="dialog-actions"><button id="briefDone" class="alt-btn">UNDERSTOOD</button></div>');
    $('briefDone').addEventListener('click',closeDialog);
  }
  // Layout is measured only when its geometry changes, never in the render loop.
  // This keeps toasts/prompts clear of wrapped HUD rows and both control banks.
  function syncCockpitLayout(){
    const host=canvas.parentElement,frame=host.getBoundingClientRect();
    const hud=document.querySelector('.cockpit-hud').getBoundingClientRect();
    host.style.setProperty('--hud-bottom',Math.ceil(hud.bottom-frame.top)+'px');
    const controls=document.querySelector(touchControls?'.mobile-controls':'.desktop-keybinds').getBoundingClientRect();
    host.style.setProperty('--control-clearance',Math.ceil(frame.bottom-controls.top+14)+'px');
  }
  function syncInputMode(){
    touchControls=primaryPointer.matches;
    document.body.classList.toggle('touch-ui',touchControls);
    document.body.classList.toggle('desktop-ui',!touchControls);
  }
  function bind() {
    syncInputMode();
    const cockpitObserver=new ResizeObserver(syncCockpitLayout);
    for(const node of [canvas.parentElement,...document.querySelectorAll('.cockpit-hud,.mobile-controls,.desktop-keybinds')])cockpitObserver.observe(node);
    primaryPointer.addEventListener('change',()=>{resetPilotInput();syncInputMode();resize();syncCockpitLayout();updateUI();});
    $('startBtn').addEventListener('click',()=>{
      if(running)resumeDive();else launchDive();
    });
    $('newGameBtn').addEventListener('click',newGameConfirmation);
    $('resumeBtn').addEventListener('click',resumeDive);
    $('pauseMenuBtn').addEventListener('click',()=>returnToMenu(true));
    $('quitBtn').addEventListener('click',quitDiveConfirmation);
    $('focusToggleBtn').addEventListener('click',toggleFocusMode);
    $('focusHelpBtn').addEventListener('click',briefing);
    $('focusPauseBtn').addEventListener('click',togglePause);
    document.addEventListener('fullscreenchange',()=>{resize();});
    $('helpBtn').addEventListener('click',briefing);$('instructionsBtn').addEventListener('click',briefing);
    $('modalClose').addEventListener('click',closeDialog);
    $('pauseBtn').addEventListener('click',togglePause);
    $('dockBtn').addEventListener('click',()=>{if(running&&!paused&&nearestInteractable()?.type==='station')depositAndDock();});
    window.addEventListener('keydown',e=>{
      const k=e.key.toLowerCase();
      if(e.target instanceof Element&&e.target.closest('input,textarea,select,[contenteditable="true"]'))return;
      if(k==='escape'){if(!e.repeat)togglePause();return;}
      if(!running||paused)return;
      if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();
      if(e.repeat)return;
      keys.add(k);
      if(k==='q')scan();else if(k==='e')interact();else if(k==='r')repair();else if(k==='l')toggleLights();else if(k==='f')deployMine();
    });
    window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur',resetPilotInput);
    document.addEventListener('visibilitychange',()=>{if(document.hidden)resetPilotInput();});
    canvas.addEventListener('pointerdown',e=>{
      if(e.pointerType==='touch'||e.button!==0||mouseHelm.pointerId!==null||!running||paused)return;
      e.preventDefault();resetJoystick(true);canvas.focus({preventScroll:true});
      mouseHelm.pointerId=e.pointerId;mouseHelm.clientX=e.clientX;mouseHelm.clientY=e.clientY;
      canvas.setPointerCapture(e.pointerId);canvas.classList.add('mouse-piloting');
    });
    canvas.addEventListener('pointermove',e=>{
      if(e.pointerId!==mouseHelm.pointerId)return;
      if(!(e.buttons&1)){releaseMouseHelm();return;}
      mouseHelm.clientX=e.clientX;mouseHelm.clientY=e.clientY;
    });
    const endMouse=e=>{if(e.pointerId===mouseHelm.pointerId)releaseMouseHelm();};
    canvas.addEventListener('pointerup',endMouse);canvas.addEventListener('pointercancel',endMouse);
    canvas.addEventListener('lostpointercapture',endMouse);window.addEventListener('pointerup',endMouse);
    const boostButton=$('mobileBoost');
    boostButton.addEventListener('pointerdown',e=>{
      if(!running||paused||boostPointerId!==null||(e.pointerType==='mouse'&&e.button!==0))return;
      e.preventDefault();if(!boostUnlocked()){announce('BUY MK I MAGNETIC THRUSTERS TO UNLOCK BOOST',2);return;}boostHeld=true;boostPointerId=e.pointerId;
      boostButton.setPointerCapture(e.pointerId);boostButton.classList.add('held');
    });
    const endBoost=e=>{if(e.pointerId===boostPointerId)releaseBoostInput();};
    boostButton.addEventListener('pointerup',endBoost);boostButton.addEventListener('pointercancel',endBoost);
    boostButton.addEventListener('lostpointercapture',endBoost);
    boostButton.addEventListener('keydown',e=>{if(e.key==='Enter'&&running&&!paused&&boostUnlocked()){e.preventDefault();boostHeld=true;}});
    boostButton.addEventListener('keyup',e=>{if(e.key==='Enter')releaseBoostInput();});
    boostButton.addEventListener('blur',()=>{if(boostPointerId===null)boostHeld=false;});
    canvas.addEventListener('pointerdown',e=>{
      if(e.pointerType!=='touch'||joystick.pointerId!==null||!running||paused)return;
      e.preventDefault();releaseMouseHelm();
      joystick.pointerId=e.pointerId;joystick.originX=e.clientX;joystick.originY=e.clientY;
      joystick.radius=Math.min(48,Math.max(36,window.innerWidth*.11));
      joystick.x=0;joystick.y=0;canvas.setPointerCapture(e.pointerId);
      positionFloatingJoystick();
    });
    canvas.addEventListener('pointermove',e=>{
      if(e.pointerId!==joystick.pointerId)return;
      e.preventDefault();steerJoystick(e);
    });
    const releaseStick=e=>{if(e.pointerId===joystick.pointerId){e.preventDefault();resetJoystick(e.type!=='pointerup');}};
    canvas.addEventListener('pointerup',releaseStick);canvas.addEventListener('pointercancel',releaseStick);
    canvas.addEventListener('lostpointercapture',releaseStick);
    window.addEventListener('pointerup',releaseStick);window.addEventListener('pointercancel',releaseStick);
    $('mobileCruise').addEventListener('click',()=>{
      if(!running||paused)return;
      cruiseEnabled=!cruiseEnabled;
      if(cruiseEnabled){cruiseHeading.x=joystick.x;cruiseHeading.y=joystick.y;}
      else{cruiseHeading.x=0;cruiseHeading.y=0;}
      updateUI();
    });
    $('mobileSonar').addEventListener('click',scan);
    // Pointerdown fires with a second finger already steering. Suppress the
    // subsequent pointer click so a single tap never spends two rounds.
    $('mobileMine').addEventListener('pointerdown',e=>{
      if(e.pointerType==='mouse'&&e.button!==0)return;
      e.preventDefault();deployMine();
    });
    $('mobileMine').addEventListener('click',e=>{if(e.detail===0)deployMine();});
    const useBtn=$('mobileInteract');
    useBtn.addEventListener('pointerdown',e=>{
      if(!running||paused||usePointerId!==null)return;
      e.preventDefault(); // Multi-touch: do not wait for a synthetic click after joystick movement.
      usePointerId=e.pointerId;useHeld=true;useHoldTimer=.12;
      useBtn.setPointerCapture(e.pointerId);
      useBtn.classList.add('held');
      interact(true);
    });
    const stopUse=e=>{
      if(e.pointerId!==usePointerId)return;
      useHeld=false;usePointerId=null;useBtn.classList.remove('held');
    };
    useBtn.addEventListener('pointerup',stopUse);
    useBtn.addEventListener('pointercancel',stopUse);
    useBtn.addEventListener('lostpointercapture',stopUse);
    // Space/Enter-generated click, as opposed to a pointer click, remains accessible.
    useBtn.addEventListener('click',e=>{if(e.detail===0)interact();});
    $('mobileRepair').addEventListener('click',repair);$('mobileLights').addEventListener('click',toggleLights);
    $('mobileSilent').addEventListener('click',()=>{pointerSilent=!pointerSilent;updateUI();});
    window.addEventListener('resize',()=>{resetPilotInput();resize();updateUI();});
    if(window.visualViewport)window.visualViewport.addEventListener('resize',resize);
    setupInstall();
  }
  function positionFloatingJoystick(){
    const host=canvas.parentElement.getBoundingClientRect(),stick=$('mobileJoystick');
    stick.style.left=(joystick.originX-host.left)+'px';stick.style.top=(joystick.originY-host.top)+'px';
    stick.style.setProperty('--floating-radius',joystick.radius+'px');
  }
  function steerJoystick(e){
    const dx=e.clientX-joystick.originX,dy=e.clientY-joystick.originY,d=Math.hypot(dx,dy);
    const amount=Math.min(1,d/joystick.radius),deadzone=6;
    const throttle=d<deadzone?0:clamp((d-deadzone)/(joystick.radius-deadzone),0,1);
    joystick.x=dx/(d||1)*throttle;joystick.y=dy/(d||1)*throttle;
    // A plain tap never reveals a stick or changes heading.
    if(d>=deadzone)$('mobileJoystick').classList.add('engaged');
    if(cruiseEnabled&&throttle>0){cruiseHeading.x=joystick.x;cruiseHeading.y=joystick.y;}
    $('joystickThumb').style.transform=`translate3d(${dx/(d||1)*amount*joystick.radius}px,${dy/(d||1)*amount*joystick.radius}px,0)`;
  }
  function resetJoystick(cancelCruise=false){
    const id=joystick.pointerId;joystick.pointerId=null;joystick.x=0;joystick.y=0;
    if(id!==null&&canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);
    $('mobileJoystick').classList.remove('engaged');
    $('joystickThumb').style.transform='translate3d(0,0,0)';
    if(cancelCruise){cruiseEnabled=false;cruiseHeading.x=0;cruiseHeading.y=0;}
    const button=$('mobileCruise');button.classList.toggle('active',cruiseEnabled);
    button.setAttribute('aria-pressed',String(cruiseEnabled));$('cruiseLabel').textContent=cruiseEnabled?'ON':'OFF';
  }
  function setupInstall(){
    // GitHub Pages (HTTPS) supports installation and the offline service worker.
    if('serviceWorker' in navigator && (location.protocol==='https:' || ['localhost','127.0.0.1'].includes(location.hostname))){
      window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js',{updateViaCache:'none'}).then(reg=>{window.AbyssWorkerRegistration=reg;window.dispatchEvent(new Event('abyss-worker'));}).catch(()=>{window.dispatchEvent(new Event('abyss-worker'));}));
    }
    const installButton=$('installBtn');
    window.addEventListener('beforeinstallprompt',event=>{
      event.preventDefault();installPrompt=event;installButton.classList.remove('hidden');
    });
    installButton.addEventListener('click',async()=>{
      if(!installPrompt)return;
      const prompt=installPrompt;installPrompt=null;
      installButton.classList.add('hidden');
      try{await prompt.prompt();}catch(_){}
    });
    window.addEventListener('appinstalled',()=>{installPrompt=null;installButton.classList.add('hidden');});
  }
  function frame(now){
    if(!previousTime)previousTime=now;
    const dt=Math.min(.045,(now-previousTime)/1000||.016);previousTime=now;
    if(running&&!paused)update(dt);
    else if(!paused)clock+=dt*.3;
    render();
    requestAnimationFrame(frame);
  }
  beamTexture=buildBeamTexture();
  bind();resize();createWorld();
  player={x:600,y:160,vx:0,vy:0,facing:0,hull:maxHull(),oxygen:maxOxygen(),battery:maxBattery(),lights:true,noise:0,cargo:{scrap:0,crystal:0,recorders:[]},scanCooldown:0,damageCooldown:0,boost:boostCapacity(),boosting:false,boostLocked:false,boostNeedsRelease:false,boostRechargeDelay:0,mineAmmo:0,mineCooldown:0,kills:0};
  resupplyMines();
  camera.x=player.x-viewport.w/2;camera.y=player.y-viewport.h/2;
  updateMainMenu();updateUI();requestAnimationFrame(frame);
  setTimeout(()=>{
    if(window.AbyssVersion)return;
    $('syncIndicator').dataset.state='unverified';$('syncStatus').textContent='UPDATE CHECKER NOT LOADED';
    $('syncDetail').textContent='Upload version-sync.js and version.json with the game. The latest release cannot be verified.';
    $('checkVersionBtn').textContent='RELOAD BUILD';
    $('checkVersionBtn').onclick=()=>{if(running){$('syncDetail').textContent='Bank or quit the active dive before reloading.';}else location.reload();};
  },3500);

  // Tiny inspection hook for automated smoke tests.
  window.AbyssDiagnostics={state:()=>({version:BUILD.version,versionName:BUILD.name,buildId:BUILD.id,storageHealthy,campaignId,levelId:LEVEL_ID,boostCapacity:boostCapacity(),boostUnlocked:boostUnlocked(),boostMultiplier:boostMultiplier(),boostSeconds:boostCapacity()/BOOST.drain,joystickVisible:$('mobileJoystick').classList.contains('engaged'),zoom:viewport.zoom,flashlightMark:saved.upgrades.flashlight,flashlightLength:flashlightSpec().length,flashlightAngle:flashlightSpec().halfAngle*360/Math.PI,flashlightPowerRate:flashlightPowerRate(),worldWidth:widthAt(player.y)*2,populationCycle:field.cycle,mineAmmo:player.mineAmmo,mineCapacity:mineCapacity(),minePower:saved.upgrades.minePower,mineCapacityMark:saved.upgrades.mineCapacity,mineDamage:mineDamage(),mineCooldown:player.mineCooldown,deployedMines:scene.mines.length,kills:player.kills,normalSpeed:normalSpeedAt(saved.upgrades.engine),maxNormalSpeed:normalSpeedAt(THRUST.maxMark),ambientLight:ambientLightAt(player.y),blackoutDepth:LIGHTING.blackoutDepth,lights:player.lights,headlightsActive:headlightsActive(),recorderDepths:[...RECORDER_DEPTHS],maxWorldDepth:depthOf(MAX_WORLD_Y),safeDepth:safeDepth(),inputMode:touchControls?'touch':'desktop',vesselLabel:vesselLabel(),boost:player.boost,boosting:player.boosting,boostLocked:player.boostLocked,boostNeedsRelease:player.boostNeedsRelease,boostRechargeDelay:player.boostRechargeDelay,boostPowerRate:boostPowerRate(),boostRechargeRate:boostRechargeRate(),scanCooldown:player.scanCooldown,sonarCost:sonarCost(),mouseHeld:mouseHelm.pointerId!==null,boostHeld,facing:player.facing,hullLevel:saved.upgrades.hull,maxHull:maxHull(),focusMode,running,paused,menuOpen:!$('menuOverlay').classList.contains('hidden'),pauseOpen:!$('pauseOverlay').classList.contains('hidden'),depth:depthOf(player.y),x:player.x,y:player.y,vx:player.vx,vy:player.vy,hull:player.hull,battery:player.battery,oxygen:player.oxygen,credits:saved.credits,secured:saved.secured.length,items:scene.items.length,rocks:scene.rocks.length,predators:scene.predators.length,apexCount:scene.predators.filter(e=>e.tier==='apex').length,commonCount:scene.predators.filter(e=>e.tier==='common').length,reaperCount:scene.predators.filter(e=>e.tier==='reaper').length,pursuing:scene.predators.filter(e=>e.aggression>.13).length,nearestPredatorDistance:Math.min(Infinity,...scene.predators.map(e=>distance(player,e))),useHeld,joystickX:joystick.x,joystickY:joystick.y,cruiseEnabled,cruiseX:cruiseHeading.x,cruiseY:cruiseHeading.y})};
  if(location.search.includes('testmode=1')||window.ABYSS_TEST_MODE===true){
    window.AbyssDiagnostics.fixture=({x=600,y=700,rocks=[],predators=[],items=[]}={})=>{
      player.x=x;player.y=y;player.vx=0;player.vy=0;player.facing=0;player.noise=0;
      scene.rocks=rocks.map(rock=>({...rock,vertices:rockPolygon(rock)}));
      scene.predators=predators.map(enemy=>createPredator({...enemy,tier:enemy.tier||'common',vx:0,vy:0,homeX:enemy.x,homeY:enemy.y,phase:0,aggression:enemy.aggression??0,alertUntil:enemy.alertUntil??0,forgetUntil:0,lastHit:-10}));
      scene.mines=[];scene.blasts=[];
      scene.items=items.map((i,index)=>makeItem(i.x,i.y,i.type||'scrap',{id:index,...i}));
      return true;
    };
    window.AbyssDiagnostics.lightingFixture=({depth=1000,facing=0,lights=true,battery=100,quietScene=false,freeze=true,hud=true}={})=>{
      player.x=centerAt(120+depth*10);player.y=120+depth*10;
      player.vx=0;player.vy=0;player.facing=facing;player.lights=lights;player.battery=battery;
      player.hull=maxHull();player.oxygen=maxOxygen();player.damageCooldown=0;player.scanCooldown=0;
      sonarWaves=[];
      if(quietScene)scene={rocks:[],items:[],predators:[],vents:[],dust:[],wrecks:[],mines:[],blasts:[]};
      paused=freeze;
      camera.x=player.x-viewport.w/2;camera.y=player.y-viewport.h*.52;
      updateUI();render();
      if(!hud){
        // The production path remains render(); hide only the instrument pointer
        // when a test needs to assert that the entire world canvas is black.
        const savedRunning=running;running=false;render();running=savedRunning;
      }
      return {x:player.x,y:player.y,camera:{...camera},viewport:{...viewport},lighting:{...LIGHTING,beamLength:flashlightSpec().length,beamHalfAngle:flashlightSpec().halfAngle},ambient:ambientLightAt(player.y)};
    };
    window.AbyssDiagnostics.ambientAtDepth=depth=>ambientLightAt(120+depth*10);
    window.AbyssDiagnostics.renderWorld=()=>{const before=running;running=false;render();running=before;};
    window.AbyssDiagnostics.debug=()=>({clock,field:JSON.parse(JSON.stringify(field)),mines:scene.mines.map(m=>({...m})),blasts:scene.blasts.map(b=>({...b})),sonarWaves:sonarWaves.map(({contacts,...w})=>({...w,contacts:contacts.map(c=>({kind:c.kind,hit:c.hit,x:c.object.x,y:c.object.y}))})),camera:{...camera},viewport:{...viewport},sonarTerrainEchoes:sonarTerrainEchoes.map(e=>({...e})),rocks:scene.rocks.map(e=>({...e})),vents:scene.vents.map(e=>({...e})),player:{...player},saved:{...saved,upgrades:{...saved.upgrades}},wrecks:scene.wrecks.map(w=>({...w})),predators:scene.predators.map(e=>({...e})),items:scene.items.map(i=>({...i}))});
    window.AbyssDiagnostics.simulationFixture=({depth=500,facing=Math.PI/2,lights=false,battery=maxBattery(),boost=null,upgrades={},items=[],predators=[],rocks=[],wrecks=[],vents=[],mines=[],mineAmmo=null}={})=>{
      resetPilotInput();Object.assign(saved.upgrades,upgrades);beamTexture=buildBeamTexture();
      const y=120+depth*10,x=centerAt(y);
      player={...player,x,y,vx:0,vy:0,facing,lights,battery,boost:boost??boostCapacity(),hull:maxHull(),oxygen:maxOxygen(),noise:0,quiet:false,boosting:false,boostLocked:false,boostNeedsRelease:false,boostRechargeDelay:0,damageCooldown:0,scanCooldown:0,mineAmmo:mineAmmo??(saved.upgrades.minePower?mineCapacity():0),mineCooldown:0,kills:0,cargo:{scrap:0,crystal:0,recorders:[]}};
      saved.mineAmmo=player.mineAmmo;
      scene={items:items.map((i,n)=>makeItem(x+i.dx,y+i.dy,i.type||'scrap',{id:n,index:i.index??0,...i})),
        rocks:rocks.map(r=>{const k={x:x+r.dx,y:y+r.dy,radius:30,rot:0,seed:.4,spikes:8,...r};return {...k,vertices:rockPolygon(k)};}),
        predators:predators.map(e=>createPredator({tier:'common',vx:0,vy:0,phase:0,aggression:0,lastHit:-10,alertUntil:0,forgetUntil:0,revealUntil:0,...e,x:x+e.dx,y:y+e.dy,homeX:x+e.dx,homeY:y+e.dy})),
        wrecks:wrecks.map(w=>({...w,x:x+w.dx,y:y+w.dy})),vents:vents.map(v=>({phase:0,...v,x:x+v.dx,y:y+v.dy})),dust:[],blasts:[],
        mines:mines.map(m=>({id:idCounter++,mark:1,damage:60,birth:0,armedAt:0,detonated:false,revealUntil:0,...m,x:x+m.dx,y:y+m.dy}))};
      running=true;paused=true;clock=0;sonarWaves=[];sonarTerrainEchoes=[];pointerSilent=false;toastUntil=0;$('notification').classList.add('hidden');
      camera={x:x-viewport.w/2,y:y-viewport.h*.52};
      for(const id of ['menuOverlay','pauseOverlay','modalOverlay'])$(id).classList.add('hidden');
      updateUI();render();return {x,y,camera:{...camera},viewport:{...viewport}};
    };
    window.AbyssDiagnostics.step=(seconds,{heldKeys=[],freezeAfter=true}={})=>{
      keys.clear();heldKeys.forEach(k=>keys.add(k));paused=false;
      for(let remaining=seconds;remaining>1e-8&&running&&!paused;){const dt=Math.min(1/60,remaining);update(dt);remaining-=dt;}
      keys.clear();if(freezeAfter)paused=true;updateUI();render();return window.AbyssDiagnostics.state();
    };
    window.AbyssDiagnostics.mine=()=>{const before=paused;paused=false;const ok=deployMine();paused=before;render();return ok;};
    window.AbyssDiagnostics.resupply=()=>{const before=paused;paused=false;interact();if(!showingDock)paused=before;};
    window.AbyssDiagnostics.pulseMines=dt=>{clock+=dt;updateMines(dt);updateUI();render();};
    window.AbyssDiagnostics.ping=()=>{const before=paused;paused=false;scan();paused=before;render();};
    window.AbyssDiagnostics.unfreeze=()=>{paused=false;canvas.focus({preventScroll:true});};
    window.AbyssDiagnostics.regenerate=(seed=12345)=>{field={...freshField(),seed:seed>>>0};createWorld();return window.AbyssDiagnostics.state();};
    window.AbyssDiagnostics.moveTo=(x,y)=>{player.x=x;player.y=y;player.vx=0;player.vy=0;camera={x:x-viewport.w/2,y:y-viewport.h*.52};updateUI();render();};
    window.AbyssDiagnostics.hurtEnemy=(id,damage)=>{const enemy=scene.predators.find(e=>e.id===id);if(enemy)damagePredator(enemy,damage);scene.predators=scene.predators.filter(predatorAlive);};
    window.AbyssDiagnostics.use=()=>{const before=paused;paused=false;interact();if(!showingDock)paused=before;updateUI();};
    window.AbyssDiagnostics.relaunch=()=>{newDive();paused=true;};
    window.AbyssDiagnostics.tiers=()=>JSON.parse(JSON.stringify(PREDATOR_TIERS));
    window.AbyssDiagnostics.grantCredits=(value)=>{saved.credits=Math.max(0,Math.floor(value));persist();updateUI();};
  }
})();
