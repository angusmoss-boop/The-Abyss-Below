(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const canvas = $('gameCanvas');
  const ctx = canvas.getContext('2d');
  const radar = $('radarCanvas');
  const rctx = radar.getContext('2d');
  const TAU = Math.PI * 2;
  const LIGHTING = Object.freeze({blackoutDepth:1000,fadeExponent:1.35,beamLength:320,beamHalfAngle:.40,bowOffset:30,nearHalfWidth:5});
  // Reuse one mask and one small, pre-baked beam texture. No per-frame pixel loops.
  const darknessCanvas = document.createElement('canvas');
  const darknessCtx = darknessCanvas.getContext('2d');
  let beamTexture = null, lastAmbient = -1;
  const SAVE_KEY = 'the-abyss-below-v01'; // Keep unchanged so v0.1 progress survives updates.
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
    common:{name:'DRIFTER',speed:80,patrolSpeed:21,detectionCap:245,leash:345,awareness:1,damage:13,cooldown:1.7},
    apex:{name:'ABYSS STALKER',speed:134,patrolSpeed:31,detectionCap:370,leash:505,awareness:1.52,damage:27,cooldown:1.35}
  };
  const UPGRADES = [
    {id:'hull', name:'REINFORCED HULL', desc:'Adds 28 max hull HP and 200 m to safe depth (maximum 1,530 m).', base:80, limit:7},
    {id:'oxygen', name:'AIR RECYCLER', desc:'Expand oxygen capacity and slow oxygen consumption.', base:70, limit:5},
    {id:'battery', name:'DEEP-CELL BATTERY', desc:'Expand energy storage and reduce engine drain.', base:65, limit:5},
    {id:'engine', name:'MAGNETIC THRUSTERS', desc:'Increase speed and improve handling.', base:75, limit:4},
    {id:'sonar', name:'WIDEBAND SONAR', desc:'Extend sonar detection radius and reduce scan costs.', base:90, limit:4},
    {id:'quiet', name:'SILENT DRIVE', desc:'Suppress engine noise and reduce predator detection.', base:95, limit:4}
  ];
  const defaults = () => ({credits:0,xp:0,bestDepth:0,secured:[],upgrades:{hull:0,oxygen:0,battery:0,engine:0,sonar:0,quiet:0}});
  let saved = defaults();
  try {
    const data = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (data && typeof data === 'object') {
      saved = {...defaults(),...data,upgrades:{...defaults().upgrades,...data.upgrades}};
      saved.secured = Array.isArray(saved.secured) ? saved.secured.filter(x => Number.isInteger(x) && x>=0 && x<RECORDERS_TOTAL) : [];
    }
  } catch (_) { /* local storage is optional */ }
  const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(saved)); } catch (_) {} };
  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
  const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
  function randGen(seed) { let s=seed>>>0; return () => {s=(s*1664525+1013904223)>>>0;return s/4294967296;}; }
  const rand = randGen(227136);
  const lerp = (a,b,t) => a + (b-a)*t;
  const centerAt = y => 600 + Math.sin(y*.0017)*94 + Math.sin(y*.0051)*39;
  const widthAt = y => 320 + Math.sin(y*.0031+1)*41 + Math.sin(y*.0072)*22;
  const leftAt = y => centerAt(y)-widthAt(y);
  const rightAt = y => centerAt(y)+widthAt(y);
  const depthOf = y => Math.max(0,Math.round((y-120)/10));
  // Use fractional metres for a continuous fade, not the rounded HUD depth.
  const ambientLightAt = y => Math.pow(1-clamp((y-120)/(10*LIGHTING.blackoutDepth),0,1),LIGHTING.fadeExponent);
  const headlightsActive = () => Boolean(player && player.lights && player.battery>0);
  const smoothstep = (lo,hi,v) => {const t=clamp((v-lo)/(hi-lo),0,1);return t*t*(3-2*t);};
  function beamIntersects(x,y,radius=0){
    if(!headlightsActive())return false;
    const dx=x-player.x,dy=y-player.y,cos=Math.cos(player.facing),sin=Math.sin(player.facing);
    const forward=dx*cos+dy*sin-LIGHTING.bowOffset,side=-dx*sin+dy*cos;
    return forward>=-radius && forward<=LIGHTING.beamLength+radius &&
      Math.abs(side)<=LIGHTING.nearHalfWidth+Math.max(0,forward)*Math.tan(LIGHTING.beamHalfAngle)+radius;
  }
  function buildBeamTexture(){
    // Finite, feathered cone: no all-round visibility bubble and no stray blur outside it.
    const length=LIGHTING.beamLength,halfHeight=Math.ceil(LIGHTING.nearHalfWidth+length*Math.tan(LIGHTING.beamHalfAngle));
    const scale=2,texture=document.createElement('canvas');
    texture.width=length*scale;texture.height=halfHeight*2*scale;
    const target=texture.getContext('2d'),pixels=target.createImageData(texture.width,texture.height);
    for(let py=0;py<texture.height;py++){
      const side=Math.abs((py+.5)/scale-halfHeight);
      for(let px=0;px<texture.width;px++){
        const forward=(px+.5)/scale,halfWidth=LIGHTING.nearHalfWidth+forward*Math.tan(LIGHTING.beamHalfAngle);
        const lateral=1-smoothstep(.55,1,side/halfWidth);
        const reach=1-smoothstep(.10,1,forward/length);
        const i=(py*texture.width+px)*4;
        pixels.data[i]=150;pixels.data[i+1]=226;pixels.data[i+2]=238;
        pixels.data[i+3]=Math.round(255*lateral*reach);
      }
    }
    target.putImageData(pixels,0,0);
    return {canvas:texture,width:length,height:halfHeight*2};
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
  const SHIP_RADIUS = 10.5; // Three small circles form a narrow capsule that matches the submarine silhouette.
  const SHIP_OFFSETS = [-15,0,15];
  let scene = {rocks:[],items:[],predators:[],vents:[],dust:[],wrecks:[]};
  let player = null;
  const keys = new Set();
  // Joystick is analogue (-1..1 on each axis). Cruise stores the last steering vector.
  const joystick = {x:0,y:0,pointerId:null};
  const cruiseHeading = {x:0,y:0};
  let cruiseEnabled=false;
  let installPrompt=null;
  let running = false, paused = false, showingDock = false;
  let dialogReturnPause = false;
  let camera = {x:0,y:0};
  let viewport = {w:700,h:550,dpr:1};
  let previousTime=0, clock=0, uiTimer=0, lastZone='';
  let toastUntil=0, eventLines=[], sonarWaves=[];
  let pointerSilent = false, victoryShown = false;
  let useHeld = false, useHoldTimer = 0, usePointerId = null;
  let idCounter = 0;
  function makeItem(x,y,type,extra={}) {return {id:idCounter++,x,y,type,collected:false,revealUntil:0,...extra};}
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
  function createWorld() {
    idCounter=0;
    const r=randGen((Math.random()*0xffffffff)>>>0);
    scene={rocks:[],items:[],predators:[],vents:[],dust:[],wrecks:[]};
    RECORDER_DEPTHS.forEach((depth,i)=>{
      const y=120+depth*10;
      // Wrecks occupy open central lanes so a tight boulder cluster can't seal a mission.
      const x=centerAt(y)+(i%2?105:-105);
      scene.wrecks.push({x,y,index:i});
      if(!saved.secured.includes(i))scene.items.push(makeItem(x,y,'recorder',{index:i}));
      // Wreck-adjacent salvage helps fund the next hull tier; recoverable even on a short dive.
      for(let j=0;j<4;j++) {
        const a=j*Math.PI/2+.35,rx=x+Math.cos(a)*78,ry=y+Math.sin(a)*78;
        if(rx>leftAt(ry)+38&&rx<rightAt(ry)-38)
          scene.items.push(makeItem(rx,ry,j%2===0?'crystal':'scrap'));
      }
    });
    for(let i=0;i<480;i++) {
      const y=370+r()*(MAX_WORLD_Y-530);
      const x=lerp(leftAt(y)+25,rightAt(y)-25,r());
      const radius=20+r()*52;
      if(scene.wrecks.some(w=>Math.hypot(x-w.x,y-w.y)<155))continue;
      // Continuous winding passage; leave enough clearance for the submarine capsule.
      const laneX=centerAt(y)+Math.sin(y*.004)*85;
      if(Math.abs(x-laneX)<radius+51)continue;
      const rock={x,y,radius,rot:r()*TAU,seed:r(),spikes:6+Math.floor(r()*4)};
      rock.vertices=rockPolygon(rock);
      scene.rocks.push(rock);
    }
    for(let i=0;i<390;i++) {
      const y=245+r()*(MAX_WORLD_Y-465);
      const x=lerp(leftAt(y)+42,rightAt(y)-42,r());
      if(scene.rocks.some(k=>Math.hypot(x-k.x,y-k.y)<k.radius+27))continue;
      const depth=depthOf(y);
      // Increased crystal frequency in deeper zones raises salvage rewards.
      const type=i%15===0?'air':r()<(depth<400?.24:.43)?'crystal':'scrap';
      scene.items.push(makeItem(x,y,type));
    }
    const addPredator=(y,tier)=>{
      const x=centerAt(y)+(r()-.5)*340;
      scene.predators.push({tier,x,y,homeX:x+(r()-.5)*90,homeY:y,vx:0,vy:0,phase:r()*TAU,aggression:0,lastHit:-10,alertUntil:0,forgetUntil:0});
    };
    for(let i=0;i<46;i++)addPredator(510+i*370+r()*110,'common');
    // Elite tier is rare, and NEVER spawned shallower than 400 m.
    for(let i=0;i<11;i++)addPredator(4490+i*1190+r()*220,'apex');
    for(let i=0;i<69;i++) {
      const y=150+r()*(MAX_WORLD_Y-270);
      scene.vents.push({x:lerp(leftAt(y)+30,rightAt(y)-30,r()),y,phase:r()*TAU});
    }
    for(let i=0;i<790;i++){
      const y=r()*MAX_WORLD_Y;
      scene.dust.push({x:r()*1400-100,y,phase:r()*TAU,size:.5+r()*1.7});
    }
  }
  function newDive() {
    createWorld();
    player={x:600,y:160,vx:0,vy:0,facing:-Math.PI/2,hull:maxHull(),oxygen:maxOxygen(),battery:maxBattery(),noise:0,lights:true,quiet:false,damageCooldown:0,scanCooldown:0,cargo:{scrap:0,crystal:0,recorders:[]},lastRepair:-100};
    sonarWaves=[];clock=0;lastZone='';eventLines=[];useHeld=false;useHoldTimer=0;usePointerId=null;victoryShown=saved.secured.length===RECORDERS_TOTAL;pointerSilent=false;resetJoystick(true);keys.clear();camera.x=player.x-viewport.w/2;camera.y=player.y-viewport.h/2;
    addEvent('Dive systems initialised.');
    addEvent('Six recorders lost as deep as 1,500 m.');
    running=true;paused=false;showingDock=false;
    $('menuOverlay').classList.add('hidden');$('modalOverlay').classList.add('hidden');$('pauseOverlay').classList.add('hidden');
    syncPauseButtons();
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
    if(item.type==='scrap') {player.cargo.scrap++;addEvent('Scrap recovered (+1)');announce('SALVAGE +1 SCRAP',1.8);}
    else if(item.type==='crystal') {player.cargo.crystal++;addEvent('Abyss crystal recovered');announce('RARE CRYSTAL SECURED',2);}
    else if(item.type==='air') {player.oxygen=Math.min(maxOxygen(),player.oxygen+35);player.battery=Math.min(maxBattery(),player.battery+12);addEvent('Emergency supply cache');announce('OXYGEN +35 · ENERGY +12',2);}
    else if(item.type==='recorder') {player.cargo.recorders.push(item.index);addEvent('ENCRYPTED RECORDER FOUND');announce('FLIGHT RECORDER RECOVERED · RETURN TO STATION',4);}
    updateUI();
  }
  function scan() {
    if(!running||paused)return;
    if(player.scanCooldown>0) {announce('SONAR RECHARGING',.85);return;}
    if(player.battery<sonarCost()) {announce('INSUFFICIENT BATTERY',1.5);return;}
    player.battery-=sonarCost();player.scanCooldown=5.5;player.noise=Math.min(100,player.noise+27);
    const range=sonarRange();
    for(const item of scene.items)if(distance(player,item)<=range+90)item.revealUntil=clock+4.5;
    for(const enemy of scene.predators)if(distance(player,enemy)<range+90)enemy.alertUntil=clock+5;
    sonarWaves.push({x:player.x,y:player.y,birth:clock,radius:range});
    addEvent('Active sonar pulse emitted');
    updateUI();
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
    const gained=player.cargo.scrap*18+player.cargo.crystal*45;
    const earnedXP=player.cargo.scrap*9+player.cargo.crystal*23+player.cargo.recorders.length*90;
    saved.credits+=gained;saved.xp+=earnedXP;
    for(const i of player.cargo.recorders)if(!saved.secured.includes(i))saved.secured.push(i);
    const delivered=player.cargo.recorders.length;
    player.cargo={scrap:0,crystal:0,recorders:[]};
    player.hull=maxHull();player.oxygen=maxOxygen();player.battery=maxBattery();player.noise=0;
    persist();
    addEvent('Docking completed · vessel refilled');
    if(gained||delivered)announce('SALVAGE BANKED: +'+gained+' CREDITS · +'+earnedXP+' XP',4);
    if(saved.secured.length===RECORDERS_TOTAL&&!victoryShown){openVictory();return;}
    showDock();
  }
  function syncPauseButtons(){
    $('pauseBtn').textContent=paused?'▶ RESUME':'Ⅱ PAUSE';
    $('focusPauseBtn').textContent=paused?'▶':'Ⅱ';
    $('focusPauseBtn').setAttribute('aria-label',paused?'Resume game':'Pause game');
  }
  function openDialog(kicker,title,body,footer='') {
    dialogReturnPause=paused;
    paused=true;useHeld=false;usePointerId=null;resetJoystick(true);keys.clear();
    $('modalKicker').textContent=kicker;$('modalTitle').textContent=title;$('modalBody').innerHTML=body;$('modalFooter').innerHTML=footer;
    $('modalOverlay').classList.remove('hidden');syncPauseButtons();
  }
  function closeDialog() {
    $('modalOverlay').classList.add('hidden');showingDock=false;
    paused=running?dialogReturnPause:false;
    syncPauseButtons();updateUI();
  }
  function showDock() {
    showingDock=true;
    const intro=`<p class="dialog-info">Welcome back to NEREID station. Salvage has been banked, and your vessel has been repaired, refuelled and resupplied.</p><p class="dialog-info"><strong>AVAILABLE CREDITS: ${saved.credits}</strong> · RECORDERS DELIVERED: ${saved.secured.length}/${RECORDERS_TOTAL}</p>`;
    openDialog('SURFACE OPERATIONS // DOCKED','SUBMARINE UPGRADES',intro+'<div class="upgrade-list" id="upgradeList"></div>', '<div class="dialog-actions"><button class="alt-btn" id="launchAgain">RETURN TO THE WATER</button></div>');
    drawUpgrades();
    $('launchAgain').addEventListener('click',()=>{closeDialog();addEvent('Station departure authorised');});
  }
  function drawUpgrades() {
    const list=$('upgradeList');if(!list)return;
    list.innerHTML=UPGRADES.map(u=>{
      const level=saved.upgrades[u.id],maxed=level>=u.limit,cost=Math.floor(u.base*Math.pow(1.55,level));
      return `<div class="upgrade"><div><h3>${u.name} <small>MK ${level}/${u.limit}</small></h3><p>${u.desc}</p></div><button data-upgrade="${u.id}" ${maxed||saved.credits<cost?'disabled':''}>${maxed?'MAX':cost+' CR'}</button></div>`;
    }).join('');
    list.querySelectorAll('[data-upgrade]').forEach(b=>b.addEventListener('click',()=>{
      const upgrade=UPGRADES.find(x=>x.id===b.dataset.upgrade);
      if(!upgrade)return;
      const lv=saved.upgrades[upgrade.id],cost=Math.floor(upgrade.base*Math.pow(1.55,lv));
      if(lv>=upgrade.limit||saved.credits<cost)return;
      saved.credits-=cost;saved.upgrades[upgrade.id]++;persist();
      player.hull=maxHull();player.oxygen=maxOxygen();player.battery=maxBattery();
      $('modalBody').querySelectorAll('.dialog-info')[1].innerHTML=`<strong>AVAILABLE CREDITS: ${saved.credits}</strong> · RECORDERS DELIVERED: ${saved.secured.length}/${RECORDERS_TOTAL}`;
      drawUpgrades();updateUI();addEvent(upgrade.name+' upgraded');
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
  function update(dt) {
    clock+=dt;
    if(!player)return;
    player.scanCooldown=Math.max(0,player.scanCooldown-dt);
    player.damageCooldown=Math.max(0,player.damageCooldown-dt);
    const keyX=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft'));
    const keyY=Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'));
    const steering=joystick.pointerId!==null?joystick:cruiseEnabled?cruiseHeading:{x:0,y:0};
    const x=clamp(keyX+steering.x,-1,1),y=clamp(keyY+steering.y,-1,1);
    const magnitude=Math.hypot(x,y);
    const hasInput=magnitude>.04;
    const quiet=keys.has('shift')||pointerSilent;
    player.quiet=quiet;
    const maxSpeed=(quiet?68:146)*(1+saved.upgrades.engine*.17);
    const thrustPower=hasInput&&player.battery>.5?1:0;
    const divisor=Math.max(1,magnitude);
    const desiredX=x/divisor*maxSpeed*thrustPower,desiredY=y/divisor*maxSpeed*thrustPower;
    const factor=1-Math.exp(-(3.5+saved.upgrades.engine*.2)*dt);
    player.vx=lerp(player.vx,desiredX,factor);player.vy=lerp(player.vy,desiredY,factor);
    if(Math.hypot(player.vx,player.vy)>9)player.facing=lerpAngle(player.facing,Math.atan2(player.vy,player.vx),Math.min(1,dt*5));
    const speed=Math.hypot(player.vx,player.vy);
    const noiseTarget=hasInput&&!quiet?45+speed*.2:quiet&&hasInput?8:0;
    player.noise=lerp(player.noise,Math.min(95,noiseTarget)/(1+saved.upgrades.quiet*.32),1-Math.exp(-dt*(hasInput?2.8:1.6)));
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
    const energyDrain=dt*(.018+(player.lights?.027:0)+(hasInput?(quiet?.028:.075):0))/(1+saved.upgrades.battery*.12);
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
      const tier=PREDATOR_TIERS[enemy.tier]||PREDATOR_TIERS.common;
      const d=distance(player,enemy);
      // Both tiers give up once sufficiently far away, but apex hunters track farther.
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
      enemy.y+=enemy.vy*dt;
      if(chase&&distance(player,enemy)<(enemy.tier==='apex'?43:35)&&clock-enemy.lastHit>tier.cooldown){
        enemy.lastHit=clock;
        takeDamage(tier.damage,tier.name+' attack');
        player.vx+=(player.x-enemy.x)*2;player.vy+=(player.y-enemy.y)*2;
      }
    }
    sonarWaves=sonarWaves.filter(w=>clock-w.birth<1.2);
    camera.x=lerp(camera.x,player.x-viewport.w/2,Math.min(1,dt*3.4));
    camera.y=lerp(camera.y,player.y-viewport.h*.52,Math.min(1,dt*3.4));
    if(clock>toastUntil)$('notification').classList.add('hidden');
    uiTimer+=dt;if(uiTimer>.13){uiTimer=0;updateUI();}
  }
  function lerpAngle(a,b,t){const diff=Math.atan2(Math.sin(b-a),Math.cos(b-a));return a+diff*t;}
  function resize(){
    const rect=canvas.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1);
    viewport={w:Math.max(1,rect.width),h:Math.max(1,rect.height),dpr};
    canvas.width=Math.round(viewport.w*dpr);canvas.height=Math.round(viewport.h*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    darknessCanvas.width=canvas.width;darknessCanvas.height=canvas.height;
    darknessCtx.setTransform(dpr,0,0,dpr,0,0);
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
    for(const enemy of scene.predators)if(onscreen(enemy.x,enemy.y)){
      const d=distance(player,enemy);
      if(d<250 || enemy.alertUntil>clock || beamIntersects(enemy.x,enemy.y,60))drawEnemy(enemy);
    }
    for(const wave of sonarWaves)drawWave(wave);
    if(player)drawPlayer();
    ctx.restore();
    const edge=ctx.createRadialGradient(W*.5,H*.48,Math.min(W,H)*.1,W*.5,H*.5,Math.max(W,H)*.77);
    edge.addColorStop(0,'#00132000');edge.addColorStop(.75,'#000e1c33');edge.addColorStop(1,'#00050dd1');ctx.fillStyle=edge;ctx.fillRect(0,0,W,H);
    if(!running && player && player.hull<=0){ctx.fillStyle='#7e22241c';ctx.fillRect(0,0,W,H);}
    // Last world pass masks everything, including eyes, salvage glows, sonar, the
    // vessel and its wake. Only instrument overlays are allowed above the darkness.
    applyDepthDarkness(ambient);
    drawEdgeArrows();
  }
  function applyDepthDarkness(ambient){
    if(ambient>=1)return;
    const m=darknessCtx,w=darknessCanvas.width/viewport.dpr,h=darknessCanvas.height/viewport.dpr;
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
      const ex=side===0?-1000:2200;
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
    const {x,y,type}=item,phase=clock*1.8+item.id;
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
  function drawEnemy(enemy){
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
    ctx.save();ctx.font='bold 9px monospace';ctx.textAlign='center';ctx.fillStyle='#a8f3e9cf';
    ctx.shadowColor='#0a1c2b';ctx.shadowBlur=4;
    ctx.fillText('NEREID // MK-II',player.x,player.y-28);ctx.restore();
  }
  function drawWave(w){
    const t=(clock-w.birth)/1.2,r=w.radius*t;
    ctx.beginPath();ctx.arc(w.x,w.y,r,0,TAU);ctx.strokeStyle=`rgba(114,237,225,${.85*(1-t)})`;ctx.lineWidth=2.3;ctx.stroke();
    ctx.beginPath();ctx.arc(w.x,w.y,Math.max(0,r-15),0,TAU);ctx.strokeStyle=`rgba(114,237,225,${.25*(1-t)})`;ctx.lineWidth=12;ctx.stroke();
  }
  function drawEdgeArrows(){
    if(!player||!running)return;
    const missing=scene.items.filter(i=>i.type==='recorder'&&!i.collected);
    if(!missing.length)return;
    let target=missing[0],best=Infinity;
    for(const item of missing){const d=distance(player,item);if(d<best){target=item;best=d;}}
    const dx=target.x-player.x,dy=target.y-player.y;
    const a=Math.atan2(dy,dx);
    const px=viewport.w/2+Math.cos(a)*Math.min(viewport.w*.34,170),py=viewport.h*.5+Math.sin(a)*Math.min(viewport.h*.35,125);
    ctx.save();ctx.translate(px,py);ctx.rotate(a);ctx.globalAlpha=.72+Math.sin(clock*3)*.18;ctx.fillStyle='#e8b776';ctx.beginPath();ctx.moveTo(11,0);ctx.lineTo(-5,-6);ctx.lineTo(-2,0);ctx.lineTo(-5,6);ctx.closePath();ctx.fill();ctx.restore();
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
    for(const enemy of scene.predators)if(distance(player,enemy)<(enemy.tier==='apex'?205:130)||enemy.alertUntil>clock)dot(enemy.x,enemy.y,enemy.tier==='apex'?'#d683ff':'#ed7873',enemy.tier==='apex'?6:4);
    dot(player.x,player.y,'#b8ffe9',6);
    rctx.save();rctx.translate(cx,cy);rctx.rotate(player.facing);rctx.strokeStyle='#b7ffe8';rctx.beginPath();rctx.moveTo(14,0);rctx.lineTo(4,-6);rctx.moveTo(14,0);rctx.lineTo(4,6);rctx.stroke();rctx.restore();
    const sweep=(clock*.55)%TAU;
    rctx.save();rctx.translate(cx,cy);rctx.rotate(sweep);const g=rctx.createLinearGradient(0,0,140,0);g.addColorStop(0,'#68d2d226');g.addColorStop(1,'#68d2d200');rctx.fillStyle=g;rctx.beginPath();rctx.moveTo(0,0);rctx.arc(0,0,190,-.2,.2);rctx.closePath();rctx.fill();rctx.restore();
  }
  function updateUI(){
    if(!player)return;
    const depth=depthOf(player.y),rating=safeDepth(),zone=zoneFor(depth);
    $('depthStat').textContent=depth;$('ratingStat').textContent=rating;$('zoneStat').textContent=zone.name;
    $('zoneStat').style.color=zone.color;
    const enemyClose=scene.predators.some(e=>e.aggression>.15&&distance(player,e)<240);
    const apexClose=scene.predators.some(e=>e.tier==='apex'&&e.aggression>.15&&distance(player,e)<300);
    const st=depth>rating?'PRESSURE ALERT':apexClose?'APEX CONTACT':enemyClose?'PREDATOR ALERT':player.oxygen<20?'LOW OXYGEN':player.battery<15?'LOW POWER':'NOMINAL';
    $('statusStat').textContent=st;$('statusStat').className='metric-value '+(st==='NOMINAL'?'status-safe':st==='PREDATOR ALERT'||st==='APEX CONTACT'||st==='PRESSURE ALERT'?'status-danger':'status-warning');
    $('signalText').textContent=st==='NOMINAL'?'VESSEL ONLINE':'VESSEL WARNING';
    const setGauge=(kind,value,max)=>{const pct=clamp(value/max*100,0,100);$(kind+'Value').textContent=Math.round(pct)+'%';$(kind+'Bar').style.width=pct+'%';};
    setGauge('hull',player.hull,maxHull());setGauge('oxygen',player.oxygen,maxOxygen());setGauge('battery',player.battery,maxBattery());setGauge('noise',player.noise,100);
    $('coordsText').textContent='SECTOR '+zone.code+' · '+zone.name;
    $('sonarText').textContent=player.scanCooldown>0?'SONAR CHARGING '+Math.ceil(player.scanCooldown)+'s':'SONAR READY · Q';
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
      prompt.textContent=close.type==='station'?'[ E / USE ] DOCK & UPGRADE':close.type==='recorder'?'[ E / USE ] RECOVER BLACK BOX':close.type==='air'?'[ E / USE ] CLAIM SUPPLY CACHE':'[ E / USE ] SALVAGE '+close.type.toUpperCase();prompt.classList.remove('hidden');
    } else prompt.classList.add('hidden');
    $('mobileSilent').classList.toggle('active',pointerSilent);
    $('lightsLabel').textContent=!player.lights?'LIGHTS OFF':headlightsActive()?'LIGHTS ON':'NO POWER';
    $('mobileLights').setAttribute('aria-pressed',String(player.lights));
    $('mobileLights').setAttribute('aria-label',!player.lights?'Turn flashlight on':headlightsActive()?'Turn flashlight off':'Flashlight has no battery power');
    $('focusDepth').textContent=depth+'m';$('focusHull').textContent=Math.round(player.hull/maxHull()*100)+'%';$('focusOxygen').textContent=Math.round(player.oxygen/maxOxygen()*100)+'%';$('focusBattery').textContent=Math.round(player.battery/maxBattery()*100)+'%';$('focusNoise').textContent=Math.round(player.noise)+'%';
    $('focusHull').classList.toggle('alert',player.hull/maxHull()<.35);$('focusOxygen').classList.toggle('alert',player.oxygen/maxOxygen()<.25);$('focusBattery').classList.toggle('alert',player.battery/maxBattery()<.2);
    const cruiseButton=$('mobileCruise');cruiseButton.classList.toggle('active',cruiseEnabled);cruiseButton.setAttribute('aria-pressed',String(cruiseEnabled));cruiseButton.textContent=cruiseEnabled?'CRUISE ON':'CRUISE OFF';
    drawRadar();
  }
  let focusMode=false;
  function setFocusMode(on){
    focusMode=Boolean(on);
    document.body.classList.toggle('game-focus',focusMode);
    const toggle=$('focusToggleBtn');
    toggle.innerHTML=focusMode?'↙ <span>EXIT</span>':'⛶ <span>FULLSCREEN</span>';
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
    paused=false;keys.clear();resetJoystick(true);
    $('pauseOverlay').classList.add('hidden');$('menuOverlay').classList.add('hidden');
    $('notification').classList.add('hidden');syncPauseButtons();updateUI();
  }
  function updateMainMenu(){
    $('startBtn').innerHTML=running?'CONTINUE EXPEDITION <span>→</span>':'BEGIN EXPEDITION <span>→</span>';
    const existing=saved.bestDepth>0||saved.credits>0||saved.xp>0||saved.secured.length>0||Object.values(saved.upgrades).some(v=>v>0);
    $('menuProgress').textContent=running?'DIVE SUSPENDED · '+depthOf(player.y)+'m · '+player.cargo.recorders.length+' RECORDER(S) ABOARD':
      existing?'BANKED PROGRESS · '+saved.secured.length+'/'+RECORDERS_TOTAL+' RECORDERS · BEST '+saved.bestDepth+'m':'NEW CAPTAIN · NO SAVED PROGRESS';
  }
  function returnToMenu(preserveDive){
    keys.clear();useHeld=false;usePointerId=null;resetJoystick(true);
    $('modalOverlay').classList.add('hidden');$('pauseOverlay').classList.add('hidden');
    if(!preserveDive) {running=false;paused=false;persist();}
    else paused=true;
    syncPauseButtons();updateMainMenu();
    $('menuOverlay').classList.remove('hidden');updateUI();
  }
  function showPause(){
    if(!running||!$('menuOverlay').classList.contains('hidden'))return;
    paused=true;keys.clear();useHeld=false;usePointerId=null;resetJoystick(true);
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
    $('confirmNewGameBtn').addEventListener('click',()=>{saved=defaults();persist();launchDive();});
  }
  function launchDive(){newDive();enterMobileCockpit();}
  function enterMobileCockpit(){
    if(window.matchMedia('(max-width: 850px)').matches){
      setFocusMode(true);
      if(document.fullscreenEnabled&&!document.fullscreenElement&&document.documentElement.requestFullscreen){
        document.documentElement.requestFullscreen({navigationUI:'hide'}).catch(()=>{});
      }
    }
  }
  function briefing(){
    const body=`<div class="briefing"><p>You pilot the <strong>NEREID MK-II</strong>, a salvage submarine. Retrieve six <strong>golden flight recorders</strong> at approximately 75, 260, 470, 725, 1,100 and 1,500 m from wrecks in the trench and dock at the surface to save them.</p><ul><li><kbd>W A S D</kbd> or <kbd>↑ ← ↓ →</kbd> moves the sub. On phones, <strong>drag the joystick</strong> in any direction. Tilt slightly for gentle thrust or to the edge for full speed. Toggle <strong>CRUISE</strong> to keep going after letting go. Turn cruise off to stop thrust.</li><li><kbd>Q</kbd> uses active sonar to detect salvage and threats. Deep in the dark, read contacts on the radar: sonar does not light up the water. Sonar <strong>consumes energy and attracts predators</strong>.</li><li><kbd>E</kbd> recovers nearby scrap, crystals, oxygen caches and recorders. At the station, it banks cargo and opens upgrades.</li><li><kbd>Shift</kbd> moves slowly and quietly to avoid attracting predators. On phones, toggle <strong>SILENT</strong>.</li><li><kbd>R</kbd> repairs 30 hull for two scrap. <kbd>L</kbd> toggles the flashlight to conserve energy. Ambient light fades smoothly with depth and is completely gone at <strong>1,000 m</strong>. Only the forward beam reveals the world down there. No lamp or no battery means total darkness; gauges and sonar radar still work as instruments.</li><li><kbd>Esc</kbd> pauses. Always return to the surface to bank progress, refill oxygen, recharge and upgrade the ship.</li></ul><p><strong>Warning:</strong> Diving beneath your depth rating inflicts rapidly increasing pressure damage. Your hull starts at 130 m and can be upgraded seven times by 200 m to reach 1,530 m. Common predators hunt everywhere; purple abyss stalkers spawn only below 400 m, see and hear farther, swim faster, and bite harder. Ship upgrades let you venture deeper. Damage or suffocation costs unbanked cargo, not your permanent progress.</p></div>`;
    openDialog('OPERATIONS MANUAL // NEREID','PILOT BRIEFING',body,'<div class="dialog-actions"><button id="briefDone" class="alt-btn">UNDERSTOOD</button></div>');
    $('briefDone').addEventListener('click',closeDialog);
  }
  function bind() {
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
      const k=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();
      if(e.repeat)return;
      keys.add(k);
      if(k==='q')scan();else if(k==='e')interact();else if(k==='r')repair();else if(k==='l')toggleLights();else if(k==='escape')togglePause();
    });
    window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur',()=>{keys.clear();useHeld=false;usePointerId=null;resetJoystick(true);});
    document.addEventListener('visibilitychange',()=>{if(document.hidden){keys.clear();useHeld=false;usePointerId=null;resetJoystick(true);}});
    const stick=$('mobileJoystick');
    stick.addEventListener('pointerdown',e=>{
      if(joystick.pointerId!==null||!running||paused)return;
      e.preventDefault();joystick.pointerId=e.pointerId;
      stick.setPointerCapture(e.pointerId);
      stick.classList.add('engaged');
      steerJoystick(e);
    });
    stick.addEventListener('pointermove',e=>{
      if(e.pointerId!==joystick.pointerId)return;
      e.preventDefault();steerJoystick(e);
    });
    const release=e=>{
      if(e.pointerId!==joystick.pointerId)return;
      e.preventDefault();resetJoystick(false);
    };
    stick.addEventListener('pointerup',release);
    stick.addEventListener('pointercancel',release);
    stick.addEventListener('lostpointercapture',e=>{if(e.pointerId===joystick.pointerId)resetJoystick(false);});
    $('mobileCruise').addEventListener('click',()=>{
      if(!running||paused)return;
      cruiseEnabled=!cruiseEnabled;
      if(cruiseEnabled){cruiseHeading.x=joystick.x;cruiseHeading.y=joystick.y;}
      else{cruiseHeading.x=0;cruiseHeading.y=0;}
      updateUI();
    });
    $('mobileSonar').addEventListener('click',scan);
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
    window.addEventListener('resize',()=>{resize();updateUI();});
    if(window.visualViewport)window.visualViewport.addEventListener('resize',resize);
    setupInstall();
  }
  function steerJoystick(e){
    const rect=$('mobileJoystick').getBoundingClientRect();
    const radius=Math.min(rect.width,rect.height)*.32;
    const dx=e.clientX-(rect.left+rect.width/2),dy=e.clientY-(rect.top+rect.height/2);
    const distance=Math.hypot(dx,dy);
    const amount=Math.min(1,distance/radius);
    // Small neutral zone avoids unintended drifting when the stick is centred.
    if(amount<.13){joystick.x=0;joystick.y=0;}
    else{
      const throttle=(amount-.13)/.87;
      joystick.x=dx/(distance||1)*throttle;
      joystick.y=dy/(distance||1)*throttle;
      if(cruiseEnabled){cruiseHeading.x=joystick.x;cruiseHeading.y=joystick.y;}
    }
    const thumb=$('joystickThumb');
    thumb.style.transform=`translate3d(${joystick.x*radius}px,${joystick.y*radius}px,0)`;
  }
  function resetJoystick(cancelCruise=false){
    joystick.pointerId=null;joystick.x=0;joystick.y=0;
    $('mobileJoystick').classList.remove('engaged');
    $('joystickThumb').style.transform='translate3d(0,0,0)';
    if(cancelCruise){cruiseEnabled=false;cruiseHeading.x=0;cruiseHeading.y=0;}
    const button=$('mobileCruise');
    button.classList.toggle('active',cruiseEnabled);
    button.setAttribute('aria-pressed',String(cruiseEnabled));
    button.textContent=cruiseEnabled?'CRUISE ON':'CRUISE OFF';
  }
  function setupInstall(){
    // GitHub Pages (HTTPS) supports installation and the offline service worker.
    if('serviceWorker' in navigator && (location.protocol==='https:' || ['localhost','127.0.0.1'].includes(location.hostname))){
      window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(()=>{}));
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
  player={x:600,y:160,vx:0,vy:0,facing:0,hull:maxHull(),oxygen:maxOxygen(),battery:maxBattery(),lights:true,noise:0,cargo:{scrap:0,crystal:0,recorders:[]},scanCooldown:0,damageCooldown:0};
  camera.x=player.x-viewport.w/2;camera.y=player.y-viewport.h/2;
  updateMainMenu();updateUI();requestAnimationFrame(frame);
  // Tiny inspection hook for automated smoke tests.
  window.AbyssDiagnostics={state:()=>({ambientLight:ambientLightAt(player.y),blackoutDepth:LIGHTING.blackoutDepth,lights:player.lights,headlightsActive:headlightsActive(),recorderDepths:[...RECORDER_DEPTHS],maxWorldDepth:depthOf(MAX_WORLD_Y),safeDepth:safeDepth(),hullLevel:saved.upgrades.hull,maxHull:maxHull(),focusMode,running,paused,menuOpen:!$('menuOverlay').classList.contains('hidden'),pauseOpen:!$('pauseOverlay').classList.contains('hidden'),depth:depthOf(player.y),x:player.x,y:player.y,vx:player.vx,vy:player.vy,hull:player.hull,battery:player.battery,oxygen:player.oxygen,credits:saved.credits,secured:saved.secured.length,items:scene.items.length,rocks:scene.rocks.length,predators:scene.predators.length,apexCount:scene.predators.filter(e=>e.tier==='apex').length,commonCount:scene.predators.filter(e=>e.tier!=='apex').length,pursuing:scene.predators.filter(e=>e.aggression>.13).length,nearestPredatorDistance:Math.min(Infinity,...scene.predators.map(e=>distance(player,e))),useHeld,joystickX:joystick.x,joystickY:joystick.y,cruiseEnabled,cruiseX:cruiseHeading.x,cruiseY:cruiseHeading.y})};
  if(location.search.includes('testmode=1')||window.ABYSS_TEST_MODE===true){
    window.AbyssDiagnostics.fixture=({x=600,y=700,rocks=[],predators=[],items=[]}={})=>{
      player.x=x;player.y=y;player.vx=0;player.vy=0;player.facing=0;player.noise=0;
      scene.rocks=rocks.map(rock=>({...rock,vertices:rockPolygon(rock)}));
      scene.predators=predators.map(enemy=>({...enemy,tier:enemy.tier||'common',vx:0,vy:0,homeX:enemy.x,homeY:enemy.y,phase:0,aggression:enemy.aggression??0,alertUntil:enemy.alertUntil??0,forgetUntil:0,lastHit:-10}));
      scene.items=items.map((i,index)=>makeItem(i.x,i.y,i.type||'scrap',{id:index}));
      return true;
    };
    window.AbyssDiagnostics.lightingFixture=({depth=1000,facing=0,lights=true,battery=100,quietScene=false,freeze=true,hud=true}={})=>{
      player.x=centerAt(120+depth*10);player.y=120+depth*10;
      player.vx=0;player.vy=0;player.facing=facing;player.lights=lights;player.battery=battery;
      player.hull=maxHull();player.oxygen=maxOxygen();player.damageCooldown=0;player.scanCooldown=0;
      sonarWaves=[];
      if(quietScene)scene={rocks:[],items:[],predators:[],vents:[],dust:[],wrecks:[]};
      paused=freeze;
      camera.x=player.x-viewport.w/2;camera.y=player.y-viewport.h*.52;
      updateUI();render();
      if(!hud){
        // The production path remains render(); hide only the instrument pointer
        // when a test needs to assert that the entire world canvas is black.
        const savedRunning=running;running=false;render();running=savedRunning;
      }
      return {x:player.x,y:player.y,camera:{...camera},viewport:{...viewport},lighting:{...LIGHTING},ambient:ambientLightAt(player.y)};
    };
    window.AbyssDiagnostics.ambientAtDepth=depth=>ambientLightAt(120+depth*10);
    window.AbyssDiagnostics.renderWorld=()=>{const before=running;running=false;render();running=before;};
    window.AbyssDiagnostics.debug=()=>({clock,sonarWaves:sonarWaves.map(w=>({...w})),player:{...player},saved:{...saved,upgrades:{...saved.upgrades}},wrecks:scene.wrecks.map(w=>({...w})),predators:scene.predators.map(e=>({...e})),items:scene.items.map(i=>({...i}))});
    window.AbyssDiagnostics.grantCredits=(value)=>{saved.credits=Math.max(0,Math.floor(value));persist();updateUI();};
  }
})();
