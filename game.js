(() => {
  'use strict';
  const BUILD = Object.freeze({version:'0.22.0',name:'Deepwater Rescue',id:'0.22.0-deepwater-rescue-1'});
  window.AbyssBuild=BUILD;
  const GIANTS=window.AbyssGiants;
  let deepwater=null;
  let giantSite=null,giantWallCache=[];
  const $ = id => document.getElementById(id);
  const canvas = $('gameCanvas');
  const ctx = canvas.getContext('2d');
  const radar = $('radarCanvas');
  const rctx = radar.getContext('2d');
  const TAU = Math.PI * 2;
  const SURVEY = Object.freeze({cell:90,left:-1000,right:2200,minX:-2440,maxX:3640,contactLife:8});
  const freshSurvey=()=>({version:1,cells:[],contacts:{},waypoint:null});
  function normaliseSurvey(value){
    if(!value||value.version!==1)return freshSurvey();
    const point=p=>p&&Number.isFinite(p.x)&&p.x>=SURVEY.minX&&p.x<=SURVEY.maxX&&Number.isFinite(p.y)&&p.y>=70&&p.y<=18120;
    return {version:1,cells:Array.isArray(value.cells)?[...new Set(value.cells.filter(x=>typeof x==='string'&&/^-?\d{1,3}:\d{1,3}$/.test(x)).slice(0,12000))]:[],
      contacts:Object.fromEntries(Object.entries(value.contacts||{}).filter(([k,c])=>k.length<100&&point(c)&&['scrap','crystal','air','recorder','recovery','wreck','landmark','station','derelict','thermal','giant','plate','panel','battery','airStation'].includes(c.type)).slice(0,4000).map(([k,c])=>[k,{x:c.x,y:c.y,type:c.type,label:String(c.label||'').slice(0,80),collected:c.collected===true}])),
      waypoint:point(value.waypoint)?{x:value.waypoint.x,y:value.waypoint.y}:null};
  }
  // Surface and harbour rules are shared by rendering, physics and AI.
  const SURFACE = Object.freeze({y:70,breachSpeed:100,gravity:260,airDrag:.18,reentryDrag:.62});
  const HARBOUR = Object.freeze({x:600,y:160,safeRadius:260,exclusionRadius:330,dockRadius:128});
  const inHarbour = object => Boolean(object && Math.hypot(object.x-HARBOUR.x,object.y-HARBOUR.y)<=HARBOUR.safeRadius);
  let surfaceEffects=[];
  // Lifeline: oxygen limits trip duration; propulsion has an unpowered reserve.
  const LIFE_SUPPORT = Object.freeze({oxygenPerSecond:.30,oxygenEfficiency:.20});
  const ENERGY = Object.freeze({idlePerSecond:.006,thrustPerSecond:.018,reserveThreshold:.5,reserveMultiplier:.5});
  const BATTERY_CELLS = Object.freeze({power:25,range:60,recharge:480,interval:90,counts:[3,4,5,6,7]});
  function normaliseBatteryCells(value){
    if(value?.version!==1||!Array.isArray(value.nodes)||value.nodes.length>7)return null;
    const valid=n=>n&&typeof n.id==='string'&&/^battery-[0-6]$/.test(n.id)&&Number.isFinite(n.x)&&n.x>=-2440&&n.x<=3640&&Number.isFinite(n.y)&&n.y>=500&&n.y<=17900;
    if(!value.nodes.every(valid)||new Set(value.nodes.map(n=>n.id)).size!==value.nodes.length)return null;
    const elapsed=Number.isFinite(value.elapsed)?Math.max(0,Math.min(1e9,value.elapsed)):0,due={};
    for(const n of value.nodes)if(Number.isFinite(value.due?.[n.id]))due[n.id]=Math.max(0,Math.min(elapsed+BATTERY_CELLS.recharge,value.due[n.id]));
    return {version:1,nodes:value.nodes.map(n=>({id:n.id,x:n.x,y:n.y})),elapsed,due,nextSpawnAt:Number.isFinite(value.nextSpawnAt)?Math.max(0,Math.min(elapsed+BATTERY_CELLS.interval,value.nextSpawnAt)):0};
  }
  const THRUST = Object.freeze({normal:146,perMark:.17,maxMark:4});
  const normalSpeedAt = mark => THRUST.normal*(1+mark*THRUST.perMark);
  function movementNoiseAt(speed,insulationMark=0,boosting=false){
    const velocity=Math.max(0,Number.isFinite(speed)?speed:0);
    const insulation=1+Math.max(0,insulationMark)*.32;
    if(boosting)return Math.max(82,100/insulation);
    // Match the existing full-throttle signature, but remove the fixed noise floor
    // at low speed. Small drags are quiet; insulation is always passive.
    const lowSpeedGain=Math.pow(Math.min(1,velocity/THRUST.normal),1.4);
    return Math.min(95,(45+velocity*.2)*lowSpeedGain)/insulation;
  }
  const MINES = Object.freeze({damage:[0,60,110,180,240],capacity:[0,2,4,6,8],
    armDelay:.65,deployCooldown:1.1,triggerRadius:52,blastRadius:108,radius:8});
  const roman = mark => ['0','I','II','III','IV','V','VI','VII'][mark]||String(mark);
  const BOOST = Object.freeze({capacities:[0,75,100,125,150],multipliers:[1,1.45,1.60,1.75,1.85],drain:25,recharge:12.5,rechargeDelay:1.5,powerPerSecond:7});
  // A defeat replaces owned stock, it never adds to it. Rescue rounds can be
  // stored before a launcher is fitted; equipment unlocks remain independent.
  const RESPAWN_AMMO = Object.freeze({railgun:10,torpedo:3,mine:3});
  const ammoStorageLimit = (id,upgrades) => Math.max(RESPAWN_AMMO[id],id==='mine'?MINES.capacity[upgrades.mineCapacity]:WEAPONS[id].capacity[upgrades[id]]);
  const AMMO_PRICE = 18;
  const WEAPON_AMMO_PRICES = Object.freeze({railgun:6,torpedo:24});
  const CREDIT_PRICE_FACTOR = 1.5; // v0.17 baseline; the new uplift is applied after its rounding.
  const CREDIT_UPLIFT = 1.25;
  const SALVAGE_REGEN = Object.freeze({delay:300,interval:45,offscreenMargin:100,pickupInterval:.25});
  const freshSalvage = () => ({version:1,elapsed:0,nextSpawnAt:0,harvested:[],due:{}});
  function normaliseSalvage(value,loot,looted){
    const scraps=new Set((loot||[]).filter(n=>n.type==='scrap').map(n=>n.id));
    const spent=new Set(looted||[]),v=value?.version===1?value:{};
    const elapsed=Number.isFinite(v.elapsed)?Math.max(0,Math.min(1e9,v.elapsed)):0;
    const harvested=[...new Set([...(Array.isArray(v.harvested)?v.harvested:[]),...spent])].filter(id=>scraps.has(id));
    const due={};
    for(const id of spent)if(scraps.has(id))due[id]=Number.isFinite(v.due?.[id])?Math.max(0,Math.min(elapsed+SALVAGE_REGEN.delay,v.due[id])):elapsed+SALVAGE_REGEN.delay;
    return {version:1,elapsed,nextSpawnAt:Number.isFinite(v.nextSpawnAt)?Math.max(0,Math.min(elapsed+SALVAGE_REGEN.interval,v.nextSpawnAt)):0,harvested,due};
  }
  const WEAPONS=Object.freeze({
    railgun:{name:'PULSE RAILGUN',damage:[0,35,50,70,95],capacity:[0,12,18,24,32],speed:760,range:620,cooldown:.42,radius:4,blast:0,color:'#9beafa'},
    torpedo:{name:'SHOCK TORPEDOES',damage:[0,95,140,200,280],capacity:[0,3,4,6,8],speed:300,range:1000,cooldown:1.4,radius:7,blast:105,color:'#ffc48e'}
  });
  // Guidance is automatic at every fitted mark. Damage, magazines and prices do
  // not change. Angles are radians; all distances below are world units (10/m).
  const GUIDANCE = Object.freeze({
    railgun:Object.freeze({cone:32*Math.PI/180,trackingCone:70*Math.PI/180,turnRate:120*Math.PI/180,maxTurn:55*Math.PI/180,maxLead:.65}),
    torpedo:Object.freeze({cone:65*Math.PI/180,trackingCone:100*Math.PI/180,turnRate:180*Math.PI/180,maxTurn:85*Math.PI/180,maxLead:1}),
    mine:Object.freeze({range:200,speed:32,leash:240,turnRate:100*Math.PI/180})
  });
  const MAGNET = Object.freeze({range:[60,100,140,180,220],power:[0,1.2,1,.8,.6]});
  const SHIELD = Object.freeze({capacity:[0,20,35,50,70],recharge:[0,2,3,4,5],delay:8,powerPerPoint:.35});
  const DISRUPTOR = Object.freeze({range:[0,180,220,260,300],seconds:[0,1.2,1.6,2,2.4],power:[0,3,4,5,6],resistance:{common:1,apex:.8,reaper:.6,warden:.35}});
  const PREDATOR_SALVAGE = Object.freeze({common:2,apex:4,reaper:8});
  const SONAR = Object.freeze({waveSpeed:520,echoSeconds:4.5,cooldown:5.5});
  const LIGHTING = Object.freeze({blackoutDepth:1000,fadeExponent:1.35,bowOffset:30,nearHalfWidth:5});
  const FLASHLIGHT = Object.freeze([
    null,
    Object.freeze({length:260,halfAngle:.29,power:.04}),
    Object.freeze({length:360,halfAngle:35*Math.PI/180,power:.055,sector:true}),
    Object.freeze({length:480,halfAngle:55*Math.PI/180,power:.075,sector:true}),
    Object.freeze({length:620,halfAngle:75*Math.PI/180,power:.10,sector:true})
  ]);
  const MOBILE_ZOOM = .70; // World-only zoom. DOM instruments and touch targets keep their size.
  const LEVELS = Object.freeze([
    {id:'sunbreak-shelf',name:'SUNBREAK SHELF',tag:'01 / FIRST LIGHT',depth:300,recorders:[75,260],scrap:42,crystals:36,caches:8,rocks:190,common:15,apex:0,reaper:0,health:1,damage:1,color:'#83ddc7',description:'Sunlit approaches and a shallow seabed. Learn the return journey before the ocean closes in.'},
    {id:'glassbone-rift',name:'GLASSBONE RIFT',tag:'02 / FRACTURED WATER',depth:600,recorders:[180,380,550],scrap:65,crystals:70,caches:12,rocks:420,common:33,apex:7,reaper:0,health:1.04,damage:1.04,color:'#99cce8',description:'Tighter rock fields and the first Abyss Stalkers. Longer journeys reward careful preparation.'},
    {id:'drowned-gardens',name:'DROWNED GARDENS',tag:'03 / THE LAST LIGHT',depth:1000,recorders:[240,480,730,950],scrap:85,crystals:100,caches:18,rocks:760,common:60,apex:15,reaper:3,health:1.08,damage:1.08,color:'#b6adeb',description:'The light disappears. Crimson Reapers patrol below 800 metres; sonar and boost become lifelines.'},
    {id:'midnight-cathedral',name:'MIDNIGHT CATHEDRAL',tag:'04 / BLACK WATER',depth:1400,recorders:[250,530,800,1090,1350],scrap:105,crystals:130,caches:24,rocks:1160,common:90,apex:28,reaper:8,health:1.15,damage:1.15,color:'#d5a3cb',description:'A long descent through crowded hunting grounds. Stronger shields, lamps and ordnance earn their keep.'},
    {id:'calypso-abyss',name:'CALYPSO ABYSS',tag:'05 / FINAL TRANSMISSION',depth:1800,recorders:[300,590,880,1170,1470,1750],scrap:125,crystals:160,caches:30,rocks:1600,common:130,apex:40,reaper:16,health:1.23,damage:1.23,color:'#f0b58a',description:'The deepest seabed and the strongest hunters. Recover the final six recorders and finish the transmission.'}
  ]);
  const HULL_DEPTHS = Object.freeze([130,330,630,830,1030,1330,1530,1830]);
  const CRYSTAL_PRICES = Object.freeze({hull:[2,5,10,14,18,23,30],oxygen:[2,4,6,9,13],battery:[2,4,7,10,14],engine:[3,6,10,15],flashlight:[0,3,7,12],sonar:[2,5,8,12],quiet:[2,4,7,10],minePower:[3,6,10,15],mineCapacity:[0,2,5,8],magnet:[3,5,8,12],shield:[4,7,11,16],disruptor:[4,7,11,16],railgun:[2,3,4,5],torpedo:[3,4,5,6]});
  const FIELD_KEY = 'the-abyss-below-field-v1'; // Legacy sources are never overwritten.
  const LEGACY_CAMPAIGN_KEY = 'the-abyss-below-campaign-v2';
  const CAMPAIGN_KEY = window.AbyssSlots.key;
  let slotTransition=false;
  let LEVEL_ID=LEVELS[0].id,MAX_WORLD_Y=3120,RECORDER_DEPTHS=[75,260],RECORDERS_TOTAL=2,WORLD={};
  const currentLevel=()=>LEVELS.find(l=>l.id===LEVEL_ID)||LEVELS[0];
  const cleanCount=v=>Number.isFinite(v)&&v>=0?Math.floor(v):0;
  const cleanRecorders=value=>Array.isArray(value)?[...new Set(value.filter(i=>Number.isInteger(i)&&i>=0&&i<6))]:[];
  const hasRecoveryCargo=cargo=>Boolean(cargo&&(cargo.scrap||cargo.crystal||cargo.recorders?.length||cargo.plates?.length));
  const freshField = () => ({schema:3,seed:(Math.random()*0xffffffff)>>>0,cycle:0,
    looted:[],health:{},loot:null,drops:[],secured:[],recoveries:[],recoverySerial:0,pendingCargo:null,floorReached:false,awaitingDock:false,survey:freshSurvey(),wild:null,salvage:freshSalvage(),batteryCells:null,rescue:null});
  let field=freshField(),campaignId='campaign-'+Date.now().toString(36)+'-'+field.seed.toString(36);
  let campaignLevels={},storageHealthy=true,storageRecovery=false,migratedLegacy=false;
  const readJSON=key=>{try{return JSON.parse(localStorage.getItem(key)||'null');}catch(_){return null;}};
  function validateField(data){
    if(!data||![1,2,3].includes(data.schema)||!Number.isInteger(data.seed)||data.seed<0||data.seed>0xffffffff)return null;
    const validPoint=n=>n&&Number.isFinite(n.x)&&Number.isFinite(n.y)&&n.y>=58&&n.y<=18120;
    const validNode=n=>validPoint(n)&&typeof n.id==='string'&&['scrap','crystal','air'].includes(n.type);
    const normalise=n=>({id:n.id,x:n.x,y:n.y,type:n.type,quantity:Number.isInteger(n.quantity)&&n.quantity>0&&n.quantity<=100?n.quantity:(n.type==='air'?1:2)});
    const cargo=n=>validPoint(n)?{x:n.x,y:n.y,scrap:cleanCount(n.scrap),crystal:cleanCount(n.crystal),recorders:cleanRecorders(n.recorders),plates:GIANTS.plates(n.plates),kind:n.kind==='wreck'?'wreck':'pod'}:null;
    const loot=Array.isArray(data.loot)&&data.loot.length>0&&data.loot.length<=3000&&data.loot.every(validNode)&&new Set(data.loot.map(n=>n.id)).size===data.loot.length?data.loot.map(normalise):null;
    const recoveries=Array.isArray(data.recoveries)?data.recoveries.filter(n=>cargo(n)&&typeof n.id==='string'&&/^recovery-/.test(n.id)).map(n=>({...cargo(n),id:n.id})).filter(hasRecoveryCargo):[];
    const looted=Array.isArray(data.looted)?[...new Set(data.looted.filter(x=>typeof x==='string'&&/^loot-\d+$/.test(x)))]:[];
    return {schema:3,seed:data.seed,cycle:cleanCount(data.cycle),looted,
      salvage:normaliseSalvage(data.salvage,loot,looted),batteryCells:normaliseBatteryCells(data.batteryCells),rescue:window.AbyssRescue.normalise(data.rescue),
      health:Object.fromEntries(Object.entries(data.health||{}).filter(([k,v])=>/^enemy-\d+$/.test(k)&&Number.isFinite(v)&&v>=0)),loot,
      drops:Array.isArray(data.drops)?data.drops.filter(n=>validNode(n)&&n.type==='scrap'&&/^drop-/.test(n.id)).map(normalise):[],
      secured:Array.isArray(data.secured)?[...new Set(data.secured.filter(n=>Number.isInteger(n)&&n>=0&&n<6))]:[],
      recorderDepths:Array.isArray(data.recorderDepths)&&data.recorderDepths.length===6&&data.recorderDepths.every(n=>Number.isFinite(n)&&n>0&&n<1800)?[...data.recorderDepths]:null,
      survey:normaliseSurvey(data.survey),wild:validateWild(data.wild),legacyLayout:data.legacyLayout===true,crystalTopUp:data.crystalTopUp===true,recoveries,recoverySerial:cleanCount(data.recoverySerial),pendingCargo:cargo(data.pendingCargo),floorReached:data.floorReached===true,awaitingDock:data.awaitingDock===true};
  }
  function normaliseRecoveryOwnership(f,limit){
    const reserved=new Set(f.secured),ids=new Set();
    f.recoveries=f.recoveries.filter(r=>{if(ids.has(r.id))return false;ids.add(r.id);return true;});
    for(const r of f.recoveries){
      r.recorders=cleanRecorders(r.recorders).filter(i=>i<limit&&!reserved.has(i));
      r.recorders.forEach(i=>reserved.add(i));
    }
    f.recoveries=f.recoveries.filter(hasRecoveryCargo);
    if(f.pendingCargo)f.pendingCargo.recorders=cleanRecorders(f.pendingCargo.recorders).filter(i=>i<limit&&!reserved.has(i));
  }
  function recoveryContents(cargo){
    return (cargo.scrap||0)+' scrap · '+(cargo.crystal||0)+' crystals · '+(cargo.recorders?.length||0)+' recorders'+(cargo.plates?.length?' · '+cargo.plates.length+' ID plate'+(cargo.plates.length===1?'':'s'):'');
  }
  function markRecovery(f,node){
    f.survey??=freshSurvey();
    f.survey.contacts['items:'+node.id]={x:node.x,y:node.y,type:'recovery',label:node.kind==='wreck'?'LOST VESSEL':'RECOVERY POD',collected:false};
  }
  function addRecovery(f,cargo){
    if(!hasRecoveryCargo(cargo))return null;
    const level=LEVELS.find(l=>campaignLevels[l.id]===f)||currentLevel();
    const occupied=new Set([...f.secured,...f.recoveries.flatMap(r=>r.recorders||[])]);
    const recorders=cleanRecorders(cargo.recorders).filter(i=>i<level.recorders.length&&!occupied.has(i));
    const plates=GIANTS.plates(cargo.plates).filter(id=>!giants.banked.includes(id)&&!Object.values(campaignLevels).some(f=>f.recoveries.some(r=>r.plates?.includes(id))));
    if(!(cargo.scrap||cargo.crystal||recorders.length||plates.length))return null;
    let id;do{id='recovery-'+f.seed+'-'+(++f.recoverySerial);}while(f.recoveries.some(r=>r.id===id));
    // Preserve the actual loss depth, even beyond the hull limit. Only surface
    // breaches and the solid seabed are clamped into recoverable water.
    const node={id,x:cargo.x,y:Math.max(140,Math.min(cargo.y,120+level.depth*10-45)),scrap:cleanCount(cargo.scrap),crystal:cleanCount(cargo.crystal),recorders,plates,kind:cargo.kind==='wreck'?'wreck':'pod'};
    f.recoveries.push(node);markRecovery(f,node);
    if(node.kind==='wreck'||!f.survey.waypoint)f.survey.waypoint={x:node.x,y:node.y};
    return node;
  }
  function recorderInRecovery(index){return field.recoveries.some(r=>r.recorders?.includes(index));}
  function placeRecovery(node){
    // Base-world generation deliberately uses the original canyon bounds. A
    // recovery inside an annex must nevertheless be placed against that annex,
    // not prematurely clamped back into the canyon during population rebuild.
    const prior=giantSite,cache=giantWallCache,objects=scene.giantObjects;
    if(!prior)buildGiants();
    try{return placeRecoveryNow(node);}finally{if(!prior){giantSite=null;giantWallCache=cache;scene.giantObjects=objects;}}
  }
  function placeRecoveryNow(node){
    const old={x:node.x,y:node.y};
    const clear=(x,y)=>y>=140&&y<=MAX_WORLD_Y-45&&!projectileSolid(x,y,24);
    node.y=clamp(node.y,140,MAX_WORLD_Y-45);
    node.x=clamp(node.x,leftAt(node.y)+35,rightAt(node.y)-35);
    // USE prioritises docking inside the berth. A loss directly over/inside it
    // must settle just below the berth, otherwise its cargo could never be used.
    if(distance(node,HARBOUR)<HARBOUR.dockRadius+1)node.y=HARBOUR.y+HARBOUR.dockRadius+40;
    if(!clear(node.x,node.y)){
      let found=false;
      // Prefer the closest open water, not a random relocation across the map.
      for(let radius=16;radius<=384&&!found;radius+=16)for(let i=0;i<24;i++){
        const a=i*TAU/24,x=old.x+Math.cos(a)*radius,y=clamp(old.y+Math.sin(a)*radius,140,MAX_WORLD_Y-45);
        if(clear(x,y)){node.x=x;node.y=y;found=true;break;}
      }
      if(!found){const point=populationPoint(randGen(field.seed+field.recoverySerial),node.y,{lane:1});node.x=point.x;node.y=point.y;}
    }
    if(field.survey.waypoint&&Math.hypot(field.survey.waypoint.x-old.x,field.survey.waypoint.y-old.y)<1)field.survey.waypoint={x:node.x,y:node.y};
    markRecovery(field,node);
    return node;
  }
  function rescueLoadout(){
    saved.weaponAmmo={railgun:RESPAWN_AMMO.railgun,torpedo:RESPAWN_AMMO.torpedo};saved.mineAmmo=RESPAWN_AMMO.mine;
    player.weaponAmmo={...saved.weaponAmmo};player.mineAmmo=saved.mineAmmo;
    player.weaponCooldown={railgun:0,torpedo:0};player.mineCooldown=0;
  }
  let dockVisitActive=true;
  // Reuse one mask and one small, pre-baked beam texture. No per-frame pixel loops.
  const darknessCanvas = document.createElement('canvas');
  const darknessCtx = darknessCanvas.getContext('2d');
  let beamTexture = null, lastAmbient = -1;
  const beamTextures = new Map();
  const SAVE_KEY = 'the-abyss-below-v01'; // Read-only legacy banked profile migration source.
  // Coordinates remain 10 world units per metre. Every level has a physical floor.
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
    warden:{name:'CATHEDRAL WARDEN',level:4,health:1200,speed:410,patrolSpeed:35,detectionCap:500,leash:520,awareness:1,damage:54,cooldown:2.4,reach:48},
    reaper:{name:'CRIMSON REAPER',level:3,health:400,speed:normalSpeedAt(THRUST.maxMark),patrolSpeed:46,detectionCap:440,leash:610,awareness:1.85,damage:42,cooldown:1.15,reach:48}
  };
  const UPGRADES = [
    {id:'hull', name:'REINFORCED HULL', desc:'Adds 28 max hull HP per mark. Pressure ratings: 330 / 630 / 830 / 1,030 / 1,330 / 1,530 / 1,830 m. The last mark reaches the final seabed safely.', prices:[80,150,297,420,570,760,1000], limit:7},
    {id:'oxygen', name:'AIR RECYCLER', desc:'Extend your dive with more oxygen and a more efficient recycler. Standard endurance is 5 min 33 sec without supply caches.', base:70, limit:5},
    {id:'battery', name:'DEEP-CELL BATTERY', desc:'More stored energy, cheaper boost and 10% faster boost recharge per mark. Sonar and boost are your main power demands; reserve thrust works at half speed when empty.', base:65, limit:5},
    {id:'engine', name:'MAGNETIC THRUSTERS', desc:'Mk I unlocks boost. Every mark improves normal speed, boost speed and boost endurance: 3 / 4 / 5 / 6 seconds.', base:75, limit:4},
    {id:'flashlight', name:'EXPLORATION FLASHLIGHT', desc:'Mk I keeps the original beam. Mk II / III / IV widen forward coverage to 70 / 110 / 150 degrees with longer reach. The rear stays dark. Uses power slowly while switched on.', prices:[0,75,150,300], limit:4},
    {id:'sonar', name:'WIDEBAND SONAR', desc:'Wider scans, longer-lived echoes, lower power cost and shorter cooldowns.', base:90, limit:4},
    {id:'quiet', name:'SILENT DRIVE', desc:'Passively suppress movement noise and reduce predator detection at every speed.', base:95, limit:4},
    {id:'minePower', name:'SEA MINE WARHEADS', desc:'Buy Mk I to unlock mines. Four warhead tiers: 60 / 110 / 180 / 240 damage.', prices:[100,180,320,520], limit:4},
    {id:'mineCapacity', name:'MINE AMMO RACK', desc:'Separate capacity upgrade: 2 / 4 / 6 / 8 mines. Mk I rack is standard. Extra slots are empty; buy ammunition in the dock Ammunition tab.', prices:[0,90,160,280], limit:4},
    {id:'magnet', name:'SALVAGE MAGNET', desc:'Automatically collect visible scrap and predator salvage within magnet range. Crystals still require USE; recorders require a close approach. Remote pickups use power; close pickups stay free.', prices:[80,130,200,300], limit:4},
    {id:'shield', name:'KINETIC SHIELD', desc:'An automatic energy barrier absorbs predator bites and rock impacts before they reach the hull. It recharges from your battery after eight seconds without an impact, unless you are boosting.', prices:[100,180,280,420], limit:4},
    {id:'railgun', name:'PULSE RAILGUN', desc:'A fast forward-firing bolt. Each mark increases damage and magazine capacity. Hold Z or RAIL to repeat. Buy rounds at the dock for 6 credits each. New capacity is empty.', prices:[150,240,360,520], limit:4},
    {id:'torpedo', name:'SHOCK TORPEDOES', desc:'A slower forward-firing explosive with an area blast. Each mark increases damage and carried rounds. Tap X or TORP to fire once. Buy rounds at the dock for 24 credits each. New capacity is empty.', prices:[200,320,480,680], limit:4},
    {id:'disruptor', name:'SONIC DISRUPTOR', desc:'Your existing SONAR pulse also briefly stuns nearby predators as its wave reaches them. Stronger marks extend the stun and its effective radius. No additional action button needed.', prices:[90,160,250,380], limit:4}
  ];
  const defaults = () => ({credits:0,crystals:0,xp:0,bestDepth:0,mineAmmo:0,weaponAmmo:{railgun:0,torpedo:0},secured:[],achievements:{},stats:{},upgrades:{hull:0,oxygen:0,battery:0,engine:0,sonar:0,quiet:0,minePower:0,mineCapacity:1,flashlight:1,magnet:0,shield:0,disruptor:0,railgun:0,torpedo:0}});
  let saved=defaults();
  const validCampaign=data=>Boolean(data?.schema===3&&data.profile&&typeof data.profile==='object'&&LEVELS.some(l=>validateField(data.levels?.[l.id])?.loot));
  const validLegacy=data=>Boolean(data?.schema===2&&data.profile&&validateField(data.levels?.['calypso-trench'])?.loot);
  let campaign=window.AbyssSlots.load(validCampaign);
  let giants=GIANTS.normalise(campaign?.giants);
  storageRecovery=window.AbyssSlots.status().recovered;
  let campaignTitle=campaign?.title||window.AbyssSlots.title();
  if(validCampaign(campaign)){
    saved={...defaults(),...campaign.profile,upgrades:{...defaults().upgrades,...campaign.profile.upgrades}};
    for(const l of LEVELS){const f=validateField(campaign.levels[l.id]);if(f){normaliseRecoveryOwnership(f,l.recorders.length);campaignLevels[l.id]=f;}}
    campaignId=typeof campaign.id==='string'?campaign.id:campaignId;
    LEVEL_ID=LEVELS.some(l=>l.id===campaign.selectedLevel)?campaign.selectedLevel:LEVELS[0].id;
  }else{
    let legacy=readJSON(LEGACY_CAMPAIGN_KEY);
    if(!validLegacy(legacy))legacy=readJSON(LEGACY_CAMPAIGN_KEY+'.backup');
    const oldProfile=window.AbyssSlots.allowLegacy()?(validLegacy(legacy)?legacy.profile:readJSON(SAVE_KEY)):null;
    if(oldProfile&&typeof oldProfile==='object'){
      saved={...defaults(),...oldProfile,crystals:0,achievements:{},stats:{},upgrades:{...defaults().upgrades,...oldProfile.upgrades}};
      const oldField=validateField(validLegacy(legacy)?legacy.levels['calypso-trench']:readJSON(FIELD_KEY));
      const imported=oldField||freshField();
      imported.legacyLayout=true;imported.recorderDepths=[75,260,470,725,1100,1500];
      imported.secured=Array.isArray(oldProfile.secured)?[...new Set(oldProfile.secured.filter(i=>Number.isInteger(i)&&i>=0&&i<6))]:[];
      campaignLevels[LEVELS[4].id]=imported;migratedLegacy=true;
      if(validLegacy(legacy)&&typeof legacy.id==='string')campaignId=legacy.id;
    }
  }
  for(const u of UPGRADES){
    const fallback=defaults().upgrades[u.id],mark=saved.upgrades[u.id];
    saved.upgrades[u.id]=Number.isInteger(mark)&&mark>=fallback&&mark<=u.limit?mark:fallback;
  }
  for(const key of ['credits','crystals','xp','bestDepth','mineAmmo'])saved[key]=cleanCount(saved[key]);
  saved.stats=saved.stats&&typeof saved.stats==='object'?Object.fromEntries(Object.entries(saved.stats).filter(([k,v])=>/^[a-zA-Z]+$/.test(k)&&Number.isFinite(v)&&v>=0)):{};
  saved.achievements=saved.achievements&&typeof saved.achievements==='object'?Object.fromEntries(Object.entries(saved.achievements).filter(([k,v])=>typeof v==='string'&&/^\d{4}-/.test(v))):{};
  saved.mineAmmo=Math.min(saved.mineAmmo,ammoStorageLimit('mine',saved.upgrades));
  saved.weaponAmmo=Object.fromEntries(['railgun','torpedo'].map(id=>[id,Math.min(cleanCount(saved.weaponAmmo?.[id]),ammoStorageLimit(id,saved.upgrades))]));
  function levelComplete(id){const l=LEVELS.find(x=>x.id===id);return Boolean(l&&campaignLevels[id]?.secured.length===l.recorders.length);}
  function levelUnlocked(index){return index===0||LEVELS.slice(0,index).every(l=>levelComplete(l.id));}
  if(!levelUnlocked(LEVELS.findIndex(l=>l.id===LEVEL_ID)))LEVEL_ID=LEVELS[0].id;
  let loadedActive=validateActiveDive(campaign?.activeDive),buildingWorld=false,lastSaveWall=0;
  if(loadedActive&&(loadedActive.levelId!==LEVEL_ID||loadedActive.seed!==campaignLevels[LEVEL_ID]?.seed||loadedActive.cycle!==campaignLevels[LEVEL_ID]?.cycle||loadedActive.player.mineAmmo!==saved.mineAmmo))loadedActive=null;
  for(const [id,f] of Object.entries(campaignLevels)){
    // Crash/reload cargo is converted once, atomically, into a persistent recovery pod.
    if(f.pendingCargo&&(!loadedActive||loadedActive.levelId!==id)){addRecovery(f,f.pendingCargo);f.pendingCargo=null;}
  }
  field=campaignLevels[LEVEL_ID]||freshField();campaignLevels[LEVEL_ID]=field;
  function applyLevelGeometry(){
    const l=currentLevel();MAX_WORLD_Y=120+l.depth*10;
    RECORDER_DEPTHS=field.recorderDepths&&l.id===LEVELS[4].id?[...field.recorderDepths]:[...l.recorders];
    RECORDERS_TOTAL=RECORDER_DEPTHS.length;
    field.secured=field.secured.filter(i=>i<RECORDERS_TOTAL);saved.secured=field.secured;
    WORLD={widthMultiplier:3,rockAttempts:field.legacyLayout?1440:l.rocks,scrap:l.scrap,crystal:l.crystals/2,caches:l.caches,common:l.common,apex:l.apex,reaper:l.reaper};
    dockVisitActive=!field.awaitingDock;
  }
  applyLevelGeometry();
  function persist(){
    if(slotTransition)return true;
    if(simulationStepping){saveRequested=true;return storageHealthy;}
    field.secured=saved.secured;
    if(player&&running){field.pendingCargo=hasRecoveryCargo(player.cargo)?{x:player.x,y:Math.max(140,player.y),scrap:player.cargo.scrap,crystal:player.cargo.crystal,recorders:[...player.cargo.recorders],plates:GIANTS.plates(player.cargo.plates)}:null;}
    campaignLevels[LEVEL_ID]=field;
    if(buildingWorld)return true;
    const activeDive=running&&player&&player.hull>0?captureActiveDive():loadedActive;
    const snapshot={schema:3,id:campaignId,title:campaignTitle,selectedLevel:LEVEL_ID,profile:saved,levels:campaignLevels,signals,giants,activeDive};
    storageHealthy=window.AbyssSlots.save(snapshot,validCampaign);
    if(storageHealthy)lastSaveWall=Date.now();
    return storageHealthy;
  }
  const persistField=()=>persist();
  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
  const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
  function randGen(seed) { let s=seed>>>0; return () => {s=(s*1664525+1013904223)>>>0;return s/4294967296;}; }
  const rand = randGen(227136);
  const lerp = (a,b,t) => a + (b-a)*t;
  const centerAt = y => 600 + Math.sin(y*.0017)*94 + Math.sin(y*.0051)*39;
  const widthAt = y => WORLD.widthMultiplier*(320 + Math.sin(y*.0031+1)*41 + Math.sin(y*.0072)*22);
  const baseLeftAt=y=>centerAt(y)-widthAt(y),baseRightAt=y=>centerAt(y)+widthAt(y);
  const leftAt=y=>giantBoundary(y,-1);
  const rightAt=y=>giantBoundary(y,1);
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
    const forward=dx*cos+dy*sin-LIGHTING.bowOffset,side=-dx*sin+dy*cos,spec=flashlightSpec();
    if(!spec.sector)return forward>=-radius && forward<=spec.length+radius &&
      Math.abs(side)<=LIGHTING.nearHalfWidth+Math.max(0,forward)*Math.tan(spec.halfAngle)+radius;
    // A radial fan, not a very wide rectangle. The bow stays the apex, so no
    // tier reveals water behind the vessel. The radius allows partial silhouettes.
    const reach=Math.hypot(forward,side);
    return forward>=-radius&&reach<=spec.length+radius&&
      Math.abs(Math.atan2(side,Math.max(0,forward)))<=spec.halfAngle+Math.asin(Math.min(1,(radius+LIGHTING.nearHalfWidth)/Math.max(1,reach)));
  }
  function buildBeamTexture(){
    const mark=saved.upgrades.flashlight;
    if(beamTextures.has(mark))return beamTextures.get(mark);
    const spec=flashlightSpec(),length=spec.length;
    const halfHeight=Math.ceil(spec.sector?length*Math.sin(spec.halfAngle)+LIGHTING.nearHalfWidth:LIGHTING.nearHalfWidth+length*Math.tan(spec.halfAngle));
    // Bound the wide fan's allocation. Mk I retains its original pixel algorithm.
    const scale=spec.sector?1.5:2,texture=document.createElement('canvas');
    texture.width=Math.ceil(length*scale);texture.height=Math.ceil(halfHeight*2*scale);
    const target=texture.getContext('2d'),pixels=target.createImageData(texture.width,texture.height);
    for(let py=0;py<texture.height;py++){
      const side=Math.abs((py+.5)/scale-halfHeight);
      for(let px=0;px<texture.width;px++){
        const forward=(px+.5)/scale,halfWidth=LIGHTING.nearHalfWidth+forward*Math.tan(spec.halfAngle);
        const lateral=spec.sector?1-smoothstep(.73,1,Math.atan2(Math.max(0,side-LIGHTING.nearHalfWidth),forward)/spec.halfAngle):1-smoothstep(.55,1,side/halfWidth);
        const reach=1-smoothstep(.10,1,(spec.sector?Math.hypot(forward,side):forward)/length);
        const i=(py*texture.width+px)*4;
        pixels.data[i]=150;pixels.data[i+1]=226;pixels.data[i+2]=238;pixels.data[i+3]=Math.round(255*lateral*reach);
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
  const oxygenRateAt = mark => LIFE_SUPPORT.oxygenPerSecond/(1+mark*LIFE_SUPPORT.oxygenEfficiency);
  const oxygenRate = () => oxygenRateAt(saved.upgrades.oxygen);
  const reserveDrive = () => player.battery<=ENERGY.reserveThreshold;
  const propulsionMultiplier = () => reserveDrive()?ENERGY.reserveMultiplier:1;
  const enduranceText = seconds => {const t=Math.max(0,Math.floor(seconds));return Math.floor(t/60)+':'+String(t%60).padStart(2,'0');};
  const safeDepth = () => HULL_DEPTHS[saved.upgrades.hull];
  const sonarRange = () => 230 + saved.upgrades.sonar*55;
  const sonarCost = () => Math.max(4,12-saved.upgrades.sonar*2);
  const sonarCooldown = () => SONAR.cooldown-saved.upgrades.sonar*.35;
  const sonarEchoSeconds = () => SONAR.echoSeconds+saved.upgrades.sonar*.45;
  const boostCapacity = () => BOOST.capacities[saved.upgrades.engine]||0;
  const boostMultiplier = () => BOOST.multipliers[saved.upgrades.engine]||1;
  const boostUnlocked = () => saved.upgrades.engine>0;
  const boostPowerRate = () => BOOST.powerPerSecond/(1+saved.upgrades.battery*.12);
  const boostRechargeRate = () => BOOST.recharge*(1+saved.upgrades.battery*.10);
  const shieldCapacity = () => SHIELD.capacity[saved.upgrades.shield];
  const magnetRange = () => MAGNET.range[saved.upgrades.magnet];
  const magnetPower = () => MAGNET.power[saved.upgrades.magnet];
  const disruptorReady = () => saved.upgrades.disruptor>0 && player.battery>=sonarCost()+DISRUPTOR.power[saved.upgrades.disruptor];
  const scanPowerCost = () => sonarCost()+(disruptorReady()?DISRUPTOR.power[saved.upgrades.disruptor]:0);
  const mineCapacity = () => MINES.capacity[saved.upgrades.mineCapacity];
  const mineDamage = () => MINES.damage[saved.upgrades.minePower];
  const upgradeCost = (upgrade,level) => Math.ceil(Math.ceil((upgrade.prices?.[level]??Math.floor(upgrade.base*Math.pow(1.55,level)))*CREDIT_PRICE_FACTOR)*CREDIT_UPLIFT);
  const crystalCost = (upgrade,level) => CRYSTAL_PRICES[upgrade.id][level]||0;
  const predatorAlive = enemy => !enemy.dead && enemy.health>0;
  function createPredator(data){
    const tier=PREDATOR_TIERS[data.tier]?data.tier:'common',maxHealth=Math.round(PREDATOR_TIERS[tier].health*currentLevel().health);
    return {...data,tier,maxHealth,health:clamp(data.health??maxHealth,0,maxHealth),dead:false};
  }
  const primaryPointer = window.matchMedia('(pointer: coarse)');
  let touchControls = primaryPointer.matches;
  const vesselLabel = () => 'NEREID // MK-II · LIMIT '+safeDepth().toLocaleString('en-GB')+'m';
  const SHIP_RADIUS = 10.5; // Three small circles form a narrow capsule that matches the submarine silhouette.
  const SHIP_OFFSETS = [-15,0,15];
  let scene = {rocks:[],items:[],predators:[],vents:[],dust:[],wrecks:[],mines:[],blasts:[],projectiles:[]};
  let player = null;
  const keys = new Set();
  // Analogue helm (-1..1). Releasing input always returns throttle to zero.
  const joystick = {x:0,y:0,pointerId:null,originX:0,originY:0,radius:44};
  // Pointer coordinates remain in screen space while the follow camera moves.
  const mouseHelm = {pointerId:null,clientX:0,clientY:0};
  let boostHeld=false,boostPointerId=null,railHeld=false,railPointerId=null;
  let installPrompt=null;
  let running = false, paused = false, showingDock = false;
  let dialogReturnPause = false;
  let camera = {x:0,y:0};
  let viewport = {w:700,h:550,dpr:1};
  let previousTime=0, clock=0, uiTimer=0, lastZone='';
  let toastUntil=0, eventLines=[], sonarWaves=[], sonarTerrainEchoes=[];
  let victoryShown = false;
  let useHeld = false, useHoldTimer = 0, usePointerId = null;
  let idCounter = 0,journalTimer=0,simulationStepping=false,saveRequested=false;
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
          const wallY=Math.max(SURFACE.y,sy);
          const edge=side<0?leftAt(wallY)+SHIP_RADIUS:rightAt(wallY)-SHIP_RADIUS;
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
        const floorOverlap=sy+SHIP_RADIUS-MAX_WORLD_Y;
        if(floorOverlap>0){player.y-=floorOverlap+.02;if(player.vy>0){impactSpeed=Math.max(impactSpeed,player.vy);player.vy=0;}moved=true;}
        for(const rock of collisionPolygons()){
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
      player.y=Math.min(player.y,MAX_WORLD_Y-SHIP_RADIUS-Math.abs(sin)*15);
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
    scene.items=[];scene.predators=[];scene.mines=[];scene.blasts=[];scene.projectiles=[];
    sonarWaves=[];sonarTerrainEchoes=[];
    for(const kind of ['rocks','wrecks','vents','derelictMines','ventFields','schools','signals','giantObjects','rescueObjects'])for(const object of (scene[kind]||[]))object.revealUntil=0;
    const looted=new Set(field.looted);
    for(const w of scene.wrecks){
      if(!saved.secured.includes(w.index)&&!recorderInRecovery(w.index))scene.items.push(makeItem(w.x,w.y,'recorder',{id:'recorder-'+w.index,index:w.index}));
    }
    if(!field.loot){
      const r=randGen((field.seed^2654435761)>>>0);field.loot=[];
      const add=(point,type)=>field.loot.push({id:'loot-'+field.loot.length,...point,type,quantity:type==='air'?1:2});
      // Starter deposits stay reachable with the unmodified 130 m hull.
      for(let i=0;i<8;i++)add(populationPoint(r,420+i*95,{lane:1}),'scrap');
      for(const w of scene.wrecks){add({x:w.x-65,y:w.y+38},'scrap');add({x:w.x+65,y:w.y-38},'scrap');}
      const rest=WORLD.scrap-8-scene.wrecks.length*2;
      for(let i=0;i<rest;i++)add(populationPoint(r,440+(i+r())/rest*(MAX_WORLD_Y-620)),'scrap');
      for(let i=0;i<6;i++)add(populationPoint(r,500+i*120,{lane:1}),'crystal');
      for(let i=0;i<WORLD.crystal-6;i++)add(populationPoint(r,800+(i+r())/(WORLD.crystal-6)*(MAX_WORLD_Y-980)),'crystal');
      for(let i=0;i<WORLD.caches;i++)add(populationPoint(r,700+(i+r())/WORLD.caches*(MAX_WORLD_Y-880)),'air');
    }
    if(field.legacyLayout&&!field.crystalTopUp){
      // Existing deposits, IDs and depletion survive. Add only the missing final-level stock.
      const amount=Math.max(0,currentLevel().crystals-field.loot.filter(n=>n.type==='crystal').reduce((a,n)=>a+n.quantity,0));
      const r=randGen(field.seed^919191),count=Math.ceil(amount/2);
      let nextId=1+Math.max(-1,...field.loot.map(n=>Number(n.id.slice(5))||0));
      for(let i=0;i<count;i++)field.loot.push({id:'loot-'+nextId++,...populationPoint(r,700+(i+r())/count*(MAX_WORLD_Y-900)),type:'crystal',quantity:Math.min(2,amount-i*2)});
      field.crystalTopUp=true;
    }
    field.salvage=normaliseSalvage(field.salvage,field.loot,field.looted);
    for(const node of field.loot)scene.items.push(makeItem(node.x,node.y,node.type,{...node,collected:looted.has(node.id)}));
    for(const node of field.drops)scene.items.push(makeItem(node.x,node.y,'scrap',{...node,predatorDrop:true}));
    for(const node of field.recoveries){
      placeRecovery(node);
      scene.items.push(makeItem(node.x,node.y,'recovery',{...node,recorders:[...node.recorders],type:'recovery'}));
    }
    const r=randGen((field.seed^Math.imul(field.cycle+1,2246822519))>>>0);
    const addPredator=(y,tier,lane)=>{
      const point=populationPoint(r,y,{lane}),id='enemy-'+scene.predators.length;
      const health=field.health[id]??Math.round(PREDATOR_TIERS[tier].health*currentLevel().health);
      const enemy=createPredator({id,tier,...point,homeX:point.x,homeY:y,vx:0,vy:0,phase:r()*TAU,aggression:0,lastHit:-10,alertUntil:0,forgetUntil:0,revealUntil:0,health});
      enemy.dead=enemy.health<=0;keepPredatorOutsideHarbour(enemy);avoidWildSpawn(enemy);scene.predators.push(enemy);
    };
    if(field.legacyLayout){
      // Preserve legacy predator IDs and damage/deaths until the next real docking cycle.
      for(let lane=0;lane<3;lane++){
        for(let i=0;i<46;i++)addPredator(510+i*370+r()*110,'common',lane);
        for(let i=0;i<11;i++)addPredator(4490+i*1190+r()*220,'apex',lane);
        for(let i=0;i<5;i++)addPredator(8220+i*2090+r()*400,'reaper',lane);
      }
    }else for(const [tier,count,minY] of [['common',WORLD.common,800],['apex',WORLD.apex,4250],['reaper',WORLD.reaper,8300]]){
      for(let i=0;i<count;i++)addPredator(minY+(i+r())/count*(MAX_WORLD_Y-120-minY),tier,i%3);
    }
    scene.predators=scene.predators.filter(predatorAlive);buildWarden();
  }
  function createWorld() {
    giantSite=null;giantWallCache=[];
    idCounter=0;
    const r=randGen(field.seed);
    scene={rocks:[],items:[],predators:[],vents:[],dust:[],wrecks:[],mines:[],blasts:[],projectiles:[]};
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
    for(let i=0;i<Math.ceil(currentLevel().depth*.115);i++){
      const y=150+r()*(MAX_WORLD_Y-270);
      scene.vents.push({x:lerp(leftAt(y)+30,rightAt(y)-30,r()),y,phase:r()*TAU});
    }
    for(let i=0;i<Math.ceil(currentLevel().depth*1.32);i++){
      const y=r()*MAX_WORLD_Y;
      scene.dust.push({x:lerp(leftAt(y)-120,rightAt(y)+120,r()),y,phase:r()*TAU,size:.5+r()*1.7});
    }
    populateWorld();buildEnvironment();hydrateSurvey();buildWildWaters();buildWarden();buildGiants();initialiseBatteryCells();deepwater?.build();initialisePredatorBehaviours(true);persistField();
  }
  function refreshDockPopulation(){
    field.cycle++;field.health={};
    const supplies=new Set(field.loot.filter(n=>n.type==='air').map(n=>n.id));
    field.looted=field.looted.filter(id=>!supplies.has(id));field.awaitingDock=false;
    const rememberedSite=giantSite;giantSite=null;populateWorld();giantSite=rememberedSite;
    buildGiants();initialiseBatteryCells();deepwater?.build();initialisePredatorBehaviours(true);persistField();
    addEvent('Dock cycle complete · predators and caches refreshed; salvage timers and crystals unchanged');
  }
  function updateSalvageRegeneration(dt){
    // All visited levels in THIS slot age while this campaign is being dived.
    // Pause, dock, harbour waiting, inactive slots and time offline grant no stock.
    if(!running||paused||inHarbour(player)||!Number.isFinite(dt)||dt<=0)return;
    let changed=false;
    for(const [levelId,f] of Object.entries(campaignLevels)){
      if(!f.loot?.length)continue;
      const state=f.salvage||(f.salvage=normaliseSalvage(null,f.loot,f.looted));
      state.elapsed+=dt;
      if(state.elapsed<state.nextSpawnAt)continue;
      const spent=new Set(f.looted);
      const candidates=f.loot.filter(n=>n.type==='scrap'&&spent.has(n.id)&&Number.isFinite(state.due[n.id])&&state.due[n.id]<=state.elapsed)
        .sort((a,b)=>state.due[a.id]-state.due[b.id]||a.id.localeCompare(b.id));
      const node=candidates.find(n=>levelId!==LEVEL_ID||(!onscreen(n.x,n.y,SALVAGE_REGEN.offscreenMargin)&&distance(player,n)>magnetRange()+100));
      if(!node)continue;
      // Restore an existing deposit, never mint new crystals, nodes or kill drops.
      f.looted=f.looted.filter(id=>id!==node.id);delete state.due[node.id];
      state.nextSpawnAt=state.elapsed+SALVAGE_REGEN.interval;
      if(levelId===LEVEL_ID){const item=scene.items.find(n=>n.id===node.id&&n.type==='scrap');if(item){item.collected=false;item.revealUntil=0;item.echoDuration=0;}}
      // Survey contact remains a last-seen record until that site is revisited.
      changed=true;
    }
    if(changed)persist();
  }
  function recordSalvageHarvest(item){
    if(item.type!=='scrap'||item.predatorDrop||!field.loot?.some(n=>n.id===item.id&&n.type==='scrap'))return;
    const state=field.salvage||(field.salvage=normaliseSalvage(null,field.loot,field.looted));
    if(!state.harvested.includes(item.id))state.harvested.push(item.id);
    state.due[item.id]=state.elapsed+SALVAGE_REGEN.delay;
  }

  // Battery cells have a separate deterministic stream and canonical state. They
  // cannot affect finite resources, first-survey achievements or predator loot.
  function initialiseBatteryCells(){
    if(!field.batteryCells){
      const index=LEVELS.findIndex(l=>l.id===LEVEL_ID),r=randGen((field.seed^0x61ab4e29)>>>0),nodes=[];
      for(let i=0;i<BATTERY_CELLS.counts[index];i++){
        let point=null;
        for(let attempt=0;attempt<900;attempt++){
          const y=i===0?800+r()*400:lerp(700,MAX_WORLD_Y-220,clamp((i+.25+r()*.65)/BATTERY_CELLS.counts[index],.05,.96));
          const x=lerp(baseLeftAt(y)+95,baseRightAt(y)-95,r()),p={x,y};
          if(projectileSolid(x,y,42)||distance(p,HARBOUR)<450||scene.items.some(n=>distance(n,p)<80)||nodes.some(n=>distance(n,p)<280))continue;
          if((scene.derelictMines||[]).some(n=>distance(n,p)<180)||(scene.ventFields||[]).some(v=>Math.abs(v.x-x)<v.rx+90&&y>v.y-v.height-80&&y<v.y+90))continue;
          if(LEVEL_ID==='midnight-cathedral'&&signals.warden.site&&distance(p,signals.warden.site)<WARDEN.radius+100)continue;
          point=p;break;
        }
        if(point)nodes.push({id:'battery-'+i,...point});
      }
      field.batteryCells={version:1,nodes,elapsed:0,nextSpawnAt:0,due:{}};
    }
    syncBatteryCellItems();
  }
  function syncBatteryCellItems(){
    for(const node of field.batteryCells?.nodes||[]){
      let item=scene.items.find(n=>n.id===node.id&&n.type==='battery');
      const collected=Number.isFinite(field.batteryCells.due[node.id]);
      if(item)Object.assign(item,{x:node.x,y:node.y,collected});
      else scene.items.push(makeItem(node.x,node.y,'battery',{id:node.id,quantity:BATTERY_CELLS.power,collected}));
    }
  }
  function collectBatteryCell(item){
    if(!running||paused||player.airborne||item.collected||distance(player,item)>=BATTERY_CELLS.range||!clearSalvageLine(item)||player.battery>=maxBattery()-.01)return false;
    const state=field.batteryCells,node=state?.nodes.find(n=>n.id===item.id);
    if(!node||Number.isFinite(state.due[node.id]))return false;
    const amount=Math.min(BATTERY_CELLS.power,maxBattery()-player.battery);
    player.battery+=amount;item.collected=true;state.due[item.id]=state.elapsed+BATTERY_CELLS.recharge;
    rememberSurveyObject('items',item);pickupNotice('power',amount);window.AbyssAudio?.event('pickup');
    addEvent('Battery cell recovered · +'+amount.toFixed(amount%1?1:0)+' power');persist();updateUI();return true;
  }
  function autoCollectBatteryCells(){
    if(!running||paused||player.airborne||player.battery>maxBattery()-5)return;
    // Avoid wasting an entire cell on negligible idle draw; USE can top up smaller deficits.
    for(const item of scene.items)if(item.type==='battery'&&!item.collected&&distance(player,item)<BATTERY_CELLS.range)collectBatteryCell(item);
  }
  function updateBatteryCells(dt){
    if(!running||paused||player.airborne||inHarbour(player)||!Number.isFinite(dt)||dt<=0)return;
    let changed=false;
    for(const [id,f] of Object.entries(campaignLevels)){
      const state=f.batteryCells;if(!state)continue;
      state.elapsed+=dt;
      if(state.elapsed<state.nextSpawnAt)continue;
      const ready=state.nodes.filter(n=>Number.isFinite(state.due[n.id])&&state.due[n.id]<=state.elapsed).sort((a,b)=>state.due[a.id]-state.due[b.id]||a.id.localeCompare(b.id));
      const node=ready.find(n=>id!==LEVEL_ID||!onscreen(n.x,n.y,100)&&distance(player,n)>180);
      if(!node)continue;
      delete state.due[node.id];state.nextSpawnAt=state.elapsed+BATTERY_CELLS.interval;changed=true;
      if(id===LEVEL_ID){const item=scene.items.find(n=>n.type==='battery'&&n.id===node.id);if(item){item.collected=false;item.revealUntil=0;item.echoDuration=0;}}
    }
    if(changed)persist();
  }

  function autoCollectSalvage(dt){
    if(!running||paused||player.airborne||player.y<SURFACE.y)return;
    player.autoSalvageCooldown=Math.max(0,(player.autoSalvageCooldown||0)-dt);
    if(player.autoSalvageCooldown>0)return;
    let closest=null,range=magnetRange();
    for(const item of scene.items){
      if(item.collected||item.type!=='scrap')continue;
      const d=distance(player,item);
      if(d<range&&((d<60&&clearSalvageLine(item))||remoteSalvageAvailable(item))){closest=item;range=d;}
    }
    if(closest&&collectItem(closest,true))player.autoSalvageCooldown=SALVAGE_REGEN.pickupInterval;
  }
  function newDive() {
    pickupNotices=[];
    // A new launch is distinct from restoring the existing expedition.
    loadedActive=null;running=false;buildingWorld=true;createWorld();buildingWorld=false;dockVisitActive=!field.awaitingDock;
    player={x:600,y:160,vx:0,vy:0,airborne:false,surfaceCooldownUntil:0,facing:-Math.PI/2,hull:maxHull(),oxygen:maxOxygen(),battery:maxBattery(),noise:0,lights:true,damageCooldown:0,scanCooldown:0,boost:boostCapacity(),boosting:false,boostLocked:false,boostNeedsRelease:false,boostRechargeDelay:0,cargo:{scrap:0,crystal:0,recorders:[],plates:[]},lastRepair:-100,mineAmmo:0,mineCooldown:0,weaponAmmo:{...saved.weaponAmmo},weaponCooldown:{railgun:0,torpedo:0},damageFlashUntil:0,nextDamageFlash:0,kills:0,shield:shieldCapacity(),shieldDelay:0,shieldFlashUntil:0,magnetFlash:null,autoSalvageCooldown:0,trip:{deepest:0,hullDamage:0}};
    resupplyMines();
    sonarWaves=[];sonarTerrainEchoes=[];surfaceEffects=[];clock=0;for(const m of scene.derelictMines||[])Object.assign(m,mineLocation(m));lastZone='';eventLines=[];useHoldTimer=0;victoryShown=saved.secured.length===RECORDERS_TOTAL;resetPilotInput();camera.x=player.x-viewport.w/2;camera.y=player.y-viewport.h/2;
    addEvent('Dive systems initialised.');
    addEvent(currentLevel().name+' · '+RECORDERS_TOTAL+' recorders · '+currentLevel().depth.toLocaleString('en-GB')+' m seabed.');
    running=true;paused=false;showingDock=false;
    $('menuOverlay').classList.add('hidden');$('modalOverlay').classList.add('hidden');$('pauseOverlay').classList.add('hidden');
    canvas.focus({preventScroll:true});syncPauseButtons();
    announce(field.recoveries.length?'RECOVERY BEACON ACTIVE · '+field.recoveries.length+' CARGO SITE'+(field.recoveries.length===1?'':'S')+' TO RECOVER':'EXPEDITION ACTIVE · LOCATE THE RECORDERS');
    surveyVisibleWater();persist();updateUI();
  }
  function addEvent(msg) {eventLines.unshift(msg);eventLines=eventLines.slice(0,3);$('eventLog').innerHTML=eventLines.map(x=>'<div>◈ '+x+'</div>').join('');}
  function announce(message,duration=2.8) { $('notification').textContent=message;$('notification').classList.remove('hidden');toastUntil=clock+duration; }
  let pickupNotices=[];
  const PICKUP_STYLE=Object.freeze({scrap:['#9ce4d3','SCRAP'],crystal:['#c6a2ff','CRYSTAL'],recorder:['#f3ce86','RECORDER'],plate:['#f3ce86','PLATE'],air:['#9bdcec','OXYGEN'],power:['#e6c78e','POWER'],contract:['#a9dced','PACKAGE'],cache:['#9bdcec','SUPPLY CACHE']});
  function pickupNotice(kind,amount=1){
    if(!player||!(amount>0)||!PICKUP_STYLE[kind])return;
    pickupNotices=pickupNotices.filter(n=>clock-n.birth<1.65);
    const recent=pickupNotices.find(n=>n.kind===kind&&clock-n.birth<.18);
    if(recent){recent.amount+=amount;return;}
    // A small stack beside the vessel, not a full-width announcement.
    const nearby=pickupNotices.filter(n=>clock-n.birth<.55).length;
    pickupNotices.push({kind,amount,x:player.x,y:player.y,birth:clock,lane:nearby%5});
    if(pickupNotices.length>12)pickupNotices.shift();
  }
  function drawPickupNotices(){
    const zoom=viewport.zoom||1;
    pickupNotices=pickupNotices.filter(n=>clock-n.birth<1.65&&clock>=n.birth);
    for(const n of pickupNotices){
      const age=clock-n.birth,[color,label]=PICKUP_STYLE[n.kind];
      ctx.save();ctx.translate(n.x-camera.x,n.y-camera.y);ctx.scale(1/zoom,1/zoom);
      ctx.translate(20,-15-n.lane*16-age*25);ctx.globalAlpha=Math.min(1,age/.07)*(1-smoothstep(.8,1.65,age));
      const text='+'+Math.round(n.amount)+' '+label;ctx.font='600 10px ui-monospace,monospace';
      ctx.fillStyle='rgba(3,15,23,.72)';ctx.beginPath();ctx.roundRect(-5,-11,ctx.measureText(text).width+24,17,6);ctx.fill();
      ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=1.2;ctx.beginPath();
      if(n.kind==='crystal'){ctx.moveTo(0,-5);ctx.lineTo(4,-10);ctx.lineTo(8,-5);ctx.lineTo(4,0);ctx.closePath();ctx.stroke();}
      else if(n.kind==='recorder'){ctx.strokeRect(0,-9,9,8);ctx.arc(2.5,-6,1.2,0,TAU);ctx.moveTo(8,-6);ctx.arc(6.5,-6,1.2,0,TAU);ctx.stroke();}
      else if(n.kind==='air'){ctx.arc(4,-5,4,0,TAU);ctx.moveTo(2,-5);ctx.lineTo(6,-5);ctx.moveTo(4,-7);ctx.lineTo(4,-3);ctx.stroke();}
      else if(n.kind==='power'){ctx.moveTo(5,-10);ctx.lineTo(1,-4);ctx.lineTo(5,-4);ctx.lineTo(3,1);ctx.lineTo(8,-6);ctx.lineTo(4,-6);ctx.stroke();}
      else{ctx.rect(0,-9,8,8);ctx.moveTo(2,-6);ctx.lineTo(6,-6);ctx.stroke();}
      ctx.fillText(text,14,-2);ctx.restore();
    }
  }
  function clearSalvageLine(item){
    // Check the actual collision polygons, not only their bounding circles.
    const dx=item.x-player.x,dy=item.y-player.y,steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/6));
    const rocks=collisionPolygons().filter(r=>Math.hypot(segmentClosest(r.x,r.y,player,item).x-r.x,segmentClosest(r.x,r.y,player,item).y-r.y)<=r.radius+5);
    for(let i=1;i<=steps;i++){
      const x=player.x+dx*i/steps,y=player.y+dy*i/steps;
      if(x<leftAt(y)+3||x>rightAt(y)-3)return false;
      if(rocks.some(r=>insidePolygon(x,y,r.vertices)))return false;
    }
    return true;
  }
  function remoteSalvageAvailable(item){
    return saved.upgrades.magnet>0&&['scrap','crystal'].includes(item.type)&&player.battery>=magnetPower()&&
      (ambientLightAt(item.y)>.08||item.revealUntil>clock||headlightsActive()&&beamIntersects(item.x,item.y,8))&&clearSalvageLine(item);
  }
  function nearestInteractable() {
    if(!player)return null;
    const station = HARBOUR;
    if(!player.airborne&&player.y>=SURFACE.y&&distance(player,station)<HARBOUR.dockRadius && depthOf(player.y)<30)return {type:'station',x:station.x,y:station.y};
    let candidate=null,range=magnetRange(); // Responsive salvage pick-up while gliding past an item.
    for (const item of scene.items) if(!item.collected&&item.type!=='scrap'&&(item.type!=='battery'||player.battery<maxBattery()-.01)) {
      const d=distance(player,item);
      if(d<range&&((d<60&&clearSalvageLine(item))||remoteSalvageAvailable(item))) {range=d;candidate=item;}
    }
    // An explicit nearby buoy/package must not be hidden by a more distant pickup.
    // This also prevents newly added resource types from monopolising USE.
    const signal=nearestSignal();
    if(signal&&(!candidate||distance(player,signal)<distance(player,candidate)))return signal;
    const rescue=deepwater?.near();
    if(rescue&&(!candidate||distance(player,rescue)<distance(player,candidate)))return rescue;
    return candidate||nearestGiantObject();
  }
  function interact(silentMiss=false) {
    if(!running||paused)return;
    const item=nearestInteractable();
    if(!item) {if(!silentMiss)announce('NOTHING IN SALVAGE RANGE',1.25);return;}
    if(item.type==='station') {depositAndDock();return;}
    if(item.type==='signal'){interactSignal(item);return;}
    if(item.type==='giant'){interactGiantObject(item);return;}
    if(item.type==='rescue'){deepwater.interact(item);return;}
    collectItem(item);
  }
  function collectItem(item,automatic=false){
    if(!running||paused||item.collected||player.airborne)return false;
    if(item.type==='battery')return collectBatteryCell(item);
    if(item.type==='recorder'&&(saved.secured.includes(item.index)||player.cargo.recorders.includes(item.index)||recorderInRecovery(item.index)))return false;
    const recovery=item.type==='recovery'?field.recoveries.find(r=>r.id===item.id):null;
    if(item.type==='recovery'&&!recovery)return false;
    if(distance(player,item)>=magnetRange())return false;
    if(distance(player,item)<60&&!clearSalvageLine(item))return false;
    if(distance(player,item)>=60){
      // Re-check on use so low power never collects a remote item for free.
      if(!remoteSalvageAvailable(item))return false;
      player.battery=Math.max(0,player.battery-magnetPower());
      // Pickup confirmation is emitted at the vessel; no tractor line.
    }
    item.collected=true;recordSalvageHarvest(item);rememberSurveyObject('items',item);window.AbyssAudio?.event(item.type==='recorder'?'recorder':'pickup');
    const quantity=item.quantity||1;
    if(distance(player,item)>=60&&['scrap','crystal'].includes(item.type))addStat('magnetPickups',1);
    if(item.predatorDrop){field.drops=field.drops.filter(n=>n.id!==item.id);}
    else if(!['recorder','recovery'].includes(item.type)&&typeof item.id==='string'&&!field.looted.includes(item.id))field.looted.push(item.id);
    if(item.type==='recovery'){
      // Transfer the canonical manifest exactly once. A checkpoint captures the
      // removed wreck and the recovered cargo together in the same slot write.
      field.recoveries=field.recoveries.filter(n=>n.id!==item.id);
      player.cargo.scrap+=recovery.scrap;player.cargo.crystal+=recovery.crystal;
      player.cargo.plates=GIANTS.plates([...(player.cargo.plates||[]),...(recovery.plates||[])]).filter(id=>!giants.banked.includes(id));
      for(const i of recovery.recorders)if(!saved.secured.includes(i)&&!player.cargo.recorders.includes(i))player.cargo.recorders.push(i);
      if(field.survey.waypoint&&distance(field.survey.waypoint,recovery)<1)field.survey.waypoint=null;
      pickupNotice('scrap',recovery.scrap);pickupNotice('crystal',recovery.crystal);pickupNotice('recorder',recovery.recorders.length);pickupNotice('plate',(recovery.plates||[]).length);if(recovery.kind==='wreck')addStat('wreckRecoveries',1);addEvent('Recovered '+recoveryContents(recovery));
    }
    else if(item.type==='scrap') {player.cargo.scrap+=quantity;pickupNotice('scrap',quantity);if(!automatic)addEvent('Scrap recovered (+'+quantity+')');}
    else if(item.type==='crystal') {player.cargo.crystal+=quantity;addEvent('Abyss crystals recovered (+'+quantity+')');pickupNotice('crystal',quantity);}
    else if(item.type==='air') {const air=Math.min(35,maxOxygen()-player.oxygen),power=Math.min(12,maxBattery()-player.battery);player.oxygen+=air;player.battery+=power;pickupNotice('air',air);pickupNotice('power',power);if(!air&&!power)pickupNotice('cache',1);addEvent('Emergency supply cache');}
    else if(item.type==='recorder') {player.cargo.recorders.push(item.index);addEvent('ENCRYPTED RECORDER FOUND');pickupNotice('recorder',1);}
    checkAchievements();persist();updateUI();return true;
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
    for(const kind of ['items','predators','rocks','wrecks','vents','mines','landmarks','derelictMines','ventFields','schools','signals','giantObjects','rescueObjects'])for(const object of (scene[kind]||[]))add(kind,object);
    for(let y=Math.floor((camera.y-30)/24)*24;y<=camera.y+viewport.h+30;y+=24){
      if(y<120)continue;
      for(const side of [-1,1])add('wall',{x:side<0?leftAt(y):rightAt(y),y,side});
    }
    if(MAX_WORLD_Y>=camera.y-40&&MAX_WORLD_Y<=camera.y+viewport.h+40){
      for(let x=Math.max(leftAt(MAX_WORLD_Y),camera.x-30);x<=Math.min(rightAt(MAX_WORLD_Y),camera.x+viewport.w+30);x+=24)add('floor',{x,y:MAX_WORLD_Y});
    }
    const duration=range/SONAR.waveSpeed;
    const disruption=disruptorReady()?saved.upgrades.disruptor:0;
    player.battery-=sonarCost()+(disruption?DISRUPTOR.power[disruption]:0);player.scanCooldown=Math.max(sonarCooldown(),duration+.4);
    player.scanDuration=player.scanCooldown; // UI ring uses the actual screen-sized scan duration.
    player.noise=Math.min(100,player.noise+27);addStat('sonarPings',1);checkAchievements();window.AbyssAudio?.event('sonar');
    sonarWaves.push({...origin,disruption,birth:clock,radius:range,front:0,duration,echoSeconds:sonarEchoSeconds(),contacts});
    persist();
    addEvent(disruption?'Disruptor pulse · nearby contacts stunned on arrival':saved.upgrades.disruptor?'Standard scan · insufficient power for disruption':'Sonar sweeping · contacts appear on wave arrival');
    updateUI();
  }
  function updateSonar() {
    for(const wave of sonarWaves){
      const previous=wave.front;
      wave.front=Math.min(wave.radius,Math.max(0,clock-wave.birth)*SONAR.waveSpeed);
      if(wave.front-previous>0)surveySonarWave(wave,previous);
      for(const contact of wave.contacts){
        if(contact.hit||contact.object.collected||contact.object.dead||contact.object.detonated)continue;
        const object=contact.object,d=distance(wave,object);
        // Crossing test handles moving predators and large simulation steps.
        if(d<=wave.front&&(contact.previousDistance>=previous||previous===0)){
          contact.hit=true;rememberSurveyObject(contact.kind,object);if(contact.kind==='signals')missionWave(object,wave);if(contact.kind==='giantObjects')giantWave(object);if(contact.kind==='rescueObjects')deepwater?.onWave(object);
          if(['items','predators'].includes(contact.kind))window.AbyssAudio?.event('echo',clamp((object.x-player.x)/300,-1,1));
          object.revealUntil=Math.max(object.revealUntil||0,clock+wave.echoSeconds);
          object.echoDuration=wave.echoSeconds;
          if(contact.kind==='schools'){object.sonarUntil=clock+1.4;object.sonarX=wave.x;object.sonarY=wave.y;object.revealUntil=clock+Math.min(2,wave.echoSeconds);}
          if(contact.kind==='predators'){
            object.alertUntil=Math.max(object.alertUntil||0,clock+5);
            if(wave.disruption&&d<=DISRUPTOR.range[wave.disruption]){
              const duration=DISRUPTOR.seconds[wave.disruption]*(DISRUPTOR.resistance[object.tier]||1);
              object.stunnedUntil=Math.max(object.stunnedUntil||0,clock+duration);
              object.vx=0;object.vy=0;
            }
          }
          if(contact.kind==='wall'||contact.kind==='floor'){object.echoKind=contact.kind;sonarTerrainEchoes.push(object);}
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
    if(y<58||y+MINES.radius>MAX_WORLD_Y||x<leftAt(y)+MINES.radius+2||x>rightAt(y)-MINES.radius-2)return false;
    for(const rock of collisionPolygons()){
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
      birth:clock,armedAt:clock+MINES.armDelay,detonated:false,revealUntil:0,
      originX:drop.x,originY:drop.y,vx:0,vy:0,heading:player.facing+Math.PI,targetId:null});
    window.AbyssAudio?.event('mine');
    player.mineAmmo--;saved.mineAmmo=player.mineAmmo;player.mineCooldown=MINES.deployCooldown;persist();
    addEvent('Mk '+roman(saved.upgrades.minePower)+' mine deployed · '+player.mineAmmo+' remaining');
    updateUI();return true;
  }
  function mineContactTime(mine,enemy,dt){
    // Relative swept collision: both the predator and the newly mobile mine can
    // move during a frame. The mine stays still for the unarmed part of it.
    const armedFraction=dt>0?clamp((mine.armedAt-(clock-dt))/dt,0,1):0;
    const mx0=mine.previousX??mine.x,my0=mine.previousY??mine.y;
    const ex0=lerp(enemy.previousX??enemy.x,enemy.x,armedFraction);
    const ey0=lerp(enemy.previousY??enemy.y,enemy.y,armedFraction);
    const ax=ex0-mx0,ay=ey0-my0,dx=(enemy.x-mine.x)-ax,dy=(enemy.y-mine.y)-ay;
    const c=ax*ax+ay*ay-MINES.triggerRadius**2;
    if(c<=0)return armedFraction;
    const a=dx*dx+dy*dy;if(a<1e-12)return null;
    const b=2*(ax*dx+ay*dy),discriminant=b*b-4*a*c;
    if(discriminant<0)return null;
    const t=(-b-Math.sqrt(discriminant))/(2*a);
    return t>=0&&t<=1?armedFraction+(1-armedFraction)*t:null;
  }
  function damagePredator(enemy,amount,credited=true,source=null){
    if(!predatorAlive(enemy)||!Number.isFinite(amount)||amount<=0)return;
    if(enemy.tier==='warden')amount=damageWarden(enemy,amount,source);
    enemy.health=Math.max(0,enemy.health-amount);enemy.lastDamaged=clock;
    if(enemy.tier==='warden'){signals.warden.health=enemy.health;if(enemy.health===0)wardenDefeated(enemy);else enemy.alertUntil=clock+5;persist();return;}
    if(typeof enemy.id==='string')field.health[enemy.id]=enemy.health;
    if(enemy.health===0){
      enemy.dead=true;enemy.aggression=0;enemy.alertUntil=0;missionKilled(enemy,credited);if(credited){player.kills++;addStat('kills',1);if(enemy.tier==='reaper')addStat('reaperKills',1);checkAchievements();}
      const quantity=PREDATOR_SALVAGE[enemy.tier]||2;
      const id='drop-'+field.cycle+'-'+(enemy.id??('fixture-'+idCounter++));
      if(!field.drops.some(n=>n.id===id)){
        // Hunters can overlap rock outlines. Keep the reward accessible.
        let point={x:enemy.x,y:enemy.y};
        if(!minePositionClear(point.x,point.y))point=populationPoint(randGen(field.seed+field.cycle+idCounter),enemy.y);
        const drop={...point,id,type:'scrap',quantity};
        field.drops.push(drop);scene.items.push(makeItem(point.x,point.y,'scrap',{...drop,predatorDrop:true}));
      }
      if(credited||distance(player,enemy)<500)addEvent(PREDATOR_TIERS[enemy.tier].name+' neutralised · '+quantity+' scrap to recover');
    }else{
      enemy.aggression=Math.max(.5,enemy.aggression);enemy.alertUntil=clock+4;enemy.forgetUntil=0;
    }
    persist();
  }
  function updateMines(dt){
    for(const mine of scene.mines){
      if(mine.detonated)continue;
      mine.previousX=mine.x;mine.previousY=mine.y;
      if(clock<mine.armedAt)continue;
      // Legacy stationary mines acquire an anchor at their saved position.
      if(!Number.isFinite(mine.originX))mine.originX=mine.x;
      if(!Number.isFinite(mine.originY))mine.originY=mine.y;
      const armedFraction=dt>0?clamp((mine.armedAt-(clock-dt))/dt,0,1):0;
      guideMine(mine,Math.max(0,dt*(1-armedFraction)));
      let contact=null;
      for(const enemy of scene.predators)if(predatorAlive(enemy)){
        const t=mineContactTime(mine,enemy,dt);
        if(t===null)continue;
        const mt=(t-armedFraction)/Math.max(1e-9,1-armedFraction);
        const centre={x:lerp(mine.previousX,mine.x,mt),y:lerp(mine.previousY,mine.y,mt)};
        const target={x:lerp(enemy.previousX??enemy.x,enemy.x,t),y:lerp(enemy.previousY??enemy.y,enemy.y,t)};
        if(guidanceLineClear(centre,target,0)&&(contact===null||t<contact))contact=t;
      }
      if(contact===null)continue;
      const mt=(contact-armedFraction)/Math.max(1e-9,1-armedFraction);
      mine.x=lerp(mine.previousX,mine.x,mt);mine.y=lerp(mine.previousY,mine.y,mt);
      mine.detonated=true;window.AbyssAudio?.event('explosion',clamp((mine.x-player.x)/300,-1,1));
      scene.blasts.push({x:mine.x,y:mine.y,birth:clock,radius:MINES.blastRadius});
      let hits=0;
      for(const enemy of scene.predators)if(predatorAlive(enemy)){
        const target={x:lerp(enemy.previousX??enemy.x,enemy.x,contact),y:lerp(enemy.previousY??enemy.y,enemy.y,contact)};
        if(distance(target,mine)<=MINES.blastRadius&&guidanceLineClear(mine,target,0)){damagePredator(enemy,mine.damage,true,mine);hits++;}
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
    announce('FIELD REPAIR COMPLETE · HULL +30',2);addEvent('Used 2 scrap for repairs');persist();updateUI();
  }
  function toggleLights(fromTelemetry=false){if(!running||(paused&&!(fromTelemetry===true&&$('telemetryDialog').open)))return;player.lights=!player.lights;window.AbyssAudio?.event('lights');persist();addEvent('External lamps '+(player.lights?'activated':'disabled'));updateUI();}
  const ACHIEVEMENTS = Object.freeze([
    {id:'first-signal',name:'First Transmission',description:'Bank your first flight recorder.',target:1,kind:'recorders',icon:'01'},
    {id:'shelf',name:'Shelf Graduate',description:'Secure both Sunbreak Shelf recorders.',target:1,kind:'level',level:0,icon:'02'},
    {id:'rift',name:'Rift Runner',description:'Secure all three Glassbone Rift recorders.',target:1,kind:'level',level:1,icon:'03'},
    {id:'gardens',name:'Garden Keeper',description:'Secure all four Drowned Gardens recorders.',target:1,kind:'level',level:2,icon:'04'},
    {id:'cathedral',name:'Midnight Courier',description:'Secure all five Midnight Cathedral recorders.',target:1,kind:'level',level:3,icon:'05'},
    {id:'transmission',name:'The Signal Returns',description:'Complete all five levels and secure all 20 recorders.',target:20,kind:'recorders',icon:'06'},
    {id:'pressure',name:'Pressure Tested',description:'Reach a depth of 1,000 metres.',target:1000,kind:'depth',icon:'07'},
    {id:'bottom',name:'Rock Bottom',description:'Visit the seabed in all five levels.',target:5,kind:'floors',icon:'08'},
    {id:'salvage',name:'Salvage Professional',description:'Deliver 200 scrap units to the hub across any number of dives.',target:200,kind:'stat',stat:'bankedScrap',icon:'09'},
    {id:'crystals',name:'Crystal Archivist',description:'Deliver 100 crystals to the hub across any number of dives.',target:100,kind:'stat',stat:'bankedCrystals',icon:'10'},
    {id:'sweep',name:'Clean Sweep',description:'Collect each original scrap and crystal site at least once in any one level.',target:1,kind:'sweeps',icon:'11'},
    {id:'survey',name:'Full Survey',description:'Collect each original scrap and crystal site at least once across all five levels.',target:5,kind:'sweeps',icon:'12'},
    {id:'first-blood',name:'First Blood',description:'Destroy your first predator.',target:1,kind:'stat',stat:'kills',icon:'13'},
    {id:'reapers',name:'Apex Eraser',description:'Destroy 10 Crimson Reapers across repeated dives.',target:10,kind:'stat',stat:'reaperKills',icon:'14'},
    {id:'demolition',name:'Demolition Crew',description:'Destroy 50 predators across the campaign.',target:50,kind:'stat',stat:'kills',icon:'15'},
    {id:'echoes',name:'Echo Cartographer',description:'Send 50 successful sonar pulses.',target:50,kind:'stat',stat:'sonarPings',icon:'16'},
    {id:'attraction',name:'Magnetic Attraction',description:'Make 50 remote resource pickups with the Salvage Magnet.',target:50,kind:'stat',stat:'magnetPickups',icon:'17'},
    {id:'shield',name:'Shield Specialist',description:'Absorb 500 damage with the Kinetic Shield.',target:500,kind:'stat',stat:'shieldAbsorbed',icon:'18'},
    {id:'getaway',name:'Clean Getaway',description:'Return with cargo from at least 200 m without taking hull damage during that trip.',target:1,kind:'stat',stat:'cleanGetaways',icon:'19'},
    {id:'systems',name:'All Systems Go',description:'Fully upgrade all 14 ship systems.',target:14,kind:'systems',icon:'20'},
    {id:'warden-breaker',name:'Warden Breaker',description:'Defeat the Cathedral Warden.',target:1,kind:'warden',icon:'21'},
    {id:'wreck-diver',name:'Wreck Diver',description:'Recover and bank your first ship identification plate.',target:1,kind:'plates',icon:'22'},
    {id:'forgotten-fleet',name:'Forgotten Fleet',description:'Explore all five wrecks and bank all five identification plates.',target:5,kind:'plates',icon:'23'},
    {id:'open-sesame',name:'Open Sesame',description:'Open the permanent service shortcut in all five wrecks.',target:5,kind:'shortcuts',icon:'24'},
    {id:'first-commission',name:'First Commission',description:'Complete and claim your first dock contract.',target:1,kind:'contracts',icon:'25'},
    {id:'trusted-contractor',name:'Trusted Contractor',description:'Complete and claim 10 dock contracts.',target:10,kind:'contracts',icon:'26'},
    {id:'versatile-operator',name:'Versatile Operator',description:'Complete one of each contract type: cargo, survey, hunt and silent recovery.',target:4,kind:'contract-types',icon:'27'},
    {id:'recovery-specialist',name:'Recovery Specialist',description:'Recover cargo from five destroyed submarines.',target:5,kind:'stat',stat:'wreckRecoveries',icon:'28'},
    {id:'dolphin-pilot',name:'Dolphin Pilot',description:'Breach the surface ten times under your own momentum.',target:10,kind:'stat',stat:'surfaceBreaches',icon:'29'},
    {id:'heavy-haul',name:'Heavy Haul',description:'Bank at least 40 scrap units in one return to the harbour.',target:40,kind:'stat',stat:'bestScrapHaul',icon:'30'}
  ]);
  const addStat=(key,amount)=>{saved.stats[key]=(saved.stats[key]||0)+Math.max(0,amount);};
  const totalRecorders=()=>LEVELS.reduce((n,l)=>n+(campaignLevels[l.id]?.secured.length||0),0);
  function resourceProgress(id){
    const l=LEVELS.find(x=>x.id===id),f=campaignLevels[id],nodes=f?.loot?.filter(n=>['scrap','crystal'].includes(n.type));
    if(!nodes)return {scrapTotal:l.scrap*2,scrapRemaining:l.scrap*2,crystalTotal:l.crystals,crystalRemaining:l.crystals,collected:0,total:l.scrap+l.crystals/2};
    const looted=new Set(f.looted),harvested=new Set([...(f.salvage?.harvested||[]),...f.looted]),sum=(type,remaining)=>nodes.filter(n=>n.type===type&&(!remaining||!looted.has(n.id))).reduce((v,n)=>v+n.quantity,0);
    const extra=f.legacyLayout&&!f.crystalTopUp?Math.max(0,l.crystals-sum('crystal',false)):0;
    return {scrapTotal:sum('scrap',false),scrapRemaining:sum('scrap',true),crystalTotal:sum('crystal',false)+extra,crystalRemaining:sum('crystal',true)+extra,collected:nodes.filter(n=>n.type==='scrap'?harvested.has(n.id):looted.has(n.id)).length,total:nodes.length+Math.ceil(extra/2)};
  }
  function achievementProgress(a){
    if(a.kind==='warden')return Number(signals.warden.defeated);
    if(a.kind==='plates')return giants.banked.length;
    if(a.kind==='shortcuts')return Object.values(giants.sites).filter(s=>s.opened).length;
    if(a.kind==='contracts')return signals.completed;
    if(a.kind==='contract-types')return ['cargo','survey','hunt','silent'].filter(k=>(saved.stats['contract'+k]||0)>0).length;
    if(a.kind==='recorders')return totalRecorders();
    if(a.kind==='level')return Number(levelComplete(LEVELS[a.level].id));
    if(a.kind==='depth')return saved.bestDepth;
    if(a.kind==='floors')return LEVELS.filter(l=>campaignLevels[l.id]?.floorReached).length;
    if(a.kind==='sweeps')return LEVELS.filter(l=>{const r=resourceProgress(l.id);return r.total>0&&r.collected===r.total;}).length;
    if(a.kind==='systems')return UPGRADES.filter(u=>saved.upgrades[u.id]===u.limit).length;
    return saved.stats[a.stat]||0;
  }
  let achievementTimer=0,achievementReturnPause=false;
  function checkAchievements(silent=false){
    const newly=[];
    for(const a of ACHIEVEMENTS)if(!saved.achievements[a.id]&&achievementProgress(a)>=a.target){saved.achievements[a.id]=new Date().toISOString();newly.push(a);}
    if(newly.length&&!silent){
      const toast=$('achievementToast');toast.textContent='ACHIEVEMENT UNLOCKED · '+newly[0].name.toUpperCase()+(newly.length>1?' + '+(newly.length-1)+' MORE':'');toast.classList.remove('hidden');clearTimeout(achievementTimer);achievementTimer=setTimeout(()=>toast.classList.add('hidden'),4800);
    }
    for(const id of ['menuAchievementCount','pauseAchievementCount'])if($(id))$(id).textContent=ACHIEVEMENTS.filter(a=>saved.achievements[a.id]).length+' / '+ACHIEVEMENTS.length;
    return newly.length;
  }
  function showAchievements(){
    if($('upgradeDialog').open)return;
    checkAchievements();persist();achievementReturnPause=paused;paused=true;resetPilotInput();
    const earned=ACHIEVEMENTS.filter(a=>saved.achievements[a.id]).length;
    $('achievementSummary').textContent=earned+' / '+ACHIEVEMENTS.length+' UNLOCKED · THIS CAMPAIGN';
    $('achievementList').innerHTML=ACHIEVEMENTS.map(a=>{
      const done=Boolean(saved.achievements[a.id]),value=Math.min(a.target,Math.floor(achievementProgress(a))),pct=clamp(value/a.target*100,0,100);
      return '<article class="achievement-card '+(done?'earned':'')+'"><span class="achievement-medal" aria-hidden="true">'+(done?'✓':a.icon)+'</span><div><div class="achievement-title"><h3>'+a.name+'</h3><span>'+(done?'UNLOCKED':value+' / '+a.target)+'</span></div><p>'+a.description+'</p><div class="achievement-track" role="progressbar" aria-label="'+a.name+'" aria-valuenow="'+value+'" aria-valuemin="0" aria-valuemax="'+a.target+'"><i style="width:'+pct+'%"></i></div></div></article>';
    }).join('');
    $('achievementsDialog').showModal();$('achievementClose').focus({preventScroll:true});syncPauseButtons();
  }
  function closeAchievements(){
    if(!$('achievementsDialog').open)return;
    $('achievementsDialog').close();paused=achievementReturnPause;syncPauseButtons();
  }
  function stashCargo(kind='pod'){
    if(!player)return null;missionDiveLost();
    const node=addRecovery(field,{x:player.x,y:player.y,...player.cargo,kind});
    if(node){placeRecovery(node);if(wildEnabled)protectWildArrival(node,150);}
    field.pendingCargo=null;player.cargo={scrap:0,crystal:0,recorders:[],plates:[]};return node;
  }
  function reserveRequirement(){
    const frontier=LEVELS.filter((l,i)=>levelUnlocked(i)).at(-1),f=campaignLevels[frontier.id];
    if(LEVELS.every(l=>levelComplete(l.id)))return 0;
    const depth=Math.max(...(f?.recorderDepths||frontier.recorders));
    const required=HULL_DEPTHS.findIndex(d=>d>=depth);
    return CRYSTAL_PRICES.hull.slice(saved.upgrades.hull,Math.max(saved.upgrades.hull,required)).reduce((a,b)=>a+b,0);
  }
  function remainingReachableCrystals(maxDepth=Infinity){
    return LEVELS.reduce((sum,l,i)=>{
      if(!levelUnlocked(i))return sum;const f=campaignLevels[l.id],looted=new Set(f?.looted||[]);
      // An unvisited map is generated only on selection. Count only its guaranteed
      // shallow starter crystals until its exact persisted coordinates are known.
      const deposits=f?.loot?f.loot.filter(n=>n.type==='crystal'&&!looted.has(n.id)&&depthOf(n.y)<=maxDepth).reduce((n,r)=>n+r.quantity,0):(maxDepth>=l.depth?l.crystals:maxDepth>=130?12:0);
      const cargo=l.id===LEVEL_ID&&running&&player?player.cargo.crystal:(f?.pendingCargo?.crystal||0);
      const recoveries=(f?.recoveries||[]).filter(r=>depthOf(r.y)<=maxDepth).reduce((n,r)=>n+r.crystal,0);
      return sum+deposits+recoveries+cargo;
    },0);
  }
  function hullReserveProblem(afterPurchase){
    if(!reserveRequirement())return '';
    const frontier=LEVELS.filter((l,i)=>levelUnlocked(i)).at(-1),f=campaignLevels[frontier.id];
    const required=HULL_DEPTHS.findIndex(d=>d>=Math.max(...(f?.recorderDepths||frontier.recorders)));
    let reserve=0;
    for(let mark=saved.upgrades.hull;mark<required;mark++){
      reserve+=CRYSTAL_PRICES.hull[mark];
      // Check every intermediate pressure gate, not just the whole level's stock.
      // Otherwise spending shallow crystals could strand the hull before deeper
      // crystals become reachable, even when the map's total stock is generous.
      if(afterPurchase+remainingReachableCrystals(HULL_DEPTHS[mark])<reserve)
        return 'Hull reserve: protect '+reserve+' crystals for hull progression through Mk '+roman(mark+1)+'. Deeper crystals do not count before their pressure gate. Fit the required hull first.';
    }
    return '';
  }
  function purchaseProblem(u){
    const mark=saved.upgrades[u.id];if(mark>=u.limit)return 'Maximum specification installed.';
    const cr=Math.max(0,upgradeCost(u,mark)-saved.credits),gems=Math.max(0,crystalCost(u,mark)-saved.crystals);
    if(cr||gems)return 'Need '+[cr?cr.toLocaleString('en-GB')+' more credits':'',gems?gems+' more crystals':''].filter(Boolean).join(' and ')+'.';
    return u.id==='hull'?'':hullReserveProblem(saved.crystals-crystalCost(u,mark));
  }
  function depositAndDock() {
    if(!running||paused||nearestInteractable()?.type!=='station')return;
    player.x=HARBOUR.x;player.y=HARBOUR.y;player.vx=0;player.vy=0;player.airborne=false;player.surfaceCooldownUntil=0;player.facing=Math.PI/2;
    window.AbyssAudio?.event('dock');
    const rescueBaseline=deepwater?.reportBefore();
    const wasComplete=levelComplete(LEVEL_ID),gained=player.cargo.scrap*18,bankedCrystals=player.cargo.crystal;
    const earnedXP=player.cargo.scrap*9+bankedCrystals*23+player.cargo.recorders.length*90;
    const delivered=player.cargo.recorders.length,realReturn=!dockVisitActive;
    saved.stats.bestScrapHaul=Math.max(saved.stats.bestScrapHaul||0,player.cargo.scrap);
    addStat('bankedScrap',player.cargo.scrap);addStat('bankedCrystals',bankedCrystals);
    if(realReturn&&player.trip?.deepest>=200&&player.trip.hullDamage<.001&&(gained||bankedCrystals||delivered))addStat('cleanGetaways',1);
    saved.credits+=gained;saved.crystals+=bankedCrystals;saved.xp+=earnedXP;
    for(const i of player.cargo.recorders)if(!saved.secured.includes(i)&&i>=0&&i<RECORDERS_TOTAL)saved.secured.push(i);
    bankGiantPlates();
    player.cargo={scrap:0,crystal:0,recorders:[],plates:[]};field.pendingCargo=null;
    player.hull=maxHull();player.oxygen=maxOxygen();player.battery=maxBattery();player.noise=0;resetBoost();resetShield();resupplyMines();syncWeaponStock();player.trip={deepest:0,hullDamage:0};
    settleSignalsAtDock(realReturn);deepwater?.dock(realReturn,rescueBaseline);
    if(delivered)addEvent('Recovered transmissions decrypted · read them in the Field Journal');
    if(realReturn){refreshDockPopulation();dockVisitActive=true;}
    checkAchievements();persist();updateUI();
    addEvent('Docked · +'+gained+' CR · +'+bankedCrystals+' crystals · systems restored');
    if(gained||bankedCrystals||delivered)announce('CARGO BANKED · +'+gained+' CR · +'+bankedCrystals+' CRYSTALS',4);
    if(!wasComplete&&levelComplete(LEVEL_ID)){openVictory();return;}
    showDock();
  }
  function syncPauseButtons(){
    $('pauseBtn').textContent=paused?'▶ RESUME':'Ⅱ PAUSE';
    $('focusPauseBtn').innerHTML=paused?'<svg class="ui-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7Z" fill="currentColor"/></svg>':`<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 5v14M16 5v14" stroke-width="3"/></svg>`;
    $('focusPauseBtn').setAttribute('aria-label',paused?'Resume game':'Pause game');
  }
  function openDialog(kicker,title,body,footer='') {
    closeUpgradeDetails(false);
    $('modalOverlay').classList.toggle('dock-overlay',showingDock);
    $('modalClose').setAttribute('aria-label',showingDock?'Leave the dock':'Close dialog');
    dialogReturnPause=paused;
    paused=true;resetPilotInput();
    $('modalKicker').textContent=kicker;$('modalTitle').textContent=title;$('modalBody').innerHTML=body;$('modalFooter').innerHTML=footer;
    $('modalOverlay').classList.remove('hidden');syncPauseButtons();
  }
  function closeDialog() {
    closeUpgradeDetails(false);$('modalOverlay').classList.remove('dock-overlay');
    $('modalOverlay').classList.add('hidden');showingDock=false;
    paused=running?dialogReturnPause:false;
    syncPauseButtons();updateUI();
  }
  let dockTab='upgrades',selectedUpgrade=null;
  const SYSTEM_META={
    hull:['STRUCTURAL INTEGRITY','defence','Pressure tolerance is independent of the kinetic shield. Never exceed the fitted hull rating.'],
    oxygen:['LIFE SUPPORT','support','Oxygen is your expedition clock: 18 units/min at base, reduced by recycler marks. The endurance estimate assumes no caches. Pause and dock menus freeze consumption.'],
    battery:['ENERGY STORAGE','support','Boost and sonar spend the most power. Cruising and the lamp draw slowly. At empty power, emergency thrust delivers 50% of your fitted thruster speed, without boost. Rare battery cells restore 25 power.'],
    engine:['PROPULSION','support','Mk I unlocks boost. Boost uses both the charge meter and battery; a Crimson Reaper matches Mk IV normal speed.'],
    flashlight:['OPTICS','exploration','At 1,000 m ambient light disappears. A wider, longer beam lets you plan routes and locate resources.'],
    sonar:['SENSORS','exploration','Scans cover the current screen. Very large screens can extend the cooldown until the wave finishes.'],
    quiet:['SIGNATURE CONTROL','support','Always-on acoustic insulation reduces speed-based movement noise. Small joystick drags or a nearby mouse cursor keep you quiet. Boost and weapons remain loud; no silent toggle is needed.'],
    minePower:['ORDNANCE','defence','Armed mines slowly seek predators within 20 m, staying within 24 m of their drop point. Rocks block movement and blasts. They remain safe for your sub. Warhead marks increase damage; buy ammunition separately.'],
    mineCapacity:['ORDNANCE STORAGE','defence','A larger rack adds empty slots only. Buy rounds in the Ammunition tab for 18 credits each.'],
    magnet:['RESOURCE RECOVERY','exploration','Scrap collects automatically. Remote pickups require power, visibility and a clear path. Crystals still need USE or E, and recorders and supply caches need a close approach.'],
    shield:['ACTIVE DEFENCE','defence','Absorbs bites and rock impacts only, never pressure or oxygen loss. Recharge costs 0.35 power per shield point and pauses while boosting.'],
    railgun:['DIRECT-FIRE WEAPON','tactical','Hold Z or RAIL to fire. Bolts gently correct toward a predator within 32 degrees of the bow and lead its movement. They cannot turn backwards or see through rocks. Dock refills cost 6 credits each. Defeat replaces stock with the rescue loadout.'],
    torpedo:['EXPLOSIVE WEAPON','defence','Tap X or TORP to launch. Strong homing tracks predators within 65 degrees of the bow, with faster turns than rail bolts. Rocks block targeting and shots. The blast is ship-safe, but detonated abandoned mines are not. Buy rounds for 24 credits each.'],
    disruptor:['ACOUSTIC COUNTERMEASURES','tactical','Stun begins on wave arrival, only inside the disruption radius. Stalkers receive 80% duration, Reapers 60%. Low battery falls back to an ordinary scan.']
  };
  function upgradeStats(id,mark){
    const n=v=>Number(v.toFixed(2)).toLocaleString('en-GB');
    switch(id){
      case 'railgun':case 'torpedo':return [['Damage',WEAPONS[id].damage[mark]+' HP'],['Magazine capacity',WEAPONS[id].capacity[mark]+' rounds'],['Firing interval',WEAPONS[id].cooldown+' sec'],['Range',WEAPONS[id].range/10+' m'],['Price per round',WEAPON_AMMO_PRICES[id]+' CR'],['Guidance',id==='railgun'?'Gentle / 32° each side':'Strong / 65° each side']];
      case 'hull':return [['Safe depth',HULL_DEPTHS[mark].toLocaleString('en-GB')+' m'],['Hull integrity',(100+mark*28)+' HP']];
      case 'oxygen':return [['Oxygen capacity',(100+mark*30)+' units'],['Consumption',n(oxygenRateAt(mark)*60)+'/min'],['Full-tank endurance',enduranceText((100+mark*30)/oxygenRateAt(mark))+' min:sec']];
      case 'battery':return [['Battery capacity',(100+mark*30)+' power'],['Boost power use',n(BOOST.powerPerSecond/(1+mark*.12))+'/sec'],['Boost recharge',n(BOOST.recharge*(1+mark*.1))+'/sec']];
      case 'engine':return [['Normal speed',n(normalSpeedAt(mark)/10)+' m/s'],['Boost speed',mark?n(normalSpeedAt(mark)*BOOST.multipliers[mark]/10)+' m/s':'Locked'],['Boost endurance',mark?BOOST.capacities[mark]/BOOST.drain+' sec':'None']];
      case 'flashlight':return [['Maximum reach',FLASHLIGHT[mark].length/10+' m'],['Beam angle',Math.round(FLASHLIGHT[mark].halfAngle*360/Math.PI)+'°'],['Base power draw',n(FLASHLIGHT[mark].power*60)+'/min']];
      case 'sonar':return [['Base cooldown',n(SONAR.cooldown-mark*.35)+' sec'],['Scan power',Math.max(4,12-mark*2)+' power'],['Echo duration',n(SONAR.echoSeconds+mark*.45)+' sec']];
      case 'quiet':return [['Normal noise reduction',Math.round((1-1/(1+mark*.32))*100)+'%'],['Base idle noise','0%']];
      case 'minePower':return [['Mine damage',MINES.damage[mark]+' HP'],['Blast radius',MINES.blastRadius/10+' m'],['Launcher',mark?'Online':'Not fitted'],['Seeker reach',GUIDANCE.mine.range/10+' m'],['Seeking speed',GUIDANCE.mine.speed/10+' m/s']];
      case 'mineCapacity':return [['Ammunition slots',MINES.capacity[mark]+' rounds'],['New rounds included','None']];
      case 'magnet':return [['Resource reach',MAGNET.range[mark]/10+' m'],['Remote pickup cost',mark?MAGNET.power[mark]+' power':'Not fitted'],['Close pickup cost','Free'],['Scrap collection','Automatic'],['Crystals / recorders','USE required']];
      case 'shield':return [['Shield capacity',SHIELD.capacity[mark]+' HP'],['Recharge rate',SHIELD.recharge[mark]+' HP/sec'],['Recharge delay',mark?SHIELD.delay+' sec':'Not fitted']];
      case 'disruptor':return [['Disruption radius',DISRUPTOR.range[mark]/10+' m'],['Drifter stun',DISRUPTOR.seconds[mark]+' sec'],['Reaper stun',n(DISRUPTOR.seconds[mark]*.6)+' sec'],['Extra scan cost',DISRUPTOR.power[mark]+' power']];
      default:return [];
    }
  }
  const DOCK_TABS=[['upgradesTab','upgrades'],['ammunitionTab','ammunition'],['expeditionsTab','expeditions'],['contractsTab','contracts'],['archiveTab','archive']];
  function showDock(tab='upgrades') {
    showingDock=true;dockTab=tab;syncWeaponStock();persist();
    openDialog('NEREID / SURFACE OPERATIONS','THE EXPEDITION HUB',
      '<div class="dock-intro"><div class="dock-vessel-identity"><img class="dock-vessel-art" src="icon-192.png?v=0.22.0" alt="" width="54" height="54"><div><span class="dock-online"><i></i> VESSEL SECURED</span><p>Hull, oxygen and power serviced.<br><span>Weapon ammunition is purchased separately.</span></p></div></div><div class="dock-wallet"><div class="dock-credit"><span>CREDITS</span><strong id="dockCredits">0</strong></div><div class="dock-credit crystal-wallet"><span>CRYSTALS</span><strong id="dockCrystals">0</strong></div></div></div><div id="dockBalance" class="dock-balance"></div><div class="dock-tabs" role="tablist" aria-label="Dock services"><button id="upgradesTab" role="tab" aria-controls="dockPanel"><svg class="nav-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6ZM8 11l3 3 5-6"/></svg><span>Upgrades</span></button><button id="ammunitionTab" role="tab" aria-controls="dockPanel"><svg class="nav-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 4 4 8v12h6V8ZM17 4l-3 4v12h6V8ZM4 15h6M14 15h6"/></svg><span>Ammunition</span></button><button id="expeditionsTab" role="tab" aria-controls="dockPanel"><svg class="nav-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2ZM9 3v16M15 5v16"/></svg><span>Expeditions</span></button><button id="contractsTab" role="tab" aria-controls="dockPanel"><svg class="nav-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="4" width="14" height="18" rx="2"/><path d="M9 2h6v4H9ZM8 11h8M8 15h8M8 18h5"/></svg><span>Contracts</span></button><button id="archiveTab" role="tab" aria-controls="dockPanel"><svg class="nav-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 3h13a2 2 0 0 1 2 2v16H6a2 2 0 0 1-2-2ZM4 17h15M8 7h7M8 11h5"/></svg><span>Archive</span></button></div><div id="dockPanel" role="tabpanel"></div>',
      '<div class="dock-departure"><span id="departureLevel">'+currentLevel().name+'<br>Seabed '+currentLevel().depth.toLocaleString('en-GB')+' m · bank all recorders to unlock the next level.</span><button class="primary-btn" id="launchAgain">UNDOCK <span aria-hidden="true">↗</span></button></div>');
    dialogReturnPause=false;
    for(const [id,tabName] of DOCK_TABS){
      $(id).addEventListener('click',()=>{dockTab=tabName;drawDockPanel();});
      $(id).addEventListener('keydown',e=>{
        if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();
        let i=DOCK_TABS.findIndex(t=>t[1]===dockTab);i=e.key==='Home'?0:e.key==='End'?DOCK_TABS.length-1:(i+(e.key==='ArrowRight'?1:DOCK_TABS.length-1))%DOCK_TABS.length;dockTab=DOCK_TABS[i][1];drawDockPanel();$(DOCK_TABS[i][0]).focus();$(DOCK_TABS[i][0]).scrollIntoView({block:'nearest',inline:'nearest'});
      });
    }
    window.AbyssAudio?.unlock();window.AbyssAudio?.setScene('dock');
    drawDockPanel();$(DOCK_TABS.find(t=>t[1]===dockTab)[0]).focus({preventScroll:true});
    $('launchAgain').addEventListener('click',()=>{closeDialog();canvas.focus({preventScroll:true});addEvent('Course set · '+currentLevel().name);});
  }
  function drawDockPanel(){
    if(!showingDock||!$('dockPanel'))return;
    $('dockCredits').textContent=saved.credits.toLocaleString('en-GB');$('dockCrystals').textContent=saved.crystals.toLocaleString('en-GB');
    $('dockBalance').innerHTML='<span><small>PRESSURE RATING</small><b>'+safeDepth().toLocaleString('en-GB')+' m</b></span><span><small>FULL-TANK AIR</small><b>'+enduranceText(maxOxygen()/oxygenRate())+' <em>min:sec</em></b></span><span><small>POWER CAPACITY</small><b>'+maxBattery()+' <em>units</em></b></span><span><small>LEVEL RECORDERS</small><b>'+saved.secured.length+' / '+RECORDERS_TOTAL+'</b></span>';
    const moduleCount=UPGRADES.filter(u=>saved.upgrades[u.id]>=u.limit).length;
    $('upgradesTab').title=moduleCount+' / '+UPGRADES.length+' fully upgraded systems';
    $('departureLevel').innerHTML='<small>SELECTED DESTINATION</small><strong>'+currentLevel().name+'</strong><span>'+currentLevel().depth.toLocaleString('en-GB')+' m seabed · '+saved.secured.length+'/'+RECORDERS_TOTAL+' recorders secured</span>';
    for(const [id,tab] of DOCK_TABS){$(id).setAttribute('aria-selected',String(dockTab===tab));$(id).tabIndex=dockTab===tab?0:-1;}
    $('dockPanel').setAttribute('aria-labelledby',DOCK_TABS.find(t=>t[1]===dockTab)[0]);
    if(dockTab==='upgrades'){$('dockPanel').innerHTML='<div class="dock-grid-caption"><span>SHIP SYSTEMS <small> / TAP TO INSPECT</small></span><span>CREDITS + CRYSTALS</span></div><div class="upgrade-grid" id="upgradeList"></div>';drawUpgrades();}
    else if(dockTab==='ammunition')drawAmmunition();else if(dockTab==='contracts')drawContracts();else if(dockTab==='archive')drawArchiveDock();else drawExpeditions();
    if(deepwater&&dockTab==='upgrades'){$('dockPanel').insertAdjacentHTML('afterbegin',deepwater.dockHTML());deepwater.bindDock();}
  }
  function drawExpeditions(){
    $('dockPanel').innerHTML='<div class="expedition-intro"><span>'+totalRecorders()+' / 20 RECORDERS BANKED</span><p>Crystals are finite. Scrap sites recover gradually during active diving. Stocks show units available now; survey completion counts each original site once.</p></div><div class="expedition-list">'+LEVELS.map((l,i)=>{
      const unlocked=levelUnlocked(i),active=l.id===LEVEL_ID,complete=levelComplete(l.id),r=resourceProgress(l.id),f=campaignLevels[l.id];
      return '<article class="expedition-card '+(active?'selected ':'')+(!unlocked?'locked':'')+'" style="--level-accent:'+l.color+'"><div class="expedition-heading"><span>'+l.tag+'</span><b>'+(active?'CURRENT COURSE':complete?'CLEARED':unlocked?'UNLOCKED':'LOCKED')+'</b></div><h3>'+l.name+'</h3><p>'+l.description+'</p><div class="expedition-metrics"><span><strong>'+l.depth.toLocaleString('en-GB')+' m</strong> SEABED</span><span><strong>'+(f?.secured.length||0)+' / '+l.recorders.length+'</strong> RECORDERS</span><span><strong>'+r.scrapRemaining+' / '+r.scrapTotal+'</strong> SCRAP AVAILABLE</span><span><strong>'+r.crystalRemaining+' / '+r.crystalTotal+'</strong> CRYSTALS LEFT</span><span><strong>'+(f?.batteryCells?f.batteryCells.nodes.filter(n=>!Number.isFinite(f.batteryCells.due[n.id])).length+' / '+f.batteryCells.nodes.length:BATTERY_CELLS.counts[i]+' sites')+'</strong> BATTERY CELLS</span></div>'+(f?.recoveries.length?'<div class="recovery-hint">'+f.recoveries.length+' RECOVERY POD'+(f.recoveries.length===1?'':'S')+' WAITING</div>':'')+'<button class="expedition-select" data-travel="'+l.id+'" '+(!unlocked||active?'disabled':'')+'>'+(active?'COURSE SELECTED':unlocked?'SET COURSE →':'BANK ALL RECORDERS IN LEVEL '+i)+'</button></article>';
    }).join('')+'</div><p class="expedition-note">Scrap recovers after 5 active dive minutes, at most one deposit per 45 seconds per visited level, out of view. Pauses, harbour waiting and offline time do not advance recovery. Battery cells restore up to 25 power and recover after 8 active minutes, at most one per 90 seconds. Crystals never respawn. Dock ammo refills cost credits; defeat grants the fixed 10 / 3 / 3 rescue loadout.</p>';
    document.querySelectorAll('[data-travel]').forEach(b=>b.addEventListener('click',()=>selectLevel(b.dataset.travel)));
  }
  function selectLevel(id){
    const index=LEVELS.findIndex(l=>l.id===id);
    if(index<0||id===LEVEL_ID||!levelUnlocked(index)||!showingDock||!running||!paused||$('upgradeDialog').open||$('achievementsDialog').open||nearestInteractable()?.type!=='station'||player.cargo.scrap||player.cargo.crystal||player.cargo.recorders.length||player.cargo.plates?.length)return false;
    deepwater?.leaveLevel();persist();LEVEL_ID=id;field=campaignLevels[id]||freshField();campaignLevels[id]=field;applyLevelGeometry();newDive();showDock('expeditions');persist();return true;
  }
  const ammunitionCapacity=id=>id==='mine'?mineCapacity():WEAPONS[id].capacity[saved.upgrades[id]];
  const ammunitionOwned=id=>id==='mine'?saved.mineAmmo:saved.weaponAmmo[id];
  const ammunitionPrice=id=>id==='mine'?AMMO_PRICE:WEAPON_AMMO_PRICES[id];
  const ammunitionFitted=id=>saved.upgrades[id==='mine'?'minePower':id]>0;
  function buyAmmunition(fill=false){return buyOrdnance('mine',fill);}
  function buyOrdnance(id,fill=false){
    if(!['mine','railgun','torpedo'].includes(id)||slotTransition||!running||!paused||!showingDock||dockTab!=='ammunition'||$('upgradeDialog').open||nearestInteractable()?.type!=='station'||!ammunitionFitted(id))return false;
    const available=Math.max(0,ammunitionCapacity(id)-ammunitionOwned(id)),price=ammunitionPrice(id);
    const count=fill?Math.min(available,Math.floor(saved.credits/price)):1;
    if(count<=0||count>available||saved.credits<count*price)return false;
    saved.credits-=count*price;
    if(id==='mine'){saved.mineAmmo+=count;player.mineAmmo=saved.mineAmmo;}
    else{saved.weaponAmmo[id]+=count;player.weaponAmmo[id]=saved.weaponAmmo[id];}
    const stored=persist();drawDockPanel();updateUI();
    const message=count+' '+(id==='mine'?'mine round'+(count===1?'':'s'):id==='railgun'?'rail round'+(count===1?'':'s'):'torpedo'+(count===1?'':'es'))+' purchased · '+count*price+' CR';
    addEvent(message);if($('ammoFeedback'))$('ammoFeedback').textContent=message+(stored?'':' · SAVE FAILED; keep this session open');
    const stem=id==='railgun'?'Rail':id==='torpedo'?'Torpedo':'Mine';
    const target=$(fill?(id==='mine'?'fillMinesBtn':'fill'+stem+'Btn'):'buy'+stem+'Btn');
    if(target&&!target.disabled)target.focus({preventScroll:true});else $('ammoFeedback')?.focus({preventScroll:true});
    return true;
  }
  function drawAmmunition(){
    const labels={railgun:'PULSE RAILGUN',torpedo:'SHOCK TORPEDOES',mine:'PROXIMITY MINES'};
    $('dockPanel').innerHTML='<section class="ordnance-shop"><div class="ordnance-intro"><span class="panel-label">DOCK MUNITIONS</span><p>Spend credits, not crystals. Buy only what you need; owned rounds stay with this campaign.</p></div><div id="ammoFeedback" class="ammo-feedback" role="status" tabindex="-1">Dock refills cost credits. Defeat replaces stock with a rescue loadout: 10 rail / 3 torpedoes / 3 mines.</div><div class="ordnance-grid">'+['railgun','torpedo','mine'].map(id=>{
      const fitted=ammunitionFitted(id),capacity=ammunitionCapacity(id),owned=ammunitionOwned(id),missing=Math.max(0,capacity-owned),reserve=Math.max(0,owned-capacity),price=ammunitionPrice(id);
      const affordable=Math.min(missing,Math.floor(saved.credits/price)),stem=id==='railgun'?'Rail':id==='torpedo'?'Torpedo':'Mine';
      const mark=saved.upgrades[id==='mine'?'minePower':id],damage=id==='mine'?mineDamage():WEAPONS[id].damage[mark];
      return `<article class="ordnance-card ${id}" aria-label="${labels[id]} ammunition"><div class="ordnance-card-head"><h3>${labels[id]}</h3><span>${fitted?'MK '+roman(mark):'UNFITTED'}</span></div><div class="ordnance-stock"><strong>${owned}<small> / ${capacity}</small></strong><span><b>${price} CR</b> PER ROUND</span></div><div class="ordnance-track" role="progressbar" aria-label="${labels[id]} rounds" aria-valuenow="${owned}" aria-valuemin="0" aria-valuemax="${Math.max(1,capacity,owned)}"><i style="width:${capacity?Math.min(1,owned/capacity)*100:owned?100:0}%"></i></div><p>${!fitted?(owned?owned+' rescue rounds stored. Fit Mk I to use them.':'Fit Mk I in Ship Upgrades to buy ammunition.'):reserve?damage+' HP damage · '+reserve+' emergency round beyond the fitted rack':damage+' HP damage · '+missing+' empty slot'+(missing===1?'':'s')}</p><div class="ammo-purchases"><button id="buy${stem}Btn" class="alt-btn" ${!fitted||!missing||saved.credits<price?'disabled':''}>BUY 1 · ${price} CR</button><button id="${id==='mine'?'fillMinesBtn':'fill'+stem+'Btn'}" class="primary-btn" ${!fitted||!affordable?'disabled':''}>${!fitted?'NOT FITTED':!missing?'FULL':!affordable?'NEED '+price+' CR':affordable===missing?'FILL '+missing:'BUY '+affordable}${missing&&affordable?' · '+affordable*price+' CR':''}</button></div></article>`;
    }).join('')+'</div><p class="ammo-footnote">Dock repairs, air and power are still free. Ordinary refills cost credits, never crystals. After defeat, stock is set to 10 rail rounds, 3 torpedoes and 3 mines. Rescue rounds do not unlock unfitted weapons.</p></section>';
    for(const id of ['railgun','torpedo','mine']){const stem=id==='railgun'?'Rail':id==='torpedo'?'Torpedo':'Mine';$('buy'+stem+'Btn').addEventListener('click',()=>buyOrdnance(id,false));$(id==='mine'?'fillMinesBtn':'fill'+stem+'Btn').addEventListener('click',()=>buyOrdnance(id,true));}
  }
  function drawUpgrades(){
    const list=$('upgradeList');if(!list)return;
    // Tier is a glanceable label; prices and full specifications remain in the pop-up.
    list.innerHTML=UPGRADES.map(u=>{
      const mark=saved.upgrades[u.id],maxed=mark===u.limit;
      const label=mark?'MK '+roman(mark):['engine','minePower','magnet','shield','disruptor','railgun','torpedo'].includes(u.id)?'UNFITTED':'BASE';
      return `<button class="upgrade-tile${maxed?' is-maxed':''}" data-system="${u.id}" data-tier="${mark}" data-group="${SYSTEM_META[u.id][1]}" aria-label="${u.name}, ${mark?'Mark '+mark:'base / no upgrade'}, ${mark} of ${u.limit}${maxed?', fully upgraded':''}" aria-haspopup="dialog" aria-controls="upgradeDialog"><span class="upgrade-name">${u.name}</span><span class="upgrade-tier${maxed?' tier-maxed':''}">${label}<small>${mark}/${u.limit}${maxed?' · MAX':''}</small></span></button>`;
    }).join('');
    list.querySelectorAll('[data-system]').forEach(button=>button.addEventListener('click',()=>openUpgradeDetails(button.dataset.system)));
  }
  function openUpgradeDetails(id){
    if(!showingDock||nearestInteractable()?.type!=='station')return;
    const upgrade=UPGRADES.find(u=>u.id===id);if(!upgrade)return;
    selectedUpgrade=id;resetPilotInput();paused=true;
    $('upgradeFeedback').textContent='';renderUpgradeDetails();
    if(!$('upgradeDialog').open)$('upgradeDialog').showModal();
    $('upgradeDetailClose').focus({preventScroll:true});
  }
  function closeUpgradeDetails(restoreFocus=true){
    const dialog=$('upgradeDialog'),id=selectedUpgrade;
    if(dialog?.open)dialog.close();selectedUpgrade=null;
    if(restoreFocus&&id&&showingDock)document.querySelector('[data-system="'+id+'"]')?.focus({preventScroll:true});
  }
  function renderUpgradeDetails(){
    const u=UPGRADES.find(x=>x.id===selectedUpgrade);if(!u)return;
    const level=saved.upgrades[u.id],maxed=level>=u.limit,next=Math.min(u.limit,level+1),cost=maxed?0:upgradeCost(u,level),gems=maxed?0:crystalCost(u,level);
    const [category,group,note]=SYSTEM_META[u.id],current=upgradeStats(u.id,level),future=upgradeStats(u.id,next);
    $('upgradeDialog').dataset.group=group;
    $('upgradeCategory').textContent=category;
    $('upgradeTitle').textContent=u.name;
    $('upgradeDescription').textContent=u.desc;
    $('upgradeFit').textContent=level?'MK '+roman(level)+' FITTED':'STANDARD / NOT UPGRADED';
    $('upgradeTierTrack').innerHTML=Array.from({length:u.limit},(_,i)=>'<span class="'+(i<level?'fitted':i===level?'next':'')+'" '+(i+1===level?'aria-current="step"':'')+'>MK '+roman(i+1)+'</span>').join('');
    $('upgradeStats').innerHTML='<table class="upgrade-comparison"><thead><tr><th scope="col">SPECIFICATION</th><th scope="col">CURRENT</th><th scope="col">'+(maxed?'MAXIMUM':'NEXT · MK '+roman(next))+'</th></tr></thead><tbody>'+current.map((row,i)=>'<tr><th scope="row">'+row[0]+'</th><td>'+row[1]+'</td><td class="'+(row[1]!==future[i][1]?'improved':'')+'">'+future[i][1]+'</td></tr>').join('')+'</tbody></table>';
    $('upgradeTacticalNote').textContent=note;
    $('upgradeBalance').textContent=saved.credits.toLocaleString('en-GB')+' CR · '+saved.crystals+' CRYSTALS AVAILABLE';
    const problem=purchaseProblem(u),button=$('upgradePurchase');
    button.dataset.upgrade=u.id;button.disabled=maxed||Boolean(problem);
    button.textContent=maxed?'FULLY UPGRADED':(level?'UPGRADE TO MK ':'INSTALL MK ')+roman(next)+' · '+cost.toLocaleString('en-GB')+' CR + '+gems+' ◆';
    $('upgradePriceNote').textContent=problem||'Price: '+cost.toLocaleString('en-GB')+' credits and '+gems+' crystals. '+'Permanent upgrade; ammunition is purchased separately. This purchase grants no free rounds.';
    button.onclick=()=>purchaseUpgrade(u.id);
  }
  function purchaseUpgrade(id){
    const u=UPGRADES.find(x=>x.id===id);
    if(!u||id!==selectedUpgrade||!$('upgradeDialog').open||!showingDock||!running||!paused||nearestInteractable()?.type!=='station')return false;
    const level=saved.upgrades[id],cost=upgradeCost(u,level),gems=crystalCost(u,level);
    if(level>=u.limit||purchaseProblem(u))return false;
    saved.credits-=cost;saved.crystals-=gems;saved.upgrades[id]++;checkAchievements();
    if(id==='flashlight')beamTexture=buildBeamTexture();
    player.hull=maxHull();player.oxygen=maxOxygen();player.battery=maxBattery();resetBoost();resetShield();resupplyMines();syncWeaponStock();
    const stored=persist();drawDockPanel();renderUpgradeDetails();updateUI();addEvent(u.name+' upgraded');
    $('upgradeFeedback').textContent=stored?'MK '+roman(saved.upgrades[id])+' INSTALLED · '+cost.toLocaleString('en-GB')+' CR + '+gems+' CRYSTALS SPENT':'INSTALLED THIS SESSION · STORAGE UNAVAILABLE';
    if($('upgradePurchase').disabled)$('upgradeDetailClose').focus({preventScroll:true});
    return true;
  }
  function openVictory() {
    victoryShown=true;const index=LEVELS.findIndex(l=>l.id===LEVEL_ID),allDone=LEVELS.every(l=>levelComplete(l.id));
    const next=LEVELS[index+1];
    openDialog('TRANSMISSION // '+(allDone?'COMPLETE':'LEVEL SECURED'),allDone?'THE SIGNAL RETURNS':currentLevel().name+' CLEARED',
      '<div class="briefing"><p>All '+RECORDERS_TOTAL+' recorders from this level are safely banked.</p><p><strong>'+(allDone?'CAMPAIGN COMPLETE · 20 / 20 RECORDERS':next?'NEXT EXPEDITION UNLOCKED: '+next.name:'FINAL TRANSMISSION SECURED')+'</strong></p><p>'+(allDone?'The five transmissions form one story. Every level remains available for unfinished salvage, achievements and predator hunts.':next?'Set your next course at the hub, or return to any unlocked level for its remaining resources.':'Visit the other levels to complete their transmissions.')+'</p></div>',
      '<div class="dialog-actions"><button class="primary-btn" id="victoryClose">RETURN TO EXPEDITION HUB →</button></div>');
    dialogReturnPause=false;$('victoryClose').addEventListener('click',()=>{paused=false;showDock('expeditions');});
  }
  function defeat(reason) {
    if(!running)return false; // Several impacts in one frame are still one death.
    deepwater?.loss();loadedActive=null;const node=stashCargo('wreck');rescueLoadout();running=false;paused=true;
    player.hull=Math.max(0,player.hull);checkAchievements();persist();
    const manifest=node?`<p>Your unbanked cargo is in your lost vessel at <strong>${depthOf(node.y)} m</strong>. The recovery beacon is marked and pinned on your survey map. Use E / USE nearby to recover it, then return to the hub.</p><div class="recovery-manifest"><span><b>${node.scrap}</b> SCRAP</span><span><b>${node.crystal}</b> CRYSTALS</span><span><b>${node.recorders.length}</b> RECORDERS</span>${node.plates?.length?'<span><b>'+node.plates.length+'</b> ID PLATE</span>':''}</div>`:'<p>No unbanked cargo was aboard. Any earlier recovery sites are still waiting.</p>';
    openDialog('SIGNAL LOST // RESCUE PROTOCOL','VESSEL LOST',`<div class="briefing"><p>${reason}</p>${manifest}<p>Recorders stay with lost cargo, not at their original wrecks. Earlier losses remain recoverable. Banked currencies and upgrades are safe.</p><div class="rescue-loadout"><span>REPLACEMENT VESSEL / FIXED LOADOUT</span><strong>10 RAIL · 3 TORPEDOES · 3 MINES</strong><small>This replaces your previous ammunition. Unfitted launchers stay locked.</small></div></div>`, '<div class="dialog-actions"><button class="primary-btn" id="retryBtn">LAUNCH RESCUE VESSEL <span>→</span></button><button class="alt-btn" id="defeatMenuBtn">MAIN MENU</button></div>');
    $('retryBtn').addEventListener('click',newDive);$('defeatMenuBtn').addEventListener('click',()=>returnToMenu(false));return true;
  }
  function takeDamage(amount,reason='Hull breach',independentImpact=false) {
    if(!running||player.damageCooldown>0&&!independentImpact)return;
    const absorbed=Math.min(player.shield||0,amount);
    player.shield=Math.max(0,(player.shield||0)-absorbed);
    if(shieldCapacity()>0){player.shieldDelay=SHIELD.delay;player.shieldFlashUntil=clock+.45;}
    window.AbyssAudio?.event(absorbed>=amount?'shield':'damage');
    flashHullDamage();player.hull-=Math.max(0,amount-absorbed);if(player.trip)player.trip.hullDamage+=Math.max(0,amount-absorbed);addStat('shieldAbsorbed',absorbed);checkAchievements();player.damageCooldown=.7;
    if(amount>=8) {addEvent(reason);announce(reason.toUpperCase(),2);}
    if(player.hull<=0)defeat(reason+' destroyed the NEREID.');else persist();
  }
  function resetShield(){
    player.shield=shieldCapacity();player.shieldDelay=0;player.shieldFlashUntil=0;
  }
  function updateShield(dt){
    if(!shieldCapacity())return;
    const rechargeTime=Math.max(0,dt-player.shieldDelay);
    player.shieldDelay=Math.max(0,player.shieldDelay-dt);
    if(!rechargeTime||player.boosting||player.battery<=.5)return;
    const amount=Math.min(shieldCapacity()-player.shield,SHIELD.recharge[saved.upgrades.shield]*rechargeTime,(player.battery-.5)/SHIELD.powerPerPoint);
    if(amount>0){player.shield+=amount;player.battery-=amount*SHIELD.powerPerPoint;}
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
    releaseRailInput();
    releaseMouseHelm();releaseBoostInput();keys.clear();
    const id=usePointerId;useHeld=false;usePointerId=null;
    $('mobileInteract').classList.remove('held');
    if(id!==null&&$('mobileInteract').hasPointerCapture(id))$('mobileInteract').releasePointerCapture(id);
    resetJoystick();
  }
  function keepPredatorOutsideHarbour(enemy){
    // Keep a buffer larger than every bite reach outside the marked safe area.
    // Also repairs old patrol homes without changing IDs, health or resource layouts.
    const project=(x,y)=>{
      const dx=x-HARBOUR.x,dy=y-HARBOUR.y,d=Math.hypot(dx,dy),r=HARBOUR.exclusionRadius+1;
      if(d>=r)return {x,y};
      let xx=HARBOUR.x+(d?dx/d:0)*r,yy=HARBOUR.y+(d?dy/d:1)*r;
      const waterFloor=SURFACE.y+34;
      if(yy<waterFloor){yy=waterFloor;xx=HARBOUR.x+Math.sign(dx||1)*Math.sqrt(r*r-(yy-HARBOUR.y)**2);}
      return {x:xx,y:yy};
    };
    const point=project(enemy.x,enemy.y),home=project(enemy.homeX??enemy.x,enemy.homeY??enemy.y);
    enemy.homeX=home.x;enemy.homeY=home.y;
    if(point.x!==enemy.x||point.y!==enemy.y){
      enemy.x=point.x;enemy.y=point.y;
      const nx=(point.x-HARBOUR.x)/(HARBOUR.exclusionRadius+1),ny=(point.y-HARBOUR.y)/(HARBOUR.exclusionRadius+1);
      const inward=(enemy.vx||0)*nx+(enemy.vy||0)*ny;
      if(inward<0){enemy.vx-=nx*inward;enemy.vy-=ny*inward;}
      enemy.aggression=0;enemy.alertUntil=0;enemy.forgetUntil=clock+1.5;
    }
  }
  function emitSurfaceSplash(x,speed,entry){
    window.AbyssAudio?.event(entry?'splash':'breach');
    const strength=clamp(Math.abs(speed)/450,.2,1),count=Math.round(10+strength*16);
    surfaceEffects.push({x,birth:clock,entry,strength,particles:Array.from({length:count},(_,i)=>{
      const phase=Math.sin(i*127.1+x*.01+clock*17)*.5+.5;
      return {vx:(i%2?1:-1)*(18+phase*105)*(.5+strength),vy:-(35+phase*115)*(.55+strength),radius:.8+phase*1.8};
    })});
    // Bound cosmetic work during repeated surfacing. These effects are not saved.
    if(surfaceEffects.length>12)surfaceEffects.shift();
  }
  function handleSurfaceCrossing(previousY){
    if(!player.airborne&&previousY>=SURFACE.y&&player.y<SURFACE.y){
      if(-player.vy>=SURFACE.breachSpeed&&clock>=(player.surfaceCooldownUntil||0)){
        player.airborne=true;player.boosting=false;addStat('surfaceBreaches',1);checkAchievements();persist();
        emitSurfaceSplash(player.x,player.vy,false);
      }else{player.y=SURFACE.y+.02;player.vy=0;}
    }else if(player.airborne&&player.y>=SURFACE.y&&player.vy>=0){
      emitSurfaceSplash(player.x,player.vy,true);
      player.airborne=false;player.surfaceCooldownUntil=clock+.35;
      player.vx*=.82;player.vy*=SURFACE.reentryDrag;
    }
  }
  function update(dt) {
    simulationStepping=true;navigationPlansThisFrame=0;
    clock+=dt;
    if(!player)return;
    player.previousX=player.x;player.previousY=player.y;
    player.scanCooldown=Math.max(0,player.scanCooldown-dt);
    player.mineCooldown=Math.max(0,player.mineCooldown-dt);
    player.damageCooldown=Math.max(0,player.damageCooldown-dt);
    for(const id of Object.keys(WEAPONS))player.weaponCooldown[id]=Math.max(0,player.weaponCooldown[id]-dt);
    const keyX=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft'));
    const keyY=Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'));
    const helm=mouseSteering();
    // Mouse and joystick are direct helm commands, not additive inputs.
    const steering=joystick.pointerId!==null?joystick:mouseHelm.pointerId!==null?helm:
      (keyX||keyY)?{x:keyX,y:keyY}:{x:0,y:0};
    const x=clamp(steering.x,-1,1),y=clamp(steering.y,-1,1);
    const magnitude=Math.hypot(x,y),hasInput=magnitude>.04;
    const boostFraction=updateBoost(dt,hasInput&&!player.airborne);
    // Stealth follows actual speed, not a latched silent mode or a modifier key.
    const maxSpeed=normalSpeedAt(saved.upgrades.engine)*propulsionMultiplier()*lerp(1,boostMultiplier(),boostFraction);
    const thrustPower=hasInput?1:0;
    const divisor=Math.max(1,magnitude);
    const water=currentAt(player.x,player.y);
    const desiredX=x/divisor*maxSpeed*thrustPower+water.x,desiredY=y/divisor*maxSpeed*thrustPower+ventFlowAt(player.x,player.y);
    const factor=1-Math.exp(-(3.5+saved.upgrades.engine*.2)*dt);
    if(player.airborne){
      // Momentum carries the leap. Neither held steering nor boost can make the sub fly.
      player.vx*=Math.exp(-SURFACE.airDrag*dt);player.vy+=SURFACE.gravity*dt;
    }else{player.vx=lerp(player.vx,desiredX,factor);player.vy=lerp(player.vy,desiredY,factor);}
    // Aim the bow (and lamp) towards a held cursor, even while momentum turns.
    if(!player.airborne&&mouseHelm.pointerId!==null&&helm.distance>8&&joystick.pointerId===null){
      player.facing=lerpAngle(player.facing,helm.angle,Math.min(1,dt*7));
    }else if(Math.hypot(player.vx,player.vy)>9){
      player.facing=lerpAngle(player.facing,Math.atan2(player.vy,player.vx),Math.min(1,dt*5));
    }
    const speed=Math.hypot(player.vx,player.vy);
    const noise=movementNoiseAt(player.airborne?0:speed,saved.upgrades.quiet,player.boosting);
    // Acoustic transients from weapons fade naturally; coasting remains audible until it slows.
    player.noise=lerp(player.noise,noise,1-Math.exp(-dt*2.8));
    const steps=Math.max(1,Math.ceil(speed*dt/7));
    let impactSpeed=0;
    for(let step=0;step<steps;step++){
      const previousY=player.y;
      player.x+=player.vx*dt/steps;
      player.y+=player.vy*dt/steps;
      handleSurfaceCrossing(previousY);
      impactSpeed=Math.max(impactSpeed,resolveWorldCollision());
    }
    if(impactSpeed>43)takeDamage(Math.min(7,1+impactSpeed*.025),'Rock impact');
    // Hold USE with a second finger while steering: collect immediately on entering range.
    if(useHeld||keys.has('e')){useHoldTimer-=dt;if(useHoldTimer<=0){interact(true);useHoldTimer=.12;}}
    if(!running||paused)return;
    deepwater?.update(dt);
    updateSalvageRegeneration(dt);updateBatteryCells(dt);autoCollectBatteryCells();autoCollectSalvage(dt);
    if(distance(player,HARBOUR)>=145&&!field.awaitingDock){dockVisitActive=false;field.awaitingDock=true;persist();}
    const energyDrain=dt*((ENERGY.idlePerSecond+(hasInput&&!player.airborne?(ENERGY.thrustPerSecond*Math.min(1,magnitude)):0))/(1+saved.upgrades.battery*.12)+(headlightsActive()?flashlightPowerRate():0));
    player.battery=clamp(player.battery-energyDrain,0,maxBattery());
    player.oxygen=clamp(player.oxygen-dt*oxygenRate(),0,maxOxygen());
    if(player.oxygen<=0){flashHullDamage();if(player.trip)player.trip.hullDamage+=dt*7;player.hull-=dt*7;if(player.hull<=0){defeat('The oxygen supply ran dry.');return;}}
    const depth=depthOf(player.y),over=Math.max(0,depth-safeDepth());
    if(over>0) {
      flashHullDamage();const pressureDamage=dt*(.26+Math.pow(over/30,1.7)*1.5);if(player.trip)player.trip.hullDamage+=pressureDamage;player.hull-=pressureDamage; // Overshooting a tier is risky; deep skips are lethal.
      if(player.hull<=0){defeat('Crushing pressure breached the hull.');return;}
    }
    if(depth>saved.bestDepth) {saved.bestDepth=depth;if(depth%10===0)persist();}
    if(player.trip)player.trip.deepest=Math.max(player.trip.deepest,depth);
    if(depth>=currentLevel().depth-4&&!field.floorReached){field.floorReached=true;checkAchievements();persist();}
    const zone=zoneFor(depth);
    if(zone.name!==lastZone){if(lastZone)addEvent('Entered '+zone.name);lastZone=zone.name;}
    updateShield(dt);
    updateAssignments();
    updateSonar();
    for(const enemy of scene.predators){
      if(!predatorAlive(enemy))continue;
      if(enemy.tier==='warden'){updateWarden(enemy,dt);continue;}
      keepPredatorOutsideHarbour(enemy);
      enemy.previousX=enemy.x;enemy.previousY=enemy.y;
      if((enemy.stunnedUntil||0)>clock){enemy.vx=0;enemy.vy=0;continue;}
      const tier=PREDATOR_TIERS[enemy.tier]||PREDATOR_TIERS.common;
      const d=distance(player,enemy);
      // Every tier has a finite pursuit leash; higher tiers track farther.
      if(inHarbour(player)||player.airborne){
        enemy.aggression=0;enemy.alertUntil=0;enemy.forgetUntil=clock+1.5;
      }else if(d>tier.leash){
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
      const intent=navigatePredator(enemy,predatorIntent(enemy,dt,chase,tier));
      const tx=intent.x,ty=intent.y;
      const ed=Math.hypot(tx-enemy.x,ty-enemy.y)||1;
      const es=intent.speed;
      const waterAtEnemy=currentAt(enemy.x,enemy.y);
      enemy.vx=lerp(enemy.vx,(tx-enemy.x)/ed*es+waterAtEnemy.x,1-Math.exp(-dt*2));
      enemy.vy=lerp(enemy.vy,(ty-enemy.y)/ed*es+ventFlowAt(enemy.x,enemy.y),1-Math.exp(-dt*2));
      enemy.x=clamp(enemy.x+enemy.vx*dt,leftAt(enemy.y)+34,rightAt(enemy.y)-34);
      enemy.y=clamp(enemy.y+enemy.vy*dt,SURFACE.y+34,MAX_WORLD_Y-30);
      resolvePredatorWreckCollision(enemy);
      keepPredatorOutsideHarbour(enemy);
      // Tier-3 encounters never leak into the upper 800 m, even in pursuit.
      if(enemy.tier==='reaper'&&enemy.y<8120){enemy.y=8120;enemy.vy=Math.max(0,enemy.vy);enemy.aggression=0;enemy.alertUntil=0;enemy.forgetUntil=clock+1;}
    }
    // Resolve both mine types before bites: a hunter killed on this frame cannot attack.
    updateWildWaters(dt);if(!running)return;
    updateMines(dt);
    if(railHeld||keys.has('z'))fireWeapon('railgun',true);
    updateProjectiles(dt);if(!running)return;
    for(const enemy of scene.predators){
      const tier=PREDATOR_TIERS[enemy.tier];
      if(!inHarbour(player)&&!player.airborne&&predatorAlive(enemy)&&(enemy.tier!=='warden'||enemy.wardenPhase==='charge')&&enemy.biteAllowed!==false&&guidanceLineClear(enemy,player,0)&&(enemy.stunnedUntil||0)<=clock&&enemy.aggression>.13&&distance(player,enemy)<tier.reach&&clock-enemy.lastHit>tier.cooldown){
        enemy.lastHit=clock;
        takeDamage(Math.round(tier.damage*currentLevel().damage),tier.name+' attack');
        if(!running)return;
        player.vx+=(player.x-enemy.x)*2;player.vy+=(player.y-enemy.y)*2;
      }
    }
    updateSonar();
    camera.x=lerp(camera.x,player.x-viewport.w/2,Math.min(1,dt*3.4));
    camera.y=lerp(camera.y,player.y-viewport.h*.52,Math.min(1,dt*3.4));
    if(clock>toastUntil)$('notification').classList.add('hidden');
    surfaceEffects=surfaceEffects.filter(effect=>clock-effect.birth<2.4);
    surveyTimer+=dt;if(surveyTimer>=.25){surveyTimer=0;surveyVisibleWater();}
    journalTimer+=dt;if(journalTimer>=5){journalTimer=0;checkAchievements();persist();}
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
    ctx.fillStyle=`rgb(${Math.round(lerp(biome().water[0],3,tint))},${Math.round(lerp(biome().water[1],17,tint))},${Math.round(lerp(biome().water[2],26,tint))})`;
    ctx.fillRect(0,0,W,H);
    const bg=ctx.createRadialGradient(W*.52,H*.38,10,W*.52,H*.55,Math.max(W,H)*.75);
    bg.addColorStop(0,'#10405766');bg.addColorStop(1,'#00101b00');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
    ctx.save();ctx.translate(-camera.x,-camera.y);
    drawSurfaceSky();
    // Navigation lines and depth contours.
    const top=Math.max(200,Math.floor(camera.y/100)*100);
    for(let y=top;y<camera.y+H+120;y+=100){
      ctx.beginPath();ctx.moveTo(camera.x,y);ctx.lineTo(camera.x+W,y);
      ctx.strokeStyle='rgba(74,151,163,.065)';ctx.lineWidth=1;ctx.stroke();
      ctx.fillStyle='#4c819488';ctx.font='10px monospace';ctx.fillText(Math.max(0,depthOf(y))+'m',camera.x+W-47,y-7);
    }
    // Water-only light shafts; the research platform sits behind the open berth.
    if(camera.y<520){
      for(let x=Math.floor(camera.x/160)*160;x<camera.x+W+160;x+=160){
        const g=ctx.createLinearGradient(0,SURFACE.y,0,480);g.addColorStop(0,'#9ce8df17');g.addColorStop(1,'#9ce8df00');
        ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(x,SURFACE.y);ctx.lineTo(x+30,SURFACE.y);ctx.lineTo(x-75,480);ctx.lineTo(x-135,480);ctx.fill();
      }
    }
    if(onscreen(HARBOUR.x,HARBOUR.y,410))drawStation();
    deepwater?.drawEncounter(ctx);
    drawTrench();drawSeabed();drawEnvironment();
    for(const particle of scene.dust)if(onscreen(particle.x,particle.y)){
      const x=particle.x+Math.sin(clock*.28+particle.phase)*17,y=particle.y+Math.cos(clock*.37+particle.phase)*7;
      ctx.beginPath();ctx.arc(x,y,particle.size,0,TAU);ctx.fillStyle='#83dfe12a';ctx.fill();
    }
    for(const vent of scene.vents)if(onscreen(vent.x,vent.y)){
      const gl=ctx.createRadialGradient(vent.x,vent.y,2,vent.x,vent.y,48);
      gl.addColorStop(0,'#2ef1de60');gl.addColorStop(1,'#2ef1de00');ctx.fillStyle=gl;ctx.beginPath();ctx.arc(vent.x,vent.y,48,0,TAU);ctx.fill();
      for(let j=0;j<5;j++){const yy=vent.y-((clock*(17+j*3)+j*11+vent.phase*9)%110);const xx=vent.x+Math.sin(yy*.1+j)*10;ctx.beginPath();ctx.arc(xx,yy,1+j%2,0,TAU);ctx.fillStyle='#76dfd46a';ctx.fill();}
    }
    drawWildLife();
    for(const rock of scene.rocks)if(onscreen(rock.x,rock.y,rock.radius+20))drawRock(rock);
    drawWildSeabed();
    for(const wreck of scene.wrecks)if(onscreen(wreck.x,wreck.y))drawWreck(wreck);
    drawGiants();
    if(headlightsActive())drawLightBeam();
    drawSignalObjects();deepwater?.draw(ctx);if(onscreen(HARBOUR.x,HARBOUR.y,400))deepwater?.drawHarbour(ctx);
    for(const item of scene.items)if(!item.collected&&onscreen(item.x,item.y)){
      const d=player?distance(player,item):0;
      const shown=d<(headlightsActive()?155:80)||item.revealUntil>clock||item.type==='recorder'&&d<225||beamIntersects(item.x,item.y,44)||saved.upgrades.magnet>0&&['scrap','crystal'].includes(item.type)&&d<magnetRange()&&ambientLightAt(item.y)>.08;
      if(shown)drawItem(item,item.revealUntil>clock);
    }
    for(const mine of scene.mines)if(onscreen(mine.x,mine.y))drawMine(mine);
    drawProjectiles();
    for(const blast of scene.blasts)if(onscreen(blast.x,blast.y))drawMineBlast(blast);
    for(const enemy of scene.predators)if(predatorAlive(enemy)&&onscreen(enemy.x,enemy.y)){
      const d=distance(player,enemy);
      if(d<250 || enemy.alertUntil>clock || beamIntersects(enemy.x,enemy.y,60)){drawEnemy(enemy);drawPredatorHealth(enemy);drawPredatorIntent(enemy);}
    }
    if(player){
      drawPlayer();
      if(shieldCapacity()>0&&player.shieldFlashUntil>clock){
        ctx.save();ctx.translate(player.x,player.y);ctx.rotate(player.facing);ctx.globalAlpha=(player.shieldFlashUntil-clock)/.45;
        ctx.strokeStyle='#8bcaff';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,0,43,25,0,0,TAU);ctx.stroke();ctx.restore();
      }
    }
    drawSurfaceWater();
    ctx.restore();
    const edge=ctx.createRadialGradient(W*.5,H*.48,Math.min(W,H)*.1,W*.5,H*.5,Math.max(W,H)*.77);
    edge.addColorStop(0,'#00132000');edge.addColorStop(.75,'#000e1c33');edge.addColorStop(1,'#00050dd1');ctx.fillStyle=edge;ctx.fillRect(0,0,W,H);
    if(!running && player && player.hull<=0){ctx.fillStyle='#7e22241c';ctx.fillRect(0,0,W,H);}
    // World illumination stays black at 1,000 m. Sonar is a separate, timed
    // instrument echo layer: silhouettes only, never an ambient-light reset.
    applyDepthDarkness(ambient);
    drawSonarEchoes();drawWildEchoes();drawSignalObjects(true);drawGiantEchoes();
    ctx.save();ctx.translate(-camera.x,-camera.y);deepwater?.draw(ctx,true);ctx.restore();
    if(environmentEnabled){ctx.save();ctx.translate(-camera.x,-camera.y);for(const l of environment.landmarks)if(l.revealUntil>clock&&onscreen(l.x,l.y,200)){ctx.globalAlpha=clamp((l.revealUntil-clock)/sonarEchoSeconds(),0,.9);drawLandmark(l,true);}ctx.restore();}
    if(player.damageFlashUntil>clock){ctx.save();ctx.translate(-camera.x,-camera.y);drawDamageFlash();ctx.restore();}
    drawTargetIndicators();
    drawPickupNotices();
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
  function drawSurfaceSky(){
    if(camera.y>=SURFACE.y)return;
    const bottom=Math.min(SURFACE.y,camera.y+viewport.h);
    const sky=ctx.createLinearGradient(0,-550,0,SURFACE.y);
    sky.addColorStop(0,'#060d20');sky.addColorStop(.55,'#1b354d');sky.addColorStop(1,'#669aa7');
    ctx.fillStyle=sky;ctx.fillRect(camera.x,camera.y,viewport.w,bottom-camera.y);
    // Deterministic stars and distant headlands add depth without image downloads.
    for(let x=Math.floor(camera.x/91)*91;x<camera.x+viewport.w+91;x+=91){
      const y=-90-Math.abs(Math.sin(x*.029))*420;
      ctx.fillStyle='#dbf4eb77';ctx.fillRect(x,y,1.2,1.2);
    }
    ctx.fillStyle='#1a35446b';ctx.beginPath();ctx.moveTo(camera.x,SURFACE.y);
    for(let x=camera.x;x<=camera.x+viewport.w+30;x+=24)ctx.lineTo(x,58-Math.abs(Math.sin(x*.004)+Math.sin(x*.012)) * 15);
    ctx.lineTo(camera.x+viewport.w+30,SURFACE.y);ctx.closePath();ctx.fill();
    const haze=ctx.createLinearGradient(0,5,0,SURFACE.y);haze.addColorStop(0,'#b6efe000');haze.addColorStop(1,'#b6efe025');
    ctx.fillStyle=haze;ctx.fillRect(camera.x,5,viewport.w,SURFACE.y-5);
  }
  function drawSurfaceWater(){
    if(camera.y>SURFACE.y+180||camera.y+viewport.h<SURFACE.y-220)return;
    ctx.save();
    // Foam and reflection sit in front of the sub as it crosses the waterline.
    for(const [offset,width,alpha] of [[0,2,.65],[7,1,.18]]){
      ctx.beginPath();
      for(let x=camera.x-12;x<camera.x+viewport.w+12;x+=8){
        const y=SURFACE.y+offset+Math.sin(x*.028+clock*1.5)*2;
        if(x===camera.x-12)ctx.moveTo(x,y);else ctx.lineTo(x,y);
      }
      ctx.strokeStyle=`rgba(168,242,231,${alpha})`;ctx.lineWidth=width;ctx.stroke();
    }
    for(const e of surfaceEffects){
      const t=clock-e.birth;if(t<0||t>2.4)continue;
      const fade=Math.max(0,1-t/2.4);
      ctx.strokeStyle=`rgba(193,255,245,${fade*.65})`;ctx.lineWidth=1.4;
      ctx.beginPath();ctx.ellipse(e.x,SURFACE.y+3,7+t*(42+e.strength*45),2+t*3,0,0,TAU);ctx.stroke();
      for(const p of e.particles){
        const x=e.x+p.vx*t,y=SURFACE.y+p.vy*t+145*t*t;
        if(y>SURFACE.y+12)continue;
        ctx.fillStyle=`rgba(212,255,249,${fade*.85})`;ctx.beginPath();ctx.arc(x,y,p.radius,0,TAU);ctx.fill();
      }
      if(t<.45){ctx.strokeStyle=`rgba(220,255,248,${(1-t/.45)*.7})`;ctx.lineWidth=2;
        ctx.beginPath();ctx.ellipse(e.x,SURFACE.y,10+t*100,5+t*(e.entry?40:70),0,Math.PI,TAU);ctx.stroke();}
    }
    ctx.restore();
  }
  function drawStation(){
    ctx.save();ctx.translate(HARBOUR.x,SURFACE.y);
    // Protected approach: subtle seabed-facing dome, not a solid obstacle.
    ctx.save();ctx.beginPath();ctx.rect(-450,0,900,500);ctx.clip();
    const glow=ctx.createRadialGradient(0,90,25,0,90,HARBOUR.safeRadius);
    glow.addColorStop(0,'#65e6d521');glow.addColorStop(.75,'#55d5ce09');glow.addColorStop(1,'#55d5ce00');
    ctx.fillStyle=glow;ctx.beginPath();ctx.arc(0,90,HARBOUR.safeRadius,0,TAU);ctx.fill();
    ctx.strokeStyle='#7ee9d04b';ctx.lineWidth=1.3;ctx.setLineDash([5,10]);
    ctx.beginPath();ctx.arc(0,90,HARBOUR.safeRadius,0,TAU);ctx.stroke();ctx.setLineDash([]);
    // Acoustic perimeter buoys indicate the protected edge.
    for(const a of [.12,.65,1.15,Math.PI/2,2,2.5,3.02]){
      const x=Math.cos(a)*HARBOUR.safeRadius,y=90+Math.sin(a)*HARBOUR.safeRadius;
      ctx.fillStyle='#173e4c';ctx.beginPath();ctx.arc(x,y,5,0,TAU);ctx.fill();
      ctx.fillStyle='#a1f5dc';ctx.beginPath();ctx.arc(x,y,1.8,0,TAU);ctx.fill();
    }
    ctx.restore();
    // Mooring struts and illuminated service lines.
    for(const sign of [-1,1]){
      const x=sign*132;
      const strut=ctx.createLinearGradient(x-9,0,x+9,0);strut.addColorStop(0,'#102a3a');strut.addColorStop(.5,'#426c7a');strut.addColorStop(1,'#142c3c');
      ctx.fillStyle=strut;ctx.fillRect(x-9,10,18,164);ctx.fillStyle='#7eafa6';ctx.fillRect(x-9,32,18,4);ctx.fillRect(x-9,125,18,4);
      ctx.strokeStyle='#446f7e';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(x,45);ctx.lineTo(sign*77,138);ctx.stroke();
      ctx.strokeStyle='#7cdbc533';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(sign*156,18);ctx.bezierCurveTo(sign*190,120,sign*145,206,sign*185,250);ctx.stroke();
      const lamp=ctx.createLinearGradient(x,40,sign*80,225);lamp.addColorStop(0,'#9efbea36');lamp.addColorStop(1,'#9efbea00');
      ctx.fillStyle=lamp;ctx.beginPath();ctx.moveTo(x-4,36);ctx.lineTo(x+4,36);ctx.lineTo(sign*44,225);ctx.lineTo(sign*110,225);ctx.closePath();ctx.fill();
      ctx.fillStyle='#c1f7dc';ctx.fillRect(x-7,34,14,3);
    }
    // Open moon-pool berth. These are background docking guides, not collision walls.
    ctx.strokeStyle='#528f99';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,90,70,44,0,0,TAU);ctx.stroke();
    ctx.strokeStyle='#9dedd04d';ctx.lineWidth=1;ctx.setLineDash([3,6]);ctx.beginPath();ctx.ellipse(0,90,59,35,0,0,TAU);ctx.stroke();ctx.setLineDash([]);
    for(const sign of [-1,1]){ctx.fillStyle='#9fefd1';ctx.fillRect(sign*65-2,83,4,14);}
    ctx.fillStyle='#9fccc8';ctx.font='8px monospace';ctx.textAlign='center';ctx.fillText('BERTH 01',0,157);
    ctx.fillStyle=inHarbour(player)?'#b3f7df':'#79bfb9';ctx.font='bold 9px monospace';ctx.fillText('PROTECTED APPROACH',0,197);
    ctx.fillStyle='#719fa6';ctx.font='8px monospace';ctx.fillText('USE / E TO DOCK',0,211);
    // Twin armoured pontoons: leave a clear central route up through the water.
    for(const sign of [-1,1]){
      ctx.save();ctx.scale(sign,1);
      const hull=ctx.createLinearGradient(0,-11,0,28);hull.addColorStop(0,'#719aa4');hull.addColorStop(.15,'#b1c7c8');hull.addColorStop(.2,'#385c6c');hull.addColorStop(1,'#132e40');
      ctx.fillStyle=hull;ctx.beginPath();ctx.moveTo(72,-12);ctx.lineTo(165,-12);ctx.lineTo(188,0);ctx.lineTo(176,27);ctx.lineTo(82,27);ctx.lineTo(69,13);ctx.closePath();ctx.fill();
      ctx.strokeStyle='#7eafba';ctx.lineWidth=1.5;ctx.stroke();
      ctx.fillStyle='#102c39';ctx.fillRect(92,-7,64,15);
      for(let x=99;x<156;x+=13){ctx.fillStyle='#91dfd8';ctx.fillRect(x,-3,7,4);}
      ctx.strokeStyle='#d4b575';ctx.lineWidth=3;for(let x=81;x<99;x+=7){ctx.beginPath();ctx.moveTo(x,14);ctx.lineTo(x+4,20);ctx.stroke();}
      ctx.strokeStyle='#6d929e';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(80,-15);ctx.lineTo(80,-28);ctx.lineTo(166,-28);ctx.lineTo(166,-15);ctx.stroke();
      for(let x=96;x<166;x+=18){ctx.beginPath();ctx.moveTo(x,-28);ctx.lineTo(x,-15);ctx.stroke();}
      ctx.restore();
    }
    // Port operations room: faceted armour, panoramic glazing, mast and beacon.
    const body=ctx.createLinearGradient(0,-94,0,-15);body.addColorStop(0,'#5f8792');body.addColorStop(.3,'#314e63');body.addColorStop(1,'#152f42');
    ctx.fillStyle=body;ctx.beginPath();ctx.moveTo(-165,-16);ctx.lineTo(-160,-76);ctx.lineTo(-142,-94);ctx.lineTo(-92,-94);ctx.lineTo(-77,-78);ctx.lineTo(-77,-16);ctx.closePath();ctx.fill();ctx.strokeStyle='#9bb8ba';ctx.lineWidth=1;ctx.stroke();
    ctx.fillStyle='#0a2637';ctx.fillRect(-153,-75,65,23);
    const glass=ctx.createLinearGradient(0,-73,0,-54);glass.addColorStop(0,'#c8f9e4');glass.addColorStop(1,'#4c9eae');ctx.fillStyle=glass;ctx.fillRect(-150,-72,59,17);
    ctx.strokeStyle='#1d4455';ctx.lineWidth=3;for(let x=-135;x<-92;x+=16){ctx.beginPath();ctx.moveTo(x,-73);ctx.lineTo(x,-54);ctx.stroke();}
    ctx.fillStyle='#a8c7cd';ctx.font='bold 9px monospace';ctx.fillText('NEREID',-121,-34);ctx.fillStyle='#8ca7ad';ctx.font='6px monospace';ctx.fillText('OPERATIONS',-121,-24);
    ctx.strokeStyle='#759ca6';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-117,-94);ctx.lineTo(-117,-132);ctx.moveTo(-130,-117);ctx.lineTo(-104,-117);ctx.stroke();
    ctx.fillStyle='#bdf8da';ctx.beginPath();ctx.arc(-117,-134,2.5,0,TAU);ctx.fill();
    ctx.strokeStyle='#9caeb4';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-146,-89);ctx.lineTo(-153,-109);ctx.stroke();
    ctx.beginPath();ctx.ellipse(-155,-111,12,4,-.4,0,Math.PI);ctx.stroke();
    // Starboard gantry and equipment deck, offset from the open launch channel.
    ctx.fillStyle='#274756';ctx.fillRect(95,-55,56,38);ctx.strokeStyle='#6e939e';ctx.strokeRect(95,-55,56,38);
    for(let i=0;i<4;i++){ctx.fillStyle='#112d3a';ctx.fillRect(103+i*10,-46,5,19);}
    ctx.strokeStyle='#638795';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(169,-17);ctx.lineTo(169,-95);ctx.lineTo(77,-95);ctx.stroke();
    ctx.strokeStyle='#c4b584';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(168,-94);ctx.lineTo(129,-62);ctx.lineTo(99,-94);ctx.stroke();
    ctx.strokeStyle='#94b6b8';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(79,-94);ctx.lineTo(79,-48);ctx.stroke();ctx.strokeStyle='#cdbb84';ctx.beginPath();ctx.arc(79,-44,4,0,Math.PI);ctx.stroke();
    ctx.fillStyle='#b7ded3';ctx.font='8px monospace';ctx.fillText('SURFACE HUB',125,-105);
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
  function drawSeabed(){
    if(MAX_WORLD_Y>camera.y+viewport.h+100||MAX_WORLD_Y<camera.y-200)return;
    const y=MAX_WORLD_Y,left=Math.max(camera.x,leftAt(y)),right=Math.min(camera.x+viewport.w,rightAt(y));
    const g=ctx.createLinearGradient(0,y,0,y+150);g.addColorStop(0,'#29414e');g.addColorStop(.15,'#122631');g.addColorStop(1,'#030c14');
    ctx.fillStyle=g;ctx.fillRect(camera.x,y,viewport.w,Math.max(200,camera.y+viewport.h-y));
    ctx.strokeStyle='#709a9e';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(left,y);ctx.lineTo(right,y);ctx.stroke();
    for(let x=Math.floor(left/38)*38;x<right;x+=38){const h=8+Math.abs(Math.sin(x*.071+field.seed))*21;ctx.fillStyle='#3b566044';ctx.beginPath();ctx.moveTo(x,y+3);ctx.lineTo(x+18,y+h);ctx.lineTo(x+34,y+3);ctx.fill();}
    ctx.fillStyle='#a2c4c9';ctx.font='10px monospace';ctx.textAlign='center';ctx.fillText('SEABED / '+currentLevel().depth.toLocaleString('en-GB')+' m',centerAt(y),y+46);ctx.textAlign='left';
  }
  function drawRock(rock){
    ctx.save();ctx.translate(rock.x,rock.y);ctx.rotate(rock.rot);
    ctx.beginPath();for(let i=0;i<rock.spikes;i++){const a=i/rock.spikes*TAU;const radius=rock.radius*(.78+Math.sin(i*10+rock.seed*99)*.19);const x=Math.cos(a)*radius,y=Math.sin(a)*radius;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.closePath();
    ctx.fillStyle=biome().rock;ctx.fill();ctx.strokeStyle=biome().edge;ctx.lineWidth=2;ctx.stroke();
    ctx.beginPath();ctx.moveTo(-rock.radius*.55,-rock.radius*.14);ctx.lineTo(-rock.radius*.14,-rock.radius*.52);ctx.lineTo(rock.radius*.5,-rock.radius*.31);ctx.strokeStyle=biome().detail+'60';ctx.stroke();
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
    const color=type==='recovery'?'#ffcb8c':type==='recorder'?'#efbd77':type==='crystal'?'#ab96f5':type==='air'?'#60d5f6':type==='battery'?'#f2d48b':'#8ce4c9';
    const glow=ctx.createRadialGradient(0,0,0,0,0,type==='recorder'?44:27);glow.addColorStop(0,color+'66');glow.addColorStop(1,color+'00');ctx.fillStyle=glow;ctx.beginPath();ctx.arc(0,0,type==='recorder'?44:27,0,TAU);ctx.fill();
    ctx.rotate(Math.sin(phase)*.15);
    if(type==='recovery'){
      // A compact broken-hull capsule, distinct from ordinary scrap. It is drawn
      // before the darkness mask: the map beacon never lights nearby scenery.
      ctx.rotate(-.16);ctx.lineWidth=1.8;ctx.strokeStyle='#eab977';ctx.fillStyle='#344953';
      ctx.beginPath();ctx.moveTo(-26,-9);ctx.lineTo(-8,-13);ctx.lineTo(4,-10);ctx.lineTo(1,-3);ctx.lineTo(9,0);ctx.lineTo(5,10);ctx.lineTo(-19,11);ctx.lineTo(-27,4);ctx.closePath();ctx.fill();ctx.stroke();
      ctx.fillStyle='#182c39';ctx.fillRect(-16,-8,11,6);ctx.strokeStyle='#8aa5ab';ctx.beginPath();ctx.moveTo(-23,14);ctx.lineTo(-9,14);ctx.moveTo(-29,-6);ctx.lineTo(-34,-9);ctx.moveTo(14,-6);ctx.lineTo(22,-2);ctx.lineTo(18,7);ctx.stroke();
      ctx.strokeStyle='#efc386';ctx.beginPath();ctx.moveTo(-5,-14);ctx.lineTo(-5,-24);ctx.stroke();ctx.fillStyle='#ffe1a7';ctx.beginPath();ctx.arc(-5,-24,2.5,0,TAU);ctx.fill();
      ctx.globalAlpha=.25+.2*Math.sin(clock*2);ctx.strokeStyle='#ffd49b';ctx.beginPath();ctx.arc(-5,-24,7+(clock%2)*5,0,TAU);ctx.stroke();ctx.globalAlpha=1;
    } else if(type==='recorder'){
      ctx.fillStyle='#ad7844';ctx.strokeStyle='#ffe0a0';ctx.lineWidth=2;ctx.fillRect(-12,-9,24,18);ctx.strokeRect(-12,-9,24,18);ctx.beginPath();ctx.moveTo(-5,0);ctx.lineTo(5,0);ctx.stroke();
      ctx.save();ctx.rotate(clock*.4);ctx.strokeStyle='#ffd28d77';ctx.strokeRect(-20,-20,40,40);ctx.restore();
    } else if(type==='crystal'){
      ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(0,-14);ctx.lineTo(10,-4);ctx.lineTo(5,10);ctx.lineTo(-7,13);ctx.lineTo(-11,-4);ctx.closePath();ctx.fill();
    } else if(type==='battery'){
      ctx.fillStyle='#304134';ctx.strokeStyle=color;ctx.lineWidth=1.8;
      ctx.beginPath();ctx.roundRect(-10,-13,20,26,4);ctx.fill();ctx.stroke();ctx.fillStyle=color;ctx.fillRect(-4,-17,8,3);
      ctx.beginPath();ctx.moveTo(2,-8);ctx.lineTo(-4,1);ctx.lineTo(1,1);ctx.lineTo(-1,8);ctx.lineTo(5,-2);ctx.lineTo(0,-2);ctx.closePath();ctx.fill();
      ctx.fillStyle='#f9e3a0';ctx.globalAlpha=.45+.25*Math.sin(phase);ctx.fillRect(-6,10,12,1.5);ctx.globalAlpha=1;
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
    if(Math.hypot(mine.vx||0,mine.vy||0)>1){
      const heading=Math.atan2(mine.vy,mine.vx);ctx.save();ctx.rotate(heading);
      ctx.strokeStyle='#9edce080';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(-17,-3);ctx.lineTo(-24,-3);ctx.moveTo(-17,3);ctx.lineTo(-21,3);ctx.stroke();ctx.restore();
    }
    mineOutline();ctx.fillStyle='#243740';ctx.strokeStyle=clock>=mine.armedAt?'#f3c489':'#82bac9';ctx.lineWidth=1.6;ctx.fill();ctx.stroke();
    ctx.fillStyle=clock>=mine.armedAt?(Math.sin(clock*7)>0?'#ffc76d':'#a66b35'):'#6ebbd5';
    ctx.beginPath();ctx.arc(0,0,3,0,TAU);ctx.fill();
    ctx.font='bold 8px monospace';ctx.textAlign='center';ctx.fillStyle='#e6c99d';if(distance(player,mine)>85)ctx.fillText('MK '+roman(mine.mark),0,24);ctx.restore();
  }
  function drawMineBlast(blast){
    const age=clamp((clock-blast.birth)/.65,0,1),r=Math.max(2,blast.radius*Math.sqrt(age));
    ctx.save();ctx.translate(blast.x,blast.y);ctx.globalAlpha=1-age;
    const g=ctx.createRadialGradient(0,0,0,0,0,r);g.addColorStop(0,blast.derelict?'#ffe4caaa':'#fff0bca0');g.addColorStop(.35,blast.derelict?'#c9806666':'#ffc67458');g.addColorStop(1,'#ef815800');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,r,0,TAU);ctx.fill();
    ctx.strokeStyle='#ffe1a4';ctx.lineWidth=2*(1-age)+.5;ctx.beginPath();ctx.arc(0,0,r,0,TAU);ctx.stroke();
    for(let i=0;i<10;i++){const a=i*TAU/10;ctx.fillStyle=blast.derelict?'#d3aa83':'#a7e3df';ctx.beginPath();ctx.arc(Math.cos(a)*r*.7,Math.sin(a)*r*.7,2*(1-age)+.5,0,TAU);ctx.fill();}
    ctx.restore();
  }
  function drawPredatorHealth(enemy,local=false){
    if(!predatorAlive(enemy))return;
    const tier=PREDATOR_TIERS[enemy.tier],w=46+tier.level*8;
    ctx.save();if(!local)ctx.translate(enemy.x,enemy.y);
    ctx.fillStyle='#05121cd9';ctx.fillRect(-w/2-3,-50,w+6,22);
    ctx.fillStyle=enemy.tier==='reaper'?'#ff9a86':enemy.tier==='apex'?'#d3a1ff':'#a5e0df';
    ctx.font='bold 8px monospace';ctx.textAlign='center';ctx.fillText((enemy.tier==='warden'?'WARDEN':'T'+tier.level)+' · '+Math.ceil(enemy.health)+'/'+enemy.maxHealth,0,-39);
    ctx.fillStyle='#314352';ctx.fillRect(-w/2,-34,w,3);
    ctx.fillStyle=clock-(enemy.lastDamaged??-100)<.2?'#fff1d1':enemy.tier==='reaper'?'#fa7e70':enemy.tier==='apex'?'#c991f4':'#78cbbb';
    ctx.fillRect(-w/2,-34,w*clamp(enemy.health/enemy.maxHealth,0,1),3);ctx.restore();
  }
  function drawEnemy(enemy){
    if(enemy.tier==='warden'){drawWarden(enemy);return;}
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
    // Hull damage has a slow red warning pulse rather than a transparency strobe.

    // Propulsion shimmer and micro-bubble trail live behind the moving hull.
    if(player.boosting&&!player.airborne){
      const jet=ctx.createLinearGradient(-31,0,-88,0);
      jet.addColorStop(0,'#dcffffdd');jet.addColorStop(.3,'#65eaff88');jet.addColorStop(1,'#34b5ff00');
      ctx.fillStyle=jet;ctx.beginPath();ctx.moveTo(-30,-7);ctx.lineTo(-92-Math.sin(clock*38)*6,0);ctx.lineTo(-30,7);ctx.closePath();ctx.fill();
    }
    if(thrust>.09&&!player.airborne){
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
    const finish=GIANTS.vessels.find(v=>v.id===giants.livery&&giants.banked.includes(v.id));
    const hunter=!finish&&signals.warden.claimed&&signals.warden.livery==='hunter';
    shell.addColorStop(0,finish?finish.palette[0]:hunter?'#f4dba2':'#d2edf0');shell.addColorStop(.15,finish?finish.palette[1]:hunter?'#b79358':'#6dabb8');shell.addColorStop(.43,finish?finish.palette[2]:hunter?'#266d69':'#285e70');shell.addColorStop(.72,'#15394e');shell.addColorStop(1,'#092837');
    ctx.shadowColor='#0e070f';ctx.shadowBlur=10;ctx.shadowOffsetY=3;
    ctx.beginPath();ctx.moveTo(-26,-7);
    ctx.bezierCurveTo(-17,-12,10,-13,20,-8);
    ctx.quadraticCurveTo(30,-4,31,0);
    ctx.quadraticCurveTo(30,4,20,8);
    ctx.bezierCurveTo(10,13,-17,12,-26,7);
    ctx.quadraticCurveTo(-30,0,-26,-7);ctx.closePath();
    ctx.fillStyle=shell;ctx.fill();ctx.shadowBlur=0;ctx.shadowOffsetY=0;
    ctx.strokeStyle=finish?finish.palette[3]:hunter?'#f1cd86':'#b2f2ec';ctx.lineWidth=1.5;ctx.stroke();

    // Sleek top ridge, segmented pressure ribs, and glowing cyan equipment rail.
    ctx.strokeStyle='#edffff';ctx.lineWidth=.75;ctx.globalAlpha*=.5;
    ctx.beginPath();ctx.moveTo(-19,-8);ctx.bezierCurveTo(-4,-11,16,-8,23,-5);ctx.stroke();
    ctx.globalAlpha=player.damageCooldown>0&&Math.sin(clock*30)>0?.67:1;
    ctx.strokeStyle='#4fa4b1';ctx.lineWidth=1.1;
    for(const xx of [-14,-9,0]){
      ctx.beginPath();ctx.moveTo(xx,-9.8);ctx.lineTo(xx+1,-5.5);
      ctx.moveTo(xx,9.8);ctx.lineTo(xx+1,5.5);ctx.stroke();
    }
    ctx.strokeStyle=finish?finish.palette[3]:'#69f4dc';ctx.lineWidth=1.25;
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
    if(finish){ctx.strokeStyle=finish.palette[3];ctx.lineWidth=2.1;for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(-20+i*4,-6);ctx.lineTo(-17+i*4,-1);ctx.stroke();}}
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
        ctx.strokeStyle=type==='recorder'?'#ffd28d':type==='crystal'?'#bea5ff':type==='air'?'#7ee5ff':type==='battery'?'#f2d48b':'#8debd3';
        if(type==='recorder'){ctx.strokeRect(-12,-9,24,18);ctx.strokeRect(-5,-2,10,4);}
        else if(type==='crystal'){ctx.beginPath();ctx.moveTo(0,-13);ctx.lineTo(10,0);ctx.lineTo(0,13);ctx.lineTo(-10,0);ctx.closePath();ctx.stroke();}
        else if(type==='battery'){ctx.strokeRect(-9,-11,18,22);ctx.beginPath();ctx.moveTo(2,-7);ctx.lineTo(-3,0);ctx.lineTo(2,0);ctx.lineTo(-2,7);ctx.stroke();}
        else if(type==='air'){ctx.strokeRect(-9,-11,18,22);ctx.beginPath();ctx.moveTo(-5,0);ctx.lineTo(5,0);ctx.moveTo(0,-5);ctx.lineTo(0,5);ctx.stroke();}
        else{ctx.strokeRect(-8,-8,16,16);ctx.beginPath();ctx.moveTo(-8,4);ctx.lineTo(8,-4);ctx.stroke();}
        ctx.beginPath();ctx.arc(0,0,21,0,TAU);ctx.stroke();
      }else if(kind==='predators'){
        const tier=PREDATOR_TIERS[object.tier]||PREDATOR_TIERS.common;
        ctx.strokeStyle=object.tier==='reaper'?'#ff796e':object.tier==='apex'?'#d597ff':'#ffac99';
        ctx.save();ctx.rotate(object.tier==='warden'?object.heading:Math.atan2(object.vy,object.vx));
        if(object.tier==='warden')wardenOutline();else if(object.tier==='reaper')reaperOutline();
        else{
          if(object.tier==='apex')ctx.scale(1.25,1.25);
          ctx.beginPath();ctx.moveTo(24,0);ctx.quadraticCurveTo(2,-14,-17,-10);ctx.lineTo(-31,-19);ctx.lineTo(-27,0);ctx.lineTo(-31,19);ctx.lineTo(-17,10);ctx.quadraticCurveTo(2,14,24,0);
        }
        ctx.stroke();ctx.restore();
        ctx.font='bold 9px monospace';ctx.textAlign='center';ctx.fillStyle=ctx.strokeStyle;
        ctx.fillText((object.stunnedUntil>clock?'STUNNED · ':'T'+tier.level+' ')+tier.name,0,-58);
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
      }else if(kind==='floor'){ctx.beginPath();ctx.moveTo(-12,0);ctx.lineTo(12,0);ctx.stroke();
      }else if(kind==='wall'){
        ctx.beginPath();const edge=object.side<0?leftAt:rightAt;
        ctx.moveTo(edge(object.y-12)-object.x,-12);ctx.lineTo(0,0);ctx.lineTo(edge(object.y+12)-object.x,12);ctx.stroke();
      }
      ctx.restore();
    };
    for(const kind of ['rocks','wrecks','vents','items','predators','mines'])for(const object of scene[kind])echo(object,kind);
    for(const wall of sonarTerrainEchoes)echo(wall,wall.echoKind||'wall');
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
    const missing=field.survey.waypoint?[field.survey.waypoint]:scene.items.filter(i=>['recorder','recovery'].includes(i.type)&&!i.collected);
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
    for(const item of scene.items)if(!item.collected&&(item.type==='recovery'||item.revealUntil>clock||distance(player,item)<120)){
      if(item.type==='recovery')dot(item.x,item.y,'#ffac82',6);
      else if(item.type==='recorder')dot(item.x,item.y,'#f4c685',5);
      else dot(item.x,item.y,'#4f9d9e',2);
    }
    for(const enemy of scene.predators)if(distance(player,enemy)<(enemy.tier==='reaper'?260:enemy.tier==='apex'?205:130)||enemy.revealUntil>clock)dot(enemy.x,enemy.y,enemy.tier==='reaper'?'#ff665b':enemy.tier==='apex'?'#d683ff':'#ed7873',enemy.tier==='reaper'?7:enemy.tier==='apex'?6:4);
    for(const mine of scene.mines)dot(mine.x,mine.y,'#f2bc74',3);
    dot(player.x,player.y,'#b8ffe9',6);
    rctx.save();rctx.translate(cx,cy);rctx.rotate(player.facing);rctx.strokeStyle='#b7ffe8';rctx.beginPath();rctx.moveTo(14,0);rctx.lineTo(4,-6);rctx.moveTo(14,0);rctx.lineTo(4,6);rctx.stroke();rctx.restore();
    const sweep=(clock*.55)%TAU;
    rctx.save();rctx.translate(cx,cy);rctx.rotate(sweep);const g=rctx.createLinearGradient(0,0,140,0);g.addColorStop(0,'#68d2d226');g.addColorStop(1,'#68d2d200');rctx.fillStyle=g;rctx.beginPath();rctx.moveTo(0,0);rctx.arc(0,0,190,-.2,.2);rctx.closePath();rctx.fill();rctx.restore();
  }
  // === Three campaign slots. Never reuse a running world's objects after switching. ===
  let slotsReturnPause=false;
  const escapeHTML=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function openSlots(newCampaign=false){
    slotsReturnPause=paused;paused=true;resetPilotInput();importPreview=null;importToken=null;$('importPreview').innerHTML='';
    const ok=persist();renderSlots();
    $('slotsMessage').textContent=ok?(newCampaign?'Choose an empty slot to start a separate campaign. Existing campaigns are never overwritten.':'Autosaves stay in the selected slot. Loading another slot first saves your current expedition.'):(window.AbyssSlots.status().error||'Save unavailable. Switching is blocked to protect your current dive.');
    $('slotsDialog').showModal();$('slotsClose').focus({preventScroll:true});
    syncPauseButtons();
  }
  function closeSlots(){
    $('slotsDialog').close();paused=running?slotsReturnPause:false;syncPauseButtons();
    if(!paused&&running)window.AbyssAudio?.unlock();
  }
  function renderSlots(){
    const slots=window.AbyssSlots.summaries();
    $('slotsList').innerHTML=slots.map(s=>{
      const time=s.updatedAt?new Date(s.updatedAt).toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):'Not saved yet';
      const title=escapeHTML(s.title),level=LEVELS.find(l=>l.id===s.levelId)?.name||'SUNBREAK SHELF';
      return '<article class="campaign-slot'+(s.active?' current-slot':'')+'" data-slot="'+s.slot+'"><div class="slot-topline"><span>SLOT 0'+s.slot+'</span><b>'+(s.empty?'EMPTY':s.corrupt?'SAVE NEEDS ATTENTION':s.active?'CURRENT CAMPAIGN':'SAVED CAMPAIGN')+'</b></div>'+
        (s.empty?'<h3>A new descent</h3><label class="slot-name-label" for="slotName'+s.slot+'">CAMPAIGN NAME</label><input id="slotName'+s.slot+'" class="slot-name-input" maxlength="32" value="Campaign '+s.slot+'" autocomplete="off"><button class="slot-primary" data-new-slot="'+s.slot+'">START NEW CAMPAIGN →</button>':
        '<h3>'+title+'</h3><p class="slot-location">'+(s.corrupt?'The stored files have been preserved.':level)+'</p><div class="slot-metrics"><span><strong>'+s.recorders+'/20</strong> RECORDERS</span><span><strong>'+s.credits.toLocaleString('en-GB')+'</strong> CREDITS</span><span><strong>'+s.crystals+'</strong> CRYSTALS</span></div><div class="slot-checkpoint"><span>'+(s.activeDive?'DIVE SAVED · '+s.diveDepth+' m · RESUMES PAUSED':'AT HUB / READY TO LAUNCH')+'</span><small>'+time+(s.recovered?' · BACKUP AVAILABLE':'')+'</small></div><div class="slot-actions"><button class="slot-primary" '+(s.corrupt?'disabled':'')+' data-load-slot="'+s.slot+'">'+(s.active?'SAVE NOW':'LOAD CAMPAIGN')+'</button><button class="slot-export" '+(s.corrupt?'disabled':'')+' data-export-slot="'+s.slot+'">EXPORT</button><button class="slot-delete" data-delete-slot="'+s.slot+'" aria-label="Delete '+title+'">DELETE</button></div>')+'</article>';
    }).join('');
    document.querySelectorAll('[data-export-slot]').forEach(b=>b.onclick=()=>exportCampaign(+b.dataset.exportSlot));
    document.querySelectorAll('[data-load-slot]').forEach(b=>b.onclick=()=>{const i=+b.dataset.loadSlot;if(i===window.AbyssSlots.active){const ok=persist();renderSlots();$('slotsMessage').textContent=ok?'CHECKPOINT SAVED · '+campaignTitle:window.AbyssSlots.status().error;}else transitionSlot(i);});
    document.querySelectorAll('[data-new-slot]').forEach(b=>b.onclick=()=>transitionSlot(+b.dataset.newSlot,$('slotName'+b.dataset.newSlot).value));
    document.querySelectorAll('[data-delete-slot]').forEach(b=>b.onclick=()=>{
      const i=+b.dataset.deleteSlot,s=slots.find(s=>s.slot===i),card=b.closest('article');
      card.innerHTML='<div class="slot-topline"><span>SLOT 0'+i+'</span><b>DELETE CAMPAIGN?</b></div><h3>'+escapeHTML(s.title)+'</h3><p class="slot-delete-warning">This permanently removes this slot’s progress, active dive and achievements. The other slots are not changed.</p><div class="slot-actions"><button class="slot-primary" data-cancel-delete>KEEP CAMPAIGN</button><button class="slot-delete" data-confirm-delete="'+i+'">DELETE SLOT '+i+'</button></div>';
      card.querySelector('[data-cancel-delete]').onclick=renderSlots;
      card.querySelector('[data-confirm-delete]').onclick=()=>deleteSlot(i);
      card.querySelector('[data-cancel-delete]').focus({preventScroll:true});
    });
  }
  function reloadForSlot(){
    resetPilotInput();window.AbyssAudio?.suspend();
    if(window.ABYSS_TEST_MODE===true){window.AbyssSlotReloadRequested=true;return;}
    location.reload();
  }
  function transitionSlot(i,title){
    if(slotTransition)return;
    if(!persist()&&!window.AbyssSlots.status().corruptActive){$('slotsMessage').textContent=window.AbyssSlots.status().error;return;}
    if(!window.AbyssSlots.activate(i,title)){$('slotsMessage').textContent=window.AbyssSlots.status().error;return;}
    slotTransition=true;reloadForSlot();
  }
  function deleteSlot(i){
    if(slotTransition)return;
    if(!window.AbyssSlots.remove(i)){$('slotsMessage').textContent=window.AbyssSlots.status().error;return;}
    if(i===window.AbyssSlots.active){
      // Block pagehide/blur from resurrecting the deleted campaign.
      slotTransition=true;
      const next=window.AbyssSlots.summaries().find(s=>!s.empty&&!s.corrupt)?.slot||i;
      window.AbyssSlots.activate(next);reloadForSlot();
    }else{renderSlots();$('slotsMessage').textContent='Slot '+i+' deleted. Your current campaign is unchanged.';}
  }
  function bindSlots(){
    for(const id of ['menuSlotsBtn','pauseSlotsBtn'])$(id).addEventListener('click',()=>openSlots());
    $('slotsClose').addEventListener('click',closeSlots);
    $('slotsDialog').addEventListener('cancel',e=>{e.preventDefault();closeSlots();});
  }

  // === Owned ammunition. Paid refills and the fixed defeat rescue loadout. ===
  function syncWeaponStock(){
    if(!player||player.airborne||distance(player,HARBOUR)>=HARBOUR.dockRadius)return false;
    for(const id of Object.keys(WEAPONS)){
      saved.weaponAmmo[id]=Math.min(cleanCount(saved.weaponAmmo[id]),ammoStorageLimit(id,saved.upgrades));
      player.weaponAmmo[id]=saved.weaponAmmo[id];player.weaponCooldown[id]=0;
    }
    return true;
  }
  function releaseRailInput(){
    railHeld=false;const id=railPointerId;railPointerId=null;
    const button=$('mobileRail');button?.classList.remove('held');
    if(id!==null&&button?.hasPointerCapture(id))button.releasePointerCapture(id);
  }
  // A cheap broad phase plus polygon-edge distance makes long seeker rays much
  // less expensive than sampling every rock at every point along the ray.
  function guidanceLineClear(a,b,radius=0){
    if(!a||!b||![a.x,a.y,b.x,b.y].every(Number.isFinite))return false;
    const n=Math.max(1,Math.ceil(distance(a,b)/8));
    for(let i=0;i<=n;i++){
      const t=i/n,x=lerp(a.x,b.x,t),y=lerp(a.y,b.y,t);
      if(y<SURFACE.y+radius||y>MAX_WORLD_Y-radius||x<leftAt(y)+radius||x>rightAt(y)-radius)return false;
    }
    const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
    const near=(p,c,d)=>{const q=segmentClosest(p.x,p.y,c,d);return Math.hypot(p.x-q.x,p.y-q.y);};
    for(const rock of collisionPolygons()){
      if(rock.x+rock.radius+radius<Math.min(a.x,b.x)||rock.x-rock.radius-radius>Math.max(a.x,b.x)||
         rock.y+rock.radius+radius<Math.min(a.y,b.y)||rock.y-rock.radius-radius>Math.max(a.y,b.y))continue;
      if(near(rock,a,b)>rock.radius+radius)continue;
      const vertices=rock.vertices;
      if(insidePolygon(a.x,a.y,vertices)||insidePolygon(b.x,b.y,vertices))return false;
      for(let i=0;i<vertices.length;i++){
        const c=vertices[i],d=vertices[(i+1)%vertices.length];
        const abC=cross(a,b,c),abD=cross(a,b,d),cdA=cross(c,d,a),cdB=cross(c,d,b);
        if(((abC>0&&abD<0)||(abC<0&&abD>0))&&((cdA>0&&cdB<0)||(cdA<0&&cdB>0)))return false;
        if(Math.min(near(a,c,d),near(b,c,d),near(c,a,b),near(d,a,b))<=radius+1e-6)return false;
      }
    }
    return true;
  }
  const angleDelta=(to,from)=>Math.atan2(Math.sin(to-from),Math.cos(to-from));
  const turnToward=(from,to,maximum)=>from+clamp(angleDelta(to,from),-maximum,maximum);
  const targetKey=enemy=>typeof enemy.id==='string'||Number.isInteger(enemy.id)?enemy.id:null;
  function eligibleGuidanceTarget(enemy){
    // Harmless schools, wrecks and abandoned mines never enter this collection.
    // The Warden only exists here after the player explicitly wakes it.
    return predatorAlive(enemy)&&!inHarbour(enemy)&&enemy.y>=SURFACE.y&&enemy.y<=MAX_WORLD_Y;
  }
  function findGuidanceTarget(ordnance,heading,kind){
    const rules=GUIDANCE[kind],mine=kind==='mine';
    const range=mine?rules.range:Math.min(WEAPONS[kind].range,ordnance.remaining+35);
    const origin=mine?{x:ordnance.originX,y:ordnance.originY}:null;
    const valid=(enemy,locked=false)=>{
      if(!eligibleGuidanceTarget(enemy)||distance(ordnance,enemy)>range)return false;
      if(mine){if(distance(origin,enemy)>rules.leash+MINES.triggerRadius)return false;}
      else{
        const bearing=Math.atan2(enemy.y-ordnance.y,enemy.x-ordnance.x);
        if(Math.abs(angleDelta(bearing,heading))>(locked?rules.trackingCone:rules.cone))return false;
        // Never turn a shot back toward the submarine, even after target loss.
        if(Math.abs(angleDelta(bearing,ordnance.launchHeading))>rules.maxTurn)return false;
      }
      return true;
    };
    const locked=ordnance.targetId!=null?scene.predators.find(e=>targetKey(e)===ordnance.targetId):null;
    const clearance=mine?MINES.radius:WEAPONS[kind].radius;
    if(locked&&valid(locked,true)&&guidanceLineClear(ordnance,locked,clearance))return locked;
    ordnance.targetId=null;
    const candidates=scene.predators.filter(e=>valid(e)).map(e=>({enemy:e,score:mine?distance(ordnance,e):
      Math.abs(angleDelta(Math.atan2(e.y-ordnance.y,e.x-ordnance.x),heading))/rules.cone*.8+distance(ordnance,e)/range*.2}));
    candidates.sort((a,b)=>a.score-b.score);
    for(const {enemy} of candidates)if(guidanceLineClear(ordnance,enemy,clearance)){ordnance.targetId=targetKey(enemy);return enemy;}
    return null;
  }
  function interceptPoint(ordnance,enemy,speed,maxLead){
    const vx=Number.isFinite(enemy.vx)?enemy.vx:0,vy=Number.isFinite(enemy.vy)?enemy.vy:0;
    const x=enemy.x-ordnance.x,y=enemy.y-ordnance.y;
    const a=vx*vx+vy*vy-speed*speed,b=2*(x*vx+y*vy),c=x*x+y*y;
    let time=0;
    if(Math.abs(a)<1e-8){if(Math.abs(b)>1e-8&&-c/b>0)time=-c/b;}
    else{
      const discriminant=b*b-4*a*c;
      if(discriminant>=0){const root=Math.sqrt(discriminant),ts=[(-b-root)/(2*a),(-b+root)/(2*a)].filter(t=>t>=0);if(ts.length)time=Math.min(...ts);}
    }
    time=clamp(time,0,maxLead);
    return {x:enemy.x+vx*time,y:enemy.y+vy*time};
  }
  function guideProjectile(p,dt){
    const rules=GUIDANCE[p.kind],spec=WEAPONS[p.kind];
    const speed=Math.hypot(p.vx,p.vy);if(!rules||!Number.isFinite(speed)||speed<1e-8)return;
    const heading=Math.atan2(p.vy,p.vx);
    if(!Number.isFinite(p.launchHeading))p.launchHeading=heading; // v0.18.0 in-flight shot.
    const target=findGuidanceTarget(p,heading,p.kind);if(!target)return;
    const lead=interceptPoint(p,target,speed,rules.maxLead);
    let desired=Math.atan2(lead.y-p.y,lead.x-p.x);
    if(Math.abs(angleDelta(desired,p.launchHeading))>rules.maxTurn||!guidanceLineClear(p,lead,spec.radius))
      desired=Math.atan2(target.y-p.y,target.x-p.x);
    const turned=turnToward(heading,desired,rules.turnRate*dt);
    const bounded=p.launchHeading+clamp(angleDelta(turned,p.launchHeading),-rules.maxTurn,rules.maxTurn);
    p.vx=Math.cos(bounded)*speed;p.vy=Math.sin(bounded)*speed;
  }
  function guideMine(mine,dt){
    const rules=GUIDANCE.mine,heading=Number.isFinite(mine.heading)?mine.heading:0;
    const target=findGuidanceTarget(mine,heading,'mine');
    if(!target||dt<=0){mine.vx=0;mine.vy=0;return;}
    const desired=Math.atan2(target.y-mine.y,target.x-mine.x);
    const moving=Math.hypot(mine.vx||0,mine.vy||0)>.01;
    mine.heading=moving?turnToward(heading,desired,rules.turnRate*dt):desired;
    const travel=Math.min(rules.speed*dt,Math.max(0,distance(mine,target)-MINES.triggerRadius*.6));
    const next={x:mine.x+Math.cos(mine.heading)*travel,y:mine.y+Math.sin(mine.heading)*travel};
    const anchor={x:mine.originX,y:mine.originY},leashDistance=distance(anchor,next);
    if(leashDistance>rules.leash){next.x=anchor.x+(next.x-anchor.x)*rules.leash/leashDistance;next.y=anchor.y+(next.y-anchor.y)*rules.leash/leashDistance;}
    if(distance(next,HARBOUR)<HARBOUR.safeRadius+MINES.radius||!guidanceLineClear(mine,next,MINES.radius)){
      mine.vx=0;mine.vy=0;mine.targetId=null;return;
    }
    mine.vx=(next.x-mine.x)/dt;mine.vy=(next.y-mine.y)/dt;mine.x=next.x;mine.y=next.y;
  }
  function validGuidanceState(o){
    if(o.targetId!=null&&!(typeof o.targetId==='string'&&o.targetId.length<=100)&&!(Number.isInteger(o.targetId)&&o.targetId>=0&&o.targetId<=1e9))return false;
    return ['launchHeading','originX','originY','heading','vx','vy'].every(k=>o[k]===undefined||(Number.isFinite(o[k])&&Math.abs(o[k])<=100000));
  }
  function fireWeapon(kind,quiet=false){
    const spec=WEAPONS[kind];if(!spec||!running||paused||slotTransition)return false;
    const say=text=>{if(!quiet)announce(text,1.5);return false;};
    if(!saved.upgrades[kind])return say('FIT '+spec.name+' MK I AT THE DOCK');
    if(player.weaponAmmo[kind]<=0)return say('MAGAZINE EMPTY · BUY ROUNDS AT DOCK');
    if(player.weaponCooldown[kind]>0)return false;
    if(inHarbour(player))return say('HARBOUR SAFETY · WEAPONS LOCKED');
    if(player.airborne||player.y<SURFACE.y+35)return say('SUBMERGE TO FIRE');
    const dx=Math.cos(player.facing),dy=Math.sin(player.facing),muzzle={x:player.x+dx*35,y:player.y+dy*35};
    if(projectileTerrainHit(player,muzzle,3)!==null)return say('BOW OBSTRUCTED · MOVE TO CLEAR WATER');
    scene.projectiles.push({id:idCounter++,kind,x:muzzle.x,y:muzzle.y,vx:dx*spec.speed,vy:dy*spec.speed,radius:spec.radius,
      damage:spec.damage[saved.upgrades[kind]],remaining:spec.range,birth:clock,launchHeading:player.facing,targetId:null});
    player.weaponAmmo[kind]--;saved.weaponAmmo[kind]=player.weaponAmmo[kind];player.weaponCooldown[kind]=spec.cooldown;
    player.noise=Math.min(100,player.noise+(kind==='torpedo'?32:18));
    for(const enemy of scene.predators)if(predatorAlive(enemy)&&distance(player,enemy)<(kind==='torpedo'?420:290)){enemy.alertUntil=clock+3;enemy.forgetUntil=0;}
    window.AbyssAudio?.event(kind);persist();updateWeaponUI();return true;
  }
  function projectileSolid(x,y,radius=0){
    if(y<SURFACE.y+radius||y>MAX_WORLD_Y-radius||x<leftAt(y)+radius||x>rightAt(y)-radius)return true;
    for(const r of collisionPolygons()){
      if(Math.abs(x-r.x)>r.radius+radius||Math.abs(y-r.y)>r.radius+radius)continue;
      if(insidePolygon(x,y,r.vertices))return true;
      if(radius&&r.vertices.some((v,i)=>{const p=segmentClosest(x,y,v,r.vertices[(i+1)%r.vertices.length]);return Math.hypot(x-p.x,y-p.y)<radius;}))return true;
    }
    return false;
  }
  function projectileTerrainHit(a,b,radius){
    const n=Math.max(1,Math.ceil(distance(a,b)/4));
    for(let i=0;i<=n;i++){const t=i/n;if(projectileSolid(lerp(a.x,b.x,t),lerp(a.y,b.y,t),radius))return t;}
    return null;
  }
  function sweptActorHit(a,b,actor,radius){
    const ax=a.x-(actor.previousX??actor.x),ay=a.y-(actor.previousY??actor.y);
    const dx=b.x-actor.x-ax,dy=b.y-actor.y-ay,c=ax*ax+ay*ay-radius*radius;
    if(c<=0)return 0;const d=dx*dx+dy*dy;if(d<1e-10)return null;
    const q=2*(ax*dx+ay*dy),disc=q*q-4*d*c;if(disc<0)return null;
    const t=(-q-Math.sqrt(disc))/(2*d);return t>=0&&t<=1?t:null;
  }
  function projectileBlast(p){
    const radius=WEAPONS[p.kind].blast;
    scene.blasts.push({x:p.x,y:p.y,birth:clock,radius:radius||28,weapon:p.kind});
    if(!radius)return;
    window.AbyssAudio?.event('torpedoHit',clamp((p.x-player.x)/300,-1,1));
    for(const e of scene.predators)if(predatorAlive(e)&&distance(p,e)<=radius+15&&projectileTerrainHit(p,e,0)===null)damagePredator(e,p.damage,true,p);
    // Only abandoned hazards can chain. Player-laid mines are never spent by friendly fire.
    for(const m of scene.derelictMines||[])if(!m.detonated&&distance(p,m)<=radius&&projectileTerrainHit(p,m,0)===null)detonateDerelict(m);
  }
  function updateProjectiles(dt){
    const kept=[];
    for(const p of scene.projectiles||[]){
      if(!Number.isFinite(p.remaining)||p.remaining<=0)continue;
      guideProjectile(p,dt);
      const speed=Math.hypot(p.vx,p.vy);if(!Number.isFinite(speed)||speed<1e-8)continue;
      const distanceThisFrame=Math.min(p.remaining,Math.hypot(p.vx,p.vy)*dt),time=distanceThisFrame/Math.hypot(p.vx,p.vy);
      const a={x:p.x,y:p.y},b={x:p.x+p.vx*time,y:p.y+p.vy*time};
      let first=projectileTerrainHit(a,b,p.radius),target=first===null?null:'terrain';
      for(const e of scene.predators)if(predatorAlive(e)){
        const t=sweptActorHit(a,b,e,p.radius+(e.tier==='warden'?35:e.tier==='reaper'?25:e.tier==='apex'?21:17));
        if(t!==null&&(first===null||t<first)){first=t;target=e;}
      }
      for(const m of scene.derelictMines||[])if(!m.detonated){
        const t=sweptActorHit(a,b,m,p.radius+WILD.mineRadius);
        if(t!==null&&(first===null||t<first)){first=t;target=m;}
      }
      if(first!==null){
        const t=target==='terrain'?Math.max(0,first-.1):first;p.x=lerp(a.x,b.x,t);p.y=lerp(a.y,b.y,t);
        if(target!=='terrain'&&target.anchorX!==undefined)detonateDerelict(target);
        else if(target!=='terrain'&&p.kind==='railgun'){damagePredator(target,p.damage,true,p);window.AbyssAudio?.event('railHit',clamp((p.x-player.x)/300,-1,1));}
        projectileBlast(p);continue;
      }
      p.x=b.x;p.y=b.y;p.remaining-=distanceThisFrame;
      if(p.remaining>0)kept.push(p);else projectileBlast(p);
    }
    scene.projectiles=kept;
  }
  function drawProjectiles(){
    for(const p of scene.projectiles||[])if(onscreen(p.x,p.y,40)){
      const spec=WEAPONS[p.kind];ctx.save();ctx.translate(p.x,p.y);ctx.rotate(Math.atan2(p.vy,p.vx));
      ctx.strokeStyle=spec.color;ctx.fillStyle=spec.color;ctx.shadowColor=spec.color;ctx.shadowBlur=9;
      if(p.kind==='railgun'){ctx.lineWidth=2.8;ctx.beginPath();ctx.moveTo(-21,0);ctx.lineTo(5,0);ctx.stroke();}
      else{ctx.beginPath();ctx.ellipse(0,0,12,4,0,0,TAU);ctx.fill();ctx.shadowBlur=0;ctx.globalAlpha=.4;ctx.beginPath();ctx.moveTo(-12,-3);ctx.lineTo(-34,0);ctx.lineTo(-12,3);ctx.fill();}
      ctx.restore();
    }
  }
  const DESKTOP_ACTIONS=Object.freeze([
    ['rail','RAIL','Z','mobileRail','#97e0f5'],['torpedo','TORPEDO','X','mobileTorpedo','#efb783'],['mine','MINE','F','mobileMine','#e8979e'],
    ['boost','BOOST','SPACE','mobileBoost','#83c5f2'],['use','USE','E','mobileInteract','#96e8d0'],['sonar','SONAR','Q','mobileSonar','#96d7ce'],
    ['repair','REPAIR','R','mobileRepair','#bad0dd'],['lights','LIGHTS','L',null,'#ecd79d'],['map','CHART','M',null,'#a0c8d9'],
    ['journal','JOURNAL','J',null,'#baabd8'],['pause','PAUSE','ESC',null,'#a2dcd5']
  ]);
  function buildDesktopActions(){
    const icons={lights:'<path d="M5 8v8M8 5v14m0-3c5 0 7 2 7 2V6s-2 2-7 2m10-1 3-2m-3 7h4m-4 5 3 2"/>',map:'<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2Zm6-2v16m6-14v16"/>',journal:'<path d="M5 3h13v18H5zM8 7h7M8 11h7M8 15h5"/>',pause:'<path d="M8 5v14M16 5v14"/>'};
    const rail=document.querySelector('.desktop-keybinds');
    rail.innerHTML='<div class="desktop-pilot-hint"><span class="helm-mark" aria-hidden="true">⌁</span><span><b>PILOT</b><small>HOLD MOUSE / WASD</small></span></div><div class="desktop-action-bank">'+DESKTOP_ACTIONS.map(([id,name,key,mobile,color])=>{
      const glyph=mobile?$(mobile).querySelector('.action-glyph').outerHTML:'<svg class="action-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+icons[id]+'</svg>';
      const readout=id==='rail'?'railKeyAmmo':id==='torpedo'?'torpedoKeyAmmo':'desktop-'+id+'-value';
      return '<div class="desktop-action" id="desktop-'+id+'" style="--action-color:'+color+'"><span class="desktop-action-name">'+name+'</span><div class="desktop-action-orb">'+glyph+'<svg class="desktop-ring" viewBox="0 0 60 60" aria-hidden="true"><circle class="desktop-track" cx="30" cy="30" r="27"/><circle class="desktop-ready" cx="30" cy="30" r="27" pathLength="100"/></svg><span class="desktop-timer"></span><kbd>'+key+'</kbd></div><b class="desktop-readout" id="'+readout+'">—</b></div>';
    }).join('')+'</div>';
  }
  function updateDesktopActions(){
    if(!player||touchControls)return;
    const data={},active=running&&!paused;
    for(const [kind,id] of [['railgun','rail'],['torpedo','torpedo']]){
      const mark=saved.upgrades[kind],ammo=player.weaponAmmo[kind]||0,cd=player.weaponCooldown[kind]||0,cap=WEAPONS[kind].capacity[mark];
      data[id]={value:mark?ammo+'/'+cap:'UNFITTED',locked:!mark,unavailable:!mark||!ammo||!active||cd>0,progress:mark?1-cd/WEAPONS[kind].cooldown:0,timer:cd,detail:mark?'Rounds remaining: '+ammo+' of '+cap+'. Cooldown '+cd.toFixed(1)+' seconds.':'Purchase this weapon at the dock.'};
    }
    data.mine={value:saved.upgrades.minePower?player.mineAmmo+'/'+mineCapacity():'UNFITTED',locked:!saved.upgrades.minePower,unavailable:!saved.upgrades.minePower||!player.mineAmmo||!active||player.mineCooldown>0,progress:saved.upgrades.minePower?1-player.mineCooldown/MINES.deployCooldown:0,timer:player.mineCooldown};
    const boostPercent=boostCapacity()?player.boost/boostCapacity():0;
    const boostTime=player.boostLocked?Math.max(0,player.boostRechargeDelay)+(boostCapacity()-player.boost)/boostRechargeRate():Math.max(0,player.boostRechargeDelay);
    data.boost={value:boostUnlocked()?Math.round(boostPercent*100)+'%':'UNFITTED',locked:!boostUnlocked(),unavailable:!boostUnlocked()||player.boostLocked||player.battery<=.5||!active,progress:boostPercent,timer:boostTime,active:player.boosting,detail:'Charge '+Math.round(boostPercent*100)+' percent. '+(player.boostLocked?'Full recharge in approximately '+Math.ceil(boostTime)+' seconds.':'Hold Space while piloting.')};
    const nearby=nearestInteractable();
    data.use={value:nearby?nearby.type==='station'?'DOCK':'IN RANGE':'HOLD',progress:nearby?1:0,active:Boolean(nearby),unavailable:!active,detail:'Hold E to collect crystals, recorders and recovery cargo, or dock. Scrap collects automatically.'};
    data.sonar={value:player.scanCooldown>0?'CHARGING':player.battery<sonarCost()?'LOW POWER':'READY',timer:player.scanCooldown,progress:1-player.scanCooldown/(player.scanDuration||sonarCooldown()),unavailable:!active||player.scanCooldown>0||player.battery<sonarCost(),detail:'Sonar costs '+scanPowerCost()+' power.'};
    const repairLeft=Math.max(0,4-(clock-(player.lastRepair??-99)));
    data.repair={value:player.cargo.scrap+' SCRAP',timer:repairLeft,progress:1-repairLeft/4,unavailable:!active||player.cargo.scrap<2||player.hull>=maxHull()-1||repairLeft>0,detail:'Field repair uses 2 scrap, restores up to 30 hull. Four-second cooldown.'};
    data.lights={value:player.lights?'ON':'OFF',progress:player.lights?1:0,active:player.lights,unavailable:!active,detail:'Toggle the forward flashlight. Mk '+roman(saved.upgrades.flashlight)+'.'};
    data.map={value:'SURVEY',progress:0};data.journal={value:'ARCHIVE',progress:0};data.pause={value:'MENU',progress:0};
    for(const [id,name,key] of DESKTOP_ACTIONS){
      const el=$('desktop-'+id),d=data[id];if(!el||!d)continue;
      const label=el.querySelector('.desktop-readout');if(label.textContent!==d.value)label.textContent=d.value;
      el.style.setProperty('--readiness',clamp(d.progress||0,0,1)*100);
      el.classList.toggle('is-locked',Boolean(d.locked));el.classList.toggle('is-unavailable',Boolean(d.unavailable));el.classList.toggle('is-active',Boolean(d.active));
      const timer=el.querySelector('.desktop-timer'),time=(d.timer||0)>.04?d.timer<10?d.timer.toFixed(1)+'s':Math.ceil(d.timer)+'s':'';
      timer.textContent=time;el.classList.toggle('has-timer',Boolean(time));
      el.setAttribute('aria-label',name+', key '+key+', '+d.value+(time?', cooldown '+time:'')+'. '+(d.detail||''));
    }
  }
  function updateWeaponUI(){
    if(!player)return;
    for(const [id,button,label,pc] of [['railgun','mobileRail','railButtonLabel','railKeyAmmo'],['torpedo','mobileTorpedo','torpedoButtonLabel','torpedoKeyAmmo']]){
      const mark=saved.upgrades[id],cap=WEAPONS[id].capacity[mark],ammo=player.weaponAmmo?.[id]||0,cd=player.weaponCooldown?.[id]||0;
      const text=mark?ammo+'/'+cap:'LOCKED';$(label).textContent=text;$(pc).textContent=mark?text:'UNFITTED';
      $(button).setAttribute('aria-disabled',String(!mark||!ammo||!running||paused));
      $(button).setAttribute('aria-label',WEAPONS[id].name+' · '+(mark?ammo+' of '+cap+' rounds. Buy ammunition at dock for '+WEAPON_AMMO_PRICES[id]+' credits per round.':'Not fitted. Buy at dock.'));
      $(button).classList.toggle('equipment-locked',!mark);$(button).classList.toggle('empty',Boolean(mark&&!ammo));
      $(button).classList.toggle('cooling',cd>0);$(button).style.setProperty('--ring',mark?100*clamp(1-cd/WEAPONS[id].cooldown,0,1):0);
      $(button).style.setProperty('--stock',cap?100*ammo/cap:0);$(button).title=$(button).getAttribute('aria-label');
    }
  }
  function bindWeaponInputs(){
    const rail=$('mobileRail');
    rail.addEventListener('pointerdown',e=>{
      if((e.pointerType==='mouse'&&e.button!==0)||railPointerId!==null||!running||paused)return;
      e.preventDefault();railPointerId=e.pointerId;railHeld=true;rail.setPointerCapture(e.pointerId);rail.classList.add('held');fireWeapon('railgun');
    });
    for(const type of ['pointerup','pointercancel','lostpointercapture'])rail.addEventListener(type,e=>{if(e.pointerId===railPointerId)releaseRailInput();});
    rail.addEventListener('click',e=>{if(e.detail===0)fireWeapon('railgun');});
    $('mobileTorpedo').addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;e.preventDefault();fireWeapon('torpedo');});
    $('mobileTorpedo').addEventListener('click',e=>{if(e.detail===0)fireWeapon('torpedo');});
  }

  // A bounded red hull pulse, including continuous pressure/oxygen loss. Never a strobe.
  function flashHullDamage(){
    if(clock<(player.nextDamageFlash||0))return;
    player.damageFlashUntil=clock+.48;player.nextDamageFlash=clock+.85;
  }
  function drawDamageFlash(){
    if(!player||!(player.damageFlashUntil>clock))return;
    const t=1-(player.damageFlashUntil-clock)/.48,alpha=.62*Math.sin(Math.PI*clamp(t+.1,0,1));
    ctx.save();ctx.translate(player.x,player.y);ctx.rotate(player.facing);ctx.globalAlpha=alpha;
    ctx.fillStyle='#ff4b56';ctx.strokeStyle='#ff9b91';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(33,0);ctx.bezierCurveTo(22,-17,-18,-18,-29,-9);ctx.lineTo(-34,-17);ctx.lineTo(-28,-4);ctx.lineTo(-28,4);ctx.lineTo(-34,17);ctx.lineTo(-29,9);ctx.bezierCurveTo(-18,18,22,17,33,0);ctx.fill();ctx.stroke();ctx.restore();
  }

  function updateUI(){
    updateWeaponUI();
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
    const st=depth>rating?'PRESSURE ALERT':player.hull/maxHull()<.35?'LOW HULL':player.oxygen/oxygenRate()<75?'LOW OXYGEN':reserveDrive()?'RESERVE DRIVE · 50%':player.battery<15?'LOW POWER':player.airborne?'SURFACE BREACH':inHarbour(player)?'DOCK SAFE ZONE':reaperClose?'REAPER CONTACT':apexClose?'APEX CONTACT':enemyClose?'PREDATOR ALERT':'NOMINAL';
    $('statusStat').textContent=st;$('statusStat').className=(['NOMINAL','DOCK SAFE ZONE','SURFACE BREACH'].includes(st)?'status-safe':st==='PREDATOR ALERT'||st==='APEX CONTACT'||st==='REAPER CONTACT'||st==='PRESSURE ALERT'||st==='LOW HULL'?'status-danger':'status-warning');
    $('signalText').textContent=st==='NOMINAL'?'VESSEL ONLINE':'VESSEL WARNING';
    const setGauge=(kind,value,max)=>{const pct=clamp(value/max*100,0,100);$(kind+'Value').textContent=Math.round(pct)+'%';$(kind+'Bar').style.width=pct+'%';
      $(kind+'Tab').classList.toggle('alert',kind==='noise'?pct>75:pct<(kind==='hull'?35:kind==='oxygen'?25:20));};
    setGauge('hull',player.hull,maxHull());setGauge('oxygen',player.oxygen,maxOxygen());setGauge('battery',player.battery,maxBattery());setGauge('noise',player.noise,100);
    $('coordsText').textContent='0'+(LEVELS.findIndex(l=>l.id===LEVEL_ID)+1)+' · '+currentLevel().name;
    const sonarCooling=player.scanCooldown>0;
    $('sonarText').textContent=sonarCooling?Math.ceil(player.scanCooldown)+'s':player.battery<sonarCost()?'LOW':'READY';
    const sonarPct=sonarCooling?clamp(1-player.scanCooldown/(player.scanDuration||sonarCooldown()),0,1)*100:100;
    $('sonarBar').style.width=sonarPct+'%';
    $('mobileSonar').style.setProperty('--ring',sonarPct);
    $('sonarStatus').textContent=sonarCooling?'RECHARGING':player.battery<sonarCost()?'LOW POWER':scanPowerCost()+' PWR'+(disruptorReady()?' · STUN':' / PING');
    $('sonarMeter').classList.toggle('cooling',sonarCooling);
    $('sonarButtonLabel').textContent=sonarCooling?Math.ceil(player.scanCooldown)+'s':player.battery<sonarCost()?'LOW':'READY';
    $('mobileSonar').classList.toggle('cooling',sonarCooling);
    $('mobileSonar').setAttribute('aria-disabled',String(sonarCooling||player.battery<sonarCost()));
    $('mobileSonar').setAttribute('aria-label',sonarCooling?'Sonar recharging, '+Math.ceil(player.scanCooldown)+' seconds':'Ping sonar, costs '+scanPowerCost()+' power'+(disruptorReady()?', disruption ready':''));
    const shieldFitted=shieldCapacity()>0;
    $('shieldMeter').classList.toggle('hidden',!shieldFitted);
    document.querySelector('.cockpit-systems').classList.toggle('with-shield',shieldFitted);
    document.querySelector('.capability-group').classList.toggle('with-shield',shieldFitted);
    $('shieldValue').textContent=Math.ceil(player.shield||0)+'/'+shieldCapacity();
    $('shieldBar').style.width=(shieldFitted?clamp(player.shield/shieldCapacity()*100,0,100):0)+'%';
    $('shieldStatus').textContent=player.shield>=shieldCapacity()?'CHARGED':player.shieldDelay>0?Math.ceil(player.shieldDelay)+'s WAIT':player.boosting?'BOOST PRIORITY':player.battery<=.5?'NO POWER':'RECHARGING';
    $('shieldMeter').classList.toggle('empty',player.shield<=0);
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
    $('mineBar').style.width=(minesReady?Math.min(1,player.mineAmmo/mineCapacity())*100:0)+'%';
    $('mineReadout').classList.toggle('empty',!minesReady||player.mineAmmo<=0);
    for(const id of ['mobileMine']){
      const b=$(id);b.classList.toggle('equipment-locked',!minesReady);b.style.setProperty('--stock',minesReady?100*Math.min(1,player.mineAmmo/mineCapacity()):0);b.classList.toggle('empty',!minesReady||player.mineAmmo<=0);b.classList.toggle('cooling',mineCooling);
      b.setAttribute('aria-disabled',String(!minesReady||player.mineAmmo<=0||mineCooling||paused||!running));
      b.setAttribute('aria-label',minesReady?'Deploy sea mine. '+player.mineAmmo+' rounds remaining'+(player.mineAmmo>mineCapacity()?', including an emergency reserve. ':'. ')+mineStatus:'Buy Mk I sea mines at the dock');
    }
    $('radarStatus').textContent=player.scanCooldown>0?'COOLDOWN':'ACTIVE';
    const count=saved.secured.length,loose=player.cargo.recorders.length;
    $('fragmentCount').textContent=count+' / '+RECORDERS_TOTAL;
    $('fragmentIcons').innerHTML=RECORDER_DEPTHS.map((_,i)=>`<span class="${saved.secured.includes(i)?'filled':player.cargo.recorders.includes(i)?'loose':''}">${saved.secured.includes(i)?'◆':player.cargo.recorders.includes(i)?'◈':'◇'}</span>`).join('');
    $('scrapCount').textContent=player.cargo.scrap;$('crystalCount').textContent=player.cargo.crystal;$('looseCount').textContent=loose;$('creditCount').textContent=saved.credits;$('bankedCrystalCount').textContent=saved.crystals;$('missionTitle').textContent=currentLevel().name;$('missionDescription').textContent='Bank all '+RECORDERS_TOTAL+' recorders to secure this level. Seabed: '+currentLevel().depth.toLocaleString('en-GB')+' m. Campaign: '+totalRecorders()+' / 20.';
    const waiting=scene.items.filter(x=>['recorder','recovery'].includes(x.type)&&!x.collected);
    if(waiting.length){waiting.sort((a,b)=>distance(player,a)-distance(player,b));$('targetInfo').textContent=(waiting[0].type==='recovery'?'RECOVERY POD · '+depthOf(waiting[0].y):'NEXT SIGNAL · '+RECORDER_DEPTHS[waiting[0].index])+' m DEPTH · '+Math.round(distance(player,waiting[0])/10)+' m AWAY';}
    else $('targetInfo').textContent=loose?'RETURN TO STATION TO SECURE RECORDER'+(loose>1?'S':''):count===RECORDERS_TOTAL?'LEVEL CLEARED · EXPEDITIONS AT HUB':'ALL SIGNALS SECURED · RETURN TO STATION';
    const lv=levelOf(saved.xp),prev=90*Math.pow(lv-1,2),next=90*Math.pow(lv,2);
    $('rankText').textContent='LV. '+lv+' · '+rankName(lv);
    $('rankFill').style.width=(clamp((saved.xp-prev)/(next-prev)*100,0,100))+'%';
    $('xpText').textContent=saved.xp+' / '+next+' XP';$('bestDepth').textContent='BEST: '+saved.bestDepth+' m';
    const station=nearestInteractable()?.type==='station';
    $('dockBtn').disabled=!station;$('dockBtn').textContent=station?'◈ DOCK · BANK SALVAGE · UPGRADE':'◈ RETURN TO STATION TO UPGRADE';
    const close=nearestInteractable();const prompt=$('interactionPrompt');
    if(running&&!paused&&close){
      prompt.textContent=(touchControls?'HOLD USE · ':'[ E ] ')+(close.type==='station'?'DOCK & UPGRADE':close.type==='signal'?(close.kind==='warden-site'?'OBSERVATION BUOY · OPTIONAL':'RECOVER ASSIGNMENT CARGO'):close.type==='giant'?(close.kind==='plate'?'RECOVER IDENTIFICATION PLATE':giantSiteState().opened?'SERVICE SHORTCUT OPEN':giantSiteState().scanned?'RELEASE SERVICE BULKHEAD':'SONAR REQUIRED · SERVICE PANEL'):close.type==='recorder'?'RECOVER BLACK BOX':close.type==='air'?'CLAIM SUPPLY CACHE':close.type==='battery'?'BATTERY CELL · +25 POWER':close.type==='recovery'?'RECOVER LOST CARGO':distance(player,close)>=60?'MAGNET '+close.type.toUpperCase()+' · '+magnetPower()+' POWER':'SALVAGE '+close.type.toUpperCase());if(close.type==='rescue')prompt.textContent=deepwater.hint(close);prompt.classList.remove('hidden');
    } else prompt.classList.add('hidden');
    $('mobileInteract').classList.toggle('available',Boolean(running&&!paused&&close));
    $('mobileRepair').setAttribute('aria-disabled',String(paused||!running||player.cargo.scrap<2||player.hull>=maxHull()));
    refreshFlashlightControl();
    updateLivingHUD();updateDesktopActions();drawRadar();
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
    $('pauseTitle').textContent='EXPEDITION PAUSED';window.AbyssAudio?.unlock();
    paused=false;resetPilotInput();canvas.focus({preventScroll:true});
    $('pauseOverlay').classList.add('hidden');$('menuOverlay').classList.add('hidden');
    $('notification').classList.add('hidden');syncPauseButtons();updateUI();audioFrame();
  }
  function updateCommandOverview(){
    const dive=loadedActive?.player||(running?player:null),level=currentLevel();
    $('menuSlotTag').textContent='COMMAND DECK / SLOT '+String(window.AbyssSlots.active).padStart(2,'0');
    $('menuCampaignName').textContent=campaignTitle;
    $('menuDestination').textContent=level.name+' · '+level.depth.toLocaleString('en-GB')+' m seabed';
    const chapters=LEVELS.map((l,i)=>'<span class="'+(l.id===LEVEL_ID?'is-current ':'')+(levelComplete(l.id)?'is-complete':levelUnlocked(i)?'is-open':'is-locked')+'" title="'+l.name+' · '+(levelComplete(l.id)?'complete':levelUnlocked(i)?'unlocked':'locked')+'"><b>'+String(i+1).padStart(2,'0')+'</b><i></i></span>').join('');
    $('menuCampaignSummary').innerHTML='<div class="campaign-figures"><div><strong>'+totalRecorders()+'<small>/20</small></strong><span>TRANSMISSIONS</span></div><div><strong>'+ACHIEVEMENTS.filter(a=>saved.achievements[a.id]).length+'<small>/30</small></strong><span>ACHIEVEMENTS</span></div><div><strong>'+giants.banked.length+'<small>/5</small></strong><span>WRECK IDENTITIES</span></div></div><div class="chapter-track" aria-label="Campaign level progress">'+chapters+'</div>';
    if(dive)$('menuDestination').textContent+=' · DIVE AT '+depthOf(dive.y)+' m';
  }
  function updatePauseOverview(){
    if(!player)return;
    const gauges=[['HULL',Math.max(0,player.hull),maxHull(),'#95ddcb'],['OXYGEN',player.oxygen,maxOxygen(),'#8acfe4'],['POWER',player.battery,maxBattery(),'#efce90'],['SHIELD',player.shield,shieldCapacity(),'#b7b3ec']];
    $('pauseTelemetry').innerHTML='<div class="pause-gauges">'+gauges.map(([label,value,max,color])=>'<div class="pause-gauge '+(max&&value/max<.2?'is-low':'')+'" style="--meter-color:'+color+'"><span>'+label+'</span><strong>'+(max?Math.round(value/max*100)+'<small>%</small>':'<small>UNFITTED</small>')+'</strong><i><b style="width:'+(max?clamp(value/max*100,0,100):0)+'%"></b></i></div>').join('')+'</div><div class="endurance-line"><div><span>AIR REMAINING</span><strong>'+enduranceText(player.oxygen/oxygenRate())+'<small> min:sec</small></strong></div><div><span>PROPULSION</span><strong>'+(reserveDrive()?'RESERVE · 50%':(normalSpeedAt(saved.upgrades.engine)/10).toFixed(1)+' m/s')+'</strong></div></div>';
    const c=player.cargo;
    $('pauseCargo').innerHTML='<span class="section-overline">UNBANKED CARGO</span><div><b>'+c.scrap+'<small>SCRAP</small></b><b>'+c.crystal+'<small>CRYSTALS</small></b><b>'+c.recorders.length+'<small>RECORDERS</small></b><b>'+(c.plates?.length||0)+'<small>ID PLATES</small></b></div>';
    const active=signals.active;
    $('pauseObjective').innerHTML='<span class="section-overline">'+(active?'ACTIVE ASSIGNMENT':'CURRENT OBJECTIVE')+'</span><strong>'+escapeHTML(active?missionName(active):currentLevel().name)+'</strong><p>'+escapeHTML(active?missionProgress(active):saved.secured.length+' / '+RECORDERS_TOTAL+' recorders banked. '+(player.cargo.recorders.length?'Return safely to secure the recorders aboard.':'Recover every recorder to unlock the next depth.'))+'</p>';
    $('pauseSaveStatus').textContent=storageHealthy?'CHECKPOINT SAVED ON THIS DEVICE':'SAVE FAILED · KEEP THIS SESSION OPEN';
    $('pauseSaveStatus').classList.toggle('save-warning',!storageHealthy);
  }
  function updateMainMenu(){
    updateCommandOverview();
    $('saveStatus').textContent=storageHealthy?(storageRecovery?'RECOVERED CAMPAIGN BACKUP':'SLOT '+window.AbyssSlots.active+' · '+campaignTitle.toUpperCase()+' · SAVED ON THIS DEVICE'):'STORAGE UNAVAILABLE · PROGRESS WILL NOT BE SAVED';
    $('saveStatus').classList.toggle('save-warning',!storageHealthy||storageRecovery);
    window.dispatchEvent(new Event('abyss-menu'));
    checkAchievements(true);$('menuHubBtn').disabled=running||Boolean(loadedActive);
    $('startBtn').innerHTML=running||loadedActive?'CONTINUE EXPEDITION <span>→</span>':'BEGIN EXPEDITION <span>→</span>';
    $('menuHubBtn').title=running||loadedActive?'Bank or quit the active dive before opening the hub.':'Choose a level and refit at the hub.';
    const existing=saved.bestDepth>0||saved.credits>0||saved.xp>0||saved.secured.length>0||Object.entries(saved.upgrades).some(([id,v])=>v>(defaults().upgrades[id]??0));
    $('menuProgress').textContent=loadedActive?'SAVED DIVE · '+depthOf(loadedActive.player.y)+'m · CONTINUE TO RESTORE PAUSED':running?'DIVE SUSPENDED · '+depthOf(player.y)+'m · '+player.cargo.recorders.length+' RECORDER(S) ABOARD':
      existing?'CAMPAIGN · '+totalRecorders()+'/20 RECORDERS · '+saved.crystals+' CRYSTALS · '+currentLevel().name:'NEW CAPTAIN · LEVEL 1 / SUNBREAK SHELF';
  }
  function returnToMenu(preserveDive){
    closeUpgradeDetails(false);
    resetPilotInput();
    $('modalOverlay').classList.add('hidden');$('pauseOverlay').classList.add('hidden');
    if(!preserveDive) {deepwater?.loss();loadedActive=null;stashCargo();running=false;paused=false;checkAchievements();persist();}
    else {paused=true;persist();}
    syncPauseButtons();updateMainMenu();
    $('menuOverlay').classList.remove('hidden');updateUI();
  }
  function showPause(){
    if(!running||!$('menuOverlay').classList.contains('hidden'))return;
    $('pauseTitle').textContent='EXPEDITION PAUSED';
    paused=true;resetPilotInput();deepwater?.pauseReset();persist();window.AbyssAudio?.setScene('pause');
    $('pauseStats').textContent=currentLevel().name+' · '+depthOf(player.y)+' m / '+safeDepth().toLocaleString('en-GB')+' m LIMIT';
    updatePauseOverview();
    $('pauseOverlay').classList.remove('hidden');
    $('notification').classList.add('hidden');syncPauseButtons();updateUI();
  }
  function togglePause(){
    if(document.querySelector('#surveyDialog[open],#audioDialog[open],#telemetryDialog[open],#slotsDialog[open],#rescueDialog[open]'))return;
    if(!$('modalOverlay').classList.contains('hidden')){closeDialog();return;}
    if(!running||!$('menuOverlay').classList.contains('hidden'))return;
    if(paused)resumeDive();else showPause();
  }
  function quitDiveConfirmation(){
    openDialog('MISSION CONTROL // ABORT','ABANDON THIS DIVE?',
      '<p class="dialog-info">All unbanked scrap, crystals and recorders will be left in a persistent recovery pod at your position. Quitting does not grant the defeat rescue ammunition. Banked currencies, upgrades and achievements remain saved.</p>',
      '<div class="dialog-actions"><button id="cancelQuitBtn" class="alt-btn">GO BACK</button><button id="confirmQuitBtn" class="danger-btn">QUIT DIVE</button></div>');
    $('cancelQuitBtn').addEventListener('click',closeDialog);
    $('confirmQuitBtn').addEventListener('click',()=>returnToMenu(false));
  }
  function newGameConfirmation(){openSlots(true);}
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
    const body=`<div class="briefing"><p>You pilot the <strong>NEREID MK-II</strong>. Explore five unlockable levels with 2, 3, 4, 5 and 6 recorders. Bank every recorder in a level to unlock the next. Change levels at the hub; cleared levels remain available.</p><ul>
      <li><strong>PC helm:</strong> hold the left mouse button over the water and move the cursor. The sub points and travels towards it, easing off when close. Release to coast to a stop. <kbd>WASD</kbd> / arrow keys still work.</li>
      <li><strong>Mobile:</strong> touch and drag anywhere over the water that is not a button. A minimal transparent joystick appears only after dragging and disappears on release. The left-side CRUISE button retains your heading after release; the large left USE button salvages while you steer.</li>
      <li><kbd>Space</kbd> / hold <strong>BOOST</strong>: requires Mk I magnetic thrusters. Mk I / II / III / IV offer 3 / 4 / 5 / 6 seconds of boost and progressively faster boosted speeds. Costs battery and boost charge. Charge recovers after 1.5 seconds; a fully emptied meter locks until full. Release to rearm. Boost is loud even with passive Silent Drive insulation. Battery upgrades reduce its power drain and speed up recharge.</li>
      <li><kbd>Q</kbd> / <strong>PING</strong>: a sonar wave sweeps the entire current screen. Salvage, recorders, caches, predators, rocks, wrecks, vents and walls appear as fading echoes <strong>when the wave reaches them</strong>, even with lights off. It uses power, alerts reached predators and has a visible cooldown. It does not light up the water permanently.</li>
      <li><kbd>E</kbd> / <strong>USE</strong>: recover crystals, recorders and caches, or dock to bank cargo, refill systems and upgrade. Scrap collects automatically within 6 m, extending to 10 / 14 / 18 / 22 m with the Salvage Magnet. Remote pickups require visibility, a clear path and power. <kbd>R</kbd> repairs 30 hull for 2 scrap. <kbd>L</kbd> toggles lights on PC; on touch, use the FLASHLIGHT switch in the top sliders/telemetry panel. Small joystick drags or holding the mouse near the submarine give slower, quieter movement. Silent Drive insulation works passively. Releasing the helm stops thrust; there is no cruise or silent toggle.</li>
      <li>The water darkens gradually to total darkness at <strong>1,000 m</strong>. Only your forward lamp and temporary sonar echoes reveal the surroundings. Vessel name, class and pressure limit are pinned to the top of the screen, alongside depth and systems. The pressure tab turns red beyond your rating.</li>
      <li><kbd>F</kbd> / <strong>MINE</strong>: drop one proximity mine astern while steering or boosting. It arms after 0.65 seconds, then damages predators within its blast radius without harming your submarine. Mines remain until triggered, docking resets the field, or this expedition ends. The launcher cycles for 1.1 seconds; hold does not auto-fire. If the stern is obstructed, no ammo is spent.</li>
      <li><strong>Harbour and surface:</strong> the marked approach protects against predators, not low oxygen, power loss or rocks. USE / E secures the sub in its berth. Build upward speed to breach the surface; boost makes a higher leap. Momentum and gravity carry the arc, with no thrust in the air. Splashdowns do not damage the hull. Upgrade tiles show your fitted mark and turn gold at maximum tier.</li>
      <li><strong>Dock ordnance:</strong> buy Mk I warheads to unlock mines, then upgrade damage separately from the ammo rack. Warheads deal 60 / 110 / 180 / 240 damage; racks hold <strong>2 / 4 / 6 / 8 mines</strong>. The two-slot Mk I rack comes fitted. Buy mine rounds for 18 credits each in the dock AMMUNITION tab. Docking, launch, upgrades and reload do not grant ammunition. Defeat instead replaces your stock with exactly 10 rail rounds, 3 torpedoes and 3 mines; unfitted weapons stay locked.</li>
      <li><strong>Three threat tiers:</strong> common blue drifters; rarer purple stalkers below 400 m; rare crimson reapers below 800 m. Base health is 100 / 200 / 400 HP; later campaign levels scale health and damage upward. Reaper chase speed matches Mk IV magnetic thrusters exactly: normal thrust cannot pull away in open water. Boost to create distance, or leave mines in its path. All tiers retain finite pursuit ranges. Health bars respect darkness and sonar visibility.</li>
      <li><strong>Exploration:</strong> mobile sees 43% farther in each direction; PC zoom is unchanged. The trench is three times wider, with more obstacles and hunters but fewer salvage pieces and much rarer crystals. The three clear navigation lanes keep descent routes open.</li>
      <li><strong>Life support and reserve propulsion:</strong> base oxygen lasts 5:33, with recycler upgrades increasing capacity and efficiency. Boost and sonar are the main battery demands. Below 0.5 power, normal thrust falls to half your fitted thruster speed; boost and sonar need power. Rare yellow battery cells automatically restore up to 25 power within 6 m, with a clear path. Full batteries leave them untouched. Spent cells recover after 8 active dive minutes, out of view, at most one per 90 seconds per visited level. Harbour waiting, pause and offline time do not count. Crystals never respawn.</li>
      <li><strong>Flashlight Mk I–IV:</strong> the standard Mk I lamp reaches 26 m. Dock upgrades extend this to 36 / 48 / 62 m and widen the beam. The lamp draws power slowly only while on; battery upgrades improve efficiency. Switch it off with <kbd>L</kbd> / LIGHTS to conserve energy.</li>
      <li><strong>Adaptive ship systems:</strong> the Salvage Magnet automatically collects visible scrap and predator drops at range, at a small power cost. Crystals still require USE / hold E. It cannot recover through rocks or fetch distant recorders/caches. The Kinetic Shield absorbs bites, rock impacts, contact-mine blasts and hot vent damage, but not pressure or oxygen loss; recharge starts after 8 seconds without impacts, uses battery power and pauses during boost. The Sonic Disruptor adds a short stun to nearby predators on sonar-wave arrival, with shorter stuns for stronger tiers. Low battery falls back to a normal scan.</li>
      <li><strong>Persistent campaign resources:</strong> crystals are placed once and never respawn. Scrap regenerates at its original sites: after a five-minute recovery, at most one deposit per 45 active dive seconds per visited level. Recovery pauses in menus, at the harbour and offline, and never creates a deposit in the current view. Each campaign slot has independent timers. Scrap and crystal deposits each yield 2 units. Across five fresh levels, the initial stock provides 15,192 credits worth of scrap and 496 finite crystals. Renewable scrap supports future purchases. Upgrade credit prices are 50% higher; crystal prices are unchanged. Scrap banks at 18 credits per unit; crystals stay a separate currency. All paid ship upgrades cost both. If an optional purchase would consume the last crystals needed for the current recorder gate, the shop reserves them for the hull instead. Predators drop 2 / 4 / 8 scrap when destroyed; collect and dock to bank it. Predators and supply caches refresh on a genuine return to dock after departure. Drops persist until collected. Secured recorders never respawn. Lost or deliberately quit dives leave persistent recovery sites containing all unbanked scrap, crystals and recorders. Recover with E / USE and dock to bank the cargo. Old recovery sites are never erased by a later death. Defeat replaces ammunition with exactly 10 rail rounds, 3 torpedoes and 3 mines; unfitted weapons stay locked. The basic two-slot mine rack may temporarily carry the third emergency mine. Quitting and normal dock visits do not grant this loadout. Active dives now autosave every five simulation seconds and after important actions. Continue restores the ship, cargo, enemies, mines and timers paused. Explicit QUIT or defeat still creates a recovery pod. Twenty achievements are available from the main and pause menus. Each of the three campaign slots has independent levels, achievements and progress.</li>
      <li><strong>Forgotten Giants:</strong> explore optional large wrecks in side chambers. USE recovers an identification plate; bank it to unlock a hull finish in Lost Signals → Discoveries. Sonar identifies service panels; USE opens a permanent shortcut. Unbanked plates remain in your recovery wreck after death. Cyan brackets show the likely rail target; amber pointers show the likely torpedo target, only while visible.</li>
      <li><strong>Exploration systems:</strong> each level has its own seeded scenery, landmark silhouettes and visible current bands. The harbour and central route are sheltered. All scenery respects total darkness. Press <kbd>M</kbd> or the map icon for a paused, permanent survey chart; drag to pan, pinch or use +/− to zoom, and tap surveyed water to set a waypoint. Resources are charted only after discovery and predator contacts expire. The sliders icon opens detailed vessel telemetry. Sound settings are in the main and pause menus.</li>
      <li><strong>Abandoned contact mines:</strong> rusty horned spheres sway on chains. Touching one detonates it, harming nearby predators and the submarine. Your own deployed mines remain safe to the ship. Sonar reveals the tether and the chart remembers the hazard. Cleared contact mines never return, even after docking. The harbour, central route, fixed deposits, recorder approaches and recovery pods are kept clear.</li>
      <li><strong>Wildlife:</strong> Silver Darts, Sunstripe Reeflets, Ribbonfins and Violet Glassfish form harmless schools. Gentle piloting parts the school; boost, nearby predators and passing sonar scatter it before it regroups. Fish cannot be collected and do not clutter the chart. Anemones, fan corals, crabs and tube colonies react to lights, movement and currents.</li>
      <li><strong>Vent fields:</strong> rising bubbles and a rumble warn for three seconds before a three-second plume. Active vents push the ship and predators upward. Sunbreak Shelf bubble seeps are harmless; hotter vents in later levels damage the ship while inside. Wait for a quiet phase or take a different route. The chart records discovered vents, not their live phase. New scenery never defeats darkness.</li>
      <li><strong>Guided weapons:</strong> hold <kbd>Z</kbd> / the top weapon icon for railgun bolts; tap <kbd>X</kbd> / the lower-left weapon icon for one explosive torpedo. Railgun is at the top of the weapon triangle, torpedo below-left and mine below-right. Inner rings show ammunition; outer rings show firing cooldowns. Exact stocks and timers appear in the circular desktop keybind rail; on mobile use telemetry (the sliders icon). Rail bolts gently correct toward predators within 32° of the bow; torpedoes turn more strongly within 65°. Both lead moving targets, stop at rock and need Mk I fitted at the dock. Armed player mines slowly seek predators within 20 m, staying within 24 m of their drop point. No extra aiming button is needed. Each upgrade increases damage and magazine capacity. All rounds are bought in the dock Ammunition tab: rail 6 CR, torpedo 24 CR, mine 18 CR each. Docking, upgrades, waiting and loading never grant ammunition. Death replaces your stock with exactly 10 rail rounds, 3 torpedoes and 3 mines.</li>
      <li><strong>Environmental sound:</strong> nearby chains, vents, kelp, school movement, wreck groans and harbour machinery use the ambience slider. Explosions, docking clamps and interaction sounds use effects. Mute and both volume controls remain in SOUND SETTINGS; visible hazard warnings work without audio.</li>
      <li><kbd>Esc</kbd> / <strong>PAUSE</strong> freezes the dive. MENU saves it across sessions; QUIT abandons the dive and leaves a recovery pod. CAMPAIGN SLOTS keeps up to three independent games. New Game selects an empty slot; only confirmed deletion removes an occupied slot. Reloading preserves the last successful active-dive snapshot. Continue restores paused; the ocean does not advance while you are away. Clearing browser data still removes local saves.</li>
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
    buildDesktopActions();syncInputMode();bindLivingUI();bindSlots();bindWeaponInputs();bindSignalsUI();
    const cockpitObserver=new ResizeObserver(syncCockpitLayout);
    for(const node of [canvas.parentElement,...document.querySelectorAll('.cockpit-hud,.mobile-controls,.desktop-keybinds')])cockpitObserver.observe(node);
    primaryPointer.addEventListener('change',()=>{resetPilotInput();syncInputMode();resize();syncCockpitLayout();updateUI();});
    $('menuAchievementsBtn').addEventListener('click',showAchievements);$('pauseAchievementsBtn').addEventListener('click',showAchievements);
    $('achievementClose').addEventListener('click',closeAchievements);$('achievementsDialog').addEventListener('cancel',e=>{e.preventDefault();closeAchievements();});
    $('menuHubBtn').addEventListener('click',()=>{if(running||loadedActive)return;launchDive();showDock('expeditions');});
    $('startBtn').addEventListener('click',()=>{
      if(running)resumeDive();else if(loadedActive)restoreActiveDive();else launchDive();
    });
    $('newGameBtn').addEventListener('click',newGameConfirmation);
    $('resumeBtn').addEventListener('click',resumeDive);
    $('pauseMenuBtn').addEventListener('click',()=>returnToMenu(true));
    $('quitBtn').addEventListener('click',quitDiveConfirmation);
    $('focusToggleBtn').addEventListener('click',()=>{closeExplorerDialog('telemetryDialog');toggleFocusMode();});
    $('focusHelpBtn').addEventListener('click',()=>{closeExplorerDialog('telemetryDialog');briefing();});
    $('focusPauseBtn').addEventListener('click',togglePause);
    document.addEventListener('fullscreenchange',()=>{resize();});
    $('helpBtn').addEventListener('click',briefing);$('instructionsBtn').addEventListener('click',briefing);
    $('modalClose').addEventListener('click',closeDialog);
    $('upgradeDetailClose').addEventListener('click',()=>closeUpgradeDetails());
    $('upgradeDialog').addEventListener('cancel',e=>{e.preventDefault();closeUpgradeDetails();});
    $('upgradeDialog').addEventListener('click',e=>{
      const r=$('upgradeDialog').getBoundingClientRect();
      if(e.target===$('upgradeDialog')&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom))closeUpgradeDetails();
    });
    $('pauseBtn').addEventListener('click',togglePause);
    $('dockBtn').addEventListener('click',()=>{if(running&&!paused&&nearestInteractable()?.type==='station')depositAndDock();});
    window.addEventListener('keydown',e=>{
      if($('signalsDialog').open||$('surveyDialog').open||$('audioDialog').open||$('telemetryDialog').open)return;
      if($('achievementsDialog').open||$('slotsDialog').open)return;
      const k=e.key.toLowerCase();
      if($('upgradeDialog').open){if(k==='escape'){e.preventDefault();closeUpgradeDetails();}return;}
      if(k==='tab'&&!$('modalOverlay').classList.contains('hidden')){
        const controls=[...$('modalOverlay').querySelectorAll('button:not(:disabled),[tabindex="0"]')].filter(n=>n.getClientRects().length&&n.tabIndex>=0);
        if(controls.length){const first=controls[0],last=controls[controls.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
        return;
      }
      if(e.target instanceof Element&&e.target.closest('input,textarea,select,[contenteditable="true"]'))return;
      if(k==='j'&&!e.repeat){e.preventDefault();openJournal();return;}
      if(k==='m'&&running&&!e.repeat){e.preventDefault();openSurvey();return;}
      if(k==='escape'){if(!e.repeat)togglePause();return;}
      if(!running||paused)return;
      if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();
      if(e.repeat)return;
      keys.add(k);
      if(k==='q')scan();else if(k==='e')interact();else if(k==='r')repair();else if(k==='l')toggleLights();else if(k==='f')deployMine();else if(k==='z')fireWeapon('railgun');else if(k==='x')fireWeapon('torpedo');
    });
    window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur',backgroundPause);
    document.addEventListener('visibilitychange',()=>{if(document.hidden)backgroundPause();});
    window.addEventListener('pagehide',backgroundPause);
    canvas.addEventListener('pointerdown',e=>{
      if(e.pointerType==='touch'||e.button!==0||mouseHelm.pointerId!==null||!running||paused)return;
      e.preventDefault();resetJoystick();canvas.focus({preventScroll:true});
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
    const releaseStick=e=>{if(e.pointerId===joystick.pointerId){e.preventDefault();resetJoystick();}};
    canvas.addEventListener('pointerup',releaseStick);canvas.addEventListener('pointercancel',releaseStick);
    canvas.addEventListener('lostpointercapture',releaseStick);
    window.addEventListener('pointerup',releaseStick);window.addEventListener('pointercancel',releaseStick);
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
    $('mobileRepair').addEventListener('click',repair);
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
    $('joystickThumb').style.transform=`translate3d(${dx/(d||1)*amount*joystick.radius}px,${dy/(d||1)*amount*joystick.radius}px,0)`;
  }
  function resetJoystick(){
    const id=joystick.pointerId;joystick.pointerId=null;joystick.x=0;joystick.y=0;
    if(id!==null&&canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);
    $('mobileJoystick').classList.remove('engaged');
    $('joystickThumb').style.transform='translate3d(0,0,0)';

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
  // === Delta Helm / atomic active-expedition snapshots ===
  function validateActiveDive(value){
    if(!value||value.schema!==1||!LEVELS.some(l=>l.id===value.levelId)||!Number.isInteger(value.seed)||!Number.isInteger(value.cycle)||!Number.isFinite(value.clock)||value.clock<0)return null;
    const p=value.player,l=LEVELS.find(l=>l.id===value.levelId),bottom=120+l.depth*10;
    const finite=keys=>keys.every(k=>Number.isFinite(p?.[k]));
    if(!finite(['x','y','vx','vy','facing','hull','oxygen','battery','boost','mineAmmo'])||p.hull<=0||p.x<SURVEY.minX||p.x>SURVEY.maxX||p.y<-2000||p.y>bottom+10)return null;
    if(p.cargo?.plates!==undefined&&(!Array.isArray(p.cargo.plates)||GIANTS.plates(p.cargo.plates).length!==p.cargo.plates.length))return null;
    if(!p.cargo||!['scrap','crystal'].every(k=>Number.isInteger(p.cargo[k])&&p.cargo[k]>=0)||!Array.isArray(p.cargo.recorders)||!p.cargo.recorders.every(i=>Number.isInteger(i)&&i>=0&&i<l.recorders.length))return null;
    for(const key of ['items','predators','mines','blasts','waves','echoes','terrain'])if(!Array.isArray(value[key])||value[key].length>6000)return null;
    const point=o=>o&&Number.isFinite(o.x)&&Number.isFinite(o.y)&&Math.abs(o.x)<5000&&Math.abs(o.y)<20000;
    if(!value.items.every(o=>point(o)&&['scrap','crystal','recorder','recovery','air','battery'].includes(o.type)))return null;
    if(!value.predators.every(o=>point(o)&&Number.isFinite(o.health)&&PREDATOR_TIERS[o.tier]))return null;
    if(!value.mines.every(o=>point(o)&&Number.isFinite(o.armedAt)&&Number.isFinite(o.damage)&&o.damage>=0&&validGuidanceState(o)))return null;
    if(!value.waves.every(o=>point(o)&&Number.isFinite(o.birth)&&Number.isFinite(o.radius)&&Array.isArray(o.contacts)))return null;
    if(value.projectiles!==undefined&&(!Array.isArray(value.projectiles)||value.projectiles.length>200||!value.projectiles.every(o=>point(o)&&WEAPONS[o.kind]&&['vx','vy','damage','remaining','radius'].every(k=>Number.isFinite(o[k]))&&o.damage>0&&o.remaining>=0&&validGuidanceState(o))))return null;
    if(p.weaponAmmo&&Object.keys(WEAPONS).some(id=>p.weaponAmmo[id]!==saved.weaponAmmo[id]))return null;
    return value;
  }
  function captureActiveDive(){
    // Only JSON-safe scalar state crosses the storage boundary. Sonar references
    // become stable collection indices, then are rebound after world generation.
    const waves=sonarWaves.map(({contacts,...wave})=>({...wave,contacts:contacts.map(c=>({kind:c.kind,hit:c.hit,previousDistance:c.previousDistance,
      index:scene[c.kind]?.indexOf(c.object)??-1,objectId:['giantObjects','rescueObjects'].includes(c.kind)?c.object.id:undefined,object:['wall','floor'].includes(c.kind)?c.object:null}))}));
    const terrain=[];for(const kind of ['rocks','wrecks','vents','landmarks','derelictMines','ventFields','schools','giantObjects','rescueObjects'])(scene[kind]||[]).forEach((o,i)=>{if(o.revealUntil>clock)terrain.push({kind,i,objectId:['giantObjects','rescueObjects'].includes(kind)?o.id:undefined,revealUntil:o.revealUntil,echoDuration:o.echoDuration});});
    return {schema:1,build:BUILD.version,levelId:LEVEL_ID,seed:field.seed,cycle:field.cycle,clock,idCounter,dockVisitActive,
      player:{...player},projectiles:scene.projectiles||[],items:scene.items,predators:scene.predators,mines:scene.mines,blasts:scene.blasts,waves,echoes:sonarTerrainEchoes,terrain,
      events:eventLines.slice(0,3),signals:scene.signals,threatContacts:surveyThreats,surfaceEffects,wildlife:captureWildlife()};
  }
  function restoreActiveDive(){
    const snapshot=loadedActive;if(!snapshot)return false;
    pickupNotices=[];
    buildingWorld=true;running=false;
    LEVEL_ID=snapshot.levelId;field=campaignLevels[LEVEL_ID];applyLevelGeometry();createWorld();
    clock=snapshot.clock;idCounter=Math.max(cleanCount(snapshot.idCounter),scene.items.length+1);
    player=JSON.parse(JSON.stringify(snapshot.player));player.cargo.plates=GIANTS.plates(player.cargo.plates);player.trip=player.trip||{deepest:depthOf(player.y),hullDamage:0};
    scene.items=JSON.parse(JSON.stringify(snapshot.items));syncBatteryCellItems();scene.predators=JSON.parse(JSON.stringify(snapshot.predators));
    if(Array.isArray(snapshot.signals)&&snapshot.signals.length<=5)scene.signals=JSON.parse(JSON.stringify(snapshot.signals));
    scene.mines=JSON.parse(JSON.stringify(snapshot.mines)).filter(m=>!m.detonated);scene.blasts=JSON.parse(JSON.stringify(snapshot.blasts));
    player.weaponAmmo={...saved.weaponAmmo};player.weaponCooldown={railgun:0,torpedo:0,...player.weaponCooldown};
    player.damageFlashUntil=Number.isFinite(player.damageFlashUntil)?player.damageFlashUntil:0;
    player.nextDamageFlash=Number.isFinite(player.nextDamageFlash)?player.nextDamageFlash:0;
    scene.projectiles=Array.isArray(snapshot.projectiles)?JSON.parse(JSON.stringify(snapshot.projectiles)):[];
    initialisePredatorBehaviours();syncGiantObjects();
    restoreWildlife(snapshot.wildlife);for(const m of scene.derelictMines||[])Object.assign(m,mineLocation(m));
    for(const t of snapshot.terrain){const o=['giantObjects','rescueObjects'].includes(t.kind)&&t.objectId?scene[t.kind].find(o=>o.id===t.objectId):scene[t.kind]?.[t.i];if(o){o.revealUntil=t.revealUntil;o.echoDuration=t.echoDuration;}}
    sonarTerrainEchoes=JSON.parse(JSON.stringify(snapshot.echoes));
    sonarWaves=snapshot.waves.map(w=>({...w,contacts:w.contacts.map(c=>({...c,object:['wall','floor'].includes(c.kind)?c.object:['giantObjects','rescueObjects'].includes(c.kind)&&c.objectId?scene[c.kind].find(o=>o.id===c.objectId):scene[c.kind]?.[c.index]})).filter(c=>c.object)}));
    surfaceEffects=Array.isArray(snapshot.surfaceEffects)?snapshot.surfaceEffects:[];
    surveyThreats=Array.isArray(snapshot.threatContacts)?snapshot.threatContacts.filter(c=>Number.isFinite(c.until)&&c.until>clock):[];
    dockVisitActive=snapshot.dockVisitActive===true;eventLines=Array.isArray(snapshot.events)?snapshot.events.slice(0,3):[];
    loadedActive=null;buildingWorld=false;running=true;paused=true;showingDock=false;
    resetPilotInput();delete player.quiet;player.boosting=false;
    camera={x:player.x-viewport.w/2,y:player.y-viewport.h*.52};
    ['menuOverlay','modalOverlay'].forEach(id=>$(id).classList.add('hidden'));
    enterMobileCockpit();showPause();$('pauseTitle').textContent='EXPEDITION RESTORED';
    addEvent('Dive restored safely paused · no elapsed-time simulation');persist();updateUI();render();return true;
  }
  function advanceSimulation(dt){
    try{update(dt);}finally{
      simulationStepping=false;
      if(saveRequested){saveRequested=false;persist();}
    }
  }
  function backgroundPause(){
    if(slotTransition)return;
    resetPilotInput();
    const explorerOpen=document.querySelector('#surveyDialog[open],#audioDialog[open],#telemetryDialog[open],#signalsDialog[open],#rescueDialog[open]');
    if(explorerOpen){explorerReturnPause=true;if(running&&$('menuOverlay').classList.contains('hidden'))showPause();}
    if(running&&!paused&&$('menuOverlay').classList.contains('hidden'))showPause();
    else if(running)paused=true;
    checkAchievements();persist();window.AbyssAudio?.suspend();
  }

  // === Forgotten Giants: persistent optional interiors, never relocated loot ===
  function giantBoundary(y,side){
    const base=side<0?baseLeftAt(y):baseRightAt(y);
    if(!giantSite||giantSite.side!==side)return base;
    const d=Math.abs(y-giantSite.y),flat=giantSite.h/2+115;
    if(d>=flat+190)return base;
    const mix=1-smoothstep(flat,flat+190,d);
    const outer=giantSite.x+side*(giantSite.w/2+110);
    return lerp(base,side<0?Math.min(base,outer):Math.max(base,outer),mix);
  }
  function giantWalls(){return giantSite?giantWallCache:[];}
  function collisionPolygons(){return giantSite?scene.rocks.concat(giantWallCache):scene.rocks;}
  function giantSolid(x,y,radius=0){
    if(!giantSite||Math.abs(x-giantSite.x)>giantSite.w/2+radius+10||Math.abs(y-giantSite.y)>giantSite.h/2+radius+10)return false;
    return giantWallCache.some(w=>x>w.left-radius&&x<w.right+radius&&y>w.top-radius&&y<w.bottom+radius);
  }
  function giantLocal(x,y){return {x:giantSite.x+x*giantSite.direction,y:giantSite.y+y};}
  function giantSiteState(id=giantSite?.id){
    if(!id)return null;
    return giants.sites[id]||(giants.sites[id]={discovered:false,scanned:false,opened:false});
  }
  function plateInRecovery(id){return Object.values(campaignLevels).some(f=>f.recoveries.some(r=>r.plates?.includes(id)));}
  function plateCarried(id){return Boolean(player?.cargo?.plates?.includes(id)||loadedActive?.player?.cargo?.plates?.includes(id));}
  function buildGiants(){
    const def=GIANTS.vessels.find(v=>v.level===LEVEL_ID);
    giantSite=null;giantWallCache=[];scene.giantObjects=[];
    if(!def)return;
    const y=120+def.depth*10,span=def.h/2+125;
    const edges=[];for(let dy=-span;dy<=span;dy+=10)edges.push(def.side<0?baseLeftAt(y+dy):baseRightAt(y+dy));
    // The full hull is beyond the old canyon boundary, not over old rocks or
    // collectibles. A broad, feathered annex connects it to the original water.
    const edge=def.side<0?Math.min(...edges):Math.max(...edges);
    giantSite={...def,x:edge+def.side*(def.w/2+100),y,direction:-def.side};
    giantSite.entry=giantLocal(def.w/2+48,0);
    giantSite.panel=giantLocal(def.w*.29,def.h*.23);
    giantSite.plate=giantLocal(-def.w*.21,-def.h*.28);
    giantSiteState();rebuildGiantWalls();syncGiantObjects();
  }
  function rebuildGiantWalls(){
    giantWallCache=[];if(!giantSite)return;
    const {w,h}=giantSite,state=giantSiteState(),t=16;
    const add=(name,l,top,r,bottom,gate=false)=>{
      const a=giantLocal(l,top),b=giantLocal(r,bottom),left=Math.min(a.x,b.x),right=Math.max(a.x,b.x);
      const x=(left+right)/2,y=(a.y+b.y)/2;
      giantWallCache.push({id:'giant-wall-'+giantSite.id+'-'+name,x,y,left,right,top:a.y,bottom:b.y,
        radius:Math.hypot(right-left,b.y-a.y)/2,gate,
        vertices:[{x:left,y:a.y},{x:right,y:a.y},{x:right,y:b.y},{x:left,y:b.y}]});
    };
    // Four generous exits. The plate is accessible by the long port passage
    // even before releasing the central shortcut; no ammunition toll or trap.
    add('roof-a',-w/2,-h/2,-85,-h/2+t);add('roof-b',85,-h/2,w/2,-h/2+t);
    add('floor-a',-w/2,h/2-t,-80,h/2);add('floor-b',80,h/2-t,w/2,h/2);
    add('stern-a',-w/2,-h/2,-w/2+t,-75);add('stern-b',-w/2,75,-w/2+t,h/2);
    add('bow-a',w/2-t,-h/2,w/2,-75);add('bow-b',w/2-t,75,w/2,h/2);
    add('deck-a',-w/2+135,-25,-78,-9);add('deck-b',78,-25,w/2-16,-9);
    if(!state.opened)add('service-door',-78,-25,78,-9,true);
    // Isolated equipment blocks create rooms without narrowing exit clearances.
    add('plant',-w*.24,h*.13,-w*.12,h*.24);
    if(w>=760)add('relay',w*.22,-h*.34,w*.33,-h*.23);
  }
  function syncGiantObjects(){
    if(!giantSite){scene.giantObjects=[];return;}
    const old=new Map((scene.giantObjects||[]).map(o=>[o.id,o])),v=giantSite;
    const objects=[{...v.entry,id:'giant-'+v.id,kind:'wreck',name:v.name},
      {...v.panel,id:'giant-panel-'+v.id,kind:'panel',name:'SERVICE RELEASE'}];
    if(!giants.banked.includes(v.id)&&!plateInRecovery(v.id)&&!plateCarried(v.id)&&!field.pendingCargo?.plates?.includes(v.id))objects.push({...v.plate,id:'giant-plate-'+v.id,kind:'plate',name:v.name+' / IDENTIFICATION'});
    for(const wall of giantWallCache)objects.push({x:wall.x,y:wall.y,id:wall.id,kind:'structure',wallId:wall.id});
    scene.giantObjects=objects.map(o=>({...o,type:'giant',vesselId:v.id,collected:false,revealUntil:old.get(o.id)?.revealUntil||0,echoDuration:old.get(o.id)?.echoDuration||0}));
  }
  function nearestGiantObject(){
    if(!player||player.airborne||!giantSite)return null;
    return (scene.giantObjects||[]).filter(o=>['panel','plate'].includes(o.kind)&&!o.collected&&distance(player,o)<60&&clearSalvageLine(o))
      .sort((a,b)=>distance(player,a)-distance(player,b))[0]||null;
  }
  function giantWave(object){
    if(!giantSite)return;
    const state=giantSiteState();state.discovered=true;
    if(object.kind==='panel'&&!state.scanned){state.scanned=true;announce('SERVICE CIRCUIT IDENTIFIED · APPROACH PANEL AND USE',3);window.AbyssAudio?.event('survey');persist();}
  }
  function interactGiantObject(object){
    if(!running||paused||!giantSite||object.collected||distance(player,object)>=60||!clearSalvageLine(object))return false;
    const state=giantSiteState();state.discovered=true;
    if(object.kind==='panel'){
      if(state.opened){announce('SERVICE SHORTCUT OPEN · NO POWER REQUIRED',2);return false;}
      if(!state.scanned){announce('SCAN WITH SONAR TO IDENTIFY THE SERVICE CIRCUIT',2.5);return false;}
      state.opened=true;rebuildGiantWalls();syncGiantObjects();window.AbyssAudio?.event('dock');announce('BULKHEAD RELEASED · SHORTCUT PERMANENTLY OPEN',3);
      addEvent(giantSite.name+' service passage opened');checkAchievements();
    }else if(object.kind==='plate'){
      if(giants.banked.includes(giantSite.id)||plateInRecovery(giantSite.id)||plateCarried(giantSite.id))return false;
      player.cargo.plates=GIANTS.plates([...(player.cargo.plates||[]),giantSite.id]);object.collected=true;
      rememberGiantObject(object);window.AbyssAudio?.event('recorder');pickupNotice('plate',1);
      addEvent(giantSite.name+' identification recovered');syncGiantObjects();
    }else return false;
    persist();updateUI();return true;
  }
  function bankGiantPlates(){
    const plates=GIANTS.plates(player.cargo.plates).filter(id=>!giants.banked.includes(id));
    if(!plates.length)return;
    for(const id of plates){giants.banked.push(id);const v=GIANTS.vessels.find(v=>v.id===id);giantSiteState(id).discovered=true;addEvent(v.name+' archived · '+v.finish+' finish unlocked');}
    window.AbyssAudio?.event('recorder');announce('DISCOVERY ARCHIVED · NEW HULL FINISH UNLOCKED',4);
  }
  function rememberGiantObject(object){
    if(!giantSite)return;
    const state=giantSiteState();state.discovered=true;
    const v=giantSite;
    field.survey.contacts['giants:'+v.id]={...v.entry,type:'giant',label:v.name,collected:giants.banked.includes(v.id)};
    if(object.kind==='plate')field.survey.contacts['plates:'+v.id]={x:object.x,y:object.y,type:'plate',label:'IDENTIFICATION PLATE',collected:object.collected||plateCarried(v.id)||giants.banked.includes(v.id)||plateInRecovery(v.id)};
  }
  function renderDiscoveries(target){
    const finishes=[{id:'standard',name:'NEREID / STANDARD'},...(signals.warden.claimed?[{id:'hunter',name:'WARDEN HUNTER'}]:[]),...GIANTS.vessels.filter(v=>giants.banked.includes(v.id)).map(v=>({id:v.id,name:v.finish}))];
    const equipped=giants.livery!=='standard'?giants.livery:signals.warden.livery==='hunter'&&signals.warden.claimed?'hunter':'standard';
    target.innerHTML='<section class="discovery-intro"><span class="menu-kicker">FORGOTTEN GIANTS / DISCOVERY ARCHIVE</span><h3>Names worth bringing home.</h3><p>Explore five optional interiors. Recover each identification plate with USE and bank it to unlock its history and a cosmetic hull finish. No credits or crystals are required.</p><div class="discovery-summary"><strong>'+giants.banked.length+' / 5 ARCHIVED</strong><label>HULL FINISH<select id="discoveryLivery">'+finishes.map(f=>'<option value="'+f.id+'" '+(equipped===f.id?'selected':'')+'>'+f.name+'</option>').join('')+'</select></label></div></section><div class="discovery-grid">'+GIANTS.vessels.map((v,index)=>{
      const state=giants.sites[v.id],banked=giants.banked.includes(v.id),carried=plateCarried(v.id),lost=plateInRecovery(v.id),unlocked=levelUnlocked(index);
      const status=banked?'ARCHIVED':carried?'PLATE ABOARD':lost?'IN RECOVERY WRECK':state?.discovered?'SURVEYED':'UNEXPLORED';
      const statusText=banked?'HULL FINISH UNLOCKED':carried?'Return safely to the harbour.':lost?'Follow the amber recovery beacon to retrieve the plate.':state?.scanned?'Service circuit surveyed. USE the panel to open the shortcut.':'Sonar can identify a working service release inside.';
      return '<article class="discovery-card '+(banked?'is-archived':'')+'" style="--wreck-accent:'+v.color+'"><div class="wreck-silhouette wreck-shape-'+index+'" aria-hidden="true"><i></i><b></b><em>0'+(index+1)+'</em></div><header><span class="discovery-status">'+status+'</span><h4>'+v.name+'</h4><small>'+v.kind+'</small></header><div class="discovery-meta">'+LEVELS[index].name+' · '+v.depth.toLocaleString('en-GB')+' m · '+(v.side<0?'WESTERN':'EASTERN')+' WALL</div><p>'+(banked?escapeHTML(v.story):unlocked?'A large return on the edge of the chart. Wide entrances lead into flooded rooms and a permanent service shortcut. Investigating is optional.':'Unlock this destination to investigate its missing vessel.')+'</p><p class="discovery-note">'+statusText+'</p><footer><span class="finish-swatch" style="--finish:'+v.palette[1]+'"></span><span>'+v.finish+'</span>'+(state?.discovered&&running&&LEVEL_ID===v.level?'<button data-pin-giant="'+v.id+'" class="discovery-pin">PIN ENTRANCE</button>':'')+'</footer></article>';
    }).join('')+'</div>';
    $('discoveryLivery').onchange=e=>{
      const id=e.target.value;giants.livery=giants.banked.includes(id)?id:'standard';signals.warden.livery=id==='hunter'&&signals.warden.claimed?'hunter':'standard';persist();render();
    };
    target.querySelectorAll('[data-pin-giant]').forEach(b=>b.onclick=()=>{if(giantSite?.id!==b.dataset.pinGiant)return;field.survey.waypoint={...giantSite.entry};persist();b.textContent='ENTRANCE PINNED';});
  }
  function drawGiants(){
    if(!giantSite||!onscreen(giantSite.x,giantSite.y,giantSite.w/2+100))return;
    const v=giantSite,{w,h}=v,state=giantSiteState();
    ctx.save();ctx.translate(v.x,v.y);ctx.scale(v.direction,1);
    // A recessed rear shell gives the flooded cutaway a vessel silhouette.
    // These dim lines are distant plating, not additional collision surfaces.
    ctx.save();ctx.globalAlpha=.7;
    const shell=ctx.createLinearGradient(0,-h*.65,0,h*.66);shell.addColorStop(0,'#254654');shell.addColorStop(.5,'#102932');shell.addColorStop(1,'#081820');
    ctx.fillStyle=shell;ctx.strokeStyle=v.color+'4b';ctx.lineWidth=2.4;
    ctx.beginPath();ctx.moveTo(-w/2-20,-h*.37);ctx.quadraticCurveTo(-w/2-65,0,-w/2-20,h*.38);
    ctx.bezierCurveTo(-w*.3,h*.63,w*.25,h*.62,w/2+30,h*.27);ctx.lineTo(w/2+52,-h*.1);
    ctx.quadraticCurveTo(w*.38,-h*.51,w*.21,-h*.51);ctx.lineTo(-w*.29,-h*.51);ctx.closePath();ctx.fill();ctx.stroke();
    // The bridge and broken mast are silhouetted behind the upper deck.
    const bridgeX=v.id==='halcyon'?w*.20:-w*.30,bridgeY=-h/2-53;
    ctx.fillStyle='#183039';ctx.strokeStyle=v.color+'65';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(bridgeX-58,-h/2+6);ctx.lineTo(bridgeX-48,bridgeY+13);ctx.lineTo(bridgeX+46,bridgeY+3);ctx.lineTo(bridgeX+66,-h/2+6);ctx.closePath();ctx.fill();ctx.stroke();
    for(let i=0;i<5;i++){ctx.fillStyle=i===3?'#31404a':'#658e9d35';ctx.fillRect(bridgeX-34+i*16,bridgeY+23,11,12);}
    ctx.strokeStyle='#66838b';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(bridgeX+5,bridgeY+5);ctx.lineTo(bridgeX+14,bridgeY-32);ctx.lineTo(bridgeX+30,bridgeY-26);ctx.moveTo(bridgeX-2,bridgeY-15);ctx.lineTo(bridgeX+26,bridgeY-12);ctx.stroke();
    // Propeller hub is visible through the broken rear shell.
    ctx.translate(-w/2-20,0);ctx.strokeStyle=v.color+'48';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,26,0,TAU);ctx.stroke();
    for(let i=0;i<4;i++){ctx.save();ctx.rotate(i*TAU/4+.4);ctx.fillStyle='#304b55';ctx.beginPath();ctx.moveTo(-3,0);ctx.bezierCurveTo(9,-15,24,-19,23,-5);ctx.lineTo(4,6);ctx.closePath();ctx.fill();ctx.restore();}ctx.restore();
    // Cutaway floor, framing, ribs and machinery are all below the darkness mask.
    const interior=ctx.createLinearGradient(0,-h/2,0,h/2);interior.addColorStop(0,'#0a1c28');interior.addColorStop(.5,'#132f3a');interior.addColorStop(1,'#071923');
    ctx.fillStyle=interior;ctx.beginPath();ctx.roundRect(-w/2,-h/2,w,h,24);ctx.fill();
    ctx.strokeStyle=v.color+'1b';ctx.lineWidth=1;
    for(let x=-w/2+36;x<w/2-20;x+=43){ctx.beginPath();ctx.moveTo(x,-h/2+20);ctx.lineTo(x,h/2-20);ctx.stroke();}
    for(let y=-h/2+38;y<h/2;y+=36){ctx.beginPath();ctx.moveTo(-w/2+20,y);ctx.lineTo(w/2-20,y);ctx.stroke();}
    // Recessed deck plates, damage streaks and staggered rib brackets.
    for(let i=0;i<11;i++){
      const x=-w/2+26+i*(w-52)/10;
      ctx.strokeStyle=i%3===0?'#8b695344':v.color+'22';ctx.lineWidth=i%3===0?2:1;
      ctx.beginPath();ctx.moveTo(x,-h/2+24);ctx.lineTo(x+8,-h/2+40+(i%4)*9);ctx.stroke();
      ctx.strokeStyle='#6d959544';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x,h/2-19);ctx.lineTo(x,h/2-38);ctx.lineTo(x+12,h/2-46);ctx.stroke();
    }
    ctx.strokeStyle='#85b0ba1c';ctx.lineWidth=10;ctx.beginPath();ctx.moveTo(-w/2+25,-h*.14);ctx.lineTo(-w*.28,-h*.14);ctx.lineTo(-w*.23,-h*.30);ctx.lineTo(w*.2,-h*.30);ctx.stroke();
    ctx.strokeStyle='#668c943d';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-w*.42,h*.34);ctx.bezierCurveTo(-w*.15,h*.39,w*.05,h*.15,w*.38,h*.32);ctx.stroke();
    // Large model-specific fixtures keep the silhouettes and room layouts legible.
    if(v.id==='wayfarer'||v.id==='atlas'){
      for(let i=0;i<(v.id==='atlas'?5:3);i++){const x=-w/2+45+i*56;ctx.fillStyle=i%2?'#33414c':'#48504c';ctx.strokeStyle=v.color+'66';ctx.lineWidth=1.5;ctx.fillRect(x,h/2-53,43,30);ctx.strokeRect(x,h/2-53,43,30);ctx.beginPath();ctx.moveTo(x+5,h/2-48);ctx.lineTo(x+38,h/2-28);ctx.stroke();}
    }else if(v.id==='prospector-nine'){
      for(let i=0;i<4;i++){const x=-w/2+60+i*57;ctx.strokeStyle='#c6a95866';ctx.fillStyle='#25343b';ctx.beginPath();ctx.arc(x,h/2-39,18,0,TAU);ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(x-10,h/2-39);ctx.lineTo(x+10,h/2-39);ctx.stroke();}
    }else if(v.id==='verdant'){
      for(let i=0;i<10;i++){const x=-w/2+28+i*66;ctx.strokeStyle=i%2?'#77be9277':'#397c7377';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x,h/2-18);ctx.bezierCurveTo(x-24,h/2-45,x+25,h/2-66,x+Math.sin(clock+i)*8,h/2-85);ctx.stroke();}
    }else{
      for(const x of [-w*.30,0,w*.30]){ctx.fillStyle='#293346';ctx.strokeStyle=v.color+'55';ctx.beginPath();ctx.roundRect(x-48,-h/2+32,96,52,16);ctx.fill();ctx.stroke();for(let i=0;i<4;i++){ctx.fillStyle='#91a1bf35';ctx.fillRect(x-37+i*20,-h/2+46,12,8);}}
    }
    // Flooded windows and torn insulation along the visible upper hull.
    for(let x=-w/2+47;x<w/2-25;x+=49){if(Math.abs(x)<90)continue;ctx.fillStyle='#94b5bf30';ctx.strokeStyle=v.color+'80';ctx.beginPath();ctx.ellipse(x,-h/2+10,10,6,0,0,TAU);ctx.fill();ctx.stroke();}
    ctx.strokeStyle='#90aeb333';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-w*.4,-h/2+28);ctx.bezierCurveTo(-w*.15,-h*.21,w*.12,-h*.29,w*.34,-h/2+28);ctx.stroke();
    ctx.restore();
    for(const wall of giantWallCache){
      ctx.fillStyle=wall.gate?'#655139':'#3b505b';ctx.strokeStyle=wall.gate?'#deb37a':v.color+'b0';ctx.lineWidth=1.7;
      ctx.beginPath();ctx.roundRect(wall.left,wall.top,wall.right-wall.left,wall.bottom-wall.top,4);ctx.fill();ctx.stroke();
      if(wall.gate){ctx.save();ctx.beginPath();ctx.rect(wall.left,wall.top,wall.right-wall.left,wall.bottom-wall.top);ctx.clip();ctx.strokeStyle='#ead18b';ctx.lineWidth=4;for(let x=wall.left-20;x<wall.right+20;x+=18){ctx.beginPath();ctx.moveTo(x,wall.bottom);ctx.lineTo(x+16,wall.top);ctx.stroke();}ctx.restore();}
      else if(wall.bottom-wall.top>20&&wall.right-wall.left>30){
        ctx.strokeStyle='#12252c';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(wall.left+6,wall.top+7);ctx.lineTo(wall.right-6,wall.bottom-7);ctx.moveTo(wall.right-6,wall.top+7);ctx.lineTo(wall.left+6,wall.bottom-7);ctx.stroke();
        ctx.fillStyle=v.color+'30';ctx.fillRect(wall.left+7,wall.top+6,Math.max(1,wall.right-wall.left-14),4);
      }
      else if(wall.right-wall.left>60){ctx.fillStyle='#bbd4d13b';for(let x=wall.left+11;x<wall.right-8;x+=36){ctx.beginPath();ctx.arc(x,wall.top+6,1.4,0,TAU);ctx.fill();}}
    }
    // World lettering is intentionally small and disappears in deep darkness.
    ctx.save();ctx.translate(v.x,v.y);ctx.font='600 11px ui-monospace,monospace';ctx.textAlign='center';ctx.fillStyle=v.color+'aa';ctx.fillText(v.name,0,-h/2+42);
    ctx.font='8px ui-monospace,monospace';ctx.fillStyle='#7b9da480';ctx.fillText(v.rooms[0],-w*.20,-h*.12);ctx.fillText(v.rooms[1],-w*.16,h*.40);ctx.fillText(v.rooms[2],w*.29,h*.43);
    ctx.restore();
    for(const o of scene.giantObjects||[]){if(!['plate','panel'].includes(o.kind)||o.collected)continue;
      ctx.save();ctx.translate(o.x,o.y);ctx.strokeStyle=o.kind==='plate'?'#f3cf88':state.opened?'#8de4bf':state.scanned?'#f4bd7a':'#81ced9';ctx.fillStyle='#102d38';ctx.lineWidth=1.7;
      const glow=ctx.createRadialGradient(0,0,1,0,0,25);glow.addColorStop(0,(o.kind==='plate'?'#f3cf88':'#81ced9')+'35');glow.addColorStop(1,'#00000000');ctx.fillStyle=glow;ctx.fillRect(-26,-26,52,52);ctx.fillStyle='#102d38';
      ctx.beginPath();ctx.roundRect(-14,-10,28,20,3);ctx.fill();ctx.stroke();ctx.beginPath();
      if(o.kind==='plate'){ctx.moveTo(-8,-3);ctx.lineTo(7,-3);ctx.moveTo(-8,3);ctx.lineTo(3,3);}
      else if(state.opened){ctx.moveTo(-8,0);ctx.lineTo(-2,5);ctx.lineTo(8,-5);}
      else{ctx.moveTo(-7,4);ctx.lineTo(0,-5);ctx.lineTo(7,4);ctx.moveTo(0,-5);ctx.lineTo(0,7);}ctx.stroke();ctx.restore();
    }
    // Restrained doorway chevrons mark traversable openings, not an opaque sign.
    ctx.save();ctx.translate(v.entry.x,v.entry.y);ctx.scale(v.direction,1);ctx.strokeStyle=v.color+'88';ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(5,-12);ctx.lineTo(-5,0);ctx.lineTo(5,12);ctx.stroke();ctx.restore();
  }
  function drawGiantEchoes(){
    if(!giantSite)return;
    ctx.save();ctx.translate(-camera.x,-camera.y);ctx.strokeStyle='#8be5db';ctx.lineWidth=1.4;
    for(const o of scene.giantObjects||[]){if(o.revealUntil<=clock||o.collected)continue;ctx.globalAlpha=.65*clamp((o.revealUntil-clock)/sonarEchoSeconds(),0,1);
      if(o.kind==='structure'){const w=giantWallCache.find(w=>w.id===o.wallId);if(w)ctx.strokeRect(w.left,w.top,w.right-w.left,w.bottom-w.top);}
      else if(['plate','panel'].includes(o.kind)){ctx.beginPath();ctx.arc(o.x,o.y,13,0,TAU);ctx.stroke();}
      else{ctx.beginPath();ctx.moveTo(o.x-8,o.y-8);ctx.lineTo(o.x+8,o.y);ctx.lineTo(o.x-8,o.y+8);ctx.stroke();}
    }ctx.restore();
  }
  function drawGiantsChart(g){
    for(const wall of giantWalls()){
      const a=chartPoint(wall.left,wall.top),b=chartPoint(wall.right,wall.bottom);
      g.fillStyle=wall.gate?'#bf935f':'#64818c';g.fillRect(a.x,a.y,Math.max(1,b.x-a.x),Math.max(1,b.y-a.y));
    }
  }
  // === Behaviour variants: unchanged health, speed and finite pursuit ===
  function initialisePredatorBehaviours(assemble=false){
    const commons=scene.predators.filter(e=>e.tier==='common');
    for(let i=0;i<commons.length;i++){
      const e=commons[i];if(e.behaviour)continue;
      const start=Math.floor(i/15)*15;
      if(i%15<3&&commons.length>=start+3){e.behaviour='pack';e.packId='pack-'+start;e.packIndex=i%15;}
      else e.behaviour='ordinary';
    }
    // Only freshly generated populations assemble into small groups. Restored
    // snapshots keep every position, velocity, wound and phase exactly as saved.
    if(assemble){
      const groups=new Map();for(const e of commons)if(e.packId){if(!groups.has(e.packId))groups.set(e.packId,[]);groups.get(e.packId).push(e);}
      for(const members of groups.values()){
        const lead=members[0];for(let i=1;i<members.length;i++){
          const e=members[i];let placement=null;
          for(const angle of [i===1?.8:-.8,Math.PI*.5,Math.PI*1.5,Math.PI]){
            const x=lead.homeX+Math.cos(angle)*86,y=lead.homeY+Math.sin(angle)*86;
            if(y>HARBOUR.y+HARBOUR.exclusionRadius+60&&y<MAX_WORLD_Y-50&&wildClear(x,y,28)&&members.slice(0,i).every(p=>Math.hypot(p.x-x,p.y-y)>44)&&!(scene.derelictMines||[]).some(m=>!m.detonated&&Math.hypot(m.x-x,m.y-y)<110)){placement={x,y};break;}
          }
          if(placement){e.x=e.homeX=placement.x;e.y=e.homeY=placement.y;}
        }
      }
    }
    let stalker=0,reaper=0;
    for(const e of scene.predators){
      if(e.tier==='apex'){if(!e.behaviour)e.behaviour=stalker%3===0?'ambush':'ordinary';stalker++;}
      if(e.tier==='reaper'){if(!e.behaviour)e.behaviour=reaper%2===0?'interceptor':'ordinary';reaper++;}
      if(e.behaviour==='ambush'&&!['idle','windup','rush','retreat','recover'].includes(e.huntPhase)){e.huntPhase='idle';e.huntLeft=0;}
    }
  }
  function predatorIntent(e,dt,chase,tier){
    const patrol={x:e.homeX+Math.sin(clock*.33+e.phase)*85,y:e.homeY+Math.cos(clock*.27+e.phase)*65,speed:tier.patrolSpeed};
    e.biteAllowed=true;
    if(!e.behaviour||e.behaviour==='ordinary'||distance(e,player)>tier.leash+180)return chase?{x:player.x,y:player.y,speed:tier.speed}:patrol;
    if(inHarbour(player)||player.airborne){e.biteAllowed=false;if(e.behaviour==='ambush')e.huntPhase='idle';return patrol;}
    const visible=distance(e,player)<=tier.leash&&guidanceLineClear(e,player,2);
    if(visible&&chase){e.seenX=player.x;e.seenY=player.y;e.seenVX=player.vx;e.seenVY=player.vy;e.seenAt=clock;}
    const remembered=Number.isFinite(e.seenAt)&&clock-e.seenAt<1.2;
    let intent=patrol;
    if(e.behaviour==='pack'){
      if(!chase){const calling=scene.predators.find(p=>p!==e&&p.packId===e.packId&&p.aggression>.4&&distance(e,p)<240&&guidanceLineClear(e,p,2));if(calling&&visible){e.aggression=Math.max(e.aggression,.3);chase=true;}}
      if(chase&&visible){const a=Math.atan2(player.y-e.y,player.x-e.x),offset=(e.packIndex-1)*35;
        intent={x:player.x-Math.sin(a)*offset,y:player.y+Math.cos(a)*offset,speed:tier.speed};}
      else if(remembered)intent={x:e.seenX,y:e.seenY,speed:tier.speed*.7};
      else{e.aggression=Math.max(0,e.aggression-dt*1.4);e.biteAllowed=false;}
    }else if(e.behaviour==='ambush'){
      e.huntLeft=Math.max(0,(e.huntLeft||0)-dt);e.biteAllowed=false;
      if(e.huntPhase==='idle'&&chase&&visible){e.huntPhase='windup';e.huntLeft=1.05;e.rushAngle=Math.atan2(player.y-e.y,player.x-e.x);wildSound('stalkerWindup',e,330,3);}
      if(e.huntPhase==='windup'){
        intent={x:e.x,y:e.y,speed:0};e.vx*=Math.exp(-dt*9);e.vy*=Math.exp(-dt*9);
        if(e.huntLeft<=0){e.huntPhase='rush';e.huntLeft=1.05;}
      }else if(e.huntPhase==='rush'){
        e.biteAllowed=true;intent={x:e.x+Math.cos(e.rushAngle)*300,y:e.y+Math.sin(e.rushAngle)*300,speed:tier.speed};
        if(e.huntLeft<=0){e.huntPhase='retreat';e.huntLeft=2.0;e.biteAllowed=false;}
      }else if(e.huntPhase==='retreat'){
        intent={x:e.homeX,y:e.homeY,speed:tier.patrolSpeed*1.6};
        if(e.huntLeft<=0||distance(e,{x:e.homeX,y:e.homeY})<20){e.huntPhase='recover';e.huntLeft=1.1;}
      }else if(e.huntPhase==='recover'){
        intent={x:e.x,y:e.y,speed:0};if(e.huntLeft<=0)e.huntPhase='idle';
      }else intent={x:e.homeX+Math.sin(clock*.3+e.phase)*12,y:e.homeY+Math.cos(clock*.25+e.phase)*10,speed:10};
    }else if(e.behaviour==='interceptor'){
      if(chase&&remembered){const lead=visible?.55:0;
        const tx=e.seenX+clamp(e.seenVX*lead,-160,160),ty=clamp(e.seenY+clamp(e.seenVY*lead,-160,160),8120,MAX_WORLD_Y-36);
        intent={x:tx,y:ty,speed:tier.speed};if(!visible&&Math.hypot(tx-e.x,ty-e.y)<22)intent.speed=0;
      }else{e.aggression=Math.max(0,e.aggression-dt*1.7);e.biteAllowed=false;}
    }
    return intent;
  }
  // Shared local A* chart. Occupancy is cached by species clearance and wall
  // revision; routes are transient and never become part of a campaign export.
  let navigationSource=null,navigationWalls=null,navigationPlansThisFrame=0;
  let navigationCells=new Map(),navigationEdges=new Map(),predatorRoutes=new WeakMap();
  const NAV_CELL=36;
  const predatorRadius=e=>e.rescueDrone?11:e.tier==='warden'?34:e.tier==='reaper'?26:e.tier==='apex'?22:18;
  function refreshNavigation(){
    if(navigationSource!==scene.rocks||navigationWalls!==giantWallCache||navigationCells.size>24000||navigationEdges.size>48000){
      navigationSource=scene.rocks;navigationWalls=giantWallCache;
      navigationCells.clear();navigationEdges.clear();predatorRoutes=new WeakMap();
    }
  }
  function predatorWaterClear(x,y,radius=18,minY=SURFACE.y+radius,allowHarbour=false){
    return y>=minY&&(allowHarbour||Math.hypot(x-HARBOUR.x,y-HARBOUR.y)>=HARBOUR.exclusionRadius+1)&&wildClear(x,y,radius);
  }
  function predatorSegmentClear(a,b,radius,minY,allowHarbour=false){
    const length=Math.hypot(b.x-a.x,b.y-a.y),steps=Math.max(1,Math.ceil(length/7));
    for(let i=0;i<=steps;i++)if(!predatorWaterClear(lerp(a.x,b.x,i/steps),lerp(a.y,b.y,i/steps),radius,minY,allowHarbour))return false;
    return true;
  }
  function planPredatorRoute(e,target){
    refreshNavigation();
    const allowHarbour=Boolean(e.rescueDrone),radius=predatorRadius(e),minY=e.tier==='reaper'?8120:SURFACE.y+radius;
    const key=(ix,iy)=>ix+','+iy;
    const point=(ix,iy)=>({x:ix*NAV_CELL,y:iy*NAV_CELL});
    const free=(ix,iy)=>{
      const id=radius+':'+minY+':'+key(ix,iy);
      if(!navigationCells.has(id))navigationCells.set(id,predatorWaterClear(ix*NAV_CELL,iy*NAV_CELL,radius+2,minY,allowHarbour));
      return navigationCells.get(id);
    };
    const edge=(a,b)=>{
      const id=radius+':'+minY+':'+[key(a.ix,a.iy),key(b.ix,b.iy)].sort().join('/');
      if(!navigationEdges.has(id))navigationEdges.set(id,predatorSegmentClear(a,b,radius+2,minY,allowHarbour));
      return navigationEdges.get(id);
    };
    const nearest=(p,connected)=>{
      const ix=Math.round(p.x/NAV_CELL),iy=Math.round(p.y/NAV_CELL),candidates=[];
      for(let ring=0;ring<=4;ring++){
        for(let dy=-ring;dy<=ring;dy++)for(let dx=-ring;dx<=ring;dx++){
          if(Math.max(Math.abs(dx),Math.abs(dy))!==ring)continue;
          const q={...point(ix+dx,iy+dy),ix:ix+dx,iy:iy+dy};
          if(free(q.ix,q.iy)&&(!connected||predatorSegmentClear(p,q,radius,minY,allowHarbour)))candidates.push(q);
        }
        if(candidates.length)return candidates.sort((a,b)=>distance(a,p)-distance(b,p))[0];
      }
      return null;
    };
    const start=nearest(e,true),goal=nearest(target,false);if(!start||!goal)return [];
    const minX=Math.min(start.ix,goal.ix)-10,maxX=Math.max(start.ix,goal.ix)+10;
    const minRow=Math.min(start.iy,goal.iy)-10,maxRow=Math.max(start.iy,goal.iy)+10;
    // Binary heap avoids repeatedly sorting an open-set array on mobile.
    const heap=[];
    const push=node=>{heap.push(node);let i=heap.length-1;while(i){const parent=(i-1)>>1;if(heap[parent].f<=node.f)break;heap[i]=heap[parent];i=parent;}heap[i]=node;};
    const pop=()=>{const top=heap[0],last=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let child=i*2+1;if(child+1<heap.length&&heap[child+1].f<heap[child].f)child++;if(heap[child].f>=last.f)break;heap[i]=heap[child];i=child;}heap[i]=last;}return top;};
    const heuristic=q=>Math.hypot(q.ix-goal.ix,q.iy-goal.iy);
    const first={...start,g:0,h:heuristic(start),parent:null};first.f=first.h;push(first);
    const bestCost=new Map([[key(first.ix,first.iy),0]]);let best=first,visited=0;
    while(heap.length&&visited++<1600){
      const n=pop();if(n.g!==bestCost.get(key(n.ix,n.iy)))continue;
      if(n.h<best.h)best=n;if(n.ix===goal.ix&&n.iy===goal.iy){best=n;break;}
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
        if(!dx&&!dy)continue;const ix=n.ix+dx,iy=n.iy+dy;
        if(ix<minX||ix>maxX||iy<minRow||iy>maxRow||!free(ix,iy))continue;
        // Prevent corner cutting even when the endpoint itself is clear.
        if(dx&&dy&&(!free(n.ix+dx,n.iy)||!free(n.ix,n.iy+dy)))continue;
        const g=n.g+(dx&&dy?Math.SQRT2:1),id=key(ix,iy);if(g>=(bestCost.get(id)??Infinity))continue;
        const q={...point(ix,iy),ix,iy};if(!edge(n,q))continue;
        const h=heuristic(q),next={...q,g,h,f:g+h,parent:n};bestCost.set(id,g);push(next);
      }
    }
    if(best===first)return [];
    const path=[];for(let n=best;n;n=n.parent)path.push({x:n.x,y:n.y});path.reverse();
    if(best.ix===goal.ix&&best.iy===goal.iy&&predatorSegmentClear(best,target,radius,minY,allowHarbour))path.push({...target});
    return path;
  }
  function navigatePredator(e,intent){
    if(intent.speed<=0||e.huntPhase==='rush'||e.huntPhase==='windup'||e.huntPhase==='recover')return intent;
    refreshNavigation();
    const radius=predatorRadius(e),minY=e.tier==='reaper'?8120:SURFACE.y+radius;
    const target={x:intent.x,y:clamp(intent.y,minY,MAX_WORLD_Y-radius-1)};
    let route=predatorRoutes.get(e);
    if(!route){route={path:[],nextPlan:0,checkAt:0,direct:false,target};predatorRoutes.set(e,route);}
    if(clock>=route.checkAt||distance(route.target,target)>48){
      route.direct=predatorSegmentClear(e,target,radius+1,minY);route.checkAt=clock+.18;
    }
    if(route.direct){route.path=[];route.target=target;return {...intent,...target};}
    if(distance(e,player)<1100&&clock>=route.nextPlan&&navigationPlansThisFrame<2){
      navigationPlansThisFrame++;route.path=planPredatorRoute(e,target);route.target=target;route.nextPlan=clock+.85;
    }
    while(route.path.length&&distance(e,route.path[0])<18)route.path.shift();
    if(route.path.length){
      if(route.path.length>1&&predatorSegmentClear(e,route.path[1],radius+1,minY))route.path.shift();
      if(predatorSegmentClear(e,route.path[0],radius,minY))return {...route.path[0],speed:intent.speed};
      route.path=[];route.nextPlan=0;
    }
    // Cheap local fallback for distant patrols or a genuinely impassable route.
    const angle=Math.atan2(target.y-e.y,target.x-e.x),look=Math.max(48,Math.min(100,intent.speed*.5));
    const side=route.side||1;
    for(const offset of [0,.5*side,-.5*side,1*side,-1*side,1.55*side,-1.55*side,2.2*side,-2.2*side]){
      const a=angle+offset,q={x:e.x+Math.cos(a)*look,y:e.y+Math.sin(a)*look};
      if(predatorSegmentClear(e,q,radius+1,minY)){if(offset)route.side=Math.sign(offset);return {...q,speed:intent.speed};}
    }
    return {x:e.x,y:e.y,speed:0};
  }
  function resolvePredatorWreckCollision(e){
    // Despite the legacy name this now applies to EVERY species and EVERY
    // solid rock, hull, closed bulkhead, trench boundary and seabed.
    const radius=predatorRadius(e),minY=e.tier==='reaper'?8120:SURFACE.y+radius;
    const clear=(x,y)=>predatorWaterClear(x,y,radius,minY);
    let px=e.previousX??e.x,py=e.previousY??e.y;
    if(!clear(px,py)){
      // Old versions permitted enemies inside rock. Repair only an already
      // invalid starting position; a moving enemy never teleports past a wall.
      let found=null;
      for(let r=8;r<=640&&!found;r+=8)for(let j=0;j<32;j++){
        const a=j*TAU/32,x=px+Math.cos(a)*r,y=py+Math.sin(a)*r;
        if(clear(x,y)){found={x,y};break;}
      }
      if(!found){e.x=px;e.y=py;e.vx=0;e.vy=0;return;}
      e.x=found.x;e.y=found.y;e.vx=0;e.vy=0;e.previousX=e.x;e.previousY=e.y;predatorRoutes.delete(e);return;
    }
    const dx=e.x-px,dy=e.y-py,steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/5));let x=px,y=py;
    for(let i=0;i<steps;i++){
      const nx=x+dx/steps,ny=y+dy/steps;
      if(clear(nx,ny)){x=nx;y=ny;continue;}
      // Tangential sliding is allowed, but each axis is tested independently.
      if(clear(nx,y)){x=nx;e.vy=0;}
      else if(clear(x,ny)){y=ny;e.vx=0;}
      else{e.vx=0;e.vy=0;break;}
    }
    e.x=x;e.y=y;
  }
  function drawPredatorIntent(e){
    if(e.behaviour==='ambush'&&e.huntPhase==='windup'){
      const a=e.rushAngle||0;ctx.save();ctx.translate(e.x,e.y);ctx.rotate(a);ctx.strokeStyle='#ffd08c';ctx.lineWidth=1.7;ctx.setLineDash([4,5]);ctx.beginPath();ctx.moveTo(23,0);ctx.lineTo(60,0);ctx.stroke();ctx.setLineDash([]);ctx.beginPath();ctx.moveTo(49,-6);ctx.lineTo(60,0);ctx.lineTo(49,6);ctx.stroke();ctx.restore();
    }else if(e.behaviour==='pack'){
      ctx.strokeStyle='#8fc7be66';ctx.lineWidth=1;ctx.beginPath();ctx.arc(e.x,e.y,21,.18,1.25);ctx.stroke();
    }
  }
  function targetIndicators(){
    if(!running||!player||player.airborne||inHarbour(player))return [];
    const result=[];
    for(const kind of ['railgun','torpedo']){
      if(!saved.upgrades[kind]||player.weaponAmmo[kind]<=0)continue;
      const o={x:player.x+Math.cos(player.facing)*35,y:player.y+Math.sin(player.facing)*35,remaining:WEAPONS[kind].range,launchHeading:player.facing,targetId:null};
      if(projectileTerrainHit(player,o,3)!==null)continue;
      const enemy=findGuidanceTarget(o,player.facing,kind);if(!enemy||!onscreen(enemy.x,enemy.y,30))continue;
      const seen=enemy.revealUntil>clock||(ambientLightAt(enemy.y)>.08&&distance(player,enemy)<220)||(headlightsActive()&&beamIntersects(enemy.x,enemy.y,10));
      if(seen)result.push({kind,id:enemy.id,x:enemy.x,y:enemy.y});
    }
    return result;
  }
  function drawTargetIndicators(){
    const targets=targetIndicators();if(!targets.length)return;
    ctx.save();ctx.translate(-camera.x,-camera.y);
    for(const t of targets){const r=t.kind==='railgun'?25:33;ctx.strokeStyle=t.kind==='railgun'?'#9beafaad':'#ffc48ead';ctx.lineWidth=1.1;
      ctx.beginPath();if(t.kind==='railgun'){for(const [dx,dy]of [[-1,-1],[1,-1],[1,1],[-1,1]]){ctx.moveTo(t.x+dx*r,t.y+dy*(r-7));ctx.lineTo(t.x+dx*r,t.y+dy*r);ctx.lineTo(t.x+dx*(r-7),t.y+dy*r);}}
      else{for(let i=0;i<4;i++){const a=i*Math.PI/2;ctx.moveTo(t.x+Math.cos(a-.14)*r,t.y+Math.sin(a-.14)*r);ctx.lineTo(t.x+Math.cos(a)*(r+4),t.y+Math.sin(a)*(r+4));ctx.lineTo(t.x+Math.cos(a+.14)*r,t.y+Math.sin(a+.14)*r);}}ctx.stroke();
    }ctx.restore();
  }

  // === Seeded environments, independent of resource / collision generation ===
  const BIOMES=[
    {water:[12,58,64],rock:'#193f43',edge:'#56847b',detail:'#84bb9a',accent:'#97e4ba',name:'SUNBREAK SHELF',current:12,landmarks:['CORAL CROWN','THE OLD ANCHOR','SHELF OBSERVATORY']},
    {water:[14,39,55],rock:'#223747',edge:'#7392a8',detail:'#c4d8e5',accent:'#b8d6ef',name:'GLASSBONE RIFT',current:20,landmarks:['GLASS GATE','FRACTURE SPIRE','WHITE SKELETON']},
    {water:[10,42,39],rock:'#173b36',edge:'#42695a',detail:'#7dba7c',accent:'#92c1a1',name:'DROWNED GARDENS',current:28,landmarks:['ROOT CATHEDRAL','LOST CONSERVATORY','GARDEN SENTINEL']},
    {water:[23,28,45],rock:'#2a2c40',edge:'#65637f',detail:'#a5a4ba',accent:'#c1b3df',name:'MIDNIGHT CATHEDRAL',current:36,landmarks:['THE NAVE','SILENT BELFRY','SUBMERGED ARCHIVE']},
    {water:[29,26,32],rock:'#302b32',edge:'#6c555b',detail:'#a57364',accent:'#d59a7e',name:'CALYPSO ABYSS',current:44,landmarks:['OBSIDIAN GATE','THE FAULT LINE','CALYPSO ARRAY']}
  ];
  let environment={decor:[],landmarks:[],currents:[]},environmentEnabled=true;
  const biome=()=>BIOMES[Math.max(0,LEVELS.findIndex(l=>l.id===LEVEL_ID))];
  function buildEnvironment(){
    environmentEnabled=true;
    const index=LEVELS.findIndex(l=>l.id===LEVEL_ID),r=randGen((field.seed^0x4ad81407)>>>0);
    environment={decor:[],landmarks:[],currents:[]};
    for(const [i,rock] of scene.rocks.entries()){
      if(r()>.68)continue;
      environment.decor.push({x:rock.x,y:rock.y-rock.radius*.25,size:rock.radius*(.55+r()*.9),phase:r()*TAU,variant:i%4,index});
    }
    for(let n=0;n<3;n++){
      const y=520+(MAX_WORLD_Y-900)*(.2+n*.3),x=laneAt(y,n%2?2:0);
      environment.landmarks.push({id:'landmark-'+n,x,y,size:95+n*16,name:biome().landmarks[n],index,variant:n,revealUntil:0});
    }
    scene.landmarks=environment.landmarks;
    const count=[3,5,8,11,14][index];
    for(let i=0;i<count;i++){
      const y=850+(i+.5)/count*(MAX_WORLD_Y-1250),lane=i%2?0:2;
      environment.currents.push({x:laneAt(y,lane),y,rx:190+r()*65,ry:170+r()*95,dir:i%2?-1:1,phase:r()*TAU,strength:biome().current});
    }
  }
  function currentAt(x,y,time=clock){
    if(!environmentEnabled||y<SURFACE.y+400||y>MAX_WORLD_Y-140||Math.hypot(x-HARBOUR.x,y-HARBOUR.y)<HARBOUR.exclusionRadius+90)return {x:0,y:0,strength:0};
    // A quiet central route and the harbour remain sheltered. Even the strongest
    // current is weaker than an unmodified quiet-running engine (68 units/s).
    if(Math.abs(x-laneAt(y,1))<100||x<leftAt(y)+100||x>rightAt(y)-100)return {x:0,y:0,strength:0};
    let force=0;
    for(const c of environment.currents){const d=((x-c.x)/c.rx)**2+((y-c.y)/c.ry)**2;if(d<1)force+=c.dir*c.strength*(1-d)*(.74+.26*Math.sin(time*.6+c.phase));}
    force=clamp(force,-biome().current,biome().current);
    if(Math.abs(force)>1&&scene.rocks.some(r=>Math.abs(r.x-x)<r.radius+58&&Math.abs(r.y-y)<r.radius+58))force*=.2;
    return {x:force,y:0,strength:Math.abs(force)};
  }
  function drawEnvironment(){
    if(!environmentEnabled)return;
    const b=biome(),index=LEVELS.findIndex(l=>l.id===LEVEL_ID);
    ctx.save();
    for(const c of environment.currents)if(onscreen(c.x,c.y,c.ry+30)){
      for(let k=0;k<15;k++){
        const phase=(clock*(.22+c.strength*.007)+k*.73+c.phase)%1;
        const x=c.x-c.dir*c.rx+c.dir*phase*c.rx*2,y=c.y+Math.sin(k*2.4+c.phase)*c.ry*.78;
        ctx.strokeStyle=b.accent+'42';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-c.dir*(6+c.strength*.18),y+1);ctx.stroke();
      }
    }
    for(const d of environment.decor){
      if(!onscreen(d.x,d.y,d.size*2))continue;
      ctx.save();ctx.translate(d.x,d.y);const size=d.size,sway=Math.sin(clock*.65+d.phase)*size*.1;
      if(index===0){
        // Seagrass and branching coral, rooted in existing rock rather than new colliders.
        ctx.strokeStyle=d.variant%2?'#659d83':'#b38476';ctx.lineWidth=2;ctx.globalAlpha=.75;
        for(let k=-2;k<=2;k++){
          ctx.beginPath();ctx.moveTo(k*4,8);ctx.quadraticCurveTo(k*6+sway,-size*.45,k*12+sway,-size*(.5+(k+2)*.08));ctx.stroke();
          if(d.variant%2===0){ctx.beginPath();ctx.moveTo(k*6+sway*.6,-size*.3);ctx.lineTo(k*10+10,-size*.52);ctx.stroke();}
        }

      }else if(index===1){
        for(let k=-1;k<=1;k++){const h=size*(.8+Math.abs(Math.sin(d.phase+k))*.8),x=k*size*.23;
          ctx.fillStyle='#9eb9cc22';ctx.strokeStyle='#b4cbdc8a';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(x-9,9);ctx.lineTo(x-6,-h*.7);ctx.lineTo(x+2,-h);ctx.lineTo(x+10,-h*.55);ctx.lineTo(x+9,9);ctx.closePath();ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(x+2,-h);ctx.lineTo(x+1,8);ctx.stroke();}
      }else if(index===2){
        for(let k=-1;k<=1;k++){
          const h=size*(1.5+Math.abs(Math.sin(d.phase+k))),x=k*13;
          ctx.strokeStyle='#4b836d99';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x,12);ctx.bezierCurveTo(x+sway,-h*.3,x-sway,-h*.7,x+sway,-h);ctx.stroke();
          for(let j=1;j<6;j++){const y=-h*j/6,lean=Math.sin(clock*.5+j+d.phase)*8;ctx.fillStyle=j%2?'#64935b77':'#336b5966';ctx.beginPath();ctx.ellipse(x+lean+(j%2?8:-8),y,14,4,j%2?-.5:.5,0,TAU);ctx.fill();}
        }
      }else if(index===3){
        const h=size*(1+d.variant*.2);ctx.fillStyle='#53546633';ctx.strokeStyle='#77768b77';ctx.lineWidth=1.2;
        ctx.beginPath();ctx.moveTo(-12,12);ctx.lineTo(-9,-h);ctx.lineTo(7,-h-8);ctx.lineTo(12,12);ctx.closePath();ctx.fill();ctx.stroke();
        ctx.beginPath();ctx.moveTo(-4,9);ctx.lineTo(-4,-h+12);ctx.moveTo(4,7);ctx.lineTo(4,-h+8);ctx.stroke();
        ctx.fillStyle='#89829355';ctx.fillRect(-14,-h-4,29,7);
      }else{
        for(let k=-1;k<=1;k++){
          const h=size*(.7+Math.abs(Math.sin(d.phase+k))*.6),x=k*size*.22;ctx.fillStyle='#343039';ctx.strokeStyle='#735852';ctx.lineWidth=1;
          ctx.beginPath();ctx.moveTo(x-12,12);ctx.lineTo(x-9,-h);ctx.lineTo(x+7,-h-6);ctx.lineTo(x+12,12);ctx.closePath();ctx.fill();ctx.stroke();
          ctx.strokeStyle='#ad75505a';ctx.beginPath();ctx.moveTo(x,-h*.7);ctx.lineTo(x+4,-h*.4);ctx.lineTo(x-3,0);ctx.stroke();
        }
      }
      ctx.restore();
    }
    for(const landmark of environment.landmarks)if(onscreen(landmark.x,landmark.y,220))drawLandmark(landmark);
    ctx.restore();
  }
  function drawLandmark(l,echo=false){
    const b=biome(),s=l.size;
    ctx.save();ctx.translate(l.x,l.y);ctx.lineWidth=echo?1.7:3;
    ctx.strokeStyle=echo?'#91e6cf':b.edge;ctx.fillStyle=b.rock;ctx.globalAlpha*=echo?1:.75;
    if(l.index===0){
      ctx.beginPath();ctx.moveTo(-s,-20);ctx.quadraticCurveTo(0,-s*.7,s,-20);ctx.lineTo(s*.8,0);ctx.quadraticCurveTo(0,-s*.45,-s*.8,0);ctx.closePath();if(!echo)ctx.fill();ctx.stroke();
      for(let j=-2;j<=2;j++){ctx.beginPath();ctx.moveTo(j*s*.3,-20);ctx.lineTo(j*s*.38,-s*.65);ctx.stroke();}
    }else if(l.index===1||l.index===3){
      for(const k of [-1,1]){ctx.beginPath();ctx.rect(k*s*.7-14,-s*.4,28,s*.9);if(!echo)ctx.fill();ctx.stroke();}
      ctx.beginPath();ctx.moveTo(-s*.7,-s*.4);ctx.quadraticCurveTo(0,-s*1.5,s*.7,-s*.4);ctx.moveTo(-s*.52,-s*.4);ctx.quadraticCurveTo(0,-s*1.14,s*.52,-s*.4);ctx.stroke();
      if(l.index===1){ctx.beginPath();ctx.moveTo(-s*.35,-s*.8);ctx.lineTo(-s*.1,-s*.53);ctx.lineTo(s*.18,-s*.9);ctx.stroke();}
    }else if(l.index===2){
      ctx.beginPath();ctx.ellipse(0,0,s*.8,s*.35,0,0,TAU);if(!echo)ctx.fill();ctx.stroke();
      for(let k=-2;k<=2;k++){ctx.beginPath();ctx.moveTo(k*s*.28,s*.1);ctx.bezierCurveTo(k*s*.2,-s*.4,k*s*.7,-s*.7,k*s*.32,-s*1.2);ctx.stroke();}
    }else{
      for(let k=-2;k<=2;k++){const h=s*(.5+Math.abs(Math.sin(k+field.seed))*.7),x=k*s*.31;ctx.beginPath();ctx.moveTo(x-16,s*.4);ctx.lineTo(x-13,-h);ctx.lineTo(x+13,-h-10);ctx.lineTo(x+17,s*.4);ctx.closePath();if(!echo)ctx.fill();ctx.stroke();}
    }
    ctx.restore();
  }

  // === Delta Helm: independent seeded encounters, never resource rerolls ===
  const WILD = Object.freeze({mineCounts:[8,16,28,42,58],ventCounts:[5,9,15,21,28],schoolCounts:[12,22,36,48,62],
    mineRadius:16,blastRadius:118,mineHullDamage:[24,32,40,48,56],mineEnemyDamage:[110,140,180,230,280],
    maxActiveSchools:12,maxFishPerSchool:14});
  const FISH = Object.freeze([
    {name:'SILVER DART',body:'#b2d9e8',edge:'#42687e',fin:'#6b9bb7',speed:38,size:7,shape:'dart'},
    {name:'SUNSTRIPE REEFLET',body:'#edba68',edge:'#b67543',fin:'#efcf85',speed:23,size:8,shape:'reef'},
    {name:'RIBBONFIN',body:'#73d5c3',edge:'#418f95',fin:'#9a8bc5',speed:29,size:9,shape:'ribbon'},
    {name:'VIOLET GLASSFISH',body:'#b6aad6',edge:'#70698f',fin:'#8e9bc5',speed:21,size:8,shape:'glass'}
  ]);
  let wildEnabled=true,wildActiveSchools=0,wildSoundTimers={},wildRockIndex=new Map(),wildRockSource=null;
  function validateWild(data){
    if(!data||data.version!==1||!Array.isArray(data.mines)||data.mines.length>80||!Array.isArray(data.vents)||data.vents.length>40)return null;
    const finite=(o,keys)=>o&&keys.every(k=>Number.isFinite(o[k]));
    if(!data.mines.every(m=>/^derelict-\d+$/.test(m.id)&&finite(m,['anchorX','anchorY','tether','phase','sway'])&&m.anchorY>70&&m.anchorY<18200&&Math.abs(m.anchorX)<3000&&m.tether>=40&&m.tether<=120&&m.sway>=0&&m.sway<=22))return null;
    if(!data.vents.every(v=>/^thermal-\d+$/.test(v.id)&&finite(v,['x','y','rx','height','period','phase','damage','lift'])&&v.y>70&&v.y<18200&&Math.abs(v.x)<3000&&v.rx>=16&&v.rx<=60&&v.height>=70&&v.height<=200&&v.period>=10&&v.period<=30&&v.damage>=0&&v.damage<=12&&v.lift>=0&&v.lift<=65))return null;
    if(new Set(data.mines.map(m=>m.id)).size!==data.mines.length||new Set(data.vents.map(v=>v.id)).size!==data.vents.length)return null;
    const list=(a,pattern)=>Array.isArray(a)?[...new Set(a.filter(v=>typeof v==='string'&&pattern.test(v)))].slice(0,80):[];
    return {version:1,mines:data.mines.map(m=>({id:m.id,anchorX:m.anchorX,anchorY:m.anchorY,tether:m.tether,phase:m.phase,sway:m.sway})),
      vents:data.vents.map(v=>({id:v.id,x:v.x,y:v.y,rx:v.rx,height:v.height,period:v.period,phase:v.phase,damage:v.damage,lift:v.lift})),
      cleared:list(data.cleared,/^derelict-\d+$/),retired:list(data.retired,/^derelict-\d+$/),sheltered:list(data.sheltered,/^thermal-\d+$/)};
  }
  function nearbyWildRocks(x,y){
    if(wildRockSource!==scene.rocks){
      wildRockSource=scene.rocks;wildRockIndex=new Map();
      for(const rock of scene.rocks){const pad=rock.radius+82;
        for(let cy=Math.floor((rock.y-pad)/180);cy<=Math.floor((rock.y+pad)/180);cy++)for(let cx=Math.floor((rock.x-pad)/180);cx<=Math.floor((rock.x+pad)/180);cx++){
          const key=cx+':'+cy;if(!wildRockIndex.has(key))wildRockIndex.set(key,[]);wildRockIndex.get(key).push(rock);
        }
      }
    }
    return wildRockIndex.get(Math.floor(x/180)+':'+Math.floor(y/180))||[];
  }
  function wildClear(x,y,radius=12){
    if(giantSolid(x,y,radius))return false;
    if(y-radius<SURFACE.y||y+radius>MAX_WORLD_Y||x-radius<leftAt(y)+8||x+radius>rightAt(y)-8)return false;
    for(const rock of radius<=80?nearbyWildRocks(x,y):scene.rocks){
      if(Math.abs(x-rock.x)>rock.radius+radius+5||Math.abs(y-rock.y)>rock.radius+radius+5)continue;
      if(insidePolygon(x,y,rock.vertices))return false;
      for(let i=0;i<rock.vertices.length;i++){const p=segmentClosest(x,y,rock.vertices[i],rock.vertices[(i+1)%rock.vertices.length]);if(Math.hypot(x-p.x,y-p.y)<radius)return false;}
    }
    return true;
  }
  function hazardClear(x,y,radius=130){
    if(y<570||distance({x,y},HARBOUR)<HARBOUR.exclusionRadius+160)return false;
    // Keep the full central route and every essential objective/recovery approach open.
    for(const yy of [y-90,y,y+90])if(Math.abs(x-laneAt(yy,1))<125)return false;
    if(scene.wrecks.some(w=>distance({x,y},w)<radius+70))return false;
    if((field.loot||[]).some(n=>distance({x,y},n)<radius))return false;
    if(field.recoveries.some(n=>distance({x,y},n)<radius+50))return false;
    return true;
  }
  function mineLocation(m,time=clock){
    const swing=Math.sin(time*.65+m.phase)*m.sway+Math.sin(time*.23+m.phase)*m.sway*.2;
    return {x:m.anchorX+swing,y:m.anchorY-m.tether+Math.abs(swing)*.12};
  }
  function buildWildWaters(){
    wildEnabled=true;wildSoundTimers={};wildActiveSchools=0;
    const levelIndex=Math.max(0,LEVELS.findIndex(l=>l.id===LEVEL_ID));
    const r=randGen((field.seed^0x57494c44)>>>0);
    if(!field.wild){
      field.wild={version:1,mines:[],vents:[],cleared:[],retired:[],sheltered:[]};
      const anchors=scene.rocks.map(rock=>rock.vertices.reduce((a,b)=>a.y<b.y?a:b)).filter(p=>p.y>700);
      for(let i=0;i<28;i++)anchors.push({x:lerp(leftAt(MAX_WORLD_Y)+80,rightAt(MAX_WORLD_Y)-80,(i+.5)/28),y:MAX_WORLD_Y});
      // Seeded shuffle operates on a separate array. No collision/resource RNG is consumed.
      for(let i=anchors.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[anchors[i],anchors[j]]=[anchors[j],anchors[i]];}
      for(const a of anchors){
        if(field.wild.mines.length>=WILD.mineCounts[levelIndex])break;
        const tether=64+r()*39,sway=10+r()*7,x=a.x,y=a.y-tether;
        if(!hazardClear(x,y,135)||![-1,0,1].every(k=>wildClear(x+k*sway*1.2,y,23)))continue;
        if(field.wild.mines.some(m=>Math.hypot(m.anchorX-x,m.anchorY-m.tether-y)<250))continue;
        field.wild.mines.push({id:'derelict-'+field.wild.mines.length,anchorX:x,anchorY:a.y,tether,phase:r()*TAU,sway});
      }
      for(const a of anchors){
        if(field.wild.vents.length>=WILD.ventCounts[levelIndex])break;
        const height=95+r()*55+levelIndex*8,rx=24+r()*13,x=a.x,y=a.y;
        if(!hazardClear(x,y-height*.5,125)||!wildClear(x,y-35,18)||!wildClear(x,y-height*.8,rx+10))continue;
        if(field.wild.mines.some(m=>Math.hypot(m.anchorX-x,m.anchorY-m.tether-(y-height*.5))<210)||field.wild.vents.some(v=>Math.hypot(v.x-x,v.y-y)<230))continue;
        field.wild.vents.push({id:'thermal-'+field.wild.vents.length,x,y,rx,height,period:14+r()*6,phase:r()*14,damage:levelIndex===0?0:2+levelIndex*1.5,lift:32+levelIndex*7});
      }
    }
    const removed=new Set([...field.wild.cleared,...field.wild.retired]);
    scene.derelictMines=field.wild.mines.map(m=>({...m,...mineLocation(m),detonated:removed.has(m.id),revealUntil:0}));
    scene.ventFields=field.wild.vents.map(v=>({...v,disabled:field.wild.sheltered.includes(v.id),revealUntil:0}));
    // Only a migration/arrival safeguard, never an unlimited underwater invulnerability aura.
    for(const pod of field.recoveries)protectWildArrival(pod,150);
    if(loadedActive?.levelId===LEVEL_ID&&!loadedActive.wildlife)protectWildArrival(loadedActive.player,145);
    for(const enemy of scene.predators)avoidWildSpawn(enemy);
    const fishRandom=randGen((field.seed^0x46495348)>>>0);
    scene.schools=[];scene.benthos=[];
    const habitats=[[0,1,0,1,2],[0,0,2,1],[2,2,0,3],[3,2,3,0],[3,3,2,0]][levelIndex];
    for(let i=0;i<WILD.schoolCounts[levelIndex];i++){
      const y=440+(i+fishRandom())/WILD.schoolCounts[levelIndex]*(MAX_WORLD_Y-620);
      const point=populationPoint(fishRandom,y),species=habitats[i%habitats.length];
      scene.schools.push(makeSchool('school-'+i,point.x,point.y,species,fishRandom));
    }
    const benthicRandom=randGen((field.seed^0x52454546)>>>0);
    for(const rock of collisionPolygons()){
      if(benthicRandom()>.46)continue;
      const p=rock.vertices.reduce((a,b)=>a.y<b.y?a:b);
      scene.benthos.push({x:p.x,y:p.y-1,kind:Math.floor(benthicRandom()*4),size:11+benthicRandom()*13,phase:benthicRandom()*TAU,retreat:0,level:levelIndex});
    }
    for(let n=0;n<16;n++)scene.benthos.push({x:lerp(leftAt(MAX_WORLD_Y)+60,rightAt(MAX_WORLD_Y)-60,(n+.5)/16),y:MAX_WORLD_Y-3,kind:n%4,size:12+benthicRandom()*15,phase:benthicRandom()*TAU,retreat:0,level:levelIndex});
  }
  function avoidWildSpawn(enemy){
    const nearby=()=> (scene.derelictMines||[]).some(m=>!m.detonated&&Math.hypot(enemy.x-m.anchorX,enemy.y-(m.anchorY-m.tether))<95);
    if(!nearby())return;
    const original=enemy.x;
    for(const offset of [140,-140,230,-230,320,-320]){
      enemy.x=clamp(original+offset,leftAt(enemy.y)+45,rightAt(enemy.y)-45);
      if(!nearby()&&wildClear(enemy.x,enemy.y,30)){enemy.homeX=enemy.x;enemy.vx=0;enemy.vy=0;return;}
    }
    enemy.x=original;
  }
  function protectWildArrival(point,radius=145){
    if(!field.wild||!point)return;
    for(const m of (scene.derelictMines||[]))if(!m.detonated&&Math.hypot(point.x-m.anchorX,point.y-(m.anchorY-m.tether))<radius+m.sway){
      m.detonated=true;if(!field.wild.retired.includes(m.id))field.wild.retired.push(m.id);
      const contact=field.survey.contacts['derelictMines:'+m.id];if(contact)contact.collected=true;
    }
    for(const v of (scene.ventFields||[]))if(!v.disabled&&Math.abs(point.x-v.x)<v.rx+radius&&point.y>v.y-v.height-radius&&point.y<v.y+radius){
      v.disabled=true;if(!field.wild.sheltered.includes(v.id))field.wild.sheltered.push(v.id);
    }
  }
  function makeSchool(id,x,y,species,r){
    const count=6+Math.floor(r()*9),heading=r()*TAU,spec=FISH[species],fish=[];
    for(let i=0;i<count;i++){
      let px=x,py=y;
      for(let k=0;k<24;k++){const nx=x+(r()-.5)*78,ny=y+(r()-.5)*52;if(wildClear(nx,ny,9)){px=nx;py=ny;break;}}
      fish.push({x:px,y:py,vx:Math.cos(heading)*spec.speed,vy:Math.sin(heading)*spec.speed,angle:heading,size:.72+r()*.45,phase:r()*TAU});
    }
    return {id,x,y,homeX:x,homeY:y,species,heading,phase:r()*TAU,fear:0,sonarUntil:0,revealUntil:0,fish};
  }
  function sweptDistance(ax,ay,bx,by){const dx=bx-ax,dy=by-ay,d=dx*dx+dy*dy,t=d?clamp(-(ax*dx+ay*dy)/d,0,1):0;return Math.hypot(ax+dx*t,ay+dy*t);}
  function derelictContact(m,actor,dt,radius=15,offset=0){
    const before=mineLocation(m,clock-dt),after=mineLocation(m,clock),angle=actor.facing||0;
    const ox=Math.cos(angle)*offset,oy=Math.sin(angle)*offset;
    return sweptDistance((actor.previousX??actor.x)+ox-before.x,(actor.previousY??actor.y)+oy-before.y,actor.x+ox-after.x,actor.y+oy-after.y)<=WILD.mineRadius+radius;
  }
  function detonateDerelict(m,playerContact=false,enemyContacts=[]){
    if(m.detonated)return false;
    m.detonated=true;
    if(!field.wild.cleared.includes(m.id))field.wild.cleared.push(m.id);
    const contact=field.survey.contacts['derelictMines:'+m.id];if(contact)contact.collected=true;
    const level=Math.max(0,LEVELS.findIndex(l=>l.id===LEVEL_ID));
    scene.blasts.push({x:m.x,y:m.y,birth:clock,radius:WILD.blastRadius,derelict:true});
    wildSound('derelictBlast',m,900,0);
    for(const enemy of scene.predators)if(predatorAlive(enemy)&&(distance(enemy,m)<WILD.blastRadius+12||enemyContacts.includes(enemy)))damagePredator(enemy,WILD.mineEnemyDamage[level],!inHarbour(player)&&distance(player,m)<600);
    for(const enemy of scene.predators)if(predatorAlive(enemy)&&distance(enemy,m)<420){enemy.alertUntil=clock+4;enemy.forgetUntil=0;}
    if(!player.airborne&&!inHarbour(player)&&(playerContact||distance(player,m)<WILD.blastRadius+24)){
      // Distinct contact explosions are not silently cancelled by a recent bite's immunity window.
      takeDamage(WILD.mineHullDamage[level],'Abandoned mine blast',true);
    }
    if(distance(player,m)<280)player.noise=Math.min(100,player.noise+35);persist();
    if(running&&distance(player,m)<500)announce('ABANDONED MINE DETONATED',1.7);
    return true;
  }
  function ventStage(v,time=clock){
    if(v.disabled)return {name:'dormant',power:0,phase:0};
    const phase=((time+v.phase)%v.period+v.period)%v.period;
    if(phase<7)return {name:'quiet',power:0,phase};
    if(phase<10)return {name:'warning',power:(phase-7)/3,phase};
    if(phase<13)return {name:'active',power:Math.min(1,(phase-10)*4,(13-phase)*3),phase};
    return {name:'settling',power:Math.max(0,1-(phase-13)/2),phase};
  }
  function inVent(v,x,y){return x>v.x-v.rx&&x<v.x+v.rx&&y<v.y-8&&y>v.y-v.height;}
  function ventFlowAt(x,y){
    if(!wildEnabled||y<SURFACE.y||Math.hypot(x-HARBOUR.x,y-HARBOUR.y)<HARBOUR.exclusionRadius)return 0;
    let flow=0;
    for(const v of scene.ventFields||[]){if(inVent(v,x,y)){const stage=ventStage(v);if(stage.name==='active')flow-=v.lift*stage.power*(1-Math.abs(x-v.x)/(v.rx*1.3));}}
    return Math.max(-62,flow);
  }
  function wildSound(kind,point,range=350,cooldown=2){
    if(!player||!running||paused||document.hidden)return;
    const d=distance(point,player);if(d>range)return;
    if(clock<(wildSoundTimers[kind]??-100))return;
    wildSoundTimers[kind]=clock+cooldown;
    window.AbyssAudio?.event(kind,clamp((point.x-player.x)/260,-1,1),clamp(1-d/range,.08,1));
  }
  function updateWildWaters(dt){
    if(!wildEnabled)return;
    for(const m of scene.derelictMines||[]){
      Object.assign(m,mineLocation(m));if(m.detonated)continue;
      const playerContact=!player.airborne&&!inHarbour(player)&&SHIP_OFFSETS.some(o=>derelictContact(m,player,dt,SHIP_RADIUS,o));
      const enemyContacts=scene.predators.filter(e=>predatorAlive(e)&&derelictContact(m,e,dt,e.tier==='reaper'?23:e.tier==='apex'?19:14));
      if(playerContact||enemyContacts.length){detonateDerelict(m,playerContact,enemyContacts);if(!running)return;}
      else if(distance(m,player)<235)wildSound('chain',m,280,6.5);
    }
    for(const v of scene.ventFields||[]){
      const stage=ventStage(v),previous=ventStage(v,clock-dt);
      if(stage.name==='warning')wildSound('ventWarning',v,380,2.5);
      if(stage.name==='active'&&previous.name!=='active')wildSound('ventErupt',v,480,1);
      if(stage.name==='active'&&stage.power>.2&&inVent(v,player.x,player.y)&&v.damage>0&&clock-(player.ventHitAt??-100)>.85){
        player.ventHitAt=clock;takeDamage(v.damage,'Thermal plume');if(!running)return;
      }
    }
    scene.predators=scene.predators.filter(predatorAlive);
    updateFishSchools(dt);updateBenthos(dt);
    if(inHarbour(player))wildSound('harbour',HARBOUR,440,10);
    if(giantSite&&distance(giantSite,player)<giantSite.w/2+100)wildSound('wreckGroan',giantSite,giantSite.w/2+170,14);
    if(depthOf(player.y)>350){const wreck=scene.wrecks.find(w=>distance(w,player)<270);if(wreck)wildSound('wreckGroan',wreck,380,11);}
  }
  function updateFishSchools(dt){
    const visible=(scene.schools||[]).filter(s=>onscreen(s.x,s.y,420)).sort((a,b)=>distance(a,player)-distance(b,player)).slice(0,WILD.maxActiveSchools);
    wildActiveSchools=visible.length;
    for(const s of visible){
      const spec=FISH[s.species],fish=s.fish;if(!fish.length)continue;
      // The school centre follows its members. No indexed slots, rows or grids.
      const cx=fish.reduce((v,f)=>v+f.x,0)/fish.length,cy=fish.reduce((v,f)=>v+f.y,0)/fish.length;
      s.x=cx;s.y=cy;
      const threats=scene.predators.filter(e=>predatorAlive(e)&&distance(e,s)<330);
      const predator=threats.sort((a,b)=>distance(a,s)-distance(b,s))[0];
      const pd=distance(player,s),boatRadius=player.boosting?265:170;
      const boatFear=pd<boatRadius,sonarFear=s.sonarUntil>clock,predatorFear=Boolean(predator&&distance(predator,s)<245);
      const wasFrightened=s.fear>.4,targetFear=predatorFear||sonarFear||player.boosting&&boatFear?1:boatFear?.7:0;
      s.fear=lerp(s.fear,targetFear,1-Math.exp(-dt*(targetFear>s.fear?4.5:.48)));
      if(!wasFrightened&&s.fear>.4&&boatFear)wildSound('schoolRush',s,270,4);
      let desired=s.heading+Math.sin(clock*.23+s.phase)*.24+Math.sin(clock*.071+s.phase*2)*.13;
      let threat=null;
      if(predatorFear)threat=predator;
      else if(boatFear)threat=player;
      else if(sonarFear)threat={x:s.sonarX??player.x,y:s.sonarY??player.y};
      if(threat)desired=Math.atan2(cy-threat.y,cx-threat.x);
      else if(Math.hypot(cx-s.homeX,cy-s.homeY)>330)desired=Math.atan2(s.homeY-cy,s.homeX-cx);
      const ahead={x:cx+Math.cos(desired)*70,y:cy+Math.sin(desired)*70};
      if(!wildClear(ahead.x,ahead.y,18))for(const offset of [.8,-.8,1.5,-1.5,2.2,-2.2]){
        const a=desired+offset;if(wildClear(cx+Math.cos(a)*70,cy+Math.sin(a)*70,18)){desired=a;break;}
      }
      s.heading=lerpAngle(s.heading,desired,1-Math.exp(-dt*(s.fear>.3?1.8:.55)));
      const hx=Math.cos(s.heading),hy=Math.sin(s.heading),water=currentAt(cx,cy),base=spec.speed*(1+s.fear*2.2);
      // Snapshot positions/velocities: iteration order must not turn into a grid.
      const before=fish.map(f=>({x:f.x,y:f.y,vx:f.vx,vy:f.vy}));
      for(let i=0;i<fish.length;i++){
        const f=fish[i],old=before[i];
        if(!Number.isFinite(f.wanderState))f.wanderState=((Math.abs(Math.sin(f.phase+1))*0xffffffff)>>>0)||1;
        const random=()=>{f.wanderState=(Math.imul(f.wanderState,1664525)+1013904223)>>>0;return f.wanderState/4294967296;};
        f.paceTimer=(f.paceTimer??0)-dt;
        if(f.paceTimer<=0){f.paceTarget=.76+random()*.48;f.wanderTarget=(random()-.5)*1.2;f.paceTimer=1.2+random()*2.8;}
        f.pace=lerp(f.pace??1,f.paceTarget,1-Math.exp(-dt*.9));
        f.wander=lerp(f.wander??0,f.wanderTarget,1-Math.exp(-dt*.75));
        const longitudinal=(old.x-cx)*hx+(old.y-cy)*hy;
        // Rear fish catch up; leaders ease off, without fixed positions.
        const catchUp=clamp(1-longitudinal/(110+s.fear*140),.65,1.5);
        const swim=base*f.pace*catchUp,a=s.heading+f.wander+Math.sin(clock*(.7+f.size*.3)+f.phase)*.12;
        let tx=Math.cos(a)*swim,ty=Math.sin(a)*swim,alignX=0,alignY=0,neighbors=0;
        const sep=20+s.fear*31;
        for(let j=0;j<before.length;j++){
          if(j===i)continue;const g=before[j],dx=old.x-g.x,dy=old.y-g.y,d=Math.hypot(dx,dy);
          if(d<140+s.fear*70){alignX+=g.vx;alignY+=g.vy;neighbors++;}
          if(d<sep){const ang=d>.01?Math.atan2(dy,dx):f.phase;const force=(1-d/sep)*(35+s.fear*55);tx+=Math.cos(ang)*force;ty+=Math.sin(ang)*force;}
        }
        if(neighbors){tx+=(alignX/neighbors-old.vx)*.13;ty+=(alignY/neighbors-old.vy)*.13;}
        const centreDistance=Math.hypot(cx-old.x,cy-old.y),cohesion=centreDistance>240+s.fear*160?.65:s.fear>.3?.06:.22;
        tx+=(cx-old.x)*cohesion;ty+=(cy-old.y)*cohesion;
        if(threat){
          const dx=old.x-threat.x,dy=old.y-threat.y,d=Math.hypot(dx,dy),reach=player.boosting?320:235;
          if(d<reach){const flee=base*1.8*(1-d/reach)+28;const angle=d>.01?Math.atan2(dy,dx):f.phase;tx+=Math.cos(angle)*flee;ty+=Math.sin(angle)*flee;}
        }
        for(const rock of nearbyWildRocks(old.x,old.y)){
          const dx=old.x-rock.x,dy=old.y-rock.y,d=Math.hypot(dx,dy),edge=rock.radius+25;
          if(d<edge){tx+=dx/(d||1)*(edge-d)*2.8;ty+=dy/(d||1)*(edge-d)*2.8;}
        }
        const prospective=Math.atan2(ty,tx),look=22;
        if(!wildClear(old.x+Math.cos(prospective)*look,old.y+Math.sin(prospective)*look,7)){
          for(const offset of [1,-1,1.8,-1.8,Math.PI]){const angle=prospective+offset;
            if(wildClear(old.x+Math.cos(angle)*look,old.y+Math.sin(angle)*look,7)){tx=Math.cos(angle)*swim;ty=Math.sin(angle)*swim;break;}}
        }
        const response=1-Math.exp(-dt*(s.fear>.3?3:1.8));
        f.vx=lerp(old.vx,tx+water.x*.4,response);f.vy=lerp(old.vy,ty+ventFlowAt(old.x,old.y)*.2,response);
        const speed=Math.hypot(f.vx,f.vy),cap=base*2;if(speed>cap){f.vx*=cap/speed;f.vy*=cap/speed;}
        // Swept swimming, including at the fast scatter speed.
        const steps=Math.max(1,Math.ceil(Math.hypot(f.vx,f.vy)*dt/5));
        for(let k=0;k<steps;k++){
          const x=f.x+f.vx*dt/steps,y=f.y+f.vy*dt/steps;
          if(wildClear(x,y,6)){f.x=x;f.y=y;}
          else if(wildClear(x,f.y,6)){f.x=x;f.vy*=.3;}
          else if(wildClear(f.x,y,6)){f.y=y;f.vx*=.3;}
          else{f.vx*=.5;f.vy*=.5;break;}
        }
        if(Math.hypot(f.vx,f.vy)>2)f.angle=lerpAngle(f.angle,Math.atan2(f.vy,f.vx),1-Math.exp(-dt*5));
      }
      s.x=fish.reduce((v,f)=>v+f.x,0)/fish.length;s.y=fish.reduce((v,f)=>v+f.y,0)/fish.length;
    }
  }
  function updateBenthos(dt){
    for(const b of scene.benthos||[]){
      if(!onscreen(b.x,b.y,120))continue;
      const d=distance(player,b),lit=headlightsActive()&&beamIntersects(b.x,b.y,12);
      const alarm=player.boosting&&d<190?1:d<70?1:lit&&d<230?.8:0;
      b.retreat=lerp(b.retreat,alarm,Math.min(1,dt*(alarm>b.retreat?5:.65)));
      if(b.kind===1&&d<70&&Math.hypot(player.vx,player.vy)>35)wildSound('kelp',b,150,3.8);
    }
  }
  function drawDerelict(m,echo=false){
    if(m.detonated)return;
    const p=mineLocation(m);ctx.save();
    ctx.lineWidth=echo?1.1:1.5;ctx.strokeStyle=echo?'#f4af7b':'#6e807d';
    if(!echo){ctx.setLineDash([3,3]);}
    ctx.beginPath();ctx.moveTo(p.x,p.y+12);ctx.quadraticCurveTo(m.anchorX-8,m.anchorY-m.tether*.4,m.anchorX,m.anchorY);ctx.stroke();ctx.setLineDash([]);
    if(!echo){ctx.fillStyle='#34464b';ctx.beginPath();ctx.moveTo(m.anchorX-14,m.anchorY);ctx.lineTo(m.anchorX-8,m.anchorY-6);ctx.lineTo(m.anchorX+9,m.anchorY-6);ctx.lineTo(m.anchorX+15,m.anchorY);ctx.closePath();ctx.fill();}
    ctx.translate(p.x,p.y);ctx.rotate(Math.sin(clock*.65+m.phase)*.10);
    ctx.strokeStyle=echo?'#ffc28e':'#bd926e';ctx.lineWidth=echo?1.2:2;
    for(let i=0;i<8;i++){const a=i*TAU/8;ctx.beginPath();ctx.moveTo(Math.cos(a)*12,Math.sin(a)*12);ctx.lineTo(Math.cos(a)*20,Math.sin(a)*20);ctx.stroke();if(!echo){ctx.fillStyle='#9c805e';ctx.beginPath();ctx.arc(Math.cos(a)*20,Math.sin(a)*20,2,0,TAU);ctx.fill();}}
    ctx.beginPath();ctx.arc(0,0,13,0,TAU);
    if(!echo){const g=ctx.createRadialGradient(-5,-5,1,0,0,16);g.addColorStop(0,'#6f7c78');g.addColorStop(.5,'#4b5c5d');g.addColorStop(1,'#19292e');ctx.fillStyle=g;ctx.fill();}
    ctx.stroke();
    if(!echo){ctx.strokeStyle='#ba864980';ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,0,9,.3,2.1);ctx.stroke();ctx.fillStyle='#bb705970';ctx.fillRect(-7,-5,4,3);ctx.fillRect(3,5,3,2);}
    ctx.strokeStyle=echo?'#ffd0a2':'#efbf7d';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,-5);ctx.lineTo(4,3);ctx.lineTo(-4,3);ctx.closePath();ctx.stroke();ctx.fillStyle=ctx.strokeStyle;ctx.fillRect(-.5,-2,1,3);
    if(echo){ctx.font='bold 8px monospace';ctx.textAlign='center';ctx.fillText('CONTACT MINE',0,-28);}
    ctx.restore();
  }
  function drawVentField(v,echo=false){
    const stage=ventStage(v);ctx.save();ctx.translate(v.x,v.y);
    ctx.strokeStyle=echo?'#eabb91':'#626d67';ctx.fillStyle='#273332';ctx.lineWidth=1.3;
    ctx.beginPath();ctx.moveTo(-23,0);ctx.lineTo(-13,-18);ctx.lineTo(-6,-13);ctx.lineTo(0,-26);ctx.lineTo(9,-15);ctx.lineTo(13,-19);ctx.lineTo(24,0);ctx.closePath();if(!echo)ctx.fill();ctx.stroke();
    const hot=stage.name==='active',warning=stage.name==='warning';
    if(echo){ctx.setLineDash([3,5]);ctx.beginPath();ctx.moveTo(-v.rx,-25);ctx.lineTo(-v.rx,-v.height);ctx.lineTo(v.rx,-v.height);ctx.lineTo(v.rx,-25);ctx.stroke();ctx.setLineDash([]);ctx.font='8px monospace';ctx.textAlign='center';ctx.fillStyle=ctx.strokeStyle;ctx.fillText(v.damage>0?'THERMAL VENT':'BUBBLE SEEP',0,14);}
    else{
      const count=hot?24:warning?10:5,progress=hot?1:warning?.45:.2;
      if(hot){const g=ctx.createLinearGradient(0,0,0,-v.height);g.addColorStop(0,v.damage>0?'#b7906640':'#9ad4d13b');g.addColorStop(1,'#b8d1cf00');ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(-10,-12);ctx.quadraticCurveTo(-v.rx*1.4,-v.height*.5,-v.rx*.7,-v.height);ctx.lineTo(v.rx*.8,-v.height);ctx.quadraticCurveTo(v.rx*1.4,-v.height*.5,10,-12);ctx.fill();}
      for(let i=0;i<count;i++){const phase=(clock*(hot?.8:.24)+i*.137+v.phase)%1,yy=-18-phase*v.height*progress,xx=Math.sin(i*2.1+clock*.8)*v.rx*phase;
        ctx.strokeStyle=hot?'#b8c7bc77':warning?'#d5b79680':'#88c6bb60';ctx.lineWidth=.8;ctx.beginPath();ctx.arc(xx,yy,1.5+(i%4)*.65,0,TAU);ctx.stroke();}
      if(warning){ctx.fillStyle='#d8b682';ctx.globalAlpha=.45+Math.sin(clock*5)*.2;ctx.beginPath();ctx.ellipse(0,-17,7,3,0,0,TAU);ctx.fill();}
    }
    ctx.restore();
  }
  function drawFish(s,f,echo=false){
    const spec=FISH[s.species],size=spec.size*f.size;
    ctx.save();ctx.translate(f.x,f.y);ctx.rotate(f.angle);ctx.scale(size/8,size/8);
    ctx.globalAlpha*=echo?.65:s.species===3?.72:.95;
    const tail=Math.sin(clock*(s.fear>.3?17:9)+f.phase)*3;
    ctx.fillStyle=echo?'#92d5d1':spec.fin;ctx.strokeStyle=echo?'#a2e0da':spec.edge;ctx.lineWidth=.75;
    ctx.beginPath();ctx.moveTo(-5,0);ctx.lineTo(-11,tail-4);ctx.lineTo(-9,tail);ctx.lineTo(-11,tail+4);ctx.closePath();ctx.fill();
    if(spec.shape==='ribbon'){
      ctx.strokeStyle=echo?'#92d5d1':spec.fin;ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(-6,-1);ctx.bezierCurveTo(-12,tail-3,-18,tail+5,-24,tail+1);ctx.moveTo(-1,2);ctx.quadraticCurveTo(-7,9+tail,-14,6+tail);ctx.stroke();
    }
    ctx.fillStyle=echo?'#9edbd4':spec.body;
    ctx.beginPath();
    if(spec.shape==='glass'){ctx.moveTo(7,0);ctx.quadraticCurveTo(0,-2,-1,-7);ctx.lineTo(-6,0);ctx.lineTo(-1,7);ctx.quadraticCurveTo(0,2,7,0);}
    else{const h=spec.shape==='reef'?5:spec.shape==='ribbon'?2.8:2.3;ctx.moveTo(8,0);ctx.bezierCurveTo(2,-h,-4,-h,-6,0);ctx.bezierCurveTo(-4,h,2,h,8,0);}
    ctx.fill();if(!echo)ctx.stroke();
    if(!echo){
      if(spec.shape==='reef'){ctx.strokeStyle='#665b4f';ctx.lineWidth=1.5;for(const x of [-2,1]){ctx.beginPath();ctx.moveTo(x,-3.7);ctx.lineTo(x-.5,3.7);ctx.stroke();}}
      else if(spec.shape==='dart'){ctx.strokeStyle='#e4f4ee';ctx.lineWidth=.65;ctx.beginPath();ctx.moveTo(-4,-.4);ctx.lineTo(5,-.4);ctx.stroke();}
      ctx.fillStyle='#172f36';ctx.beginPath();ctx.arc(4.6,-.6,.8,0,TAU);ctx.fill();
    }
    ctx.restore();
  }
  function drawBenthos(b){
    const amount=1-b.retreat*.88,size=b.size,sway=Math.sin(clock*.8+b.phase)*5,colors=['#cba295','#76ac94','#b38e75','#aea9cb'];
    ctx.save();ctx.translate(b.x,b.y);ctx.strokeStyle=colors[b.kind];ctx.fillStyle=colors[b.kind];ctx.globalAlpha=.8;ctx.lineWidth=1.3;
    if(b.kind===0){ // Anemone tentacles fold into a low, rounded crown.
      ctx.beginPath();ctx.ellipse(0,-2,9,4,0,0,TAU);ctx.fill();
      for(let j=-3;j<=3;j++){ctx.beginPath();ctx.moveTo(j*2,-2);ctx.quadraticCurveTo(j*4+sway,-size*.45*amount,j*4+sway*.6,-size*amount+Math.abs(j)*2);ctx.stroke();}
    }else if(b.kind===1){ // A delicate fan bending in the current, not a new collider.
      const lean=sway+clamp(currentAt(b.x,b.y).x*.2,-7,7)+b.retreat*5;
      ctx.strokeStyle='#80afa0';ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(lean,-size);ctx.stroke();
      for(let j=-3;j<=3;j++){ctx.beginPath();ctx.moveTo(lean*.35,-size*.35);ctx.quadraticCurveTo(lean+j*3,-size*.7,lean+j*5,-size+Math.abs(j)*1.6);ctx.stroke();}
    }else if(b.kind===2){ // Crab retreats into its rock crevice.
      ctx.translate(b.retreat*14,2*b.retreat);ctx.scale(amount,amount);ctx.beginPath();ctx.ellipse(0,-3,6,3.6,0,0,TAU);ctx.fill();
      for(const side of [-1,1]){for(let j=0;j<3;j++){ctx.beginPath();ctx.moveTo(side*4,-3);ctx.lineTo(side*(9+j),-5+j*3+Math.sin(clock*7+b.phase+j)*b.retreat);ctx.stroke();}ctx.beginPath();ctx.moveTo(side*4,-4);ctx.lineTo(side*9,-10);ctx.lineTo(side*7,-12);ctx.stroke();}
    }else{
      for(let j=-2;j<=2;j++){const h=(size+Math.sin(b.phase+j)*5)*amount;ctx.strokeStyle='#707b82';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(j*4,0);ctx.lineTo(j*4,-size*.45);ctx.stroke();ctx.strokeStyle='#c1b5ce';ctx.lineWidth=.9;
        for(let k=-1;k<=1;k++){ctx.beginPath();ctx.moveTo(j*4,-size*.4);ctx.quadraticCurveTo(j*4+k*5+sway*.3,-h,j*4+k*5,-h-3);ctx.stroke();}}
    }
    ctx.restore();
  }
  function drawWildLife(){
    if(!wildEnabled)return;
    for(const s of scene.schools||[])if(onscreen(s.x,s.y,160))for(const f of s.fish)if(onscreen(f.x,f.y,25))drawFish(s,f);
  }
  function drawWildSeabed(){
    if(!wildEnabled)return;
    for(const b of scene.benthos||[])if(onscreen(b.x,b.y,65))drawBenthos(b);
    for(const v of scene.ventFields||[])if(onscreen(v.x,v.y,v.height))drawVentField(v);
    for(const m of scene.derelictMines||[])if(onscreen(m.anchorX,m.anchorY,m.tether+40))drawDerelict(m);
  }
  function drawWildEchoes(){
    if(!wildEnabled)return;
    ctx.save();ctx.translate(-camera.x,-camera.y);
    for(const m of scene.derelictMines||[])if(!m.detonated&&m.revealUntil>clock&&onscreen(m.x,m.y,150)){ctx.globalAlpha=clamp((m.revealUntil-clock)/(m.echoDuration||4.5),0,.85);drawDerelict(m,true);}
    for(const v of scene.ventFields||[])if(v.revealUntil>clock&&onscreen(v.x,v.y,v.height)){ctx.globalAlpha=clamp((v.revealUntil-clock)/(v.echoDuration||4.5),0,.8);drawVentField(v,true);}
    for(const s of scene.schools||[])if(s.revealUntil>clock&&onscreen(s.x,s.y,150)){ctx.globalAlpha=clamp((s.revealUntil-clock)/2,0,.5);for(const f of s.fish)drawFish(s,f,true);}
    ctx.restore();
  }
  function captureWildlife(){return {version:1,schools:(scene.schools||[]).map(s=>({...s,fish:s.fish.map(f=>({...f}))})),benthos:(scene.benthos||[]).map(b=>b.retreat)};}
  function restoreWildlife(data){
    if(!data||data.version!==1)return;
    if(Array.isArray(data.schools))for(const s of scene.schools||[]){
      const found=data.schools.find(v=>v?.id===s.id);
      const point=p=>p&&['x','y','vx','vy','angle','size','phase'].every(k=>Number.isFinite(p[k]))&&Math.abs(p.x)<3000&&p.y>70&&p.y<MAX_WORLD_Y&&p.size>0&&p.size<2;
      if(found&&['x','y','heading','fear'].every(k=>Number.isFinite(found[k]))&&Array.isArray(found.fish)&&found.fish.length<=14&&found.fish.every(point)){
        for(const key of ['x','y','heading','fear','sonarUntil','sonarX','sonarY','revealUntil'])if(Number.isFinite(found[key]))s[key]=found[key];
        s.fish=found.fish.map(f=>({...f}));
      }
    }
    if(Array.isArray(data.benthos))for(const [i,b] of (scene.benthos||[]).entries())b.retreat=clamp(Number(data.benthos[i])||0,0,1);
  }

  // === Persistent, partial survey chart; no remote omniscient loot or enemies ===
  let surveyCells=new Set(),surveyThreats=[],surveyTimer=0,sonarSurveyTimer=0;
  let explorerReturnPause=false,explorerReturnFocus=null;
  const mapView={x:600,y:700,scale:.18,w:600,h:480,drag:null,pointers:new Map(),pinch:null};
  const surveyKey=(x,y)=>Math.floor((x-SURVEY.left)/SURVEY.cell)+':'+Math.floor((y-SURFACE.y)/SURVEY.cell);
  function hydrateSurvey(){
    field.survey=normaliseSurvey(field.survey);surveyCells=new Set(field.survey.cells);surveyThreats=[];surveyTimer=0;
    field.survey.contacts.station={x:HARBOUR.x,y:HARBOUR.y,type:'station',label:'NEREID HARBOUR',collected:false};
  }
  function markSurveyCell(x,y){
    if(y<SURFACE.y||y>MAX_WORLD_Y||x<leftAt(y)-50||x>rightAt(y)+50)return;
    const key=surveyKey(x,y);if(!surveyCells.has(key)){surveyCells.add(key);field.survey.cells.push(key);}
  }
  function chartArea(x,y,radius,predicate=null){
    const size=SURVEY.cell;
    for(let cy=Math.max(0,Math.floor((y-radius-SURFACE.y)/size));cy<=Math.floor((Math.min(MAX_WORLD_Y,y+radius)-SURFACE.y)/size);cy++){
      for(let cx=Math.floor((x-radius-SURVEY.left)/size);cx<=Math.floor((x+radius-SURVEY.left)/size);cx++){
        const px=SURVEY.left+(cx+.5)*size,py=SURFACE.y+(cy+.5)*size;
        if(Math.hypot(px-x,py-y)<=radius&&(!predicate||predicate(px,py)))markSurveyCell(px,py);
      }
    }
  }
  function rememberSurveyObject(kind,object){
    if(kind==='rescueObjects'){deepwater?.remember(object);return;}
    if(kind==='predators'){
      if(!predatorAlive(object))return;
      const id=object.id??('contact-'+Math.round(object.homeX)+'-'+Math.round(object.homeY));
      surveyThreats=surveyThreats.filter(c=>c.id!==id&&c.until>clock);
      surveyThreats.push({id,x:object.x,y:object.y,tier:object.tier,until:clock+SURVEY.contactLife});return;
    }
    if(kind==='giantObjects'){rememberGiantObject(object);return;}
    if(!['items','wrecks','landmarks','derelictMines','ventFields'].includes(kind))return;
    const type=kind==='items'?object.type:kind==='wrecks'?'wreck':kind==='derelictMines'?'derelict':kind==='ventFields'?'thermal':'landmark';
    const id=kind+':'+(object.id??object.index);
    field.survey.contacts[id]={x:object.x,y:object.y,type,label:kind==='derelictMines'?'CONTACT MINE':kind==='ventFields'?'THERMAL VENT':kind==='landmarks'?object.name:type==='recorder'?'RECORDER '+(object.index+1):type==='recovery'?(object.kind==='wreck'?'LOST VESSEL':'RECOVERY POD'):type==='battery'?'BATTERY CELL · +25 POWER':type.toUpperCase(),collected:Boolean(object.collected||object.detonated)};
  }
  function surveyVisibleWater(){
    if(!player||!field.survey)return;
    const ambient=ambientLightAt(player.y),radius=ambient>.08?100+ambient*95:0;
    // The vessel always knows its own approximate grid square. Scenery beyond it
    // is charted only by actual local visibility or a passing sonar wave.
    markSurveyCell(player.x,Math.max(SURFACE.y,player.y));
    if(radius)chartArea(player.x,player.y,radius);
    if(headlightsActive())chartArea(player.x,player.y,flashlightSpec().length,(x,y)=>beamIntersects(x,y,0));
    for(const kind of ['items','predators','wrecks','landmarks','derelictMines','ventFields','giantObjects','rescueObjects'])for(const object of (scene[kind]||[])){
      if(object.collected||object.dead||object.detonated)continue;
      const d=distance(player,object);
      const inBeam=headlightsActive()&&beamIntersects(object.x,object.y,0);
      if(d<radius||inBeam||object.revealUntil>clock)rememberSurveyObject(kind,object);
    }
    surveyThreats=surveyThreats.filter(c=>c.until>clock);
  }
  function surveySonarWave(wave,previous){
    const front=wave.front;
    // Terrain is logged on arrival, not when the scan button is pressed.
    chartArea(wave.x,wave.y,front,(x,y)=>Math.hypot(x-wave.x,y-wave.y)>=Math.max(0,previous-SURVEY.cell));
  }
  function openExplorerDialog(id){
    if(document.querySelector('#surveyDialog[open],#audioDialog[open],#telemetryDialog[open],#signalsDialog[open],#rescueDialog[open]'))return false;
    explorerReturnPause=paused;explorerReturnFocus=document.activeElement;
    paused=true;resetPilotInput();deepwater?.pauseReset();persist();
    $(id).showModal();syncPauseButtons();audioFrame();return true;
  }
  function closeExplorerDialog(id){
    if(!$(id).open)return;
    $(id).close();mapView.drag=null;mapView.pointers.clear();mapView.pinch=null;
    paused=explorerReturnPause;syncPauseButtons();
    if(explorerReturnFocus?.isConnected)explorerReturnFocus.focus({preventScroll:true});
    if(running&&!paused)window.AbyssAudio?.unlock();
    updateUI();persist();
  }
  function closeExplorationDialogs(){
    for(const id of ['surveyDialog','audioDialog','telemetryDialog','signalsDialog'])if($(id)?.open)$(id).close();
    mapView.pointers.clear();mapView.drag=null;mapView.pinch=null;
  }
  function openSurvey(){
    if(!running||$('upgradeDialog').open||$('achievementsDialog').open)return;
    if(!openExplorerDialog('surveyDialog'))return;
    mapView.x=player.x;mapView.y=Math.max(100,player.y);mapView.scale=Math.min(.45,Math.max(.12,window.innerWidth/2100));
    $('surveyTitle').textContent=currentLevel().name;
    $('surveySummary').textContent='LEVEL '+(LEVELS.findIndex(l=>l.id===LEVEL_ID)+1)+' / 5 · '+currentLevel().depth.toLocaleString('en-GB')+' m SEABED · '+saved.secured.length+'/'+RECORDERS_TOTAL+' RECORDERS BANKED';
    $('mapMessage').textContent=field.recoveries.length?field.recoveries.length+' RECOVERY SITE'+(field.recoveries.length===1?'':'S')+' · amber diamonds mark your lost cargo. Drag to pan; tap surveyed water to pin.':'Drag to pan. Tap surveyed water to pin a waypoint. Unknown regions stay hidden.';
    sizeSurvey();$('surveyClose').focus({preventScroll:true});
  }
  function sizeSurvey(){
    if(!$('surveyDialog').open)return;
    const c=$('surveyCanvas'),rect=c.getBoundingClientRect(),dpr=Math.min(2,devicePixelRatio||1);
    mapView.w=Math.max(1,rect.width);mapView.h=Math.max(1,rect.height);c.width=Math.round(mapView.w*dpr);c.height=Math.round(mapView.h*dpr);
    clampMap();drawSurvey();
  }
  const chartPoint=(x,y)=>({x:(x-mapView.x)*mapView.scale+mapView.w/2,y:(y-mapView.y)*mapView.scale+mapView.h/2});
  const chartWorld=(x,y)=>({x:(x-mapView.w/2)/mapView.scale+mapView.x,y:(y-mapView.h/2)/mapView.scale+mapView.y});
  function clampMap(){
    mapView.scale=clamp(mapView.scale,.018,1.2);
    mapView.x=clamp(mapView.x,SURVEY.minX,SURVEY.maxX);
    const half=mapView.h/(2*mapView.scale),margin=30/mapView.scale;
    mapView.y=MAX_WORLD_Y-SURFACE.y<2*half?(SURFACE.y+MAX_WORLD_Y)/2:clamp(mapView.y,SURFACE.y+half-margin,MAX_WORLD_Y-half+margin);
  }
  function mapZoom(factor,anchor=null){
    const p=anchor||{x:mapView.w/2,y:mapView.h/2},before=chartWorld(p.x,p.y);
    mapView.scale=clamp(mapView.scale*factor,.018,1.2);
    const after=chartWorld(p.x,p.y);mapView.x+=before.x-after.x;mapView.y+=before.y-after.y;clampMap();drawSurvey();
  }
  function setWaypoint(x,y){
    if(y<SURFACE.y||y>MAX_WORLD_Y||!surveyCells.has(surveyKey(x,y))||giantSolid(x,y,14)||x<leftAt(y)+14||x>rightAt(y)-14||scene.rocks.some(r=>Math.hypot(r.x-x,r.y-y)<r.radius+12&&insidePolygon(x,y,r.vertices))){
      $('mapMessage').textContent='Choose surveyed open water. Explore or scan first to chart an unknown route.';return false;
    }
    field.survey.waypoint={x,y};persist();$('mapMessage').textContent='WAYPOINT SET · '+depthOf(y)+' m DEPTH · '+Math.round(distance(player,{x,y})/10)+' m FROM SUB';drawSurvey();updateUI();return true;
  }
  function drawSurvey(){
    if(!$('surveyDialog').open)return;
    const c=$('surveyCanvas'),g=c.getContext('2d'),W=mapView.w,H=mapView.h,scale=mapView.scale,dpr=c.width/W;
    g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,W,H);g.fillStyle='#030c14';g.fillRect(0,0,W,H);
    const step=scale>.25?500:scale>.07?1000:2500;
    g.font='10px ui-monospace,monospace';g.textAlign='left';
    for(let y=Math.max(120,Math.floor((mapView.y-H/(2*scale))/step)*step+120);y<=mapView.y+H/(2*scale)&&y<=MAX_WORLD_Y;y+=step){
      const p=chartPoint(0,y);g.strokeStyle='#28445550';g.lineWidth=.7;g.beginPath();g.moveTo(0,p.y);g.lineTo(W,p.y);g.stroke();g.fillStyle='#668b9c';g.fillText(depthOf(y)+' m',9,p.y-5);
    }
    // Clip the terrain to surveyed grid squares. Unvisited boundaries and rocks
    // never leak through the fog, even in overview mode.
    g.save();g.beginPath();
    for(const key of surveyCells){const [cx,cy]=key.split(':').map(Number),p=chartPoint(SURVEY.left+cx*SURVEY.cell,SURFACE.y+cy*SURVEY.cell),size=SURVEY.cell*scale;
      if(p.x>W||p.y>H||p.x+size<0||p.y+size<0)continue;g.rect(p.x,p.y,size+.5,size+.5);}
    g.clip();g.fillStyle='#12303d';g.fillRect(0,0,W,H);
    g.strokeStyle='#356674';g.lineWidth=1;
    for(const side of [-1,1]){g.beginPath();for(let y=Math.max(SURFACE.y,mapView.y-H/(2*scale)-60);y<=Math.min(MAX_WORLD_Y,mapView.y+H/(2*scale)+60);y+=45){const p=chartPoint(side<0?leftAt(y):rightAt(y),y);if(y===Math.max(SURFACE.y,mapView.y-H/(2*scale)-60))g.moveTo(p.x,p.y);else g.lineTo(p.x,p.y);}g.stroke();}
    g.fillStyle='#355361';g.strokeStyle='#68919b88';
    for(const r of scene.rocks){const p=chartPoint(r.x,r.y),radius=r.radius*scale;if(p.x<-radius||p.x>W+radius||p.y<-radius||p.y>H+radius)continue;
      g.beginPath();r.vertices.forEach((v,i)=>{const a=chartPoint(v.x,v.y);i?g.lineTo(a.x,a.y):g.moveTo(a.x,a.y);});g.closePath();g.fill();if(scale>.1)g.stroke();}
    drawGiantsChart(g);
    const floor=chartPoint(0,MAX_WORLD_Y);g.fillStyle='#52616c';g.fillRect(0,floor.y,W,H-floor.y);g.strokeStyle='#a4b5bc';g.beginPath();g.moveTo(0,floor.y);g.lineTo(W,floor.y);g.stroke();
    g.restore();
    for(const [id,contact] of Object.entries(field.survey.contacts)){
      if(contact.type==='airStation')continue; // The rescue chart draws live reserve status.
      const p=chartPoint(contact.x,contact.y);if(p.x<-20||p.x>W+20||p.y<-20||p.y>H+20)continue;
      let collected=contact.collected;
      if(contact.type==='plate')collected=giants.banked.includes(id.slice(7))||plateCarried(id.slice(7))||plateInRecovery(id.slice(7));
      if(contact.type==='giant')collected=giants.banked.includes(id.slice(7));
      if(id.startsWith('items:')){const object=scene.items.find(o=>'items:'+o.id===id);if(object)collected=object.collected;else if(contact.type==='recorder')collected=saved.secured.includes(Number(id.split('-').at(-1)))||player.cargo.recorders.includes(Number(id.split('-').at(-1)))||recorderInRecovery(Number(id.split('-').at(-1)));}
      g.save();g.translate(p.x,p.y);g.lineWidth=1.4;
      if(collected){g.strokeStyle='#6f9b9477';g.beginPath();g.moveTo(-3,0);g.lineTo(0,3);g.lineTo(5,-4);g.stroke();}
      else if(contact.type==='battery'){g.strokeStyle='#f2d48b';g.strokeRect(-4,-6,8,12);g.beginPath();g.moveTo(1,-3);g.lineTo(-1,0);g.lineTo(1,0);g.lineTo(-1,3);g.stroke();}
      else if(contact.type==='derelict'){g.strokeStyle='#e6a477';g.beginPath();g.arc(0,0,4,0,TAU);for(let i=0;i<4;i++){const a=i*TAU/4;g.moveTo(Math.cos(a)*4,Math.sin(a)*4);g.lineTo(Math.cos(a)*7,Math.sin(a)*7);}g.stroke();}
      else if(contact.type==='thermal'){g.strokeStyle='#b9cba6';g.beginPath();g.moveTo(-5,4);g.lineTo(0,-5);g.lineTo(5,4);g.stroke();}
      else if(contact.type==='giant'){g.strokeStyle='#a8ddd4';g.strokeRect(-9,-5,18,10);g.beginPath();g.moveTo(-4,-5);g.lineTo(-4,5);g.moveTo(4,-5);g.lineTo(4,5);g.stroke();}
      else if(contact.type==='plate'){g.strokeStyle='#f3cf88';g.strokeRect(-6,-4,12,8);}
      else if(contact.type==='recorder'||contact.type==='recovery'){g.strokeStyle=contact.type==='recorder'?'#f2cb87':'#f39476';g.beginPath();g.moveTo(0,-6);g.lineTo(5,0);g.lineTo(0,6);g.lineTo(-5,0);g.closePath();g.stroke();}
      else if(contact.type==='landmark'||contact.type==='station'||contact.type==='wreck'){
        g.strokeStyle=contact.type==='station'?'#92e4d4':'#afa6ce';g.strokeRect(-5,-5,10,10);
        if(scale>.08&&contact.type!=='wreck'){g.font='9px ui-monospace,monospace';g.fillStyle=g.strokeStyle;g.fillText(contact.label,9,-7);}
      }else{g.fillStyle=contact.type==='crystal'?'#c1a4ef':contact.type==='air'?'#8fbedd':'#8ac4b5';g.beginPath();g.arc(0,0,contact.type==='crystal'?2.5:2,0,TAU);g.fill();}
      if(contact.type==='recovery'&&!collected&&scale>.08){g.font='bold 9px ui-monospace,monospace';g.fillStyle='#ffbc95';g.fillText(contact.label,10,-7);}
      g.restore();
    }
    for(const threat of surveyThreats){
      if(threat.until<=clock)continue;const p=chartPoint(threat.x,threat.y);g.globalAlpha=clamp((threat.until-clock)/SURVEY.contactLife,.25,1);g.fillStyle='#ec8c85';g.beginPath();g.arc(p.x,p.y,3.5,0,TAU);g.fill();g.globalAlpha=1;
    }
    drawMissionChart(g);deepwater?.map(g,chartPoint);
    const pin=field.survey.waypoint;
    if(pin){const p=chartPoint(pin.x,pin.y);g.strokeStyle='#efd6a3';g.lineWidth=1.5;g.beginPath();g.arc(p.x,p.y,9,0,TAU);g.moveTo(p.x-13,p.y);g.lineTo(p.x+13,p.y);g.moveTo(p.x,p.y-13);g.lineTo(p.x,p.y+13);g.stroke();}
    const p=chartPoint(player.x,player.y);g.save();g.translate(p.x,p.y);g.rotate(player.facing);g.shadowColor='#a8ffe5';g.shadowBlur=9;g.fillStyle='#b9ffe6';g.beginPath();g.moveTo(8,0);g.lineTo(-5,-5);g.lineTo(-2,0);g.lineTo(-5,5);g.closePath();g.fill();g.restore();
    const metres=Math.round(80/scale/10);$('mapScale').textContent='80 px ≈ '+metres+' m';$('mapClear').disabled=!pin;
  }
  function bindSurvey(){
    $('surveyBtn').addEventListener('click',openSurvey);$('pauseMapBtn').addEventListener('click',openSurvey);
    $('surveyClose').addEventListener('click',()=>closeExplorerDialog('surveyDialog'));
    $('surveyDialog').addEventListener('cancel',e=>{e.preventDefault();closeExplorerDialog('surveyDialog');});
    $('mapZoomIn').addEventListener('click',()=>mapZoom(1.4));$('mapZoomOut').addEventListener('click',()=>mapZoom(1/1.4));
    $('mapCentre').addEventListener('click',()=>{mapView.x=player.x;mapView.y=player.y;mapView.scale=Math.min(.45,Math.max(.12,window.innerWidth/2100));clampMap();drawSurvey();});
    $('mapOverview').addEventListener('click',()=>{const left=giantSite?.side<0?Math.min(-600,giantSite.x-giantSite.w/2-130):-600,right=giantSite?.side>0?Math.max(1800,giantSite.x+giantSite.w/2+130):1800;mapView.x=(left+right)/2;mapView.y=MAX_WORLD_Y/2;mapView.scale=Math.min((mapView.w-55)/(right-left),(mapView.h-35)/(MAX_WORLD_Y+200));drawSurvey();});
    $('mapClear').addEventListener('click',()=>{field.survey.waypoint=null;persist();$('mapMessage').textContent='Waypoint cleared.';drawSurvey();updateUI();});
    const c=$('surveyCanvas'),local=e=>{const r=c.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};};
    c.addEventListener('pointerdown',e=>{
      if(e.pointerType==='mouse'&&e.button!==0)return;e.preventDefault();c.focus({preventScroll:true});c.setPointerCapture(e.pointerId);
      const p=local(e);mapView.pointers.set(e.pointerId,p);
      if(mapView.pointers.size===1)mapView.drag={id:e.pointerId,start:p,last:p,moved:false};
      else if(mapView.pointers.size===2){const [a,b]=[...mapView.pointers.values()];mapView.pinch=Math.hypot(a.x-b.x,a.y-b.y);if(mapView.drag)mapView.drag.moved=true;}
    });
    c.addEventListener('pointermove',e=>{
      if(!mapView.pointers.has(e.pointerId))return;e.preventDefault();const p=local(e);mapView.pointers.set(e.pointerId,p);
      if(mapView.pointers.size>=2){const [a,b]=[...mapView.pointers.values()],d=Math.hypot(a.x-b.x,a.y-b.y);if(mapView.pinch>4)mapZoom(d/mapView.pinch,{x:(a.x+b.x)/2,y:(a.y+b.y)/2});mapView.pinch=d;return;}
      const drag=mapView.drag;if(!drag||drag.id!==e.pointerId)return;
      if(Math.hypot(p.x-drag.start.x,p.y-drag.start.y)>6)drag.moved=true;
      if(drag.moved){mapView.x-=(p.x-drag.last.x)/mapView.scale;mapView.y-=(p.y-drag.last.y)/mapView.scale;clampMap();drawSurvey();}drag.last=p;
    });
    const release=e=>{
      if(!mapView.pointers.has(e.pointerId))return;
      if(e.type==='pointerup'&&mapView.pointers.size===1&&mapView.drag?.id===e.pointerId&&!mapView.drag.moved){const p=local(e),w=chartWorld(p.x,p.y);setWaypoint(w.x,w.y);}
      mapView.pointers.delete(e.pointerId);mapView.pinch=null;mapView.drag=null;
    };
    for(const event of ['pointerup','pointercancel','lostpointercapture'])c.addEventListener(event,release);
    c.addEventListener('wheel',e=>{e.preventDefault();mapZoom(Math.exp(-e.deltaY*.0015),local(e));},{passive:false});
    c.addEventListener('keydown',e=>{const k=e.key;if(k==='+'||k==='='){e.preventDefault();mapZoom(1.4);}else if(k==='-'){e.preventDefault();mapZoom(1/1.4);}else if(k==='Enter'){e.preventDefault();setWaypoint(mapView.x,mapView.y);}else if(k.startsWith('Arrow')){e.preventDefault();mapView.x+=(k==='ArrowRight'?1:k==='ArrowLeft'?-1:0)*60/mapView.scale;mapView.y+=(k==='ArrowDown'?1:k==='ArrowUp'?-1:0)*60/mapView.scale;clampMap();drawSurvey();}});
    new ResizeObserver(sizeSurvey).observe(c.parentElement);
  }

  // === Compact HUD, full telemetry on demand, and accessible sound controls ===
  function refreshFlashlightControl(){
    const button=$('telemetryLightsBtn');
    if(!button||!player)return;
    const status=!player.lights?'OFF':headlightsActive()?'ON':'NO POWER';
    button.textContent='FLASHLIGHT '+status+' · MK '+roman(saved.upgrades.flashlight);
    button.classList.toggle('active',player.lights);button.setAttribute('aria-pressed',String(player.lights));
    button.setAttribute('aria-label','Turn flashlight '+(player.lights?'off':'on'));
    button.title='Flashlight Mk '+roman(saved.upgrades.flashlight)+' · '+(flashlightSpec().length/10)+' m reach · '+(flashlightPowerRate()*60).toFixed(1)+' power/min';
  }
  function openTelemetry(){
    if(!running||!openExplorerDialog('telemetryDialog'))return;
    const rows=[['PRESSURE LIMIT',safeDepth().toLocaleString('en-GB')+' m'],['CURRENT DEPTH',depthOf(player.y).toLocaleString('en-GB')+' m'],
      ['HULL',Math.ceil(player.hull)+' / '+maxHull()+' HP'],['OXYGEN',Math.ceil(player.oxygen)+' / '+maxOxygen()],['AIR REMAINING',enduranceText(player.oxygen/oxygenRate())+' min:sec'],['PROPULSION',reserveDrive()?'RESERVE · 50% SPEED':(normalSpeedAt(saved.upgrades.engine)/10).toFixed(1)+' m/s CRUISE'],['POWER',Math.ceil(player.battery)+' / '+maxBattery()],
      ['NOISE',Math.round(player.noise)+'%'],['SHIELD',shieldCapacity()?Math.ceil(player.shield)+' / '+shieldCapacity()+' HP':'NOT FITTED'],
      ['BOOST',boostUnlocked()?Math.round(player.boost/boostCapacity()*100)+'% · '+(boostCapacity()/BOOST.drain)+'s CAPACITY':'MK I THRUSTERS REQUIRED'],
      ['SONAR',player.scanCooldown>0?Math.ceil(player.scanCooldown)+'s COOLDOWN':'READY · '+scanPowerCost()+' POWER'],
      ['RAILGUN',saved.upgrades.railgun?player.weaponAmmo.railgun+' / '+WEAPONS.railgun.capacity[saved.upgrades.railgun]:'NOT FITTED'],['TORPEDOES',saved.upgrades.torpedo?player.weaponAmmo.torpedo+' / '+WEAPONS.torpedo.capacity[saved.upgrades.torpedo]:'NOT FITTED'],['MINE AMMUNITION',player.mineAmmo+' / '+mineCapacity()],['CARGO',player.cargo.scrap+' SCRAP · '+player.cargo.crystal+' CRYSTALS'+(player.cargo.plates?.length?' · '+player.cargo.plates.length+' ID PLATE':'')],
      ['RECORDERS',player.cargo.recorders.length+' ABOARD · '+saved.secured.length+'/'+RECORDERS_TOTAL+' BANKED']];
    $('telemetryBody').innerHTML='<div class="telemetry-grid">'+rows.map(([label,value])=>'<div><span>'+label+'</span><strong>'+value+'</strong></div>').join('')+'</div><p class="telemetry-target">'+$('targetInfo').textContent+'</p><p class="telemetry-save">'+(storageHealthy?'ACTIVE DIVE SAVED · RESUMES PAUSED':'STORAGE WARNING · THIS DIVE COULD NOT BE SAVED')+'</p>';
    refreshFlashlightControl();$('telemetryClose').focus({preventScroll:true});
  }
  function refreshAudioSettings(){
    const audio=window.AbyssAudio,settings=audio?.settings()||{effects:.5,ambience:.35,muted:true};
    $('effectsVolume').value=Math.round(settings.effects*100);$('ambienceVolume').value=Math.round(settings.ambience*100);
    $('musicVolume').value=Math.round((settings.music??.3)*100);$('musicValue').textContent=Math.round((settings.music??.3)*100)+'%';
    $('effectsValue').textContent=Math.round(settings.effects*100)+'%';$('ambienceValue').textContent=Math.round(settings.ambience*100)+'%';
    $('audioMute').textContent=settings.muted?'SOUND MUTED · TAP TO ENABLE':'SOUND ON · TAP TO MUTE';$('audioMute').setAttribute('aria-pressed',String(settings.muted));
    $('audioState').textContent=!audio?.status().available?'Audio is not available in this browser. All visual warnings still work.':audio.status().blocked?'Audio is blocked. Tap TEST SONAR SOUND to try again.':'Music, effects and ambience can be adjusted independently.';
  }
  function openAudio(){
    if(!openExplorerDialog('audioDialog'))return;window.AbyssAudio?.unlock();refreshAudioSettings();$('audioClose').focus({preventScroll:true});
  }
  function bindCommandFocus(){
    document.addEventListener('keydown',e=>{
      if(e.key!=='Tab'||document.querySelector('dialog[open]'))return;
      const overlay=!$('modalOverlay').classList.contains('hidden')?$('modalOverlay'):!$('pauseOverlay').classList.contains('hidden')?$('pauseOverlay'):!$('menuOverlay').classList.contains('hidden')?$('menuOverlay'):null;
      if(!overlay)return;
      const targets=[...overlay.querySelectorAll('button:not(:disabled),a[href],input,select,[tabindex="0"]')].filter(el=>el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden');
      if(!targets.length)return;
      const first=targets[0],last=targets.at(-1);
      if(e.shiftKey&&(document.activeElement===first||!overlay.contains(document.activeElement))){e.preventDefault();last.focus();}
      else if(!e.shiftKey&&(document.activeElement===last||!overlay.contains(document.activeElement))){e.preventDefault();first.focus();}
    });
  }
  function bindLivingUI(){
    bindCommandFocus();
    bindSurvey();
    $('telemetryBtn').addEventListener('click',openTelemetry);
    $('telemetryLightsBtn').addEventListener('click',()=>toggleLights(true));
    $('telemetryClose').addEventListener('click',()=>closeExplorerDialog('telemetryDialog'));
    $('telemetryDialog').addEventListener('cancel',e=>{e.preventDefault();closeExplorerDialog('telemetryDialog');});
    $('telemetryAudioBtn').addEventListener('click',()=>{closeExplorerDialog('telemetryDialog');openAudio();});
    for(const id of ['menuAudioBtn','pauseAudioBtn'])$(id).addEventListener('click',openAudio);
    $('audioClose').addEventListener('click',()=>closeExplorerDialog('audioDialog'));
    $('audioDialog').addEventListener('cancel',e=>{e.preventDefault();closeExplorerDialog('audioDialog');});
    for(const [id,key] of [['effectsVolume','effects'],['ambienceVolume','ambience'],['musicVolume','music']])$(id).addEventListener('input',()=>{window.AbyssAudio?.unlock();window.AbyssAudio?.configure({[key]:Number($(id).value)/100});refreshAudioSettings();});
    $('audioMute').addEventListener('click',()=>{window.AbyssAudio?.unlock();window.AbyssAudio?.configure({muted:!window.AbyssAudio.settings().muted});refreshAudioSettings();});
    $('audioTest').addEventListener('click',async()=>{await window.AbyssAudio?.unlock();const audio=window.AbyssAudio,status=audio?.status();
      if(!status?.available){$('audioState').textContent='Audio is not available in this browser. All visual warnings still work.';return;}
      if(status.muted){$('audioState').textContent='Sound is muted. Enable sound to hear the preview.';return;}
      if(status.state!=='running'){$('audioState').textContent='Audio has not started. Check browser sound permissions and try again.';return;}
      audio.event('sonar',0,1,true);$('audioState').textContent='Sonar preview played at your effects volume.';
    });
    const activate=()=>{if(!document.hidden)window.AbyssAudio?.unlock();};
    document.addEventListener('pointerdown',activate,{capture:true,passive:true});document.addEventListener('keydown',activate,{capture:true});
  }
  function updateLivingHUD(){
    const force=currentAt(player.x,player.y),pin=field.survey.waypoint;
    if(force.strength>5&&$('statusStat').textContent==='NOMINAL'){$('statusStat').textContent='CURRENT '+(force.x>0?'→':'←')+' '+(force.strength/10).toFixed(1)+'m/s';$('statusStat').className='status-warning';}
    if(wildEnabled&&($('statusStat').textContent==='NOMINAL'||$('statusStat').textContent.startsWith('CURRENT '))){
      const nearbyVent=(scene.ventFields||[]).find(v=>!v.disabled&&Math.abs(player.x-v.x)<v.rx+90&&player.y>v.y-v.height-70&&player.y<v.y+25&&(v.revealUntil>clock||ambientLightAt(player.y)>.08||beamIntersects(v.x,v.y,20)));
      if(nearbyVent){const phase=ventStage(nearbyVent);if(['warning','active'].includes(phase.name)){$('statusStat').textContent=phase.name==='warning'?'VENT BUILDING':'ACTIVE PLUME';$('statusStat').className='status-warning';}}
      const nearbyMine=(scene.derelictMines||[]).find(m=>!m.detonated&&distance(m,player)<95&&(m.revealUntil>clock||ambientLightAt(player.y)>.08||beamIntersects(m.x,m.y,12)));
      if(nearbyMine){$('statusStat').textContent='CONTACT MINE NEARBY';$('statusStat').className='status-danger';}
    }
    const hint=$('waypointHint');hint.classList.toggle('hidden',!pin);
    if(pin){const d=distance(player,pin)/10;hint.textContent='⌖ '+(d<6?'WAYPOINT REACHED':Math.round(d)+' m TO PIN')+' · '+depthOf(pin.y)+' m DEPTH';}
    const resident=scene.predators.find(e=>e.tier==='warden'&&predatorAlive(e)&&distance(e,player)<600);
    if(resident&&!['PRESSURE ALERT','LOW HULL','LOW OXYGEN','LOW POWER','RESERVE DRIVE · 50%'].includes($('statusStat').textContent)){$('statusStat').textContent='WARDEN '+resident.wardenPhase.toUpperCase()+' · '+Math.ceil(resident.health/12)+'%';$('statusStat').className=resident.wardenPhase==='recover'?'status-safe':'status-danger';}
    const rescueLabel=deepwater?.labels();if(rescueLabel&&$('statusStat').textContent==='NOMINAL'){$('statusStat').textContent=rescueLabel;$('statusStat').className='status-safe';}
    if(!storageHealthy){$('statusStat').textContent='SAVE FAILED · KEEP APP OPEN';$('statusStat').className='status-danger';}
  }
  // === Lost Signals: one assignment, banked transcripts and an optional resident ===
  let signals=window.AbyssSignals.normalise(campaign?.signals);
  let journalTab='transmissions',selectedRecord=null,importPreview=null,importToken=null,signalPulse=0;
  const signalData=window.AbyssSignals;
  const WARDEN=Object.freeze({health:1200,reward:1200,radius:430,speed:410,charge:1.25,windup:1.5,recovery:3.4});
  const signalEscape=value=>escapeHTML(value??'');
  const missionName=c=>signalData.kinds[c.kind].title;
  const isPhysicalDock=()=>showingDock&&running&&paused&&nearestInteractable()?.type==='station';
  function missionProgress(c){
    if(!c)return 'No active assignment';
    if(c.status==='retry')return 'RETRY AT DOCK';
    if(c.status==='return')return 'COMPLETE · RETURN TO DOCK';
    if(c.kind==='hunt')return c.kills+' / '+c.required+' '+PREDATOR_TIERS[c.tier].name+'S';
    if(c.kind==='survey')return c.points.filter(p=>p.done).length+' / 3 SURVEYS';
    return c.kind==='silent'?'RECOVER PACKAGE · QUIET ZONE':'LOCATE THE CONTAINER';
  }
  function missionPoint(r,depth,ordinal=0){
    let fallback=null;
    for(let i=0;i<100;i++){
      const y=120+depth*10+(i?((r()-.5)*150):0),p=populationPoint(r,y,{lane:(ordinal+i)%3});fallback=p;
      if(distance(p,HARBOUR)<470||scene.items.some(n=>distance(n,p)<85)||scene.wrecks.some(n=>distance(n,p)<160)||projectileSolid(p.x,p.y,26))continue;
      if((scene.derelictMines||[]).some(n=>!n.detonated&&distance(n,p)<175)||(scene.ventFields||[]).some(n=>Math.abs(n.x-p.x)<n.rx+60&&p.y>n.y-n.height-60&&p.y<n.y+50))continue;
      return p;
    }
    // Protected lane remains navigable; suppress only overlapping optional hazards,
    // never move collision geometry or any crystal/salvage deposit.
    const p=fallback||{x:laneAt(120+depth*10,1),y:120+depth*10};protectWildArrival(p,150);return p;
  }
  function ensureContracts(){
    let b=signals.boards[LEVEL_ID];if(!b)b=signals.boards[LEVEL_ID]={serial:1,offers:[]};
    if(b.offers.length)return b;
    const levelIndex=LEVELS.findIndex(l=>l.id===LEVEL_ID),r=randGen(field.seed^Math.imul(b.serial,31991));
    const maxDepth=Math.max(70,Math.min(safeDepth()-22,currentLevel().depth-30)),minDepth=Math.max(45,maxDepth*.42);
    const armed=['railgun','torpedo','minePower'].some(id=>saved.upgrades[id]>0);
    const types=armed?(b.serial%2?['cargo','survey','hunt']:['silent','survey','hunt']):['cargo','survey','silent'];
    b.offers=types.map((kind,index)=>{
      const count=kind==='survey'?3:kind==='hunt'?0:1,points=[];
      for(let i=0;i<count;i++){
        const depth=lerp(minDepth,maxDepth,count===1?.6:(i+.4)/count);
        const p=missionPoint(r,depth,i+index);points.push({...p,id:'assignment-'+b.serial+'-'+index+'-'+i,done:false,located:false,searchX:p.x+(r()-.5)*160,searchY:p.y+(r()-.5)*160});
      }
      const tier=levelIndex>=2&&safeDepth()>=900?'apex':'common';
      return {id:LEVEL_ID+'-'+b.serial+'-'+kind,kind,levelId:LEVEL_ID,reward:(kind==='hunt'?230:kind==='survey'?180:kind==='silent'?220:160)+levelIndex*65,
        maxDepth:Math.ceil(maxDepth),points,required:kind==='hunt'?(levelIndex>=2?3:2):count,kills:0,tier,status:'active'};
    });persist();return b;
  }
  function acceptContract(id){
    if(!isPhysicalDock()||signals.active)return false;
    const c=ensureContracts().offers.find(c=>c.id===id);if(!c)return false;
    if(c.kind==='hunt'&&!['railgun','torpedo','minePower'].some(k=>saved.upgrades[k]>0))return false;
    signals.active=JSON.parse(JSON.stringify(c));refreshSignalObjects();persist();drawDockPanel();return true;
  }
  function retryContract(){
    if(!isPhysicalDock()||signals.active?.status!=='retry')return false;
    const c=signals.active;c.status='active';c.kills=0;c.points.forEach(p=>{p.done=false;p.located=false;});
    refreshSignalObjects();persist();drawDockPanel();return true;
  }
  function abandonContract(){
    if(!isPhysicalDock()||!signals.active)return false;
    const id=signals.active.levelId,b=signals.boards[id];if(b){b.serial++;b.offers=[];}
    signals.active=null;refreshSignalObjects();persist();drawDockPanel();return true;
  }
  function drawContracts(){
    const b=ensureContracts(),c=signals.active;
    const card=offer=>'<article class="contract-card"><div class="contract-eyebrow"><span>'+signalEscape(missionName(offer))+'</span><strong>'+offer.reward+' CR</strong></div><h3>'+({cargo:'Bring something home',survey:'Listen beyond the chart',hunt:'Clear a hunting ground',silent:'A quieter approach'}[offer.kind])+'</h3><p>'+signalData.kinds[offer.kind].verb+'</p><div class="contract-meta">'+signalEscape(currentLevel().name)+' · '+(offer.kind==='hunt'?'REACHABLE '+offer.tier.toUpperCase()+' CONTACTS':'TARGETS BELOW '+offer.maxDepth+' m')+'</div><p class="contract-note">'+signalData.kinds[offer.kind].hint+'</p><button class="slot-primary" data-accept-contract="'+offer.id+'" '+(c?'disabled':'')+'>'+(c?'ONE ASSIGNMENT AT A TIME':'ACCEPT ASSIGNMENT')+'</button></article>';
    $('dockPanel').innerHTML='<div class="signals-intro"><span class="menu-kicker">HARBOUR DISPATCH / OPTIONAL WORK</span><h3>A reason for the next descent.</h3><p>Credits only. No countdown. Payment on a real return to the dock. '+signals.completed+' completed.</p></div>'+
      (c?'<article class="active-contract"><div class="contract-eyebrow"><span>ACTIVE · '+signalEscape(LEVELS.find(l=>l.id===c.levelId)?.name)+'</span><strong>'+c.reward+' CR</strong></div><h3>'+missionName(c)+'</h3><p>'+missionProgress(c)+'</p><p>'+signalData.kinds[c.kind].verb+'</p><div class="signal-actions"><button id="contractTrack" class="alt-btn">VIEW IN JOURNAL</button>'+(c.status==='retry'?'<button id="contractRetry" class="alt-btn">RETRY ASSIGNMENT</button>':'')+'<button id="contractAbandon" class="menu-danger-btn">ABANDON</button></div><div id="contractConfirm"></div></article>':'')+
      '<div class="contract-list">'+b.offers.map(card).join('')+'</div><p class="expedition-note">Offers persist between visits. Hull upgrades do not move accepted targets. You may refuel mid-assignment; quitting or losing the vessel resets unfinished field work for a free retry.</p>';
    document.querySelectorAll('[data-accept-contract]').forEach(b=>b.onclick=()=>acceptContract(b.dataset.acceptContract));
    if($('contractTrack'))$('contractTrack').onclick=()=>openJournal('assignment');
    if($('contractRetry'))$('contractRetry').onclick=retryContract;
    if($('contractAbandon'))$('contractAbandon').onclick=()=>{
      $('contractConfirm').innerHTML='<p>Abandon without payment? Your currencies and other progress are untouched.</p><button id="confirmAbandonContract" class="alt-btn">CONFIRM ABANDON</button> <button id="keepContract" class="alt-btn">KEEP IT</button>';
      $('confirmAbandonContract').onclick=abandonContract;$('keepContract').onclick=drawDockPanel;
    };
  }
  function missionFailed(reason){
    const c=signals.active;if(!c||c.status==='retry')return;
    c.status='retry';c.kills=0;c.points.forEach(p=>p.done=false);refreshSignalObjects();persist();
    addEvent(reason+' · assignment can be retried at dock');
  }
  function missionDiveLost(){if(signals.active)missionFailed('Field assignment interrupted');}
  function missionKilled(enemy,credited){
    const c=signals.active;if(!credited||!c||c.status!=='active'||c.kind!=='hunt'||c.levelId!==LEVEL_ID||enemy.tier!==c.tier)return;
    c.kills=Math.min(c.required,c.kills+1);
    if(c.kills>=c.required){c.status='return';announce('ASSIGNMENT COMPLETE · RETURN FOR '+c.reward+' CR',3);}
  }
  function missionWave(object,wave){
    if(object.kind==='warden-site'){signals.warden.discovered=true;return;}
    const c=signals.active;if(!c||c.levelId!==LEVEL_ID||c.status!=='active')return;
    const p=c.points[object.pointIndex];if(!p)return;p.located=true;
    if(c.kind==='survey'&&distance(wave,object)<=200){
      if(p.done)return;p.done=true;object.collected=true;window.AbyssAudio?.event('assignmentScan');
      announce('SURVEY '+c.points.filter(p=>p.done).length+'/3 LOGGED',1.8);
      if(c.points.every(p=>p.done)){c.status='return';announce('SURVEY COMPLETE · RETURN FOR '+c.reward+' CR',3);}
    }
    persist();
  }
  function updateAssignments(){
    const c=signals.active;
    if(c?.status==='active'&&c.kind==='silent'&&c.levelId===LEVEL_ID&&player.boosting&&c.points.some(p=>distance(player,p)<250)){
      missionFailed('Quiet-zone package disturbed');announce('QUIET ZONE BROKEN · RETRY AT DOCK',3);
    }
  }
  function settleSignalsAtDock(realReturn){
    if(!realReturn)return;
    const c=signals.active;
    if(c?.status==='return'){
      saved.credits+=c.reward;signals.earned+=c.reward;signals.completed++;addStat('contract'+c.kind,1);
      const b=signals.boards[c.levelId];if(b){b.serial++;b.offers=[];}
      signals.active=null;addEvent('Assignment banked · +'+c.reward+' CR');
      window.AbyssAudio?.event('contractComplete',0,1,true);
    }
    const w=signals.warden;if(w.defeated&&w.pending&&!w.claimed){
      saved.credits+=WARDEN.reward;w.pending=false;w.claimed=true;w.livery='hunter';
      addEvent('Warden bounty +1,200 CR · Hunter livery unlocked');window.AbyssAudio?.event('contractComplete',0,1,true);
    }
    refreshSignalObjects();
  }
  function refreshSignalObjects(){
    scene.signals=[];const c=signals.active;
    if(c?.levelId===LEVEL_ID&&c.status==='active')c.points.forEach((p,i)=>{
      if(p.done)return;scene.signals.push({...p,id:p.id,pointIndex:i,kind:c.kind==='survey'?'survey-buoy':'contract-package',type:'signal',revealUntil:0,echoDuration:0,collected:false});
    });
    if(LEVEL_ID==='midnight-cathedral'&&signals.warden.site&&!signals.warden.defeated&&!signals.warden.activated){
      const p=signals.warden.site;scene.signals.push({x:p.x,y:p.y-170,id:'warden-beacon',kind:'warden-site',type:'signal',revealUntil:0,collected:false});
    }
  }
  function nearestSignal(){
    if(!player||player.airborne)return null;let best=null,range=60;
    for(const s of scene.signals||[]){if(s.collected||s.kind==='survey-buoy')continue;const d=distance(s,player);if(d<range&&clearSalvageLine(s)){best=s;range=d;}}
    return best;
  }
  function interactSignal(s){
    if(s.kind==='warden-site'){showWardenPrompt();return;}
    const c=signals.active;if(!c||c.status!=='active')return;
    c.points[s.pointIndex].done=true;s.collected=true;c.status='return';window.AbyssAudio?.event('recorder');
    pickupNotice('contract',1);persist();updateUI();
  }
  function bankedRecord(r){return Boolean(campaignLevels[r.levelId]?.secured.includes(r.index));}
  function drawArchiveDock(){
    $('dockPanel').innerHTML='<div class="signals-intro"><span class="menu-kicker">RECOVERY ARCHIVE</span><h3>Twenty voices. One interrupted expedition.</h3><p>Bank recorders to decrypt the story. Reading is optional and never interrupts a dive.</p></div><div class="archive-chapters">'+LEVELS.map((l,i)=>'<button class="archive-chapter" data-chapter="'+i+'"><span>CHAPTER 0'+(i+1)+'</span><strong>'+signalData.chapters[i]+'</strong><small>'+signalEscape(l.name)+' · '+(campaignLevels[l.id]?.secured.length||0)+' / '+l.recorders.length+' BANKED</small></button>').join('')+'</div><button class="slot-primary" id="wardenDossierBtn">OPTIONAL ENCOUNTER / WARDEN DOSSIER</button>';
    document.querySelectorAll('[data-chapter]').forEach(b=>b.onclick=()=>{const records=signalData.records.filter(r=>r.levelId===LEVELS[+b.dataset.chapter].id);selectedRecord=records.find(bankedRecord)?.id||records[0].id;openJournal('transmissions');});
    $('wardenDossierBtn').onclick=()=>openJournal('warden');
    const discovery=document.createElement('button');discovery.id='discoveriesDockBtn';discovery.className='slot-primary';discovery.textContent='FORGOTTEN GIANTS / DISCOVERIES & HULL FINISHES';discovery.onclick=()=>openJournal('discoveries');$('dockPanel').append(discovery);
  }
  function openJournal(tab='transmissions'){
    journalTab=tab;if(!openExplorerDialog('signalsDialog'))return;renderJournal();$('signalsClose').focus({preventScroll:true});
  }
  function renderJournal(){
    document.querySelectorAll('[data-journal-tab]').forEach(b=>{b.setAttribute('aria-selected',String(b.dataset.journalTab===journalTab));b.tabIndex=b.dataset.journalTab===journalTab?0:-1;});
    const target=$('signalsContent');
    if(journalTab==='transmissions'){
      const chosen=signalData.records.find(r=>r.id===selectedRecord)||signalData.records.find(bankedRecord)||signalData.records[0];selectedRecord=chosen.id;
      const open=bankedRecord(chosen);
      target.innerHTML='<div class="archive-layout"><nav class="transmission-list" aria-label="Recovered transmissions">'+LEVELS.map((l,i)=>'<h3>0'+(i+1)+' / '+signalData.chapters[i]+'</h3>'+signalData.records.filter(r=>r.levelId===l.id).map(r=>'<button data-record="'+r.id+'" aria-pressed="'+(r.id===selectedRecord)+'"><span>'+String(r.number).padStart(2,'0')+'</span><b>'+(bankedRecord(r)?r.title:'ENCRYPTED RECORDING')+'</b><small>'+(bankedRecord(r)?'DECRYPTED':'BANK TO UNLOCK')+'</small></button>').join('')).join('')+'</nav><article class="transcript"><div class="menu-kicker">'+(open?'DECRYPTED TRANSMISSION':'RECOVERY REQUIRED')+' / '+String(chosen.number).padStart(2,'0')+'</div><h3>'+(open?chosen.title:'A voice still below')+'</h3><p class="transcript-byline">'+(open?chosen.speaker:LEVELS.find(l=>l.id===chosen.levelId).name)+'</p><div class="transcript-rule"></div>'+(open?chosen.text.split('\n\n').map(p=>'<p>'+signalEscape(p)+'</p>').join(''):'<p>Find this recorder and bank it at the harbour to decrypt the transmission. Carrying it aboard is not enough.</p>')+'<div class="transcript-footer">'+totalRecorders()+' / 20 RECORDERS BANKED · STORY IS OPTIONAL</div></article></div>';
      target.querySelectorAll('[data-record]').forEach(b=>b.onclick=()=>{selectedRecord=b.dataset.record;renderJournal();if(bankedRecord(signalData.records.find(r=>r.id===selectedRecord)))window.AbyssAudio?.event('radioOpen',0,.35,true);});
    }else if(journalTab==='assignment'){
      const c=signals.active;
      target.innerHTML='<div class="journal-page"><span class="menu-kicker">HARBOUR CONTRACTS</span><h3>'+(c?missionName(c):'Your next assignment awaits')+'</h3><p>'+(c?signalData.kinds[c.kind].verb:'Visit CONTRACTS at the dock to accept one optional assignment. There is no time limit, and rewards use credits only.')+'</p>'+(c?'<div class="assignment-readout"><strong>'+missionProgress(c)+'</strong><span>'+c.reward+' CR ON RETURN</span></div><p>'+signalEscape(LEVELS.find(l=>l.id===c.levelId).name)+'</p><p>'+signalData.kinds[c.kind].hint+'</p><button id="pinAssignment" class="slot-primary" '+(c.levelId!==LEVEL_ID||!running?'disabled':'')+'>PIN NEXT SEARCH AREA</button>':'')+'<p class="contract-note">A vessel loss or abandoned dive resets unfinished field work. Retry at the dock without a fee. Reopening menus does not reroll offers.</p></div>';
      if($('pinAssignment'))$('pinAssignment').onclick=()=>pinAssignment();
    }else if(journalTab==='discoveries')renderDiscoveries(target);
    else renderWardenDossier(target);
  }
  function pinAssignment(){
    const c=signals.active;if(!c||c.levelId!==LEVEL_ID||!running)return;
    const p=c.points.find(p=>!p.done);if(!p){announce(c.kind==='hunt'?'HUNT ASSIGNED CONTACTS IN THIS LEVEL':'RETURN TO HARBOUR',2);return;}
    field.survey.waypoint={x:p.located?p.x:p.searchX,y:p.located?p.y:p.searchY};persist();$('pinAssignment').textContent='SEARCH AREA PINNED · OPEN MAP WITH M';
  }
  function renderWardenDossier(target){
    const w=signals.warden,unlocked=levelUnlocked(3);
    target.innerHTML='<div class="journal-page warden-dossier"><span class="menu-kicker">OPTIONAL ENCOUNTER / MIDNIGHT CATHEDRAL</span><div class="warden-sigil" aria-hidden="true">◈</div><h3>The Cathedral Warden</h3><p>A territorial listener in the outer passages. It never guards a campaign recorder. The observation buoy must be deliberately activated before it will attack.</p><div class="assignment-readout"><strong>'+(w.defeated?'WARDEN DEFEATED':w.activated?'RESIDENT ACTIVE':unlocked?'OBSERVATION SITE AVAILABLE':'UNLOCK LEVEL 4 TO INVESTIGATE')+'</strong><span>1,200 CR + HUNTER LIVERY</span></div><p><b>Listen.</b> Slow movement lowers your signature. Sonar and weapons draw its attention.</p><p><b>Evade.</b> An amber wind-up and warning tone precede each committed charge. Use terrain or boost across its path.</p><p><b>Answer.</b> A missed charge leaves its armour open. The recovery phase takes full damage; side and rear hits are more effective than frontal hits at other times.</p><p>Recommended: 1,330 m hull, upgraded weapons and spare ammunition. The resident stays within its chamber. Damage persists between trips.</p>'+(w.defeated?'<p>'+(w.claimed?'Bounty claimed. The cosmetic does not alter ship statistics.':'Return to the dock to claim the bounty and hull finish.')+'</p>':'<p>Approximate depth: '+(w.site?depthOf(w.site.y):1180)+' m. Investigating is your choice; leaving the chamber is always allowed.</p>')+
      (unlocked&&running&&LEVEL_ID==='midnight-cathedral'&&w.site&&!w.defeated?'<button id="pinWarden" class="slot-primary">PIN OBSERVATION BUOY</button>':'')+
      (w.claimed?'<label class="livery-choice">HULL FINISH <select id="hullLivery"><option value="standard" '+(w.livery==='standard'?'selected':'')+'>NEREID / STANDARD</option><option value="hunter" '+(w.livery==='hunter'?'selected':'')+'>WARDEN HUNTER / GOLD & TEAL</option></select></label>':'')+'</div>';
    if($('pinWarden'))$('pinWarden').onclick=()=>{field.survey.waypoint={x:w.site.x,y:w.site.y-170};persist();$('pinWarden').textContent='BUOY PINNED';};
    if($('hullLivery'))$('hullLivery').onchange=e=>{w.livery=e.target.value==='hunter'?'hunter':'standard';giants.livery='standard';persist();render();};
  }
  function buildWarden(){
    if(LEVEL_ID!=='midnight-cathedral'){refreshSignalObjects();return;}
    const w=signals.warden;
    if(!w.site){
      const r=randGen(field.seed^993174);
      for(let i=0;i<120;i++){
        const y=11720+(i%12)*35,p={x:laneAt(y,i%2?0:2),y};
        if(projectileSolid(p.x,p.y,28)||projectileSolid(p.x,p.y-170,28)||scene.wrecks.some(v=>distance(p,v)<600))continue;
        w.site=p;break;
      }
      if(!w.site){const y=11920;w.site={x:laneAt(y,1),y};}
    }
    // createWorld builds optional wildlife after its first population pass. Apply
    // the observation approach exclusion again once those hazards are available.
    protectWildArrival(w.site,120);protectWildArrival({x:w.site.x,y:w.site.y-170},105);
    if(w.activated&&!w.defeated&&!scene.predators.some(e=>e.tier==='warden')){
      const p=w.site;scene.predators.push({id:'cathedral-warden',tier:'warden',x:p.x,y:p.y,homeX:p.x,homeY:p.y,health:Math.max(1,w.health),maxHealth:WARDEN.health,dead:false,
        vx:0,vy:0,phase:0,aggression:0,lastHit:-10,alertUntil:0,forgetUntil:0,revealUntil:0,wardenPhase:'listen',phaseLeft:3,heading:-Math.PI/2,aimX:0,aimY:-1});
    }
    refreshSignalObjects();
  }
  function showWardenPrompt(){
    openDialog('OPTIONAL ENCOUNTER / OBSERVATION BUOY','WAKE THE LISTENER?',
      '<p class="dialog-info">This buoy emits a test signal that awakens the Cathedral Warden. No essential recorder or upgrade material is locked behind this encounter.</p><p class="dialog-info">Recommended: 1,330 m hull, upgraded weapons and enough ammunition. Its amber warning precedes a committed charge. Strike during recovery. You may retreat beyond its chamber at any time.</p>',
      '<div class="dialog-actions"><button id="leaveWarden" class="alt-btn">LEAVE IT SLEEPING</button><button id="wakeWarden" class="danger-btn">ACTIVATE OBSERVATION SIGNAL</button></div>');
    $('leaveWarden').onclick=closeDialog;
    $('wakeWarden').onclick=()=>{closeDialog();const w=signals.warden;w.activated=true;w.discovered=true;buildWarden();window.AbyssAudio?.event('wardenWake');announce('WARDEN AWAKE · WATCH THE WIND-UP',4);persist();};
  }
  function updateWarden(e,dt){
    e.previousX=e.x;e.previousY=e.y;e.phaseLeft=Math.max(0,e.phaseLeft-dt);
    const home={x:e.homeX,y:e.homeY},d=distance(player,e),inside=distance(player,home)<WARDEN.radius+90;
    if(!inside||player.airborne){e.wardenPhase='listen';e.phaseLeft=2;e.aggression=0;e.alertUntil=0;}
    if((e.stunnedUntil||0)>clock){e.vx=0;e.vy=0;return;}
    let vx=0,vy=0;
    if(e.wardenPhase==='listen'){
      e.aggression=inside?.25:0;
      const hears=inside&&(d<130||player.noise>14&&d<430||e.alertUntil>clock&&d<560);
      if(hears&&e.phaseLeft<=0){
        e.wardenPhase='windup';e.phaseLeft=WARDEN.windup;const dist=Math.max(1,d);e.aimX=(player.x-e.x)/dist;e.aimY=(player.y-e.y)/dist;
        e.heading=Math.atan2(e.aimY,e.aimX);window.AbyssAudio?.event('wardenWarning',clamp((e.x-player.x)/300,-1,1));announce('WARDEN WIND-UP · MOVE ACROSS ITS PATH',1.6);
      }else{
        const tx=home.x+Math.sin(clock*.3)*30,ty=home.y+Math.cos(clock*.22)*75;
        const intent=navigatePredator(e,{x:tx,y:ty,speed:35});
        const n=Math.max(1,Math.hypot(intent.x-e.x,intent.y-e.y));vx=(intent.x-e.x)/n*intent.speed;vy=(intent.y-e.y)/n*intent.speed;
      }
    }else if(e.wardenPhase==='windup'){
      e.aggression=1;if(e.phaseLeft<=0){e.wardenPhase='charge';e.phaseLeft=WARDEN.charge;window.AbyssAudio?.event('wardenCharge',clamp((e.x-player.x)/300,-1,1));}
    }else if(e.wardenPhase==='charge'){
      e.aggression=1;vx=e.aimX*WARDEN.speed;vy=e.aimY*WARDEN.speed;
      if(e.phaseLeft<=0||distance(e,home)>WARDEN.radius){e.wardenPhase='recover';e.phaseLeft=WARDEN.recovery;vx=0;vy=0;}
    }else{
      e.aggression=0;if(e.phaseLeft<=0){e.wardenPhase='listen';e.phaseLeft=2.5;}
    }
    const next={x:e.x+vx*dt,y:e.y+vy*dt};
    if(projectileTerrainHit(e,next,predatorRadius(e))!==null){
      if(e.wardenPhase==='charge'){e.wardenPhase='recover';e.phaseLeft=WARDEN.recovery+1;window.AbyssAudio?.event('wardenImpact',clamp((e.x-player.x)/300,-1,1));}
      vx=0;vy=0;
    }else{e.x=next.x;e.y=next.y;}
    if(distance(e,home)>WARDEN.radius+35){const angle=Math.atan2(e.y-home.y,e.x-home.x);e.x=home.x+Math.cos(angle)*WARDEN.radius;e.y=home.y+Math.sin(angle)*WARDEN.radius;}
    e.vx=vx;e.vy=vy;resolvePredatorWreckCollision(e);
    if(e.wardenPhase==='listen'&&Math.hypot(vx,vy)>2)e.heading=lerpAngle(e.heading,Math.atan2(vy,vx),dt*2);
    signals.warden.health=e.health;
  }
  function damageWarden(e,amount,source){
    if(e.wardenPhase==='recover')return amount;
    if(!source)return amount*.65;
    const a=Math.atan2(source.y-e.y,source.x-e.x),front=Math.cos(a-e.heading)>.45;
    return amount*(front?.3:.8);
  }
  function wardenDefeated(e){
    const w=signals.warden;w.health=0;w.defeated=true;w.activated=false;w.discovered=true;w.pending=!w.claimed;
    e.dead=true;e.aggression=0;e.alertUntil=0;player.kills++;addStat('kills',1);checkAchievements();
    scene.blasts.push({x:e.x,y:e.y,birth:clock,radius:150});window.AbyssAudio?.event('wardenDefeated');
    announce('WARDEN DEFEATED · RETURN FOR BOUNTY & HUNTER LIVERY',5);refreshSignalObjects();
  }
  function wardenOutline(){
    ctx.beginPath();ctx.moveTo(66,0);ctx.quadraticCurveTo(40,-28,-4,-21);ctx.bezierCurveTo(-30,-17,-65,-21,-100,-36);
    ctx.lineTo(-87,-4);ctx.lineTo(-113,23);ctx.quadraticCurveTo(-57,14,-26,19);ctx.quadraticCurveTo(32,31,66,0);ctx.closePath();
  }
  function drawWarden(e){
    ctx.save();ctx.translate(e.x,e.y);ctx.rotate(e.heading||0);
    const recovering=e.wardenPhase==='recover',warning=e.wardenPhase==='windup',accent=recovering?'#91f9d3':warning?'#ffd790':'#ad92e3';
    wardenOutline();const gradient=ctx.createLinearGradient(0,-28,0,28);gradient.addColorStop(0,'#536881');gradient.addColorStop(.4,'#263750');gradient.addColorStop(1,'#100e24');ctx.fillStyle=gradient;ctx.fill();ctx.strokeStyle=accent;ctx.lineWidth=1.7;ctx.stroke();
    for(let i=0;i<6;i++){
      const x=35-i*15,spread=recovering?1.4:1;ctx.beginPath();ctx.moveTo(x+10,-13);ctx.lineTo(x,-(26+i%2*6)*spread);ctx.lineTo(x-9,-15);ctx.moveTo(x+10,13);ctx.lineTo(x,(26+i%2*6)*spread);ctx.lineTo(x-9,15);ctx.stroke();
      ctx.strokeStyle=recovering?'#c7ffe8':'#647295';ctx.beginPath();ctx.moveTo(x,-14);ctx.quadraticCurveTo(x-6,0,x,14);ctx.stroke();ctx.strokeStyle=accent;
    }
    ctx.fillStyle=warning?'#ffe8a2':'#e6b4ff';ctx.shadowColor=accent;ctx.shadowBlur=8;
    for(const y of [-8,8]){ctx.beginPath();ctx.ellipse(44,y,5,2.3,0,0,TAU);ctx.fill();}ctx.shadowBlur=0;
    ctx.strokeStyle='#ded6ef';ctx.beginPath();ctx.moveTo(57,-8);ctx.lineTo(62,0);ctx.lineTo(57,8);ctx.stroke();
    if(warning){ctx.strokeStyle='#edbb7780';ctx.setLineDash([10,9]);ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(70,0);ctx.lineTo(340,0);ctx.stroke();}
    ctx.restore();
  }
  function drawSignalObjects(echo=false){
    ctx.save();if(echo)ctx.translate(-camera.x,-camera.y);
    for(const s of scene.signals||[]){
      if(s.collected||!onscreen(s.x,s.y,90))continue;
      if(echo&&!(s.revealUntil>clock))continue;
      if(!echo&&distance(s,player)>160&&!beamIntersects(s.x,s.y,25))continue;
      ctx.save();ctx.translate(s.x,s.y);ctx.strokeStyle=s.kind==='warden-site'?'#d0a3ef':'#e6c887';ctx.lineWidth=1.6;
      if(echo)ctx.globalAlpha=clamp((s.revealUntil-clock)/(s.echoDuration||5),0,.9);else ctx.fillStyle='#152b39';
      if(s.kind==='survey-buoy'){ctx.beginPath();ctx.arc(0,0,12,0,TAU);ctx.moveTo(0,-21);ctx.lineTo(0,21);ctx.moveTo(-21,0);ctx.lineTo(21,0);ctx.stroke();}
      else if(s.kind==='warden-site'){ctx.beginPath();ctx.moveTo(0,-21);ctx.lineTo(15,0);ctx.lineTo(0,21);ctx.lineTo(-15,0);ctx.closePath();if(!echo)ctx.fill();ctx.stroke();ctx.beginPath();ctx.arc(0,0,6,0,TAU);ctx.stroke();}
      else{if(!echo)ctx.fillRect(-15,-10,30,20);ctx.strokeRect(-15,-10,30,20);ctx.strokeRect(-7,-5,14,10);ctx.beginPath();ctx.moveTo(-15,0);ctx.lineTo(-7,0);ctx.moveTo(7,0);ctx.lineTo(15,0);ctx.stroke();}
      ctx.restore();
    }ctx.restore();
  }
  function drawMissionChart(g){
    const c=signals.active;
    g.save();g.font='10px ui-monospace,monospace';g.textAlign='center';
    if(c?.levelId===LEVEL_ID&&c.status==='active')for(const point of c.points){
      if(point.done)continue;const exact=point.located||c.kind==='silent',p=chartPoint(exact?point.x:point.searchX,exact?point.y:point.searchY),radius=Math.max(9,(c.kind==='silent'?250:150)*mapView.scale);
      g.strokeStyle='#e4c78c';g.fillStyle='#e4c78c10';g.setLineDash([5,4]);g.beginPath();g.arc(p.x,p.y,radius,0,TAU);g.fill();g.stroke();g.setLineDash([]);g.fillStyle='#e4c78c';g.fillText(c.kind==='silent'?'QUIET ZONE':point.located?'ASSIGNMENT':'SEARCH AREA',p.x,p.y-radius-6);
    }
    const w=signals.warden;if(LEVEL_ID==='midnight-cathedral'&&w.site){const p=chartPoint(w.site.x,w.site.y-170);g.fillStyle=w.defeated?'#719287':'#c3a3e8';g.fillText(w.defeated?'WARDEN / CLEARED':'OPTIONAL OBSERVATION BUOY',p.x,p.y-12);g.strokeStyle=g.fillStyle;g.strokeRect(p.x-4,p.y-4,8,8);}
    g.restore();
  }
  function exportCampaign(slot){
    try{
      if(slot===window.AbyssSlots.active&&!persist())throw Error(window.AbyssSlots.status().error);
      const payload=window.AbyssSlots.exportSlot(slot);if(!payload)throw Error('This campaign cannot be read.');
      const text=signalData.pack(payload,BUILD.version),blob=new Blob([text],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
      a.href=url;a.download='abyss-'+String(payload.title||'campaign').replace(/[^a-z0-9_-]+/gi,'-').slice(0,40)+'-'+new Date().toISOString().slice(0,10)+'.abyss.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
      $('slotsMessage').textContent='Campaign exported. Keep the file somewhere safe; it contains your progress, not a cloud link.';return text;
    }catch(e){$('slotsMessage').textContent=e.message;return null;}
  }
  function showImportPreview(text,slot){
    const parsed=signalData.unpack(text);importPreview={...parsed,slot};importToken=window.AbyssSlots.token(slot);
    const title=signalEscape(parsed.payload.title||'Imported campaign'),p=parsed.payload.profile;
    const current=window.AbyssSlots.summaries().find(s=>s.slot===slot),count=Object.values(parsed.payload.levels).reduce((n,f)=>n+f.secured.length,0);
    $('importPreview').innerHTML='<div class="import-preview"><span class="menu-kicker">BACKUP VALIDATED / SLOT 0'+slot+'</span><h3>'+title+'</h3><p>'+count+'/20 recorders · '+p.credits.toLocaleString('en-GB')+' CR · '+p.crystals+' crystals</p><p>'+(parsed.payload.activeDive?'Saved expedition will resume paused.':'Ready at the harbour.')+'</p><p class="slot-delete-warning">'+(current.empty?'This empty slot will receive the campaign.':'This replaces “'+signalEscape(current.title)+'”. Export it first to keep a separate copy.')+'</p><div class="signal-actions"><button id="confirmImport" class="slot-primary">'+(current.empty?'IMPORT INTO SLOT ':'REPLACE SLOT ')+slot+'</button><button id="cancelImport" class="alt-btn">CANCEL</button></div></div>';
    $('confirmImport').onclick=confirmImport;$('cancelImport').onclick=()=>{importPreview=null;importToken=null;$('importPreview').innerHTML='';};
    $('confirmImport').focus({preventScroll:true});$('importPreview').scrollIntoView({block:'nearest'});return true;
  }
  function confirmImport(){
    if(!importPreview||slotTransition)return false;
    const {slot,payload}=importPreview;
    if(slot!==window.AbyssSlots.active&&!persist()){$('slotsMessage').textContent='Could not save your current campaign. Import cancelled.';return false;}
    if(!window.AbyssSlots.importSlot(slot,payload,importToken)){$('slotsMessage').textContent=window.AbyssSlots.status().error;return false;}
    importPreview=null;importToken=null;$('importPreview').innerHTML='';
    if(slot===window.AbyssSlots.active){slotTransition=true;reloadForSlot();}
    else{renderSlots();$('slotsMessage').textContent='Backup imported. Your active campaign is unchanged. Choose LOAD CAMPAIGN to switch.';}
    return true;
  }
  function bindSignalsUI(){
    for(const id of ['menuJournalBtn','pauseJournalBtn'])$(id).onclick=()=>openJournal();
    $('signalsClose').onclick=()=>closeExplorerDialog('signalsDialog');
    $('signalsDialog').addEventListener('cancel',e=>{e.preventDefault();closeExplorerDialog('signalsDialog');});
    const tabs=[...document.querySelectorAll('[data-journal-tab]')];tabs.forEach((b,i)=>{
      b.onclick=()=>{journalTab=b.dataset.journalTab;renderJournal();};
      b.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const n=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:tabs.length-1))%tabs.length;tabs[n].click();tabs[n].focus();};
    });
    $('importFile').onchange=async e=>{
      const file=e.target.files?.[0];e.target.value='';if(!file)return;
      try{if(file.size>signalData.maxBytes)throw Error('Choose a backup smaller than 12 MB.');showImportPreview(await file.text(),Number($('importSlot').value));}
      catch(error){importPreview=null;$('importPreview').innerHTML='';$('slotsMessage').textContent=error.message;}
    };
    $('importSlot').onchange=()=>{importPreview=null;importToken=null;$('importPreview').innerHTML='';};
    $('chooseImport').onclick=()=>$('importFile').click();
  }

  function audioFrame(){
    const audio=window.AbyssAudio;if(!audio)return;
    if(document.hidden){if(audio.status().state==='running')audio.suspend();return;}
    const interfaceMode=!$('menuOverlay').classList.contains('hidden')?'menu':showingDock?'dock':paused?'pause':'none';
    audio.setScene(interfaceMode);
    if(interfaceMode!=='none')return;
    if($('audioDialog').open)return; // Allow explicit paused preview.
    if(!running||paused)return;
    const threats=scene.predators.filter(e=>predatorAlive(e)&&e.aggression>.15&&distance(e,player)<300&&!inHarbour(player));
    const nearest=threats.sort((a,b)=>distance(a,player)-distance(b,player))[0];
    audio.tick({speed:Math.hypot(player.vx,player.vy),depth:depthOf(player.y),boost:player.boosting,airborne:player.airborne,harbour:inHarbour(player),pressure:depthOf(player.y)/safeDepth(),threat:Boolean(nearest),pan:nearest?clamp((nearest.x-player.x)/200,-1,1):0});
  }

  function frame(now){
    if(!previousTime)previousTime=now;
    const dt=Math.min(.045,(now-previousTime)/1000||.016);previousTime=now;
    if(running&&!paused)advanceSimulation(dt);
    else if(!paused&&!loadedActive)clock+=dt*.3;
    audioFrame();render();
    requestAnimationFrame(frame);
  }
  deepwater=window.AbyssRescue.create({
    field:()=>field,levels:()=>campaignLevels,levelId:()=>LEVEL_ID,levelIndex:()=>LEVELS.findIndex(l=>l.id===LEVEL_ID),levelDefinitions:()=>LEVELS,
    player:()=>player,profile:()=>saved,signals:()=>signals,objects:()=>scene.rescueObjects||[],setObjects:o=>{scene.rescueObjects=o;},
    random:randGen,lane:laneAt,left:leftAt,right:rightAt,bottom:()=>MAX_WORLD_Y,harbour:()=>HARBOUR,inHarbour,depth:depthOf,
    safeDepth,maxOxygen,normalSpeed:()=>normalSpeedAt(saved.upgrades.engine),clear:wildClear,line:guidanceLineClear,
    route:(d,t)=>planPredatorRoute({...d,rescueDrone:true},t),
    exclusions:()=>[...scene.items,...scene.wrecks,...(scene.derelictMines||[]).filter(m=>!m.detonated),...(scene.ventFields||[]),...(signals.warden.site?[{...signals.warden.site,radius:WARDEN.radius+80}]:[])],
    landmarks:()=>[...(scene.landmarks||[]),...(scene.giantObjects||[]).filter(o=>o.kind==='panel')],
    visible:o=>distance(player,o)<(ambientLightAt(o.y)>.08?190:0)||beamIntersects(o.x,o.y,24),onScreen:onscreen,clock:()=>clock,
    active:()=>Boolean(running&&!paused&&player),bossActive:()=>scene.predators.some(e=>e.tier==='warden'&&predatorAlive(e)&&distance(player,e)<700),
    announce,addEvent,save:persist,sound:(name,pan=0,intensity=1)=>window.AbyssAudio?.event(name,pan,intensity,name==='rescueHome'),
    openLog:()=>openExplorerDialog('rescueDialog'),achievementProgress:()=>ACHIEVEMENTS.map(a=>({...a,progress:achievementProgress(a)}))
  });
  $('rescueClose').addEventListener('click',()=>closeExplorerDialog('rescueDialog'));
  $('rescueDone').addEventListener('click',()=>closeExplorerDialog('rescueDialog'));
  $('rescueDialog').addEventListener('cancel',e=>{e.preventDefault();closeExplorerDialog('rescueDialog');});
  $('pauseRescueBtn').addEventListener('click',()=>deepwater.openLog());
  $('menuRescueBtn').addEventListener('click',()=>deepwater.openLog());
  beamTexture=buildBeamTexture();
  bind();resize();createWorld();
  player={x:600,y:160,vx:0,vy:0,airborne:false,surfaceCooldownUntil:0,facing:0,hull:maxHull(),oxygen:maxOxygen(),battery:maxBattery(),lights:true,noise:0,cargo:{scrap:0,crystal:0,recorders:[],plates:[]},scanCooldown:0,damageCooldown:0,boost:boostCapacity(),boosting:false,boostLocked:false,boostNeedsRelease:false,boostRechargeDelay:0,mineAmmo:0,mineCooldown:0,weaponAmmo:{...saved.weaponAmmo},weaponCooldown:{railgun:0,torpedo:0},damageFlashUntil:0,nextDamageFlash:0,kills:0,shield:shieldCapacity(),shieldDelay:0,shieldFlashUntil:0,magnetFlash:null,autoSalvageCooldown:0};
  resupplyMines();
  camera.x=player.x-viewport.w/2;camera.y=player.y-viewport.h/2;
  checkAchievements(true);persist();updateMainMenu();updateUI();requestAnimationFrame(frame);
  setTimeout(()=>{
    if(window.AbyssVersion)return;
    $('syncIndicator').dataset.state='unverified';$('syncStatus').textContent='UPDATE CHECKER NOT LOADED';
    $('syncDetail').textContent='Upload version-sync.js and version.json with the game. The latest release cannot be verified.';
    $('checkVersionBtn').textContent='RELOAD BUILD';
    $('checkVersionBtn').onclick=()=>{if(running){$('syncDetail').textContent='Bank or quit the active dive before reloading.';}else location.reload();};
  },3500);

  // Tiny inspection hook for automated smoke tests.
  window.AbyssDiagnostics={state:()=>({slot:window.AbyssSlots.active,campaignTitle,weaponAmmo:{...player.weaponAmmo},weaponCooldown:{...player.weaponCooldown},damageFlashing:player.damageFlashUntil>clock,projectiles:scene.projectiles?.length||0,airborne:Boolean(player.airborne),dockSafe:inHarbour(player),surfaceY:SURFACE.y,splashCount:surfaceEffects.length,version:BUILD.version,versionName:BUILD.name,buildId:BUILD.id,shield:player.shield,shieldCapacity:shieldCapacity(),shieldDelay:player.shieldDelay,magnetRange:magnetRange(),magnetPower:magnetPower(),disruptorMark:saved.upgrades.disruptor,scanPowerCost:scanPowerCost(),upgradeOpen:$('upgradeDialog').open,storageHealthy,campaignId,levelId:LEVEL_ID,levelName:currentLevel().name,crystals:saved.crystals,totalRecorders:totalRecorders(),achievements:ACHIEVEMENTS.filter(a=>saved.achievements[a.id]).length,recoveryPods:field.recoveries.length,levelComplete:levelComplete(LEVEL_ID),boostCapacity:boostCapacity(),boostUnlocked:boostUnlocked(),boostMultiplier:boostMultiplier(),boostSeconds:boostCapacity()/BOOST.drain,joystickVisible:$('mobileJoystick').classList.contains('engaged'),zoom:viewport.zoom,flashlightMark:saved.upgrades.flashlight,flashlightLength:flashlightSpec().length,flashlightAngle:flashlightSpec().halfAngle*360/Math.PI,flashlightPowerRate:flashlightPowerRate(),worldWidth:widthAt(player.y)*2,populationCycle:field.cycle,mineAmmo:player.mineAmmo,mineCapacity:mineCapacity(),minePower:saved.upgrades.minePower,mineCapacityMark:saved.upgrades.mineCapacity,mineDamage:mineDamage(),mineCooldown:player.mineCooldown,deployedMines:scene.mines.length,kills:player.kills,normalSpeed:normalSpeedAt(saved.upgrades.engine),maxNormalSpeed:normalSpeedAt(THRUST.maxMark),ambientLight:ambientLightAt(player.y),blackoutDepth:LIGHTING.blackoutDepth,lights:player.lights,headlightsActive:headlightsActive(),recorderDepths:[...RECORDER_DEPTHS],maxWorldDepth:depthOf(MAX_WORLD_Y),safeDepth:safeDepth(),inputMode:touchControls?'touch':'desktop',vesselLabel:vesselLabel(),boost:player.boost,boosting:player.boosting,boostLocked:player.boostLocked,boostNeedsRelease:player.boostNeedsRelease,boostRechargeDelay:player.boostRechargeDelay,boostPowerRate:boostPowerRate(),boostRechargeRate:boostRechargeRate(),scanCooldown:player.scanCooldown,sonarCost:sonarCost(),mouseHeld:mouseHelm.pointerId!==null,boostHeld,facing:player.facing,hullLevel:saved.upgrades.hull,maxHull:maxHull(),focusMode,running,hasSavedDive:Boolean(loadedActive),lastSaveWall,paused,menuOpen:!$('menuOverlay').classList.contains('hidden'),pauseOpen:!$('pauseOverlay').classList.contains('hidden'),depth:depthOf(player.y),x:player.x,y:player.y,vx:player.vx,vy:player.vy,hull:player.hull,battery:player.battery,oxygen:player.oxygen,credits:saved.credits,secured:saved.secured.length,items:scene.items.length,rocks:scene.rocks.length,predators:scene.predators.length,apexCount:scene.predators.filter(e=>e.tier==='apex').length,commonCount:scene.predators.filter(e=>e.tier==='common').length,reaperCount:scene.predators.filter(e=>e.tier==='reaper').length,pursuing:scene.predators.filter(e=>e.aggression>.13).length,nearestPredatorDistance:Math.min(Infinity,...scene.predators.map(e=>distance(player,e))),useHeld,joystickX:joystick.x,joystickY:joystick.y,noise:player.noise})};
  if(location.search.includes('testmode=1')||window.ABYSS_TEST_MODE===true){
    window.AbyssDiagnostics.rescue=()=>deepwater.state();
    window.AbyssDiagnostics.rescueSpawn=()=>deepwater.spawnDrone();
    window.AbyssDiagnostics.rescueEvent=kind=>deepwater.startEvent(kind);
    window.AbyssDiagnostics.rescueLog=()=>deepwater.openLog();
    window.AbyssDiagnostics.rescueFixture=values=>deepwater.fixture(s=>Object.assign(s,values));
    window.AbyssDiagnostics.rescuePulse=(dt,active=true)=>{const old=paused;paused=!active;deepwater.update(dt);paused=old;updateUI();render();};
    window.AbyssDiagnostics.rescueUse=id=>{const old=paused;paused=false;deepwater.interact({rescueId:id});paused=old;};
    window.AbyssDiagnostics.rescueRoute=(a,b)=>planPredatorRoute({...a,rescueDrone:true},b);
    window.AbyssDiagnostics.lifeline=()=>({oxygenRate:oxygenRate(),maxOxygen:maxOxygen(),maxBattery:maxBattery(),fullEndurance:maxOxygen()/oxygenRate(),reserve:reserveDrive(),effectiveSpeed:normalSpeedAt(saved.upgrades.engine)*propulsionMultiplier(),cells:JSON.parse(JSON.stringify(field.batteryCells)),rules:{...BATTERY_CELLS},energy:{...ENERGY}});
    window.AbyssDiagnostics.cellPulse=(seconds,active=false)=>{const was=paused;if(active)paused=false;updateBatteryCells(seconds);paused=was;persist();return window.AbyssDiagnostics.lifeline();};
    window.AbyssDiagnostics.cellPickup=()=>{const was=paused;paused=false;autoCollectBatteryCells();paused=was;updateUI();};
    window.AbyssDiagnostics.pickups=()=>JSON.parse(JSON.stringify(pickupNotices));
    window.AbyssDiagnostics.beamAt=(x,y,r=0)=>beamIntersects(x,y,r);
    window.AbyssDiagnostics.navigationPath=(id,target)=>{const e=scene.predators.find(e=>e.id===id);return e?planPredatorRoute(e,target):[];};
    window.AbyssDiagnostics.predatorClear=id=>{const e=scene.predators.find(e=>e.id===id);return e?predatorWaterClear(e.x,e.y,predatorRadius(e),e.tier==='reaper'?8120:SURFACE.y+predatorRadius(e)):null;};
    window.AbyssDiagnostics.predatorSweep=(id,dx,dy)=>{const e=scene.predators.find(e=>e.id===id);if(!e)return;e.previousX=e.x;e.previousY=e.y;e.x+=dx;e.y+=dy;resolvePredatorWreckCollision(e);return {x:e.x,y:e.y};};
    window.AbyssDiagnostics.fishPulse=dt=>{clock+=dt;updateFishSchools(dt);render();};
    window.AbyssDiagnostics.mutateFish=(school,index,values)=>{const f=scene.schools[school]?.fish[index];if(f)Object.assign(f,values);};
    window.AbyssDiagnostics.mutateSchool=(index,values)=>{if(scene.schools[index])Object.assign(scene.schools[index],values);};
    window.AbyssDiagnostics.audioFrame=audioFrame;
    window.AbyssDiagnostics.movementNoiseAt=movementNoiseAt;
    window.AbyssDiagnostics.weaponStock=values=>{for(const id of Object.keys(WEAPONS)){if(Number.isFinite(values[id]))saved.weaponAmmo[id]=player.weaponAmmo[id]=clamp(Math.floor(values[id]),0,WEAPONS[id].capacity[saved.upgrades[id]]);}updateUI();persist();};
    window.AbyssDiagnostics.fire=kind=>{const before=paused;paused=false;const ok=fireWeapon(kind);paused=before;render();return ok;};
    window.AbyssDiagnostics.damage=(amount=10)=>{takeDamage(amount,'Test impact',true);render();};
    window.AbyssDiagnostics.save=()=>persist();
    window.AbyssDiagnostics.fixture=({x=600,y=700,rocks=[],predators=[],items=[]}={})=>{
      giantSite=null;giantWallCache=[];scene.giantObjects=[];
      environmentEnabled=false;wildEnabled=false;player.x=x;player.y=y;player.vx=0;player.vy=0;player.airborne=y<SURFACE.y;player.surfaceCooldownUntil=0;player.facing=0;player.noise=0;
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
      if(quietScene)scene={rocks:[],items:[],predators:[],vents:[],dust:[],wrecks:[],mines:[],blasts:[],projectiles:[]};
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
    window.AbyssDiagnostics.debug=()=>({clock,projectiles:(scene.projectiles||[]).map(p=>({...p})),field:JSON.parse(JSON.stringify(field)),mines:scene.mines.map(m=>({...m})),blasts:scene.blasts.map(b=>({...b})),sonarWaves:sonarWaves.map(({contacts,...w})=>({...w,contacts:contacts.map(c=>({kind:c.kind,hit:c.hit,x:c.object.x,y:c.object.y}))})),camera:{...camera},viewport:{...viewport},sonarTerrainEchoes:sonarTerrainEchoes.map(e=>({...e})),rocks:scene.rocks.map(e=>({...e})),vents:scene.vents.map(e=>({...e})),player:{...player},saved:{...saved,upgrades:{...saved.upgrades}},campaignLevels:JSON.parse(JSON.stringify(campaignLevels)),levels:LEVELS.map((l,i)=>({...l,unlocked:levelUnlocked(i),complete:levelComplete(l.id),resources:resourceProgress(l.id)})),wrecks:scene.wrecks.map(w=>({...w})),predators:scene.predators.map(e=>({...e})),items:scene.items.map(i=>({...i}))});
    window.AbyssDiagnostics.simulationFixture=({depth=500,facing=Math.PI/2,lights=false,battery=maxBattery(),boost=null,upgrades={},items=[],predators=[],rocks=[],wrecks=[],vents=[],mines=[],mineAmmo=null}={})=>{
      giantSite=null;giantWallCache=[];
      environmentEnabled=false;wildEnabled=false;resetPilotInput();Object.assign(saved.upgrades,upgrades);beamTexture=buildBeamTexture();
      const y=120+depth*10,x=centerAt(y);
      player={...player,x,y,vx:0,vy:0,airborne:false,surfaceCooldownUntil:0,facing,lights,battery,boost:boost??boostCapacity(),hull:maxHull(),oxygen:maxOxygen(),noise:0,boosting:false,boostLocked:false,boostNeedsRelease:false,boostRechargeDelay:0,damageCooldown:0,scanCooldown:0,mineAmmo:mineAmmo??(saved.upgrades.minePower?mineCapacity():0),mineCooldown:0,weaponAmmo:{...saved.weaponAmmo},weaponCooldown:{railgun:0,torpedo:0},damageFlashUntil:0,nextDamageFlash:0,kills:0,shield:shieldCapacity(),shieldDelay:0,shieldFlashUntil:0,magnetFlash:null,autoSalvageCooldown:0,trip:{deepest:0,hullDamage:0},cargo:{scrap:0,crystal:0,recorders:[],plates:[]}};
      saved.mineAmmo=player.mineAmmo;
      scene={items:items.map((i,n)=>makeItem(x+i.dx,y+i.dy,i.type||'scrap',{id:n,index:i.index??0,...i})),
        rocks:rocks.map(r=>{const k={x:x+r.dx,y:y+r.dy,radius:30,rot:0,seed:.4,spikes:8,...r};return {...k,vertices:rockPolygon(k)};}),
        predators:predators.map((e,n)=>createPredator({behaviour:'ordinary',id:'fixture-enemy-'+n,tier:'common',vx:0,vy:0,phase:0,aggression:0,lastHit:-10,alertUntil:0,forgetUntil:0,revealUntil:0,...e,x:x+e.dx,y:y+e.dy,homeX:x+e.dx,homeY:y+e.dy})),
        wrecks:wrecks.map(w=>({...w,x:x+w.dx,y:y+w.dy})),vents:vents.map(v=>({phase:0,...v,x:x+v.dx,y:y+v.dy})),dust:[],blasts:[],projectiles:[],
        mines:mines.map(m=>({id:idCounter++,mark:1,damage:60,birth:0,armedAt:0,detonated:false,revealUntil:0,...m,x:x+m.dx,y:y+m.dy}))};
      running=true;paused=true;clock=0;pickupNotices=[];surfaceEffects=[];sonarWaves=[];sonarTerrainEchoes=[];toastUntil=0;$('notification').classList.add('hidden');
      camera={x:x-viewport.w/2,y:y-viewport.h*.52};
      for(const id of ['menuOverlay','pauseOverlay','modalOverlay'])$(id).classList.add('hidden');
      updateUI();render();return {x,y,camera:{...camera},viewport:{...viewport}};
    };
    window.AbyssDiagnostics.step=(seconds,{heldKeys=[],freezeAfter=true}={})=>{
      keys.clear();heldKeys.forEach(k=>keys.add(k));paused=false;
      for(let remaining=seconds;remaining>1e-8&&running&&!paused;){const dt=Math.min(1/60,remaining);advanceSimulation(dt);remaining-=dt;}
      keys.clear();if(freezeAfter)paused=true;updateUI();render();return window.AbyssDiagnostics.state();
    };
    window.AbyssDiagnostics.mine=()=>{const before=paused;paused=false;const ok=deployMine();paused=before;render();return ok;};
    window.AbyssDiagnostics.resupply=()=>{const before=paused;paused=false;interact();if(!showingDock)paused=before;};
    window.AbyssDiagnostics.pulseMines=dt=>{clock+=dt;updateMines(dt);updateUI();render();};
    window.AbyssDiagnostics.ping=()=>{const before=paused;paused=false;scan();paused=before;render();};
    window.AbyssDiagnostics.unfreeze=()=>{paused=false;canvas.focus({preventScroll:true});};
    window.AbyssDiagnostics.regenerate=(seed=12345)=>{field={...freshField(),seed:seed>>>0};campaignLevels[LEVEL_ID]=field;applyLevelGeometry();createWorld();return window.AbyssDiagnostics.state();};
    window.AbyssDiagnostics.moveTo=(x,y)=>{player.x=x;player.y=y;player.vx=0;player.vy=0;player.airborne=y<SURFACE.y;player.surfaceCooldownUntil=0;camera={x:x-viewport.w/2,y:y-viewport.h*.52};updateUI();render();};
    window.AbyssDiagnostics.hurtEnemy=(id,damage)=>{const enemy=scene.predators.find(e=>e.id===id);if(enemy)damagePredator(enemy,damage);scene.predators=scene.predators.filter(predatorAlive);};
    window.AbyssDiagnostics.use=()=>{const before=paused;paused=false;interact();if(!showingDock)paused=before;updateUI();};
    window.AbyssDiagnostics.relaunch=()=>{newDive();paused=true;};
    window.AbyssDiagnostics.tiers=()=>JSON.parse(JSON.stringify(PREDATOR_TIERS));
    window.AbyssDiagnostics.hit=(amount=10)=>{player.damageCooldown=0;takeDamage(amount,'Test impact');updateUI();};
    window.AbyssDiagnostics.setSystems=values=>{for(const k of ['battery','shield','shieldDelay','hull','oxygen','damageCooldown'])if(Number.isFinite(values[k]))player[k]=values[k];updateUI();};
    window.AbyssDiagnostics.upgradeCatalog=()=>UPGRADES.map(u=>({...u,level:saved.upgrades[u.id],stats:upgradeStats(u.id,saved.upgrades[u.id])}));
    window.AbyssDiagnostics.grantCrystals=value=>{saved.crystals=cleanCount(value);persist();updateUI();};
    window.AbyssDiagnostics.achievementCatalog=()=>ACHIEVEMENTS.map(a=>({...a,progress:achievementProgress(a),earned:Boolean(saved.achievements[a.id])}));
    window.AbyssDiagnostics.loseDive=()=>defeat('Test emergency');
    window.AbyssDiagnostics.save=()=>{checkAchievements();return persist();};
    window.AbyssDiagnostics.setStats=stats=>{Object.assign(saved.stats,stats);checkAchievements();persist();};
    window.AbyssDiagnostics.selectLevel=selectLevel;
    window.AbyssDiagnostics.fixtureLevel=index=>{LEVEL_ID=LEVELS[index].id;field=campaignLevels[LEVEL_ID]||freshField();campaignLevels[LEVEL_ID]=field;applyLevelGeometry();newDive();paused=true;return window.AbyssDiagnostics.state();};
    window.AbyssDiagnostics.costs=()=>UPGRADES.map(u=>({id:u.id,prices:Array.from({length:u.limit},(_,i)=>({credits:upgradeCost(u,i),crystals:crystalCost(u,i)}))}));
    window.AbyssDiagnostics.setMotion=({vx=0,vy=0,airborne=player.y<SURFACE.y})=>{player.vx=vx;player.vy=vy;player.airborne=airborne;};
    window.AbyssDiagnostics.harbourRules=()=>({harbour:{...HARBOUR},surface:{...SURFACE}});
    window.AbyssDiagnostics.living=()=>({survey:JSON.parse(JSON.stringify(field.survey)),threats:surveyThreats.map(t=>({...t})),environment:JSON.parse(JSON.stringify(environment)),current:currentAt(player.x,player.y),environmentEnabled,loadedActive:Boolean(loadedActive),clock,audio:window.AbyssAudio?.status()});
    window.AbyssDiagnostics.surveyNow=()=>{surveyVisibleWater();persist();};
    window.AbyssDiagnostics.currentAt=(x,y,time=clock)=>currentAt(x,y,time);
    window.AbyssDiagnostics.enableEnvironment=()=>{buildEnvironment();environmentEnabled=true;};
    window.AbyssDiagnostics.backgroundPause=backgroundPause;
    window.AbyssDiagnostics.openSurvey=openSurvey;
    window.AbyssDiagnostics.setWaypoint=setWaypoint;
    window.AbyssDiagnostics.restore=restoreActiveDive;
    window.AbyssDiagnostics.wild=()=>JSON.parse(JSON.stringify({enabled:wildEnabled,rules:WILD,species:FISH,activeSchools:wildActiveSchools,field:field.wild,mines:scene.derelictMines||[],vents:(scene.ventFields||[]).map(v=>({...v,stage:ventStage(v)})),schools:scene.schools||[],benthos:scene.benthos||[]}));
    window.AbyssDiagnostics.enableWild=()=>{buildWildWaters();render();};
    window.AbyssDiagnostics.wildFixture=({mines=[],vents=[],schools=[],benthos=[]}={})=>{
      wildEnabled=true;wildSoundTimers={};const x=player.x,y=player.y;
      field.wild={version:1,mines:mines.map((m,i)=>({id:'derelict-'+i,anchorX:x+(m.dx||0),anchorY:y+(m.dy||0)+80,tether:80,phase:0,sway:0,...m})),vents:vents.map((v,i)=>({id:'thermal-'+i,x:x+(v.dx||0),y:y+(v.dy||0),rx:30,height:130,period:16,phase:0,damage:5,lift:46,...v})),cleared:[],retired:[],sheltered:[]};
      scene.derelictMines=field.wild.mines.map(m=>({...m,...mineLocation(m),detonated:false,revealUntil:0}));scene.ventFields=field.wild.vents.map(v=>({...v,revealUntil:0,disabled:false}));
      scene.schools=schools.map((v,i)=>makeSchool('school-'+i,x+(v.dx||0),y+(v.dy||0),v.species||0,randGen(i+42)));
      scene.benthos=benthos.map(v=>({x:x+(v.dx||0),y:y+(v.dy||0),kind:0,size:18,phase:0,retreat:0,level:0,...v}));render();
    };
    window.AbyssDiagnostics.ventAt=(x,y)=>ventFlowAt(x,y);
    window.AbyssDiagnostics.wildClear=(x,y,r=6)=>wildClear(x,y,r);
    window.AbyssDiagnostics.setClock=t=>{clock=t;for(const m of scene.derelictMines||[])Object.assign(m,mineLocation(m));render();};
    window.AbyssDiagnostics.face=angle=>{player.facing=angle;render();};
    window.AbyssDiagnostics.setFear=value=>{for(const s of scene.schools||[])s.fear=value;render();};
    window.AbyssDiagnostics.pulseWild=dt=>{clock+=dt;updateWildWaters(dt);updateUI();render();};

    window.AbyssDiagnostics.signals=()=>JSON.parse(JSON.stringify({state:signals,objects:scene.signals||[],records:signalData.records.map(r=>({...r,unlocked:bankedRecord(r)}))}));
    window.AbyssDiagnostics.openContracts=()=>showDock('contracts');
    window.AbyssDiagnostics.openJournal=openJournal;
    window.AbyssDiagnostics.acceptContract=acceptContract;
    window.AbyssDiagnostics.signalPreview=showImportPreview;
    window.AbyssDiagnostics.confirmImport=confirmImport;
    window.AbyssDiagnostics.exportCampaign=exportCampaign;
    window.AbyssDiagnostics.wardenFixture=()=>{signals.warden.activated=true;signals.warden.defeated=false;signals.warden.health=1200;buildWarden();};
    window.AbyssDiagnostics.signalPlacementProbe=()=>{if(LEVEL_ID==='midnight-cathedral'){signals.warden.site=null;buildWarden();}signals.boards[LEVEL_ID]={serial:1,offers:[]};const b=ensureContracts();return {offers:b.offers.map(c=>({...c,points:c.points.map(p=>({...p,blocked:projectileSolid(p.x,p.y,24),depth:depthOf(p.y)}))})),warden:signals.warden.site?{...signals.warden.site,blocked:projectileSolid(signals.warden.site.x,signals.warden.site.y,24)}:null};};
    window.AbyssDiagnostics.retryContract=retryContract;
    window.AbyssDiagnostics.guidance=()=>JSON.parse(JSON.stringify(GUIDANCE));
    window.AbyssDiagnostics.guidanceLine=(a,b,r=0)=>guidanceLineClear(a,b,r);
    window.AbyssDiagnostics.seekTarget=(kind,index=0)=>{
      const o=kind==='mine'?scene.mines[index]:scene.projectiles[index];if(!o)return null;
      if(kind==='mine'){o.originX??=o.x;o.originY??=o.y;}
      const e=findGuidanceTarget(o,kind==='mine'?(o.heading||0):Math.atan2(o.vy,o.vx),kind);
      return e?{id:e.id,x:e.x,y:e.y}:null;
    };
    window.AbyssDiagnostics.ordnancePulse=(dt,{moveEnemies=false}={})=>{
      clock+=dt;for(const e of scene.predators){e.previousX=e.x;e.previousY=e.y;if(moveEnemies){e.x+=(e.vx||0)*dt;e.y+=(e.vy||0)*dt;}}
      updateMines(dt);updateProjectiles(dt);render();
    };
    window.AbyssDiagnostics.mutateEnemy=(id,values)=>{const e=scene.predators.find(e=>e.id===id);if(e)Object.assign(e,values);};
    window.AbyssDiagnostics.collectById=id=>{const item=scene.items.find(n=>n.id===id);if(!item)return false;const was=paused;paused=false;const ok=collectItem(item);paused=was;return ok;};
    window.AbyssDiagnostics.giants=()=>JSON.parse(JSON.stringify({state:giants,site:giantSite,objects:scene.giantObjects||[],walls:giantWalls(),cargo:player.cargo,indicators:targetIndicators(),definitions:GIANTS.vessels}));
    window.AbyssDiagnostics.giantSolid=(x,y,r=0)=>giantSolid(x,y,r);
    window.AbyssDiagnostics.openDiscoveries=()=>openJournal('discoveries');
    window.AbyssDiagnostics.predatorBehaviour=()=>{for(const e of scene.predators)delete e.behaviour;initialisePredatorBehaviours();};
    window.AbyssDiagnostics.rescueRules=()=>({...RESPAWN_AMMO});
    window.AbyssDiagnostics.economy=()=>({regen:{...SALVAGE_REGEN},creditFactor:CREDIT_PRICE_FACTOR,creditUplift:CREDIT_UPLIFT,prices:{mine:AMMO_PRICE,...WEAPON_AMMO_PRICES},salvage:JSON.parse(JSON.stringify(field.salvage))});
    window.AbyssDiagnostics.buyOrdnance=buyOrdnance;
    window.AbyssDiagnostics.autoPickup=()=>{const before=paused;paused=false;autoCollectSalvage(.25);paused=before;updateUI();return player.cargo.scrap;};
    window.AbyssDiagnostics.economyPulse=(seconds,allowPaused=false)=>{const before=paused;if(allowPaused)paused=false;updateSalvageRegeneration(seconds);paused=before;persist();return window.AbyssDiagnostics.economy();};
    window.AbyssDiagnostics.grantCredits=(value)=>{saved.credits=Math.max(0,Math.floor(value));persist();updateUI();};
  }
  window.AbyssLaunch?.ready();
})();
