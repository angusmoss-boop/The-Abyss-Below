(() => {
  'use strict';
  const BUILD = Object.freeze({version:'0.17.0',name:'Salvage & Supply',id:'0.17.0-salvage-supply-1'});
  window.AbyssBuild=BUILD;
  const $ = id => document.getElementById(id);
  const canvas = $('gameCanvas');
  const ctx = canvas.getContext('2d');
  const radar = $('radarCanvas');
  const rctx = radar.getContext('2d');
  const TAU = Math.PI * 2;
  const SURVEY = Object.freeze({cell:90,left:-1000,right:2200,contactLife:8});
  const freshSurvey=()=>({version:1,cells:[],contacts:{},waypoint:null});
  function normaliseSurvey(value){
    if(!value||value.version!==1)return freshSurvey();
    const point=p=>p&&Number.isFinite(p.x)&&p.x>=SURVEY.left&&p.x<=SURVEY.right&&Number.isFinite(p.y)&&p.y>=70&&p.y<=18120;
    return {version:1,cells:Array.isArray(value.cells)?[...new Set(value.cells.filter(x=>typeof x==='string'&&/^\d{1,2}:\d{1,3}$/.test(x)).slice(0,12000))]:[],
      contacts:Object.fromEntries(Object.entries(value.contacts||{}).filter(([k,c])=>k.length<100&&point(c)&&['scrap','crystal','air','recorder','recovery','wreck','landmark','station','derelict','thermal'].includes(c.type)).slice(0,4000).map(([k,c])=>[k,{x:c.x,y:c.y,type:c.type,label:String(c.label||'').slice(0,80),collected:c.collected===true}])),
      waypoint:point(value.waypoint)?{x:value.waypoint.x,y:value.waypoint.y}:null};
  }
  // Surface and harbour rules are shared by rendering, physics and AI.
  const SURFACE = Object.freeze({y:70,breachSpeed:100,gravity:260,airDrag:.18,reentryDrag:.62});
  const HARBOUR = Object.freeze({x:600,y:160,safeRadius:260,exclusionRadius:330,dockRadius:128});
  const inHarbour = object => Boolean(object && Math.hypot(object.x-HARBOUR.x,object.y-HARBOUR.y)<=HARBOUR.safeRadius);
  let surfaceEffects=[];
  const THRUST = Object.freeze({normal:146,quiet:68,perMark:.17,maxMark:4});
  const normalSpeedAt = mark => THRUST.normal*(1+mark*THRUST.perMark);
  const MINES = Object.freeze({damage:[0,60,110,180,240],capacity:[0,2,4,6,8],
    armDelay:.65,deployCooldown:1.1,triggerRadius:52,blastRadius:108,radius:8});
  const roman = mark => ['0','I','II','III','IV','V','VI','VII'][mark]||String(mark);
  const BOOST = Object.freeze({capacities:[0,75,100,125,150],multipliers:[1,1.45,1.60,1.75,1.85],drain:25,recharge:12.5,rechargeDelay:1.5,powerPerSecond:7});
  const AMMO_PRICE = 18;
  const WEAPON_AMMO_PRICES = Object.freeze({railgun:6,torpedo:24});
  const CREDIT_PRICE_FACTOR = 1.5;
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
  const MAGNET = Object.freeze({range:[60,100,140,180,220],power:[0,1.2,1,.8,.6]});
  const SHIELD = Object.freeze({capacity:[0,20,35,50,70],recharge:[0,2,3,4,5],delay:8,powerPerPoint:.35});
  const DISRUPTOR = Object.freeze({range:[0,180,220,260,300],seconds:[0,1.2,1.6,2,2.4],power:[0,3,4,5,6],resistance:{common:1,apex:.8,reaper:.6}});
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
  const freshField = () => ({schema:3,seed:(Math.random()*0xffffffff)>>>0,cycle:0,
    looted:[],health:{},loot:null,drops:[],secured:[],recoveries:[],recoverySerial:0,pendingCargo:null,floorReached:false,awaitingDock:false,survey:freshSurvey(),wild:null,salvage:freshSalvage()});
  let field=freshField(),campaignId='campaign-'+Date.now().toString(36)+'-'+field.seed.toString(36);
  let campaignLevels={},storageHealthy=true,storageRecovery=false,migratedLegacy=false;
  const readJSON=key=>{try{return JSON.parse(localStorage.getItem(key)||'null');}catch(_){return null;}};
  function validateField(data){
    if(!data||![1,2,3].includes(data.schema)||!Number.isInteger(data.seed)||data.seed<0||data.seed>0xffffffff)return null;
    const validPoint=n=>n&&Number.isFinite(n.x)&&Number.isFinite(n.y)&&n.y>=58&&n.y<=18120;
    const validNode=n=>validPoint(n)&&typeof n.id==='string'&&['scrap','crystal','air'].includes(n.type);
    const normalise=n=>({id:n.id,x:n.x,y:n.y,type:n.type,quantity:Number.isInteger(n.quantity)&&n.quantity>0&&n.quantity<=100?n.quantity:(n.type==='air'?1:2)});
    const cargo=n=>validPoint(n)?{x:n.x,y:n.y,scrap:cleanCount(n.scrap),crystal:cleanCount(n.crystal)}:null;
    const loot=Array.isArray(data.loot)&&data.loot.length>0&&data.loot.length<=3000&&data.loot.every(validNode)&&new Set(data.loot.map(n=>n.id)).size===data.loot.length?data.loot.map(normalise):null;
    const recoveries=Array.isArray(data.recoveries)?data.recoveries.filter(n=>cargo(n)&&typeof n.id==='string'&&/^recovery-/.test(n.id)).map(n=>({...cargo(n),id:n.id})).filter(n=>n.scrap||n.crystal):[];
    const looted=Array.isArray(data.looted)?[...new Set(data.looted.filter(x=>typeof x==='string'&&/^loot-\d+$/.test(x)))]:[];
    return {schema:3,seed:data.seed,cycle:cleanCount(data.cycle),looted,
      salvage:normaliseSalvage(data.salvage,loot,looted),
      health:Object.fromEntries(Object.entries(data.health||{}).filter(([k,v])=>/^enemy-\d+$/.test(k)&&Number.isFinite(v)&&v>=0)),loot,
      drops:Array.isArray(data.drops)?data.drops.filter(n=>validNode(n)&&n.type==='scrap'&&/^drop-/.test(n.id)).map(normalise):[],
      secured:Array.isArray(data.secured)?[...new Set(data.secured.filter(n=>Number.isInteger(n)&&n>=0&&n<6))]:[],
      recorderDepths:Array.isArray(data.recorderDepths)&&data.recorderDepths.length===6&&data.recorderDepths.every(n=>Number.isFinite(n)&&n>0&&n<1800)?[...data.recorderDepths]:null,
      survey:normaliseSurvey(data.survey),wild:validateWild(data.wild),legacyLayout:data.legacyLayout===true,crystalTopUp:data.crystalTopUp===true,recoveries,recoverySerial:cleanCount(data.recoverySerial),pendingCargo:cargo(data.pendingCargo),floorReached:data.floorReached===true,awaitingDock:data.awaitingDock===true};
  }
  function addRecovery(f,cargo){
    if(!cargo||!(cargo.scrap||cargo.crystal))return;
    f.recoverySerial++;
    f.recoveries.push({id:'recovery-'+f.seed+'-'+f.recoverySerial,x:cargo.x,y:Math.max(300,Math.min(cargo.y,120+Math.max(20,HULL_DEPTHS[saved.upgrades.hull]-12)*10)),scrap:cleanCount(cargo.scrap),crystal:cleanCount(cargo.crystal)});
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
    reaper:{name:'CRIMSON REAPER',level:3,health:400,speed:normalSpeedAt(THRUST.maxMark),patrolSpeed:46,detectionCap:440,leash:610,awareness:1.85,damage:42,cooldown:1.15,reach:48}
  };
  const UPGRADES = [
    {id:'hull', name:'REINFORCED HULL', desc:'Adds 28 max hull HP per mark. Pressure ratings: 330 / 630 / 830 / 1,030 / 1,330 / 1,530 / 1,830 m. The last mark reaches the final seabed safely.', prices:[80,150,297,420,570,760,1000], limit:7},
    {id:'oxygen', name:'AIR RECYCLER', desc:'Expand oxygen capacity and slow oxygen consumption.', base:70, limit:5},
    {id:'battery', name:'DEEP-CELL BATTERY', desc:'More energy, cheaper boost bursts and 10% faster boost recharge per level.', base:65, limit:5},
    {id:'engine', name:'MAGNETIC THRUSTERS', desc:'Mk I unlocks boost. Every mark improves normal speed, boost speed and boost endurance: 3 / 4 / 5 / 6 seconds.', base:75, limit:4},
    {id:'flashlight', name:'EXPLORATION FLASHLIGHT', desc:'Mk I fitted. Upgrade the forward beam for longer reach and a wider view. Uses power slowly while switched on.', prices:[0,75,150,300], limit:4},
    {id:'sonar', name:'WIDEBAND SONAR', desc:'Wider scans, longer-lived echoes, lower power cost and shorter cooldowns.', base:90, limit:4},
    {id:'quiet', name:'SILENT DRIVE', desc:'Suppress engine noise and reduce predator detection.', base:95, limit:4},
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
  storageRecovery=window.AbyssSlots.status().recovered;
  let campaignTitle=campaign?.title||window.AbyssSlots.title();
  if(validCampaign(campaign)){
    saved={...defaults(),...campaign.profile,upgrades:{...defaults().upgrades,...campaign.profile.upgrades}};
    for(const l of LEVELS){const f=validateField(campaign.levels[l.id]);if(f)campaignLevels[l.id]=f;}
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
  saved.mineAmmo=saved.upgrades.minePower?Math.min(saved.mineAmmo,MINES.capacity[saved.upgrades.mineCapacity]):0;
  saved.weaponAmmo=Object.fromEntries(['railgun','torpedo'].map(id=>[id,Math.min(cleanCount(saved.weaponAmmo?.[id]),WEAPONS[id].capacity[saved.upgrades[id]])]));
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
    if(player&&running){field.pendingCargo=player.cargo.scrap||player.cargo.crystal?{x:player.x,y:Math.max(300,player.y),scrap:player.cargo.scrap,crystal:player.cargo.crystal}:null;}
    campaignLevels[LEVEL_ID]=field;
    if(buildingWorld)return true;
    const activeDive=running&&player&&player.hull>0?captureActiveDive():loadedActive;
    const snapshot={schema:3,id:campaignId,title:campaignTitle,selectedLevel:LEVEL_ID,profile:saved,levels:campaignLevels,activeDive};
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
  const upgradeCost = (upgrade,level) => Math.ceil((upgrade.prices?.[level]??Math.floor(upgrade.base*Math.pow(1.55,level)))*CREDIT_PRICE_FACTOR);
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
  // Joystick is analogue (-1..1 on each axis). Cruise stores the last steering vector.
  const joystick = {x:0,y:0,pointerId:null,originX:0,originY:0,radius:44};
  const cruiseHeading = {x:0,y:0};
  // Pointer coordinates remain in screen space while the follow camera moves.
  const mouseHelm = {pointerId:null,clientX:0,clientY:0};
  let boostHeld=false,boostPointerId=null,railHeld=false,railPointerId=null;
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
    for(const kind of ['rocks','wrecks','vents','derelictMines','ventFields','schools'])for(const object of (scene[kind]||[]))object.revealUntil=0;
    const looted=new Set(field.looted);
    for(const w of scene.wrecks){
      if(!saved.secured.includes(w.index))scene.items.push(makeItem(w.x,w.y,'recorder',{id:'recorder-'+w.index,index:w.index}));
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
      // Recoveries cannot be trapped inside collision outlines after an emergency.
      node.y=clamp(node.y,300,MAX_WORLD_Y-80);
      if(!minePositionClear(node.x,node.y)){const point=populationPoint(randGen(field.seed+field.recoverySerial),node.y,{lane:1});node.x=point.x;}
      scene.items.push(makeItem(node.x,node.y,'recovery',{...node,type:'recovery'}));
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
    scene.predators=scene.predators.filter(predatorAlive);
  }
  function createWorld() {
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
    populateWorld();buildEnvironment();hydrateSurvey();buildWildWaters();persistField();
  }
  function refreshDockPopulation(){
    field.cycle++;field.health={};
    const supplies=new Set(field.loot.filter(n=>n.type==='air').map(n=>n.id));
    field.looted=field.looted.filter(id=>!supplies.has(id));field.awaitingDock=false;
    populateWorld();persistField();
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
    // A new launch is distinct from restoring the existing expedition.
    loadedActive=null;running=false;buildingWorld=true;createWorld();buildingWorld=false;dockVisitActive=!field.awaitingDock;
    player={x:600,y:160,vx:0,vy:0,airborne:false,surfaceCooldownUntil:0,facing:-Math.PI/2,hull:maxHull(),oxygen:maxOxygen(),battery:maxBattery(),noise:0,lights:true,quiet:false,damageCooldown:0,scanCooldown:0,boost:boostCapacity(),boosting:false,boostLocked:false,boostNeedsRelease:false,boostRechargeDelay:0,cargo:{scrap:0,crystal:0,recorders:[]},lastRepair:-100,mineAmmo:0,mineCooldown:0,weaponAmmo:{...saved.weaponAmmo},weaponCooldown:{railgun:0,torpedo:0},damageFlashUntil:0,nextDamageFlash:0,kills:0,shield:shieldCapacity(),shieldDelay:0,shieldFlashUntil:0,magnetFlash:null,autoSalvageCooldown:0,trip:{deepest:0,hullDamage:0}};
    resupplyMines();
    sonarWaves=[];sonarTerrainEchoes=[];surfaceEffects=[];clock=0;for(const m of scene.derelictMines||[])Object.assign(m,mineLocation(m));lastZone='';eventLines=[];useHoldTimer=0;victoryShown=saved.secured.length===RECORDERS_TOTAL;pointerSilent=false;resetPilotInput();camera.x=player.x-viewport.w/2;camera.y=player.y-viewport.h/2;
    addEvent('Dive systems initialised.');
    addEvent(currentLevel().name+' · '+RECORDERS_TOTAL+' recorders · '+currentLevel().depth.toLocaleString('en-GB')+' m seabed.');
    running=true;paused=false;showingDock=false;
    $('menuOverlay').classList.add('hidden');$('modalOverlay').classList.add('hidden');$('pauseOverlay').classList.add('hidden');
    canvas.focus({preventScroll:true});syncPauseButtons();
    announce('EXPEDITION ACTIVE · LOCATE THE RECORDERS');
    surveyVisibleWater();persist();updateUI();
  }
  function addEvent(msg) {eventLines.unshift(msg);eventLines=eventLines.slice(0,3);$('eventLog').innerHTML=eventLines.map(x=>'<div>◈ '+x+'</div>').join('');}
  function announce(message,duration=2.8) { $('notification').textContent=message;$('notification').classList.remove('hidden');toastUntil=clock+duration; }
  function clearSalvageLine(item){
    // Check the actual collision polygons, not only their bounding circles.
    const dx=item.x-player.x,dy=item.y-player.y,steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/6));
    const rocks=scene.rocks.filter(r=>Math.hypot(segmentClosest(r.x,r.y,player,item).x-r.x,segmentClosest(r.x,r.y,player,item).y-r.y)<=r.radius+5);
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
    for (const item of scene.items) if(!item.collected&&item.type!=='scrap') {
      const d=distance(player,item);
      if(d<range&&((d<60&&clearSalvageLine(item))||remoteSalvageAvailable(item))) {range=d;candidate=item;}
    }
    return candidate;
  }
  function interact(silentMiss=false) {
    if(!running||paused)return;
    const item=nearestInteractable();
    if(!item) {if(!silentMiss)announce('NOTHING IN SALVAGE RANGE',1.25);return;}
    if(item.type==='station') {depositAndDock();return;}
    collectItem(item);
  }
  function collectItem(item,automatic=false){
    if(!running||paused||item.collected||player.airborne)return false;
    if(distance(player,item)>=magnetRange())return false;
    if(distance(player,item)<60&&!clearSalvageLine(item))return false;
    if(distance(player,item)>=60){
      // Re-check on use so low power never collects a remote item for free.
      if(!remoteSalvageAvailable(item))return false;
      player.battery=Math.max(0,player.battery-magnetPower());
      player.magnetFlash={x:item.x,y:item.y,until:clock+.35};
    }
    item.collected=true;recordSalvageHarvest(item);rememberSurveyObject('items',item);window.AbyssAudio?.event(item.type==='recorder'?'recorder':'pickup');
    const quantity=item.quantity||1;
    if(distance(player,item)>=60&&['scrap','crystal'].includes(item.type))addStat('magnetPickups',1);
    if(item.predatorDrop){field.drops=field.drops.filter(n=>n.id!==item.id);}
    else if(!['recorder','recovery'].includes(item.type)&&typeof item.id==='string'&&!field.looted.includes(item.id))field.looted.push(item.id);
    if(item.type==='recovery'){field.recoveries=field.recoveries.filter(n=>n.id!==item.id);player.cargo.scrap+=item.scrap||0;player.cargo.crystal+=item.crystal||0;announce('RECOVERY POD SECURED · RETURN TO HUB',3);addEvent('Recovered '+(item.scrap||0)+' scrap + '+(item.crystal||0)+' crystals');}
    else if(item.type==='scrap') {player.cargo.scrap+=quantity;if(!automatic){addEvent('Scrap recovered (+'+quantity+')');announce('SALVAGE +'+quantity+' SCRAP',1.8);}else{player.magnetFlash={x:item.x,y:item.y,until:clock+.35};}}
    else if(item.type==='crystal') {player.cargo.crystal+=quantity;addEvent('Abyss crystals recovered (+'+quantity+')');announce('RARE CRYSTALS +'+quantity,2);}
    else if(item.type==='air') {player.oxygen=Math.min(maxOxygen(),player.oxygen+35);player.battery=Math.min(maxBattery(),player.battery+12);addEvent('Emergency supply cache');announce('OXYGEN +35 · ENERGY +12',2);}
    else if(item.type==='recorder') {player.cargo.recorders.push(item.index);addEvent('ENCRYPTED RECORDER FOUND');announce('FLIGHT RECORDER RECOVERED · RETURN TO STATION',4);}
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
    for(const kind of ['items','predators','rocks','wrecks','vents','mines','landmarks','derelictMines','ventFields','schools'])for(const object of (scene[kind]||[]))add(kind,object);
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
          contact.hit=true;rememberSurveyObject(contact.kind,object);
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
    window.AbyssAudio?.event('mine');
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
  function damagePredator(enemy,amount,credited=true){
    if(!predatorAlive(enemy)||!Number.isFinite(amount)||amount<=0)return;
    enemy.health=Math.max(0,enemy.health-amount);enemy.lastDamaged=clock;
    if(typeof enemy.id==='string')field.health[enemy.id]=enemy.health;
    if(enemy.health===0){
      enemy.dead=true;enemy.aggression=0;enemy.alertUntil=0;if(credited){player.kills++;addStat('kills',1);if(enemy.tier==='reaper')addStat('reaperKills',1);checkAchievements();}
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
      if(mine.detonated||clock<mine.armedAt)continue;
      let contact=null;
      for(const enemy of scene.predators)if(predatorAlive(enemy)){
        const t=mineContactTime(mine,enemy,dt);
        if(t!==null&&(contact===null||t<contact))contact=t;
      }
      if(contact===null)continue;
      mine.detonated=true;window.AbyssAudio?.event('explosion',clamp((mine.x-player.x)/300,-1,1));
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
    announce('FIELD REPAIR COMPLETE · HULL +30',2);addEvent('Used 2 scrap for repairs');persist();updateUI();
  }
  function toggleLights(){if(!running||paused)return;player.lights=!player.lights;window.AbyssAudio?.event('lights');persist();addEvent('External lamps '+(player.lights?'activated':'disabled'));updateUI();}
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
    {id:'systems',name:'All Systems Go',description:'Fully upgrade all 14 ship systems.',target:14,kind:'systems',icon:'20'}
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
    for(const id of ['menuAchievementCount','pauseAchievementCount'])if($(id))$(id).textContent=ACHIEVEMENTS.filter(a=>saved.achievements[a.id]).length+' / 20';
    return newly.length;
  }
  function showAchievements(){
    if($('upgradeDialog').open)return;
    checkAchievements();persist();achievementReturnPause=paused;paused=true;resetPilotInput();
    const earned=ACHIEVEMENTS.filter(a=>saved.achievements[a.id]).length;
    $('achievementSummary').textContent=earned+' / 20 UNLOCKED · THIS CAMPAIGN';
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
  function stashCargo(){
    if(!player)return;
    if(player.cargo.scrap||player.cargo.crystal)addRecovery(field,{x:player.x,y:player.y,scrap:player.cargo.scrap,crystal:player.cargo.crystal});
    field.pendingCargo=null;player.cargo={scrap:0,crystal:0,recorders:[]};
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
    const wasComplete=levelComplete(LEVEL_ID),gained=player.cargo.scrap*18,bankedCrystals=player.cargo.crystal;
    const earnedXP=player.cargo.scrap*9+bankedCrystals*23+player.cargo.recorders.length*90;
    const delivered=player.cargo.recorders.length,realReturn=!dockVisitActive;
    addStat('bankedScrap',player.cargo.scrap);addStat('bankedCrystals',bankedCrystals);
    if(realReturn&&player.trip?.deepest>=200&&player.trip.hullDamage<.001&&(gained||bankedCrystals||delivered))addStat('cleanGetaways',1);
    saved.credits+=gained;saved.crystals+=bankedCrystals;saved.xp+=earnedXP;
    for(const i of player.cargo.recorders)if(!saved.secured.includes(i)&&i>=0&&i<RECORDERS_TOTAL)saved.secured.push(i);
    player.cargo={scrap:0,crystal:0,recorders:[]};field.pendingCargo=null;
    player.hull=maxHull();player.oxygen=maxOxygen();player.battery=maxBattery();player.noise=0;resetBoost();resetShield();resupplyMines();syncWeaponStock();player.trip={deepest:0,hullDamage:0};
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
    oxygen:['LIFE SUPPORT','support','More air means longer expeditions. Oxygen still drains while travelling or waiting underwater.'],
    battery:['ENERGY STORAGE','support','More stored power and better efficiency help your thrusters, flashlight and other powered systems.'],
    engine:['PROPULSION','support','Mk I unlocks boost. Boost uses both the charge meter and battery; a Crimson Reaper matches Mk IV normal speed.'],
    flashlight:['OPTICS','exploration','At 1,000 m ambient light disappears. A wider, longer beam lets you plan routes and locate resources.'],
    sonar:['SENSORS','exploration','Scans cover the current screen. Very large screens can extend the cooldown until the wave finishes.'],
    quiet:['SIGNATURE CONTROL','support','Suppresses ordinary engine noise. Boost remains loud, and sonar can alert nearby predators.'],
    minePower:['ORDNANCE','defence','The launcher unlocks at Mk I. Warheads strengthen every mine; ammunition is bought separately.'],
    mineCapacity:['ORDNANCE STORAGE','defence','A larger rack adds empty slots only. Buy rounds in the Ammunition tab for 18 credits each.'],
    magnet:['RESOURCE RECOVERY','exploration','Scrap collects automatically. Remote pickups require power, visibility and a clear path. Crystals still need USE or E, and recorders and supply caches need a close approach.'],
    shield:['ACTIVE DEFENCE','defence','Absorbs bites and rock impacts only, never pressure or oxygen loss. Recharge costs 0.35 power per shield point and pauses while boosting.'],
    railgun:['DIRECT-FIRE WEAPON','tactical','Fast straight-line bolts follow the bow. Hold Z or RAIL for repeated fire. Rocks stop shots. Buy rail rounds for 6 credits each in Ammunition. Docking, upgrades, menus, death and loading never grant rounds.'],
    torpedo:['EXPLOSIVE WEAPON','defence','Tap X or TORP for one forward torpedo. The blast can hit several predators; your own blast is ship-safe. Detonating abandoned mines can still hurt you. Buy torpedoes for 24 credits each at the dock. Upgrading adds empty capacity, not ammunition.'],
    disruptor:['ACOUSTIC COUNTERMEASURES','tactical','Stun begins on wave arrival, only inside the disruption radius. Stalkers receive 80% duration, Reapers 60%. Low battery falls back to an ordinary scan.']
  };
  function upgradeStats(id,mark){
    const n=v=>Number(v.toFixed(2)).toLocaleString('en-GB');
    switch(id){
      case 'railgun':case 'torpedo':return [['Damage',WEAPONS[id].damage[mark]+' HP'],['Magazine capacity',WEAPONS[id].capacity[mark]+' rounds'],['Firing interval',WEAPONS[id].cooldown+' sec'],['Range',WEAPONS[id].range/10+' m'],['Price per round',WEAPON_AMMO_PRICES[id]+' CR']];
      case 'hull':return [['Safe depth',HULL_DEPTHS[mark].toLocaleString('en-GB')+' m'],['Hull integrity',(100+mark*28)+' HP']];
      case 'oxygen':return [['Oxygen capacity',(100+mark*30)+' units'],['Consumption',n(.22/(1+mark*.2)*60)+'/min']];
      case 'battery':return [['Battery capacity',(100+mark*30)+' power'],['Boost power use',n(BOOST.powerPerSecond/(1+mark*.12))+'/sec'],['Boost recharge',n(BOOST.recharge*(1+mark*.1))+'/sec']];
      case 'engine':return [['Normal speed',n(normalSpeedAt(mark)/10)+' m/s'],['Boost speed',mark?n(normalSpeedAt(mark)*BOOST.multipliers[mark]/10)+' m/s':'Locked'],['Boost endurance',mark?BOOST.capacities[mark]/BOOST.drain+' sec':'None']];
      case 'flashlight':return [['Maximum reach',FLASHLIGHT[mark].length/10+' m'],['Beam angle',Math.round(FLASHLIGHT[mark].halfAngle*360/Math.PI)+'°'],['Base power draw',n(FLASHLIGHT[mark].power*60)+'/min']];
      case 'sonar':return [['Base cooldown',n(SONAR.cooldown-mark*.35)+' sec'],['Scan power',Math.max(4,12-mark*2)+' power'],['Echo duration',n(SONAR.echoSeconds+mark*.45)+' sec']];
      case 'quiet':return [['Normal noise reduction',Math.round((1-1/(1+mark*.32))*100)+'%'],['Base idle noise','0%']];
      case 'minePower':return [['Mine damage',MINES.damage[mark]+' HP'],['Blast radius',MINES.blastRadius/10+' m'],['Launcher',mark?'Online':'Not fitted']];
      case 'mineCapacity':return [['Ammunition slots',MINES.capacity[mark]+' rounds'],['New rounds included','None']];
      case 'magnet':return [['Resource reach',MAGNET.range[mark]/10+' m'],['Remote pickup cost',mark?MAGNET.power[mark]+' power':'Not fitted'],['Close pickup cost','Free'],['Scrap collection','Automatic'],['Crystals / recorders','USE required']];
      case 'shield':return [['Shield capacity',SHIELD.capacity[mark]+' HP'],['Recharge rate',SHIELD.recharge[mark]+' HP/sec'],['Recharge delay',mark?SHIELD.delay+' sec':'Not fitted']];
      case 'disruptor':return [['Disruption radius',DISRUPTOR.range[mark]/10+' m'],['Drifter stun',DISRUPTOR.seconds[mark]+' sec'],['Reaper stun',n(DISRUPTOR.seconds[mark]*.6)+' sec'],['Extra scan cost',DISRUPTOR.power[mark]+' power']];
      default:return [];
    }
  }
  const DOCK_TABS=[['upgradesTab','upgrades'],['ammunitionTab','ammunition'],['expeditionsTab','expeditions']];
  function showDock(tab='upgrades') {
    showingDock=true;dockTab=tab;syncWeaponStock();persist();
    openDialog('SURFACE OPERATIONS / CAMPAIGN HUB','NEREID EXPEDITION HUB',
      '<div class="dock-intro"><div><span class="dock-online"><i></i> VESSEL SECURED</span><p>Refit. Revisit. Go deeper.</p></div><div class="dock-wallet"><div class="dock-credit"><span>CREDITS</span><strong id="dockCredits">0</strong></div><div class="dock-credit crystal-wallet"><span>CRYSTALS</span><strong id="dockCrystals">0</strong></div></div></div><div id="dockBalance" class="dock-balance"></div><div class="dock-tabs" role="tablist" aria-label="Dock services"><button id="upgradesTab" role="tab" aria-controls="dockPanel">SHIP UPGRADES</button><button id="ammunitionTab" role="tab" aria-controls="dockPanel">AMMUNITION</button><button id="expeditionsTab" role="tab" aria-controls="dockPanel">EXPEDITIONS</button></div><div id="dockPanel" role="tabpanel"></div>',
      '<div class="dock-departure"><span id="departureLevel">'+currentLevel().name+'<br>Seabed '+currentLevel().depth.toLocaleString('en-GB')+' m · bank all recorders to unlock the next level.</span><button class="primary-btn" id="launchAgain">UNDOCK <span aria-hidden="true">↗</span></button></div>');
    dialogReturnPause=false;
    for(const [id,tabName] of DOCK_TABS){
      $(id).addEventListener('click',()=>{dockTab=tabName;drawDockPanel();});
      $(id).addEventListener('keydown',e=>{
        if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();
        let i=DOCK_TABS.findIndex(t=>t[1]===dockTab);i=e.key==='Home'?0:e.key==='End'?2:(i+(e.key==='ArrowRight'?1:2))%3;dockTab=DOCK_TABS[i][1];drawDockPanel();$(DOCK_TABS[i][0]).focus();
      });
    }
    window.AbyssAudio?.unlock();window.AbyssAudio?.setScene('dock');
    drawDockPanel();$(DOCK_TABS.find(t=>t[1]===dockTab)[0]).focus({preventScroll:true});
    $('launchAgain').addEventListener('click',()=>{closeDialog();canvas.focus({preventScroll:true});addEvent('Course set · '+currentLevel().name);});
  }
  function drawDockPanel(){
    if(!showingDock||!$('dockPanel'))return;
    $('dockCredits').textContent=saved.credits.toLocaleString('en-GB');$('dockCrystals').textContent=saved.crystals.toLocaleString('en-GB');
    $('dockBalance').innerHTML='<span><b>'+safeDepth().toLocaleString('en-GB')+' m</b> HULL</span><span><b>'+player.mineAmmo+'/'+mineCapacity()+'</b> MINES</span><span><b>'+saved.secured.length+'/'+RECORDERS_TOTAL+'</b> LEVEL RECORDERS</span>';
    for(const [id,tab] of DOCK_TABS){$(id).setAttribute('aria-selected',String(dockTab===tab));$(id).tabIndex=dockTab===tab?0:-1;}
    $('dockPanel').setAttribute('aria-labelledby',DOCK_TABS.find(t=>t[1]===dockTab)[0]);
    if(dockTab==='upgrades'){$('dockPanel').innerHTML='<div class="dock-grid-caption"><span>SELECT A SYSTEM</span><span>CREDITS + CRYSTALS</span></div><div class="upgrade-grid" id="upgradeList"></div>';drawUpgrades();}
    else if(dockTab==='ammunition')drawAmmunition();else drawExpeditions();
  }
  function drawExpeditions(){
    $('dockPanel').innerHTML='<div class="expedition-intro"><span>'+totalRecorders()+' / 20 RECORDERS BANKED</span><p>Crystals are finite. Scrap sites recover gradually during active diving. Stocks show units available now; survey completion counts each original site once.</p></div><div class="expedition-list">'+LEVELS.map((l,i)=>{
      const unlocked=levelUnlocked(i),active=l.id===LEVEL_ID,complete=levelComplete(l.id),r=resourceProgress(l.id),f=campaignLevels[l.id];
      return '<article class="expedition-card '+(active?'selected ':'')+(!unlocked?'locked':'')+'" style="--level-accent:'+l.color+'"><div class="expedition-heading"><span>'+l.tag+'</span><b>'+(active?'CURRENT COURSE':complete?'CLEARED':unlocked?'UNLOCKED':'LOCKED')+'</b></div><h3>'+l.name+'</h3><p>'+l.description+'</p><div class="expedition-metrics"><span><strong>'+l.depth.toLocaleString('en-GB')+' m</strong> SEABED</span><span><strong>'+(f?.secured.length||0)+' / '+l.recorders.length+'</strong> RECORDERS</span><span><strong>'+r.scrapRemaining+' / '+r.scrapTotal+'</strong> SCRAP AVAILABLE</span><span><strong>'+r.crystalRemaining+' / '+r.crystalTotal+'</strong> CRYSTALS LEFT</span></div>'+(f?.recoveries.length?'<div class="recovery-hint">'+f.recoveries.length+' RECOVERY POD'+(f.recoveries.length===1?'':'S')+' WAITING</div>':'')+'<button class="expedition-select" data-travel="'+l.id+'" '+(!unlocked||active?'disabled':'')+'>'+(active?'COURSE SELECTED':unlocked?'SET COURSE →':'BANK ALL RECORDERS IN LEVEL '+i)+'</button></article>';
    }).join('')+'</div><p class="expedition-note">Scrap recovers after 5 active dive minutes, at most one deposit per 45 seconds per visited level, out of view. Pauses, harbour waiting and offline time do not advance recovery. Crystals and ammo never refill automatically.</p>';
    document.querySelectorAll('[data-travel]').forEach(b=>b.addEventListener('click',()=>selectLevel(b.dataset.travel)));
  }
  function selectLevel(id){
    const index=LEVELS.findIndex(l=>l.id===id);
    if(index<0||id===LEVEL_ID||!levelUnlocked(index)||!showingDock||!running||!paused||$('upgradeDialog').open||$('achievementsDialog').open||nearestInteractable()?.type!=='station'||player.cargo.scrap||player.cargo.crystal||player.cargo.recorders.length)return false;
    persist();LEVEL_ID=id;field=campaignLevels[id]||freshField();campaignLevels[id]=field;applyLevelGeometry();newDive();showDock('expeditions');persist();return true;
  }
  const ammunitionCapacity=id=>id==='mine'?mineCapacity():WEAPONS[id].capacity[saved.upgrades[id]];
  const ammunitionOwned=id=>id==='mine'?saved.mineAmmo:saved.weaponAmmo[id];
  const ammunitionPrice=id=>id==='mine'?AMMO_PRICE:WEAPON_AMMO_PRICES[id];
  const ammunitionFitted=id=>saved.upgrades[id==='mine'?'minePower':id]>0;
  function buyAmmunition(fill=false){return buyOrdnance('mine',fill);}
  function buyOrdnance(id,fill=false){
    if(!['mine','railgun','torpedo'].includes(id)||slotTransition||!running||!paused||!showingDock||dockTab!=='ammunition'||$('upgradeDialog').open||nearestInteractable()?.type!=='station'||!ammunitionFitted(id))return false;
    const available=ammunitionCapacity(id)-ammunitionOwned(id),price=ammunitionPrice(id);
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
    $('dockPanel').innerHTML='<section class="ordnance-shop"><div class="ordnance-intro"><span class="panel-label">DOCK MUNITIONS</span><p>Spend credits, not crystals. Buy only what you need; owned rounds stay with this campaign.</p></div><div id="ammoFeedback" class="ammo-feedback" role="status" tabindex="-1">No automatic reloads. Upgrades add empty capacity.</div><div class="ordnance-grid">'+['railgun','torpedo','mine'].map(id=>{
      const fitted=ammunitionFitted(id),capacity=ammunitionCapacity(id),owned=ammunitionOwned(id),missing=capacity-owned,price=ammunitionPrice(id);
      const affordable=Math.min(missing,Math.floor(saved.credits/price)),stem=id==='railgun'?'Rail':id==='torpedo'?'Torpedo':'Mine';
      const mark=saved.upgrades[id==='mine'?'minePower':id],damage=id==='mine'?mineDamage():WEAPONS[id].damage[mark];
      return `<article class="ordnance-card ${id}" aria-label="${labels[id]} ammunition"><div class="ordnance-card-head"><h3>${labels[id]}</h3><span>${fitted?'MK '+roman(mark):'UNFITTED'}</span></div><div class="ordnance-stock"><strong>${owned}<small> / ${capacity}</small></strong><span><b>${price} CR</b> PER ROUND</span></div><div class="ordnance-track" role="progressbar" aria-label="${labels[id]} rounds" aria-valuenow="${owned}" aria-valuemin="0" aria-valuemax="${capacity||1}"><i style="width:${capacity?owned/capacity*100:0}%"></i></div><p>${fitted?damage+' HP damage · '+missing+' empty slot'+(missing===1?'':'s'):"Fit Mk I in Ship Upgrades to buy ammunition."}</p><div class="ammo-purchases"><button id="buy${stem}Btn" class="alt-btn" ${!fitted||!missing||saved.credits<price?'disabled':''}>BUY 1 · ${price} CR</button><button id="${id==='mine'?'fillMinesBtn':'fill'+stem+'Btn'}" class="primary-btn" ${!fitted||!affordable?'disabled':''}>${!fitted?'NOT FITTED':!missing?'FULL':!affordable?'NEED '+price+' CR':affordable===missing?'FILL '+missing:'BUY '+affordable}${missing&&affordable?' · '+affordable*price+' CR':''}</button></div></article>`;
    }).join('')+'</div><p class="ammo-footnote">Dock repairs, air and power are still free. All three ammunition types must be purchased. No crystals charged.</p></section>';
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
    $('upgradePriceNote').textContent=problem||'Price: '+cost.toLocaleString('en-GB')+' credits and '+gems+' crystals. '+'Permanent upgrade; ammunition is purchased separately. No free rounds.';
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
    loadedActive=null;stashCargo();running=false;paused=true;player.hull=Math.max(0,player.hull);checkAchievements();persist();
    openDialog('SIGNAL LOST // RECOVERY AVAILABLE','VESSEL LOST',`<div class="briefing"><p>${reason}</p><p>Your unbanked scrap and crystals are in a persistent recovery pod near the loss position. Undelivered recorders return to their wrecks. Banked currencies, upgrades and achievements remain saved.</p><p><strong>Selected level:</strong> ${currentLevel().name}<br><strong>Best depth:</strong> ${saved.bestDepth} m · <strong>Secured recorders:</strong> ${saved.secured.length}/${RECORDERS_TOTAL}</p></div>`, '<div class="dialog-actions"><button class="primary-btn" id="retryBtn">LAUNCH RESCUE VESSEL <span>→</span></button><button class="alt-btn" id="defeatMenuBtn">MAIN MENU</button></div>');
    $('retryBtn').addEventListener('click',newDive);$('defeatMenuBtn').addEventListener('click',()=>returnToMenu(false));
  }
  function takeDamage(amount,reason='Hull breach',independentImpact=false) {
    if(player.damageCooldown>0&&!independentImpact)return;
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
    resetJoystick(true);
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
        player.airborne=true;player.boosting=false;
        emitSurfaceSplash(player.x,player.vy,false);
      }else{player.y=SURFACE.y+.02;player.vy=0;}
    }else if(player.airborne&&player.y>=SURFACE.y&&player.vy>=0){
      emitSurfaceSplash(player.x,player.vy,true);
      player.airborne=false;player.surfaceCooldownUntil=clock+.35;
      player.vx*=.82;player.vy*=SURFACE.reentryDrag;
    }
  }
  function update(dt) {
    simulationStepping=true;
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
      (keyX||keyY)?{x:keyX,y:keyY}:cruiseEnabled?cruiseHeading:{x:0,y:0};
    const x=clamp(steering.x,-1,1),y=clamp(steering.y,-1,1);
    const magnitude=Math.hypot(x,y),hasInput=magnitude>.04;
    const boostFraction=updateBoost(dt,hasInput&&!player.airborne);
    const quiet=(keys.has('shift')||pointerSilent)&&!player.boosting;
    player.quiet=quiet;
    const maxSpeed=(quiet?THRUST.quiet*(1+saved.upgrades.engine*THRUST.perMark):normalSpeedAt(saved.upgrades.engine))*lerp(1,boostMultiplier(),boostFraction);
    const thrustPower=hasInput&&player.battery>.5?1:0;
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
    const noiseTarget=player.boosting?100:hasInput&&!quiet?45+speed*.2:quiet&&hasInput?8:0;
    const noise=player.boosting?Math.max(82,noiseTarget/(1+saved.upgrades.quiet*.32)):
      Math.min(95,noiseTarget)/(1+saved.upgrades.quiet*.32);
    player.noise=lerp(player.noise,noise,1-Math.exp(-dt*(hasInput?2.8:1.6)));
    if(!hasInput)player.noise=Math.max(0,player.noise-dt*4);
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
    updateSalvageRegeneration(dt);autoCollectSalvage(dt);
    if(distance(player,HARBOUR)>=145&&!field.awaitingDock){dockVisitActive=false;field.awaitingDock=true;persist();}
    const energyDrain=dt*((.018+(hasInput&&!player.airborne?(quiet?.028:.075):0))/(1+saved.upgrades.battery*.12)+(headlightsActive()?flashlightPowerRate():0));
    player.battery=clamp(player.battery-energyDrain,0,maxBattery());
    player.oxygen=clamp(player.oxygen-dt*(.22/(1+saved.upgrades.oxygen*.2)),0,maxOxygen());
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
    updateSonar();
    for(const enemy of scene.predators){
      if(!predatorAlive(enemy))continue;
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
      const tx=chase?player.x:enemy.homeX+Math.sin(clock*.33+enemy.phase)*85;
      const ty=chase?player.y:enemy.homeY+Math.cos(clock*.27+enemy.phase)*65;
      const ed=Math.hypot(tx-enemy.x,ty-enemy.y)||1;
      const es=chase?tier.speed:tier.patrolSpeed;
      const waterAtEnemy=currentAt(enemy.x,enemy.y);
      enemy.vx=lerp(enemy.vx,(tx-enemy.x)/ed*es+waterAtEnemy.x,1-Math.exp(-dt*2));
      enemy.vy=lerp(enemy.vy,(ty-enemy.y)/ed*es+ventFlowAt(enemy.x,enemy.y),1-Math.exp(-dt*2));
      enemy.x=clamp(enemy.x+enemy.vx*dt,leftAt(enemy.y)+34,rightAt(enemy.y)-34);
      enemy.y=clamp(enemy.y+enemy.vy*dt,SURFACE.y+34,MAX_WORLD_Y-30);
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
      if(!inHarbour(player)&&!player.airborne&&predatorAlive(enemy)&&(enemy.stunnedUntil||0)<=clock&&enemy.aggression>.13&&distance(player,enemy)<tier.reach&&clock-enemy.lastHit>tier.cooldown){
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
    if(headlightsActive())drawLightBeam();
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
      if(d<250 || enemy.alertUntil>clock || beamIntersects(enemy.x,enemy.y,60)){drawEnemy(enemy);drawPredatorHealth(enemy);}
    }
    if(player){
      if(player.magnetFlash?.until>clock){
        ctx.save();ctx.globalAlpha=(player.magnetFlash.until-clock)/.35;ctx.strokeStyle='#8cebd0';ctx.lineWidth=1.5;ctx.setLineDash([5,5]);
        ctx.beginPath();ctx.moveTo(player.x,player.y);ctx.lineTo(player.magnetFlash.x,player.magnetFlash.y);ctx.stroke();ctx.restore();
      }
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
    drawSonarEchoes();drawWildEchoes();
    if(environmentEnabled){ctx.save();ctx.translate(-camera.x,-camera.y);for(const l of environment.landmarks)if(l.revealUntil>clock&&onscreen(l.x,l.y,200)){ctx.globalAlpha=clamp((l.revealUntil-clock)/sonarEchoSeconds(),0,.9);drawLandmark(l,true);}ctx.restore();}
    if(player.damageFlashUntil>clock){ctx.save();ctx.translate(-camera.x,-camera.y);drawDamageFlash();ctx.restore();}
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
    const color=type==='recovery'?'#ffcb8c':type==='recorder'?'#efbd77':type==='crystal'?'#ab96f5':type==='air'?'#60d5f6':'#8ce4c9';
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
  // === Three campaign slots. Never reuse a running world's objects after switching. ===
  let slotsReturnPause=false;
  const escapeHTML=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function openSlots(newCampaign=false){
    slotsReturnPause=paused;paused=true;resetPilotInput();
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
        '<h3>'+title+'</h3><p class="slot-location">'+(s.corrupt?'The stored files have been preserved.':level)+'</p><div class="slot-metrics"><span><strong>'+s.recorders+'/20</strong> RECORDERS</span><span><strong>'+s.credits.toLocaleString('en-GB')+'</strong> CREDITS</span><span><strong>'+s.crystals+'</strong> CRYSTALS</span></div><div class="slot-checkpoint"><span>'+(s.activeDive?'DIVE SAVED · '+s.diveDepth+' m · RESUMES PAUSED':'AT HUB / READY TO LAUNCH')+'</span><small>'+time+(s.recovered?' · BACKUP AVAILABLE':'')+'</small></div><div class="slot-actions"><button class="slot-primary" '+(s.corrupt?'disabled':'')+' data-load-slot="'+s.slot+'">'+(s.active?'SAVE NOW':'LOAD CAMPAIGN')+'</button><button class="slot-delete" data-delete-slot="'+s.slot+'" aria-label="Delete '+title+'">DELETE</button></div>')+'</article>';
    }).join('');
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

  // === Owned ammunition. Only explicit paid dock transactions grant rounds. ===
  function syncWeaponStock(){
    if(!player||player.airborne||distance(player,HARBOUR)>=HARBOUR.dockRadius)return false;
    for(const id of Object.keys(WEAPONS)){
      saved.weaponAmmo[id]=Math.min(cleanCount(saved.weaponAmmo[id]),WEAPONS[id].capacity[saved.upgrades[id]]);
      player.weaponAmmo[id]=saved.weaponAmmo[id];player.weaponCooldown[id]=0;
    }
    return true;
  }
  function releaseRailInput(){
    railHeld=false;const id=railPointerId;railPointerId=null;
    const button=$('mobileRail');button?.classList.remove('held');
    if(id!==null&&button?.hasPointerCapture(id))button.releasePointerCapture(id);
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
      damage:spec.damage[saved.upgrades[kind]],remaining:spec.range,birth:clock});
    player.weaponAmmo[kind]--;saved.weaponAmmo[kind]=player.weaponAmmo[kind];player.weaponCooldown[kind]=spec.cooldown;
    player.noise=Math.min(100,player.noise+(kind==='torpedo'?32:18));
    for(const enemy of scene.predators)if(predatorAlive(enemy)&&distance(player,enemy)<(kind==='torpedo'?420:290)){enemy.alertUntil=clock+3;enemy.forgetUntil=0;}
    window.AbyssAudio?.event(kind);persist();updateWeaponUI();return true;
  }
  function projectileSolid(x,y,radius=0){
    if(y<SURFACE.y+radius||y>MAX_WORLD_Y-radius||x<leftAt(y)+radius||x>rightAt(y)-radius)return true;
    for(const r of scene.rocks){
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
    for(const e of scene.predators)if(predatorAlive(e)&&distance(p,e)<=radius+15&&projectileTerrainHit(p,e,0)===null)damagePredator(e,p.damage);
    // Only abandoned hazards can chain. Player-laid mines are never spent by friendly fire.
    for(const m of scene.derelictMines||[])if(!m.detonated&&distance(p,m)<=radius&&projectileTerrainHit(p,m,0)===null)detonateDerelict(m);
  }
  function updateProjectiles(dt){
    const kept=[];
    for(const p of scene.projectiles||[]){
      const distanceThisFrame=Math.min(p.remaining,Math.hypot(p.vx,p.vy)*dt),time=distanceThisFrame/Math.hypot(p.vx,p.vy);
      const a={x:p.x,y:p.y},b={x:p.x+p.vx*time,y:p.y+p.vy*time};
      let first=projectileTerrainHit(a,b,p.radius),target=first===null?null:'terrain';
      for(const e of scene.predators)if(predatorAlive(e)){
        const t=sweptActorHit(a,b,e,p.radius+(e.tier==='reaper'?25:e.tier==='apex'?21:17));
        if(t!==null&&(first===null||t<first)){first=t;target=e;}
      }
      for(const m of scene.derelictMines||[])if(!m.detonated){
        const t=sweptActorHit(a,b,m,p.radius+WILD.mineRadius);
        if(t!==null&&(first===null||t<first)){first=t;target=m;}
      }
      if(first!==null){
        const t=target==='terrain'?Math.max(0,first-.1):first;p.x=lerp(a.x,b.x,t);p.y=lerp(a.y,b.y,t);
        if(target!=='terrain'&&target.anchorX!==undefined)detonateDerelict(target);
        else if(target!=='terrain'&&p.kind==='railgun'){damagePredator(target,p.damage);window.AbyssAudio?.event('railHit',clamp((p.x-player.x)/300,-1,1));}
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
  function updateWeaponUI(){
    if(!player)return;
    for(const [id,button,label,pc] of [['railgun','mobileRail','railButtonLabel','railKeyAmmo'],['torpedo','mobileTorpedo','torpedoButtonLabel','torpedoKeyAmmo']]){
      const mark=saved.upgrades[id],cap=WEAPONS[id].capacity[mark],ammo=player.weaponAmmo?.[id]||0,cd=player.weaponCooldown?.[id]||0;
      const text=mark?ammo+'/'+cap:'LOCKED';$(label).textContent=text;$(pc).textContent=mark?text:'UNFITTED';
      $(button).setAttribute('aria-disabled',String(!mark||!ammo||!running||paused));
      $(button).setAttribute('aria-label',WEAPONS[id].name+' · '+(mark?ammo+' of '+cap+' rounds. Buy ammunition at dock for '+WEAPON_AMMO_PRICES[id]+' credits per round.':'Not fitted. Buy at dock.'));
      $(button).classList.toggle('cooling',cd>0);$(button).style.setProperty('--ring',100*(1-cd/WEAPONS[id].cooldown));
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
    const st=depth>rating?'PRESSURE ALERT':player.hull/maxHull()<.35?'LOW HULL':player.oxygen<20?'LOW OXYGEN':player.battery<15?'LOW POWER':player.airborne?'SURFACE BREACH':inHarbour(player)?'DOCK SAFE ZONE':reaperClose?'REAPER CONTACT':apexClose?'APEX CONTACT':enemyClose?'PREDATOR ALERT':'NOMINAL';
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
      prompt.textContent=(touchControls?'HOLD USE · ':'[ E ] ')+(close.type==='station'?'DOCK & UPGRADE':close.type==='recorder'?'RECOVER BLACK BOX':close.type==='air'?'CLAIM SUPPLY CACHE':close.type==='recovery'?'RECOVER LOST CARGO':distance(player,close)>=60?'MAGNET '+close.type.toUpperCase()+' · '+magnetPower()+' POWER':'SALVAGE '+close.type.toUpperCase());prompt.classList.remove('hidden');
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
    updateLivingHUD();drawRadar();
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
    $('notification').classList.add('hidden');syncPauseButtons();updateUI();
  }
  function updateMainMenu(){
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
    if(!preserveDive) {loadedActive=null;stashCargo();running=false;paused=false;checkAchievements();persist();}
    else {paused=true;persist();}
    syncPauseButtons();updateMainMenu();
    $('menuOverlay').classList.remove('hidden');updateUI();
  }
  function showPause(){
    if(!running||!$('menuOverlay').classList.contains('hidden'))return;
    $('pauseTitle').textContent='EXPEDITION PAUSED';
    paused=true;resetPilotInput();persist();window.AbyssAudio?.suspend();
    $('pauseStats').textContent='DEPTH '+depthOf(player.y)+'m  ·  HULL '+Math.round(player.hull/maxHull()*100)+'%  ·  RECORDERS '+player.cargo.recorders.length+' ABOARD';
    $('pauseOverlay').classList.remove('hidden');
    $('notification').classList.add('hidden');syncPauseButtons();updateUI();
  }
  function togglePause(){
    if(document.querySelector('#surveyDialog[open],#audioDialog[open],#telemetryDialog[open],#slotsDialog[open]'))return;
    if(!$('modalOverlay').classList.contains('hidden')){closeDialog();return;}
    if(!running||!$('menuOverlay').classList.contains('hidden'))return;
    if(paused)resumeDive();else showPause();
  }
  function quitDiveConfirmation(){
    openDialog('MISSION CONTROL // ABORT','ABANDON THIS DIVE?',
      '<p class="dialog-info">Unbanked scrap and crystals will be left in a persistent recovery pod. Undelivered recorders return to their wrecks. Banked currencies, upgrades and achievements remain saved.</p>',
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
      <li><kbd>Space</kbd> / hold <strong>BOOST</strong>: requires Mk I magnetic thrusters. Mk I / II / III / IV offer 3 / 4 / 5 / 6 seconds of boost and progressively faster boosted speeds. Costs battery and boost charge. Charge recovers after 1.5 seconds; a fully emptied meter locks until full. Release to rearm. Boost is loud and overrides quiet running. Battery upgrades reduce its power drain and speed up recharge.</li>
      <li><kbd>Q</kbd> / <strong>PING</strong>: a sonar wave sweeps the entire current screen. Salvage, recorders, caches, predators, rocks, wrecks, vents and walls appear as fading echoes <strong>when the wave reaches them</strong>, even with lights off. It uses power, alerts reached predators and has a visible cooldown. It does not light up the water permanently.</li>
      <li><kbd>E</kbd> / <strong>USE</strong>: recover crystals, recorders and caches, or dock to bank cargo, refill systems and upgrade. Scrap collects automatically within 6 m, extending to 10 / 14 / 18 / 22 m with the Salvage Magnet. Remote pickups require visibility, a clear path and power. <kbd>R</kbd> repairs 30 hull for 2 scrap. <kbd>L</kbd> toggles lights. <kbd>Shift</kbd> / <strong>SILENT</strong> reduces speed and noise.</li>
      <li>The water darkens gradually to total darkness at <strong>1,000 m</strong>. Only your forward lamp and temporary sonar echoes reveal the surroundings. Vessel name, class and pressure limit are pinned to the top of the screen, alongside depth and systems. The pressure tab turns red beyond your rating.</li>
      <li><kbd>F</kbd> / <strong>MINE</strong>: drop one proximity mine astern while steering or boosting. It arms after 0.65 seconds, then damages predators within its blast radius without harming your submarine. Mines remain until triggered, docking resets the field, or this expedition ends. The launcher cycles for 1.1 seconds; hold does not auto-fire. If the stern is obstructed, no ammo is spent.</li>
      <li><strong>Harbour and surface:</strong> the marked approach protects against predators, not low oxygen, power loss or rocks. USE / E secures the sub in its berth. Build upward speed to breach the surface; boost makes a higher leap. Momentum and gravity carry the arc, with no thrust in the air. Splashdowns do not damage the hull. Upgrade tiles show your fitted mark and turn gold at maximum tier.</li>
      <li><strong>Dock ordnance:</strong> buy Mk I warheads to unlock mines, then upgrade damage separately from the ammo rack. Warheads deal 60 / 110 / 180 / 240 damage; racks hold <strong>2 / 4 / 6 / 8 mines</strong>. The two-slot Mk I rack comes fitted. Buy mine rounds for 18 credits each in the dock AMMUNITION tab. Docking, launch, upgrades, death and reload never refill ammunition for free.</li>
      <li><strong>Three threat tiers:</strong> common blue drifters; rarer purple stalkers below 400 m; rare crimson reapers below 800 m. Base health is 100 / 200 / 400 HP; later campaign levels scale health and damage upward. Reaper chase speed matches Mk IV magnetic thrusters exactly: normal thrust cannot pull away in open water. Boost to create distance, or leave mines in its path. All tiers retain finite pursuit ranges. Health bars respect darkness and sonar visibility.</li>
      <li><strong>Exploration:</strong> mobile sees 43% farther in each direction; PC zoom is unchanged. The trench is three times wider, with more obstacles and hunters but fewer salvage pieces and much rarer crystals. The three clear navigation lanes keep descent routes open.</li>
      <li><strong>Flashlight Mk I–IV:</strong> the standard Mk I lamp reaches 26 m. Dock upgrades extend this to 36 / 48 / 62 m and widen the beam. The lamp draws power slowly only while on; battery upgrades improve efficiency. Switch it off with <kbd>L</kbd> / LIGHTS to conserve energy.</li>
      <li><strong>Adaptive ship systems:</strong> the Salvage Magnet automatically collects visible scrap and predator drops at range, at a small power cost. Crystals still require USE / hold E. It cannot recover through rocks or fetch distant recorders/caches. The Kinetic Shield absorbs bites, rock impacts, contact-mine blasts and hot vent damage, but not pressure or oxygen loss; recharge starts after 8 seconds without impacts, uses battery power and pauses during boost. The Sonic Disruptor adds a short stun to nearby predators on sonar-wave arrival, with shorter stuns for stronger tiers. Low battery falls back to a normal scan.</li>
      <li><strong>Persistent campaign resources:</strong> crystals are placed once and never respawn. Scrap regenerates at its original sites: after a five-minute recovery, at most one deposit per 45 active dive seconds per visited level. Recovery pauses in menus, at the harbour and offline, and never creates a deposit in the current view. Each campaign slot has independent timers. Scrap and crystal deposits each yield 2 units. Across five fresh levels, the initial stock provides 15,192 credits worth of scrap and 496 finite crystals. Renewable scrap supports future purchases. Upgrade credit prices are 50% higher; crystal prices are unchanged. Scrap banks at 18 credits per unit; crystals stay a separate currency. All paid ship upgrades cost both. If an optional purchase would consume the last crystals needed for the current recorder gate, the shop reserves them for the hull instead. Predators drop 2 / 4 / 8 scrap when destroyed; collect and dock to bank it. Predators and supply caches refresh on a genuine return to dock after departure. Drops persist until collected. Secured recorders never respawn. Lost or deliberately quit dives leave recoverable scrap and crystal pods; undelivered recorders return to their wrecks. Active dives now autosave every five simulation seconds and after important actions. Continue restores the ship, cargo, enemies, mines and timers paused. Explicit QUIT or defeat still creates a recovery pod. Twenty achievements are available from the main and pause menus. Each of the three campaign slots has independent levels, achievements and progress.</li>
      <li><strong>Exploration systems:</strong> each level has its own seeded scenery, landmark silhouettes and visible current bands. The harbour and central route are sheltered. All scenery respects total darkness. Press <kbd>M</kbd> or the map icon for a paused, permanent survey chart; drag to pan, pinch or use +/− to zoom, and tap surveyed water to set a waypoint. Resources are charted only after discovery and predator contacts expire. The sliders icon opens detailed vessel telemetry. Sound settings are in the main and pause menus.</li>
      <li><strong>Abandoned contact mines:</strong> rusty horned spheres sway on chains. Touching one detonates it, harming nearby predators and the submarine. Your own deployed mines remain safe to the ship. Sonar reveals the tether and the chart remembers the hazard. Cleared contact mines never return, even after docking. The harbour, central route, fixed deposits, recorder approaches and recovery pods are kept clear.</li>
      <li><strong>Wildlife:</strong> Silver Darts, Sunstripe Reeflets, Ribbonfins and Violet Glassfish form harmless schools. Gentle piloting parts the school; boost, nearby predators and passing sonar scatter it before it regroups. Fish cannot be collected and do not clutter the chart. Anemones, fan corals, crabs and tube colonies react to lights, movement and currents.</li>
      <li><strong>Vent fields:</strong> rising bubbles and a rumble warn for three seconds before a three-second plume. Active vents push the ship and predators upward. Sunbreak Shelf bubble seeps are harmless; hotter vents in later levels damage the ship while inside. Wait for a quiet phase or take a different route. The chart records discovered vents, not their live phase. New scenery never defeats darkness.</li>
      <li><strong>Direct-fire weapons:</strong> hold <kbd>Z</kbd> / RAIL for railgun bolts; tap <kbd>X</kbd> / TORP for one explosive torpedo. Both fire along the bow, stop at rock and need Mk I fitted at the dock. Each upgrade increases damage and magazine capacity. All rounds are bought in the dock Ammunition tab: rail 6 CR, torpedo 24 CR, mine 18 CR each. Docking, upgrades, waiting, loading and respawning never grant ammunition.</li>
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
    syncInputMode();bindLivingUI();bindSlots();bindWeaponInputs();
    for(const type of ['pointerdown','keydown'])document.addEventListener(type,()=>{if(!document.hidden)window.AbyssAudio?.unlock();},{capture:true});
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
      if($('surveyDialog').open||$('audioDialog').open||$('telemetryDialog').open)return;
      if($('achievementsDialog').open||$('slotsDialog').open)return;
      const k=e.key.toLowerCase();
      if($('upgradeDialog').open){if(k==='escape'){e.preventDefault();closeUpgradeDetails();}return;}
      if(k==='tab'&&!$('modalOverlay').classList.contains('hidden')){
        const controls=[...$('modalOverlay').querySelectorAll('button:not(:disabled),[tabindex="0"]')].filter(n=>n.getClientRects().length&&n.tabIndex>=0);
        if(controls.length){const first=controls[0],last=controls[controls.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
        return;
      }
      if(e.target instanceof Element&&e.target.closest('input,textarea,select,[contenteditable="true"]'))return;
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
  // === Salvage & Supply / atomic active-expedition snapshots ===
  function validateActiveDive(value){
    if(!value||value.schema!==1||!LEVELS.some(l=>l.id===value.levelId)||!Number.isInteger(value.seed)||!Number.isInteger(value.cycle)||!Number.isFinite(value.clock)||value.clock<0)return null;
    const p=value.player,l=LEVELS.find(l=>l.id===value.levelId),bottom=120+l.depth*10;
    const finite=keys=>keys.every(k=>Number.isFinite(p?.[k]));
    if(!finite(['x','y','vx','vy','facing','hull','oxygen','battery','boost','mineAmmo'])||p.hull<=0||p.x<-1400||p.x>2600||p.y<-2000||p.y>bottom+10)return null;
    if(!p.cargo||!['scrap','crystal'].every(k=>Number.isInteger(p.cargo[k])&&p.cargo[k]>=0)||!Array.isArray(p.cargo.recorders)||!p.cargo.recorders.every(i=>Number.isInteger(i)&&i>=0&&i<l.recorders.length))return null;
    for(const key of ['items','predators','mines','blasts','waves','echoes','terrain'])if(!Array.isArray(value[key])||value[key].length>6000)return null;
    const point=o=>o&&Number.isFinite(o.x)&&Number.isFinite(o.y)&&Math.abs(o.x)<5000&&Math.abs(o.y)<20000;
    if(!value.items.every(o=>point(o)&&['scrap','crystal','recorder','recovery','air'].includes(o.type)))return null;
    if(!value.predators.every(o=>point(o)&&Number.isFinite(o.health)&&PREDATOR_TIERS[o.tier]))return null;
    if(!value.mines.every(o=>point(o)&&Number.isFinite(o.armedAt)&&Number.isFinite(o.damage)&&o.damage>=0))return null;
    if(!value.waves.every(o=>point(o)&&Number.isFinite(o.birth)&&Number.isFinite(o.radius)&&Array.isArray(o.contacts)))return null;
    if(value.projectiles!==undefined&&(!Array.isArray(value.projectiles)||value.projectiles.length>200||!value.projectiles.every(o=>point(o)&&WEAPONS[o.kind]&&['vx','vy','damage','remaining','radius'].every(k=>Number.isFinite(o[k]))&&o.damage>0&&o.remaining>=0)))return null;
    if(p.weaponAmmo&&Object.keys(WEAPONS).some(id=>p.weaponAmmo[id]!==saved.weaponAmmo[id]))return null;
    return value;
  }
  function captureActiveDive(){
    // Only JSON-safe scalar state crosses the storage boundary. Sonar references
    // become stable collection indices, then are rebound after world generation.
    const waves=sonarWaves.map(({contacts,...wave})=>({...wave,contacts:contacts.map(c=>({kind:c.kind,hit:c.hit,previousDistance:c.previousDistance,
      index:scene[c.kind]?.indexOf(c.object)??-1,object:['wall','floor'].includes(c.kind)?c.object:null}))}));
    const terrain=[];for(const kind of ['rocks','wrecks','vents','landmarks','derelictMines','ventFields','schools'])(scene[kind]||[]).forEach((o,i)=>{if(o.revealUntil>clock)terrain.push({kind,i,revealUntil:o.revealUntil,echoDuration:o.echoDuration});});
    return {schema:1,build:BUILD.version,levelId:LEVEL_ID,seed:field.seed,cycle:field.cycle,clock,idCounter,dockVisitActive,
      player:{...player},projectiles:scene.projectiles||[],items:scene.items,predators:scene.predators,mines:scene.mines,blasts:scene.blasts,waves,echoes:sonarTerrainEchoes,terrain,
      events:eventLines.slice(0,3),threatContacts:surveyThreats,surfaceEffects,wildlife:captureWildlife()};
  }
  function restoreActiveDive(){
    const snapshot=loadedActive;if(!snapshot)return false;
    buildingWorld=true;running=false;
    LEVEL_ID=snapshot.levelId;field=campaignLevels[LEVEL_ID];applyLevelGeometry();createWorld();
    clock=snapshot.clock;idCounter=Math.max(cleanCount(snapshot.idCounter),scene.items.length+1);
    player=JSON.parse(JSON.stringify(snapshot.player));player.trip=player.trip||{deepest:depthOf(player.y),hullDamage:0};
    scene.items=JSON.parse(JSON.stringify(snapshot.items));scene.predators=JSON.parse(JSON.stringify(snapshot.predators));
    scene.mines=JSON.parse(JSON.stringify(snapshot.mines)).filter(m=>!m.detonated);scene.blasts=JSON.parse(JSON.stringify(snapshot.blasts));
    player.weaponAmmo={...saved.weaponAmmo};player.weaponCooldown={railgun:0,torpedo:0,...player.weaponCooldown};
    player.damageFlashUntil=Number.isFinite(player.damageFlashUntil)?player.damageFlashUntil:0;
    player.nextDamageFlash=Number.isFinite(player.nextDamageFlash)?player.nextDamageFlash:0;
    scene.projectiles=Array.isArray(snapshot.projectiles)?JSON.parse(JSON.stringify(snapshot.projectiles)):[];
    restoreWildlife(snapshot.wildlife);for(const m of scene.derelictMines||[])Object.assign(m,mineLocation(m));
    for(const t of snapshot.terrain){const o=scene[t.kind]?.[t.i];if(o){o.revealUntil=t.revealUntil;o.echoDuration=t.echoDuration;}}
    sonarTerrainEchoes=JSON.parse(JSON.stringify(snapshot.echoes));
    sonarWaves=snapshot.waves.map(w=>({...w,contacts:w.contacts.map(c=>({...c,object:['wall','floor'].includes(c.kind)?c.object:scene[c.kind]?.[c.index]})).filter(c=>c.object)}));
    surfaceEffects=Array.isArray(snapshot.surfaceEffects)?snapshot.surfaceEffects:[];
    surveyThreats=Array.isArray(snapshot.threatContacts)?snapshot.threatContacts.filter(c=>Number.isFinite(c.until)&&c.until>clock):[];
    dockVisitActive=snapshot.dockVisitActive===true;eventLines=Array.isArray(snapshot.events)?snapshot.events.slice(0,3):[];
    loadedActive=null;buildingWorld=false;running=true;paused=true;showingDock=false;
    resetPilotInput();pointerSilent=Boolean(player.quiet);player.boosting=false;
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
    const explorerOpen=document.querySelector('#surveyDialog[open],#audioDialog[open],#telemetryDialog[open]');
    if(explorerOpen){explorerReturnPause=true;if(running&&$('menuOverlay').classList.contains('hidden'))showPause();}
    if(running&&!paused&&$('menuOverlay').classList.contains('hidden'))showPause();
    else if(running)paused=true;
    checkAchievements();persist();window.AbyssAudio?.suspend();
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

  // === Salvage & Supply: independent seeded encounters, never resource rerolls ===
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
    for(const rock of scene.rocks){
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
    if(depthOf(player.y)>350){const wreck=scene.wrecks.find(w=>distance(w,player)<270);if(wreck)wildSound('wreckGroan',wreck,380,11);}
  }
  function updateFishSchools(dt){
    const visible=(scene.schools||[]).filter(s=>onscreen(s.x,s.y,300)).sort((a,b)=>distance(a,player)-distance(b,player)).slice(0,WILD.maxActiveSchools);
    wildActiveSchools=visible.length;
    for(const s of visible){
      const spec=FISH[s.species],nearRock=scene.rocks.filter(r=>Math.abs(r.x-s.x)<r.radius+200&&Math.abs(r.y-s.y)<r.radius+200);
      const threats=scene.predators.filter(e=>predatorAlive(e)&&distance(e,s)<230);
      const threat=threats.sort((a,b)=>distance(a,s)-distance(b,s))[0];
      const pd=distance(player,s),boostFear=player.boosting&&pd<220,sonarFear=s.sonarUntil>clock,predatorFear=Boolean(threat&&distance(threat,s)<175);
      const wasFrightened=s.fear>.4,targetFear=boostFear||sonarFear||predatorFear?1:pd<100?.25:0;
      s.fear=lerp(s.fear,targetFear,Math.min(1,dt*(targetFear>s.fear?5:.6)));
      if(!wasFrightened&&s.fear>.4&&boostFear)wildSound('schoolRush',s,230,4);
      let desired=s.heading+Math.sin(clock*.31+s.phase)*.07;
      if(threat&&predatorFear)desired=Math.atan2(s.y-threat.y,s.x-threat.x);
      else if(boostFear||pd<90)desired=Math.atan2(s.y-player.y,s.x-player.x);
      else if(sonarFear)desired=Math.atan2(s.y-(s.sonarY??player.y),s.x-(s.sonarX??player.x));
      else if(Math.hypot(s.x-s.homeX,s.y-s.homeY)>190)desired=Math.atan2(s.homeY-s.y,s.homeX-s.x);
      s.heading=lerpAngle(s.heading,desired,Math.min(1,dt*(s.fear> .3?3.2:.9)));
      const water=currentAt(s.x,s.y),speed=spec.speed*(1+s.fear*1.8);
      let nx=s.x+(Math.cos(s.heading)*speed+water.x*.55)*dt,ny=s.y+(Math.sin(s.heading)*speed+ventFlowAt(s.x,s.y)*.5)*dt;
      if(wildClear(nx,ny,24)){s.x=nx;s.y=ny;}else{s.heading+=dt*3;}
      for(let i=0;i<s.fish.length;i++){
        const f=s.fish[i],spread=1+s.fear*.75,formX=Math.cos(s.heading+Math.PI*.5)*(i%3-1)*12*spread-Math.cos(s.heading)*Math.floor(i/3)*10;
        const formY=Math.sin(s.heading+Math.PI*.5)*(i%3-1)*12*spread-Math.sin(s.heading)*Math.floor(i/3)*10;
        let tx=Math.cos(s.heading)*speed+(s.x+formX-f.x)*1.4,ty=Math.sin(s.heading)*speed+(s.y+formY-f.y)*1.4;
        for(const g of s.fish){if(g===f)continue;const dx=f.x-g.x,dy=f.y-g.y,d2=dx*dx+dy*dy;if(d2>0&&d2<144){tx+=dx/d2*45;ty+=dy/d2*45;}}
        const fd=distance(f,player);if(fd<65){const strength=(65-fd)*1.8;tx+=(f.x-player.x)/(fd||1)*strength;ty+=(f.y-player.y)/(fd||1)*strength;}
        for(const rock of nearRock){const dx=f.x-rock.x,dy=f.y-rock.y,d=Math.hypot(dx,dy),edge=rock.radius+22;if(d<edge){tx+=dx/(d||1)*(edge-d)*3;ty+=dy/(d||1)*(edge-d)*3;}}
        f.vx=lerp(f.vx,tx+water.x*.4,Math.min(1,dt*3));f.vy=lerp(f.vy,ty,Math.min(1,dt*3));
        const fs=Math.hypot(f.vx,f.vy),cap=speed*1.9;if(fs>cap){f.vx*=cap/fs;f.vy*=cap/fs;}
        nx=f.x+f.vx*dt;ny=f.y+f.vy*dt;
        if(wildClear(nx,ny,6)){f.x=nx;f.y=ny;}else{f.vx*=-.5;f.vy*=-.5;}
        if(Math.hypot(f.vx,f.vy)>2)f.angle=lerpAngle(f.angle,Math.atan2(f.vy,f.vx),Math.min(1,dt*6));
      }
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
      for(let cx=Math.max(0,Math.floor((x-radius-SURVEY.left)/size));cx<=Math.floor((x+radius-SURVEY.left)/size);cx++){
        const px=SURVEY.left+(cx+.5)*size,py=SURFACE.y+(cy+.5)*size;
        if(Math.hypot(px-x,py-y)<=radius&&(!predicate||predicate(px,py)))markSurveyCell(px,py);
      }
    }
  }
  function rememberSurveyObject(kind,object){
    if(kind==='predators'){
      if(!predatorAlive(object))return;
      const id=object.id??('contact-'+Math.round(object.homeX)+'-'+Math.round(object.homeY));
      surveyThreats=surveyThreats.filter(c=>c.id!==id&&c.until>clock);
      surveyThreats.push({id,x:object.x,y:object.y,tier:object.tier,until:clock+SURVEY.contactLife});return;
    }
    if(!['items','wrecks','landmarks','derelictMines','ventFields'].includes(kind))return;
    const type=kind==='items'?object.type:kind==='wrecks'?'wreck':kind==='derelictMines'?'derelict':kind==='ventFields'?'thermal':'landmark';
    const id=kind+':'+(object.id??object.index);
    field.survey.contacts[id]={x:object.x,y:object.y,type,label:kind==='derelictMines'?'CONTACT MINE':kind==='ventFields'?'THERMAL VENT':kind==='landmarks'?object.name:type==='recorder'?'RECORDER '+(object.index+1):type==='recovery'?'RECOVERY POD':type.toUpperCase(),collected:Boolean(object.collected||object.detonated)};
  }
  function surveyVisibleWater(){
    if(!player||!field.survey)return;
    const ambient=ambientLightAt(player.y),radius=ambient>.08?100+ambient*95:0;
    // The vessel always knows its own approximate grid square. Scenery beyond it
    // is charted only by actual local visibility or a passing sonar wave.
    markSurveyCell(player.x,Math.max(SURFACE.y,player.y));
    if(radius)chartArea(player.x,player.y,radius);
    if(headlightsActive())chartArea(player.x,player.y,flashlightSpec().length,(x,y)=>beamIntersects(x,y,0));
    for(const kind of ['items','predators','wrecks','landmarks','derelictMines','ventFields'])for(const object of (scene[kind]||[])){
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
    if(document.querySelector('#surveyDialog[open],#audioDialog[open],#telemetryDialog[open]'))return false;
    explorerReturnPause=paused;explorerReturnFocus=document.activeElement;
    paused=true;resetPilotInput();persist();window.AbyssAudio?.suspend();
    $(id).showModal();syncPauseButtons();return true;
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
    for(const id of ['surveyDialog','audioDialog','telemetryDialog'])if($(id)?.open)$(id).close();
    mapView.pointers.clear();mapView.drag=null;mapView.pinch=null;
  }
  function openSurvey(){
    if(!running||$('upgradeDialog').open||$('achievementsDialog').open)return;
    if(!openExplorerDialog('surveyDialog'))return;
    mapView.x=player.x;mapView.y=Math.max(100,player.y);mapView.scale=Math.min(.45,Math.max(.12,window.innerWidth/2100));
    $('surveyTitle').textContent=currentLevel().name;
    $('surveySummary').textContent='LEVEL '+(LEVELS.findIndex(l=>l.id===LEVEL_ID)+1)+' / 5 · '+currentLevel().depth.toLocaleString('en-GB')+' m SEABED · '+saved.secured.length+'/'+RECORDERS_TOTAL+' RECORDERS BANKED';
    $('mapMessage').textContent='Drag to pan. Tap surveyed water to pin a waypoint. Unknown regions stay hidden.';
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
    mapView.x=clamp(mapView.x,SURVEY.left,SURVEY.right);
    const half=mapView.h/(2*mapView.scale),margin=30/mapView.scale;
    mapView.y=MAX_WORLD_Y-SURFACE.y<2*half?(SURFACE.y+MAX_WORLD_Y)/2:clamp(mapView.y,SURFACE.y+half-margin,MAX_WORLD_Y-half+margin);
  }
  function mapZoom(factor,anchor=null){
    const p=anchor||{x:mapView.w/2,y:mapView.h/2},before=chartWorld(p.x,p.y);
    mapView.scale=clamp(mapView.scale*factor,.018,1.2);
    const after=chartWorld(p.x,p.y);mapView.x+=before.x-after.x;mapView.y+=before.y-after.y;clampMap();drawSurvey();
  }
  function setWaypoint(x,y){
    if(y<SURFACE.y||y>MAX_WORLD_Y||!surveyCells.has(surveyKey(x,y))||x<leftAt(y)+14||x>rightAt(y)-14||scene.rocks.some(r=>Math.hypot(r.x-x,r.y-y)<r.radius+12&&insidePolygon(x,y,r.vertices))){
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
    const floor=chartPoint(0,MAX_WORLD_Y);g.fillStyle='#52616c';g.fillRect(0,floor.y,W,H-floor.y);g.strokeStyle='#a4b5bc';g.beginPath();g.moveTo(0,floor.y);g.lineTo(W,floor.y);g.stroke();
    g.restore();
    for(const [id,contact] of Object.entries(field.survey.contacts)){
      const p=chartPoint(contact.x,contact.y);if(p.x<-20||p.x>W+20||p.y<-20||p.y>H+20)continue;
      let collected=contact.collected;
      if(id.startsWith('items:')){const object=scene.items.find(o=>'items:'+o.id===id);if(object)collected=object.collected;else if(contact.type==='recorder')collected=saved.secured.includes(Number(id.split('-').at(-1)));}
      g.save();g.translate(p.x,p.y);g.lineWidth=1.4;
      if(collected){g.strokeStyle='#6f9b9477';g.beginPath();g.moveTo(-3,0);g.lineTo(0,3);g.lineTo(5,-4);g.stroke();}
      else if(contact.type==='derelict'){g.strokeStyle='#e6a477';g.beginPath();g.arc(0,0,4,0,TAU);for(let i=0;i<4;i++){const a=i*TAU/4;g.moveTo(Math.cos(a)*4,Math.sin(a)*4);g.lineTo(Math.cos(a)*7,Math.sin(a)*7);}g.stroke();}
      else if(contact.type==='thermal'){g.strokeStyle='#b9cba6';g.beginPath();g.moveTo(-5,4);g.lineTo(0,-5);g.lineTo(5,4);g.stroke();}
      else if(contact.type==='recorder'||contact.type==='recovery'){g.strokeStyle=contact.type==='recorder'?'#f2cb87':'#f39476';g.beginPath();g.moveTo(0,-6);g.lineTo(5,0);g.lineTo(0,6);g.lineTo(-5,0);g.closePath();g.stroke();}
      else if(contact.type==='landmark'||contact.type==='station'||contact.type==='wreck'){
        g.strokeStyle=contact.type==='station'?'#92e4d4':'#afa6ce';g.strokeRect(-5,-5,10,10);
        if(scale>.08&&contact.type!=='wreck'){g.font='9px ui-monospace,monospace';g.fillStyle=g.strokeStyle;g.fillText(contact.label,9,-7);}
      }else{g.fillStyle=contact.type==='crystal'?'#c1a4ef':contact.type==='air'?'#8fbedd':'#8ac4b5';g.beginPath();g.arc(0,0,contact.type==='crystal'?2.5:2,0,TAU);g.fill();}
      g.restore();
    }
    for(const threat of surveyThreats){
      if(threat.until<=clock)continue;const p=chartPoint(threat.x,threat.y);g.globalAlpha=clamp((threat.until-clock)/SURVEY.contactLife,.25,1);g.fillStyle='#ec8c85';g.beginPath();g.arc(p.x,p.y,3.5,0,TAU);g.fill();g.globalAlpha=1;
    }
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
    $('mapOverview').addEventListener('click',()=>{mapView.x=centerAt(MAX_WORLD_Y/2);mapView.y=MAX_WORLD_Y/2;mapView.scale=Math.min((mapView.w-55)/2400,(mapView.h-35)/(MAX_WORLD_Y+200));drawSurvey();});
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
  function openTelemetry(){
    if(!running||!openExplorerDialog('telemetryDialog'))return;
    const rows=[['PRESSURE LIMIT',safeDepth().toLocaleString('en-GB')+' m'],['CURRENT DEPTH',depthOf(player.y).toLocaleString('en-GB')+' m'],
      ['HULL',Math.ceil(player.hull)+' / '+maxHull()+' HP'],['OXYGEN',Math.ceil(player.oxygen)+' / '+maxOxygen()],['POWER',Math.ceil(player.battery)+' / '+maxBattery()],
      ['NOISE',Math.round(player.noise)+'%'],['SHIELD',shieldCapacity()?Math.ceil(player.shield)+' / '+shieldCapacity()+' HP':'NOT FITTED'],
      ['BOOST',boostUnlocked()?Math.round(player.boost/boostCapacity()*100)+'% · '+(boostCapacity()/BOOST.drain)+'s CAPACITY':'MK I THRUSTERS REQUIRED'],
      ['SONAR',player.scanCooldown>0?Math.ceil(player.scanCooldown)+'s COOLDOWN':'READY · '+scanPowerCost()+' POWER'],
      ['RAILGUN',saved.upgrades.railgun?player.weaponAmmo.railgun+' / '+WEAPONS.railgun.capacity[saved.upgrades.railgun]:'NOT FITTED'],['TORPEDOES',saved.upgrades.torpedo?player.weaponAmmo.torpedo+' / '+WEAPONS.torpedo.capacity[saved.upgrades.torpedo]:'NOT FITTED'],['MINE AMMUNITION',player.mineAmmo+' / '+mineCapacity()],['CARGO',player.cargo.scrap+' SCRAP · '+player.cargo.crystal+' CRYSTALS'],
      ['RECORDERS',player.cargo.recorders.length+' ABOARD · '+saved.secured.length+'/'+RECORDERS_TOTAL+' BANKED']];
    $('telemetryBody').innerHTML='<div class="telemetry-grid">'+rows.map(([label,value])=>'<div><span>'+label+'</span><strong>'+value+'</strong></div>').join('')+'</div><p class="telemetry-target">'+$('targetInfo').textContent+'</p><p class="telemetry-save">'+(storageHealthy?'ACTIVE DIVE SAVED · RESUMES PAUSED':'STORAGE WARNING · THIS DIVE COULD NOT BE SAVED')+'</p>';
    $('telemetryClose').focus({preventScroll:true});
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
  function bindLivingUI(){
    bindSurvey();
    $('telemetryBtn').addEventListener('click',openTelemetry);
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
      audio.event('sonar');$('audioState').textContent='Sonar preview played at your effects volume.';
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
    if(!storageHealthy){$('statusStat').textContent='SAVE FAILED · KEEP APP OPEN';$('statusStat').className='status-danger';}
  }
  function audioFrame(){
    const audio=window.AbyssAudio;if(!audio)return;
    if(document.hidden){if(audio.status().state==='running')audio.suspend();return;}
    const interfaceMode=!$('menuOverlay').classList.contains('hidden')?'menu':showingDock?'dock':'none';
    audio.setScene(interfaceMode);
    if(interfaceMode!=='none')return;
    if($('audioDialog').open)return; // Allow explicit paused preview.
    if(!running||paused){if(audio.status().state==='running')audio.suspend();return;}
    const threats=scene.predators.filter(e=>predatorAlive(e)&&e.aggression>.15&&distance(e,player)<300&&!inHarbour(player));
    const nearest=threats.sort((a,b)=>distance(a,player)-distance(b,player))[0];
    audio.tick({speed:Math.hypot(player.vx,player.vy),depth:depthOf(player.y),boost:player.boosting,quiet:player.quiet,airborne:player.airborne,harbour:inHarbour(player),pressure:depthOf(player.y)/safeDepth(),threat:Boolean(nearest),pan:nearest?clamp((nearest.x-player.x)/200,-1,1):0});
  }

  function frame(now){
    if(!previousTime)previousTime=now;
    const dt=Math.min(.045,(now-previousTime)/1000||.016);previousTime=now;
    if(running&&!paused)advanceSimulation(dt);
    else if(!paused&&!loadedActive)clock+=dt*.3;
    audioFrame();render();
    requestAnimationFrame(frame);
  }
  beamTexture=buildBeamTexture();
  bind();resize();createWorld();
  player={x:600,y:160,vx:0,vy:0,airborne:false,surfaceCooldownUntil:0,facing:0,hull:maxHull(),oxygen:maxOxygen(),battery:maxBattery(),lights:true,noise:0,cargo:{scrap:0,crystal:0,recorders:[]},scanCooldown:0,damageCooldown:0,boost:boostCapacity(),boosting:false,boostLocked:false,boostNeedsRelease:false,boostRechargeDelay:0,mineAmmo:0,mineCooldown:0,weaponAmmo:{...saved.weaponAmmo},weaponCooldown:{railgun:0,torpedo:0},damageFlashUntil:0,nextDamageFlash:0,kills:0,shield:shieldCapacity(),shieldDelay:0,shieldFlashUntil:0,magnetFlash:null,autoSalvageCooldown:0};
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
  window.AbyssDiagnostics={state:()=>({slot:window.AbyssSlots.active,campaignTitle,weaponAmmo:{...player.weaponAmmo},weaponCooldown:{...player.weaponCooldown},damageFlashing:player.damageFlashUntil>clock,projectiles:scene.projectiles?.length||0,airborne:Boolean(player.airborne),dockSafe:inHarbour(player),surfaceY:SURFACE.y,splashCount:surfaceEffects.length,version:BUILD.version,versionName:BUILD.name,buildId:BUILD.id,shield:player.shield,shieldCapacity:shieldCapacity(),shieldDelay:player.shieldDelay,magnetRange:magnetRange(),magnetPower:magnetPower(),disruptorMark:saved.upgrades.disruptor,scanPowerCost:scanPowerCost(),upgradeOpen:$('upgradeDialog').open,storageHealthy,campaignId,levelId:LEVEL_ID,levelName:currentLevel().name,crystals:saved.crystals,totalRecorders:totalRecorders(),achievements:ACHIEVEMENTS.filter(a=>saved.achievements[a.id]).length,recoveryPods:field.recoveries.length,levelComplete:levelComplete(LEVEL_ID),boostCapacity:boostCapacity(),boostUnlocked:boostUnlocked(),boostMultiplier:boostMultiplier(),boostSeconds:boostCapacity()/BOOST.drain,joystickVisible:$('mobileJoystick').classList.contains('engaged'),zoom:viewport.zoom,flashlightMark:saved.upgrades.flashlight,flashlightLength:flashlightSpec().length,flashlightAngle:flashlightSpec().halfAngle*360/Math.PI,flashlightPowerRate:flashlightPowerRate(),worldWidth:widthAt(player.y)*2,populationCycle:field.cycle,mineAmmo:player.mineAmmo,mineCapacity:mineCapacity(),minePower:saved.upgrades.minePower,mineCapacityMark:saved.upgrades.mineCapacity,mineDamage:mineDamage(),mineCooldown:player.mineCooldown,deployedMines:scene.mines.length,kills:player.kills,normalSpeed:normalSpeedAt(saved.upgrades.engine),maxNormalSpeed:normalSpeedAt(THRUST.maxMark),ambientLight:ambientLightAt(player.y),blackoutDepth:LIGHTING.blackoutDepth,lights:player.lights,headlightsActive:headlightsActive(),recorderDepths:[...RECORDER_DEPTHS],maxWorldDepth:depthOf(MAX_WORLD_Y),safeDepth:safeDepth(),inputMode:touchControls?'touch':'desktop',vesselLabel:vesselLabel(),boost:player.boost,boosting:player.boosting,boostLocked:player.boostLocked,boostNeedsRelease:player.boostNeedsRelease,boostRechargeDelay:player.boostRechargeDelay,boostPowerRate:boostPowerRate(),boostRechargeRate:boostRechargeRate(),scanCooldown:player.scanCooldown,sonarCost:sonarCost(),mouseHeld:mouseHelm.pointerId!==null,boostHeld,facing:player.facing,hullLevel:saved.upgrades.hull,maxHull:maxHull(),focusMode,running,hasSavedDive:Boolean(loadedActive),lastSaveWall,paused,menuOpen:!$('menuOverlay').classList.contains('hidden'),pauseOpen:!$('pauseOverlay').classList.contains('hidden'),depth:depthOf(player.y),x:player.x,y:player.y,vx:player.vx,vy:player.vy,hull:player.hull,battery:player.battery,oxygen:player.oxygen,credits:saved.credits,secured:saved.secured.length,items:scene.items.length,rocks:scene.rocks.length,predators:scene.predators.length,apexCount:scene.predators.filter(e=>e.tier==='apex').length,commonCount:scene.predators.filter(e=>e.tier==='common').length,reaperCount:scene.predators.filter(e=>e.tier==='reaper').length,pursuing:scene.predators.filter(e=>e.aggression>.13).length,nearestPredatorDistance:Math.min(Infinity,...scene.predators.map(e=>distance(player,e))),useHeld,joystickX:joystick.x,joystickY:joystick.y,cruiseEnabled,cruiseX:cruiseHeading.x,cruiseY:cruiseHeading.y})};
  if(location.search.includes('testmode=1')||window.ABYSS_TEST_MODE===true){
    window.AbyssDiagnostics.audioFrame=audioFrame;
    window.AbyssDiagnostics.weaponStock=values=>{for(const id of Object.keys(WEAPONS)){if(Number.isFinite(values[id]))saved.weaponAmmo[id]=player.weaponAmmo[id]=clamp(Math.floor(values[id]),0,WEAPONS[id].capacity[saved.upgrades[id]]);}updateUI();persist();};
    window.AbyssDiagnostics.fire=kind=>{const before=paused;paused=false;const ok=fireWeapon(kind);paused=before;render();return ok;};
    window.AbyssDiagnostics.damage=(amount=10)=>{takeDamage(amount,'Test impact',true);render();};
    window.AbyssDiagnostics.save=()=>persist();
    window.AbyssDiagnostics.fixture=({x=600,y=700,rocks=[],predators=[],items=[]}={})=>{
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
      environmentEnabled=false;wildEnabled=false;resetPilotInput();Object.assign(saved.upgrades,upgrades);beamTexture=buildBeamTexture();
      const y=120+depth*10,x=centerAt(y);
      player={...player,x,y,vx:0,vy:0,airborne:false,surfaceCooldownUntil:0,facing,lights,battery,boost:boost??boostCapacity(),hull:maxHull(),oxygen:maxOxygen(),noise:0,quiet:false,boosting:false,boostLocked:false,boostNeedsRelease:false,boostRechargeDelay:0,damageCooldown:0,scanCooldown:0,mineAmmo:mineAmmo??(saved.upgrades.minePower?mineCapacity():0),mineCooldown:0,weaponAmmo:{...saved.weaponAmmo},weaponCooldown:{railgun:0,torpedo:0},damageFlashUntil:0,nextDamageFlash:0,kills:0,shield:shieldCapacity(),shieldDelay:0,shieldFlashUntil:0,magnetFlash:null,autoSalvageCooldown:0,trip:{deepest:0,hullDamage:0},cargo:{scrap:0,crystal:0,recorders:[]}};
      saved.mineAmmo=player.mineAmmo;
      scene={items:items.map((i,n)=>makeItem(x+i.dx,y+i.dy,i.type||'scrap',{id:n,index:i.index??0,...i})),
        rocks:rocks.map(r=>{const k={x:x+r.dx,y:y+r.dy,radius:30,rot:0,seed:.4,spikes:8,...r};return {...k,vertices:rockPolygon(k)};}),
        predators:predators.map(e=>createPredator({tier:'common',vx:0,vy:0,phase:0,aggression:0,lastHit:-10,alertUntil:0,forgetUntil:0,revealUntil:0,...e,x:x+e.dx,y:y+e.dy,homeX:x+e.dx,homeY:y+e.dy})),
        wrecks:wrecks.map(w=>({...w,x:x+w.dx,y:y+w.dy})),vents:vents.map(v=>({phase:0,...v,x:x+v.dx,y:y+v.dy})),dust:[],blasts:[],projectiles:[],
        mines:mines.map(m=>({id:idCounter++,mark:1,damage:60,birth:0,armedAt:0,detonated:false,revealUntil:0,...m,x:x+m.dx,y:y+m.dy}))};
      running=true;paused=true;clock=0;surfaceEffects=[];sonarWaves=[];sonarTerrainEchoes=[];pointerSilent=false;toastUntil=0;$('notification').classList.add('hidden');
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

    window.AbyssDiagnostics.economy=()=>({regen:{...SALVAGE_REGEN},creditFactor:CREDIT_PRICE_FACTOR,prices:{mine:AMMO_PRICE,...WEAPON_AMMO_PRICES},salvage:JSON.parse(JSON.stringify(field.salvage))});
    window.AbyssDiagnostics.buyOrdnance=buyOrdnance;
    window.AbyssDiagnostics.autoPickup=()=>{const before=paused;paused=false;autoCollectSalvage(.25);paused=before;updateUI();return player.cargo.scrap;};
    window.AbyssDiagnostics.economyPulse=(seconds,allowPaused=false)=>{const before=paused;if(allowPaused)paused=false;updateSalvageRegeneration(seconds);paused=before;persist();return window.AbyssDiagnostics.economy();};
    window.AbyssDiagnostics.grantCredits=(value)=>{saved.credits=Math.max(0,Math.floor(value));persist();updateUI();};
  }
})();
