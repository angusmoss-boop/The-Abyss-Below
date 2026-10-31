/* Deepwater Rescue: optional expeditions, persistent support sites and honest debriefs.
 * All gameplay time comes from the active simulation. No wall-clock rewards.
 */
(() => {
  'use strict';
  const buildId='0.26.0-tactical-depths-1';
  const TAU=Math.PI*2;
  const NAMES=['PIP','MICA','FERN','ECHO','NOVA'];
  const REWARDS=[180,260,340,420,500];
  const MESSAGES=[
    'PIP recovered a surface-current survey. Its final log reads: "Return route still looks beautiful."',
    'MICA mapped a clear channel between the fractured mineral shelves. The little surveyor kept its route home.',
    'FERN recorded new growth on the old laboratories. Even here, something is beginning again.',
    'ECHO preserved an acoustic sample from before the Cathedral fell silent. The carrier signal is still unexplained.',
    'NOVA returned with a pressure log from the deepest survey. Its last entry is a single instruction: "Look up."'
  ];
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const finite=(x,a=0,b=1e9)=>Number.isFinite(x)&&x>=a&&x<=b;
  const point=p=>p&&finite(p.x,-4800,6000)&&finite(p.y,70,18120);
  const copy=x=>JSON.parse(JSON.stringify(x));
  const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const states=['stranded','follow','wait','rescued'];
  const eventKinds=['migration','silt','silhouette','beacon'];
  function valid(s){
    if(!s||s.version!==1||!finite(s.elapsed)||!finite(s.signalAfter)||!finite(s.nextEventAt)||!Number.isInteger(s.eventCount)||s.eventCount<0||s.eventCount>1e7||typeof s.done!=='boolean')return false;
    if(!Array.isArray(s.stations)||s.stations.length<1||s.stations.length>2||new Set(s.stations.map(n=>n.id)).size!==s.stations.length)return false;
    if(!s.stations.every(n=>point(n)&&/^air-service-[01]$/.test(n.id)&&typeof n.seen==='boolean'&&finite(n.spent,0,1000)&&finite(n.allowance,0,1000)&&n.spent<=n.allowance+.001))return false;
    if(s.drone){const d=s.drone;
      if(!point(d)||d.id!=='rescue-drone'||!states.includes(d.status)||typeof d.seen!=='boolean'||!point(d.search)||!finite(d.heading,-10000,10000)||!finite(d.restart,0,1.6)||!Array.isArray(d.trail)||d.trail.length>800||!d.trail.every(point))return false;
      if(s.done!==(d.status==='rescued'))return false;
    }else if(s.done)return false;
    if(s.event&&(!eventKinds.includes(s.event.kind)||!point(s.event)||!finite(s.event.age,0,90)||!finite(s.event.duration,1,90)||!finite(s.event.direction,-1,1)))return false;
    if(s.trip&&(!finite(s.trip.seconds)||!finite(s.trip.depth,0,1800)||!finite(s.trip.damage)||!finite(s.trip.airAdded)||!finite(s.trip.startKnown)||!finite(s.trip.startContracts)||!finite(s.trip.startCredits)))return false;
    if(s.lastReport&&!validReport(s.lastReport))return false;
    return true;
  }
  function validReport(r){return r&&['scrap','credits','crystals','recorders','plates','rescueCredit','contractCredit','discoveries','seconds','depth','damage','airAdded','rescued'].every(k=>finite(r[k]))&&Array.isArray(r.bests)&&r.bests.length<=4&&r.bests.every(t=>['Largest haul','Longest successful dive','New depth record','First clean return'].includes(t));}
  function normalise(value){return valid(value)?copy(value):null;}
  function validateCampaign(data){for(const f of Object.values(data.levels||{}))if(f.rescue!=null&&!valid(f.rescue))throw Error('Invalid rescue, air-station or expedition-log state.');return true;}
  function create(api){
    let held=null,heldFor=0,toggleRelease=0,path=[],routeTimer=0,transferSound=0,seenTimer=0,previousField=null;
    const state=()=>api.field().rescue;
    const idx=()=>api.levelIndex();
    const pauseReset=()=>{held=null;heldFor=0;toggleRelease=0;transferSound=0;path=[];routeTimer=0;};
    const audio=(name,obj,intensity=1)=>api.sound(name,obj?clamp((obj.x-api.player().x)/320,-1,1):0,intensity);
    const knownCount=()=>Object.keys(api.field().survey.contacts).length;
    function activeOther(){return Object.entries(api.levels()).some(([id,f])=>id!==api.levelId()&&f.rescue?.drone&&!f.rescue.done);}
    function clear(x,y,r=28){return point({x,y})&&api.clear(x,y,r)&&y<api.bottom()-70;}
    function safeSite(y,rng,side=1){
      // Start in the deliberately open navigation lanes, then try nearby water.
      for(let n=0;n<240;n++){
        const yy=clamp(y+(n?Math.sin(n*2.399)*Math.min(220,n*5):0),720,api.bottom()-140);
        const x=api.lane(yy,(n%3+side)%3)+(n>8?(rng()-.5)*90:0);
        const p={x,y:yy};
        if(!clear(x,yy,50)||dist(p,api.harbour())<500)continue;
        if(api.exclusions().some(o=>dist(p,o)<(o.radius||0)+95))continue;
        if(state()?.stations?.some(o=>dist(p,o)<180))continue;
        return p;
      }
      // The centre lane is protected by the original world generator. Never
      // move resources to make room; a very crowded seed gets a shorter site list.
      for(let yy=750;yy<api.bottom()-160;yy+=30){const x=api.lane(yy,1);if(clear(x,yy,45)&&!api.exclusions().some(o=>dist({x,y:yy},o)<90))return {x,y:yy};}
      return null;
    }
    function build(){
      const f=api.field();
      if(!f.rescue){
        const rng=api.random(f.seed^0x52ab136d);const stations=[];
        // Early service is reachable with the stock 130 m hull. Later stations
        // remain below the level's prior pressure gate, not behind its final floor.
        const depths=[[88],[220,465],[370,790],[610,1120],[800,1480]][idx()];
        f.rescue={version:1,elapsed:0,signalAfter:95+rng()*35,nextEventAt:175+rng()*65,eventCount:0,stations,drone:null,done:false,event:null,trip:null,lastReport:null};
        depths.forEach((d,i)=>{const p=safeSite(120+d*10,rng,i);if(p)stations.push({id:'air-service-'+i,...p,seen:false,spent:0,allowance:0});});
      }
      if(previousField!==f){pauseReset();previousField=f;}
      // Canonical objects are also sonar contacts. Save waves bind by stable ID.
      api.setObjects([...f.rescue.stations,...(f.rescue.drone&&!f.rescue.done?[f.rescue.drone]:[])]);
    }
    function remember(o){
      if(!o)return;o.seen=true;
      if(o.id==='rescue-drone')return; // Moving followers never leave stale map dots.
      api.field().survey.contacts['rescue:'+o.id]={x:o.x,y:o.y,type:'airStation',label:'AIR SERVICE · '+(available(o)?'AVAILABLE':'DEPLETED'),collected:!available(o)};
    }
    function available(s){return s.allowance===0||s.spent<s.allowance-.05;}
    function spawnDrone(){
      const s=state(),p=api.player();if(s.done||s.drone||activeOther())return false;
      const rng=api.random(api.field().seed^0x197acb6d);
      const depth=Math.min(api.safeDepth()-22,[110,360,650,940,1320][idx()]);
      if(depth<65)return false;
      const site=safeSite(120+depth*10,rng,2);if(!site)return false;
      const search={x:site.x+(rng()-.5)*160,y:clamp(site.y+(rng()-.5)*100,500,api.bottom()-100)};
      s.drone={id:'rescue-drone',...site,status:'stranded',seen:false,search,heading:-Math.PI/2,restart:0,trail:[]};
      build();audio('distress',site);api.announce('FAINT DISTRESS SIGNAL · '+NAMES[idx()]+' · SEARCH AREA ON MAP',4);api.save();return true;
    }
    function near(){
      const p=api.player();if(!p||p.airborne)return null;let found=null,best=68;
      for(const o of api.objects()){
        if(o.status==='rescued')continue;
        const d=dist(p,o);if(d<best&&api.line(p,o,3)){best=d;found=o;}
      }
      return found?{...found,type:'rescue',rescueId:found.id}:null;
    }
    function interact(item){
      const s=state(),o=api.objects().find(n=>n.id===item.rescueId);if(!o||!near()||near().rescueId!==o.id)return;
      remember(o);held=o.id;heldFor=.22;
      if(o.id==='rescue-drone'&&o.status!=='stranded'){
        // A held E/USE generates repeated calls. Require release before toggling again.
        if(toggleRelease>0){toggleRelease=.35;return;}
        toggleRelease=.35;
        o.status=o.status==='follow'?'wait':'follow';o.trail=[];path=[];
        api.announce(NAMES[idx()]+' · '+(o.status==='follow'?'FOLLOWING · RETURN TO HARBOUR':'HOLDING POSITION'),2.5);
        audio('droneHello',o,.5);api.save();
      }
    }
    function hint(item){
      const o=api.objects().find(n=>n.id===item.rescueId);if(!o)return '';
      if(o.id==='rescue-drone')return o.status==='stranded'?'HOLD USE · RESTART '+NAMES[idx()]+' · '+Math.floor(o.restart/1.5*100)+'%':'USE · '+(o.status==='follow'?'ASK '+NAMES[idx()]+' TO WAIT':'CALL '+NAMES[idx()]+' TO FOLLOW');
      if(!available(o))return 'AIR STATION DEPLETED · RESETS AFTER RETURN TO HARBOUR';
      if(api.player().oxygen>=api.maxOxygen()-.05)return 'AIR STATION · TANK FULL';
      const left=o.allowance?Math.max(0,o.allowance-o.spent):api.maxOxygen()*.25;
      return 'HOLD USE · TRANSFER AIR · '+Math.ceil(left)+' UNITS AVAILABLE';
    }
    function onWave(o){remember(o);if(o.id==='rescue-drone'&&o.status==='stranded'&&!o.sonarLocated){o.sonarLocated=true;audio('rescueLocated',o,.7);api.announce(NAMES[idx()]+' LOCATED · HOLD USE NEARBY TO RESTART',2.8);}}
    function visible(o){return api.visible(o)&&api.line(api.player(),o,0);}
    function pulseChannel(dt){
      const s=state(),p=api.player();
      heldFor=Math.max(0,heldFor-dt);toggleRelease=Math.max(0,toggleRelease-dt);transferSound=Math.max(0,transferSound-dt);
      const o=heldFor>0?api.objects().find(n=>n.id===held):null;
      if(!o||p.airborne||dist(p,o)>=68||!api.line(p,o,3)){held=null;return;}
      if(o.id==='rescue-drone'){
        if(o.status==='stranded'){
          o.restart=Math.min(1.5,o.restart+dt);
          if(o.restart>=1.5){o.status='follow';o.trail=[];toggleRelease=.35;held=null;path=[];audio('droneHello',o);api.announce(NAMES[idx()]+' ONLINE · LEAD IT HOME · USE TO WAIT/FOLLOW',3.8);api.save();}
        }
      }else if(available(o)&&p.oxygen<api.maxOxygen()-.01){
        if(!o.allowance)o.allowance=api.maxOxygen()*.25;
        const amount=Math.min(api.maxOxygen()-p.oxygen,o.allowance-o.spent,api.maxOxygen()*.25/6*dt);
        if(amount>0){p.oxygen+=amount;o.spent+=amount;if(s.trip)s.trip.airAdded+=amount;
          if(transferSound<=0){audio('airTransfer',o,.5);transferSound=1.3;}
          remember(o);
          if(!available(o)){api.announce('AIR TRANSFER COMPLETE · RETURN TO HARBOUR TO RESTOCK STATION',3);api.save();}
        }
      }
    }
    function follow(dt){
      const d=state().drone,p=api.player();if(!d||d.status!=='follow')return;
      const goal=p.airborne?{x:p.x,y:150}:{x:p.x,y:Math.max(150,p.y)};
      let last=d.trail.at(-1)||d;
      if(dist(last,goal)>28&&api.line(last,goal,11)){d.trail.push({...goal});if(d.trail.length>800)d.trail.splice(0,d.trail.length-800);}
      let target;
      if(api.line(d,goal,11)){target=goal;d.trail=[];path=[];}
      else {
        while(d.trail.length&&dist(d,d.trail[0])<18)d.trail.shift();
        target=d.trail[0]||goal;
        if(!api.line(d,target,11)){
          routeTimer-=dt;
          if(routeTimer<=0){path=api.route(d,target);routeTimer=1.1;}
          while(path.length&&dist(d,path[0])<15)path.shift();
          target=path[0];
        }
      }
      if(!target)return;
      const delta=dist(d,target),distanceToShip=dist(d,goal);
      const personalSpace=target===goal?57:4;
      if(delta<=personalSpace)return;
      const speed=api.normalSpeed()*(distanceToShip>150?1.15:1)*clamp((delta-personalSpace)/50,.15,1);
      const travel=Math.min(delta-personalSpace,speed*dt),nx=(target.x-d.x)/delta,ny=(target.y-d.y)/delta;
      const steps=Math.max(1,Math.ceil(travel/5));
      for(let i=0;i<steps;i++){
        const x=d.x+nx*travel/steps,y=d.y+ny*travel/steps;
        if(!clear(x,y,11)){path=[];routeTimer=0;break;}d.x=x;d.y=y;
      }
      const turn=Math.atan2(ny,nx)-d.heading;d.heading+=Math.atan2(Math.sin(turn),Math.cos(turn))*Math.min(1,dt*5);
    }
    function beginTrip(){const s=state();if(!s.trip)s.trip={seconds:0,depth:0,damage:0,airAdded:0,startKnown:knownCount(),startContracts:api.signals().earned,startCredits:api.profile().credits};}
    function startEvent(kind){
      const s=state(),p=api.player(),rng=api.random(api.field().seed+s.eventCount*7139);
      if(!kind)kind=eventKinds[(s.eventCount+(api.field().seed%4))%4];
      if(idx()===0&&kind==='silt')kind='migration';
      const x=clamp(p.x+(rng()-.5)*120,api.left(p.y)+60,api.right(p.y)-60),y=clamp(p.y+110,680,api.bottom()-100);
      const event={kind,x,y,age:0,duration:kind==='silhouette'?26:kind==='migration'?36:24,direction:rng()>.5?1:-1};
      if(kind==='beacon'){
        const contacts=api.field().survey.contacts;
        const unknown=api.landmarks().filter(o=>!Object.values(contacts).some(c=>dist(c,o)<100)&&api.depth(o.y)<=api.safeDepth()-8);
        if(!unknown.length){event.kind='migration';}else{const target=unknown[Math.floor(rng()*unknown.length)];event.x=target.x+(rng()-.5)*140;event.y=target.y+(rng()-.5)*120;}
      }
      s.event=event;s.eventCount++;s.nextEventAt=s.elapsed+200+rng()*130;
      const labels={migration:'A MIGRATION IS PASSING THROUGH',silt:'SILT LIFT · SONAR CAN HELP',silhouette:'A LOW CALL FROM BEYOND THE TRENCH',beacon:'INTERMITTENT BEACON · APPROXIMATE AREA ON MAP'};
      api.announce(labels[event.kind],3);audio(event.kind==='silhouette'?'distantCall':event.kind==='beacon'?'distress':event.kind==='silt'?'siltLift':'schoolRush',event,.5);api.save();
    }
    function update(dt){
      if(!state()||!api.active()||dt<=0)return;
      const s=state(),p=api.player();
      if(!api.inHarbour(p)&&!p.airborne){s.elapsed+=dt;beginTrip();s.trip.seconds+=dt;s.trip.depth=Math.max(s.trip.depth,api.depth(p.y));s.trip.damage=p.trip?.hullDamage||0;
        if(s.elapsed>=s.signalAfter&&!s.drone&&!s.done&&!activeOther())spawnDrone();
        if(s.elapsed>=s.nextEventAt&&!s.event&&!api.bossActive())startEvent();
      }
      if(s.event){if(api.bossActive()||api.inHarbour(p))s.event=null;else{s.event.age+=dt;if(s.event.age>=s.event.duration)s.event=null;}}
      pulseChannel(dt);follow(dt);
      seenTimer+=dt;if(seenTimer>=.25){seenTimer=0;for(const o of api.objects())if(!o.seen&&visible(o)){remember(o);api.save();}}
    }
    function loss(){
      const s=state();if(!s)return;
      if(s.drone?.status==='follow'){s.drone.status='wait';s.drone.trail=[];s.drone.seen=true;}
      s.trip=null;s.event=null;pauseReset();
    }
    function leaveLevel(){const d=state()?.drone;if(d?.status==='follow'){d.status='wait';d.trail=[];}pauseReset();}
    function reportBefore(){const p=api.player(),s=state();return {scrap:p.cargo.scrap,crystals:p.cargo.crystal,recorders:p.cargo.recorders.length,plates:p.cargo.plates?.length||0,seconds:s?.trip?.seconds||0,depth:Math.max(s?.trip?.depth||0,p.trip?.deepest||0),damage:p.trip?.hullDamage||0,airAdded:s?.trip?.airAdded||0,known:knownCount(),startKnown:s?.trip?.startKnown??knownCount(),contractBefore:api.signals().earned};}
    function dock(realReturn,baseline){
      const s=state();if(!s)return;
      // Only a physical return can restock service stations or pay a rescue.
      if(!realReturn)return;
      const p=api.profile(),d=s.drone;let rescued=0,rescueCredit=0;
      if(d&&d.status==='follow'&&dist(d,api.harbour())<260){
        d.status='rescued';d.trail=[];s.done=true;rescueCredit=REWARDS[idx()];p.credits+=rescueCredit;p.stats.dronesRescued=(p.stats.dronesRescued||0)+1;rescued=1;
        if(api.field().survey.waypoint&&dist(api.field().survey.waypoint,d)<250)api.field().survey.waypoint=null;
        audio('rescueHome',null);api.addEvent(NAMES[idx()]+' rescued · +'+rescueCredit+' CR');
      }else if(d?.status==='follow'){d.status='wait';d.trail=[];api.addEvent(NAMES[idx()]+' is waiting outside the harbour. Return and use it to resume the escort.');}
      // Reset stations in this destination only. Selecting a different level is
      // not a physical return and never resets either destination's stock.
      for(const n of s.stations){n.spent=0;n.allowance=0;if(n.seen)remember(n);}
      const r={...baseline,credits:baseline.scrap*18,rescued,rescueCredit,contractCredit:Math.max(0,api.signals().earned-baseline.contractBefore),discoveries:Math.max(0,baseline.known-baseline.startKnown),bests:[]};
      delete r.known;delete r.startKnown;delete r.contractBefore;
      const stats=p.stats;
      if(r.scrap>(stats.rescueBestHaul||0)){r.bests.push('Largest haul');stats.rescueBestHaul=r.scrap;}
      if(r.seconds>(stats.rescueBestTime||0)&&r.seconds>=30){r.bests.push('Longest successful dive');stats.rescueBestTime=r.seconds;}
      if(r.depth>(stats.rescueBestDepth||0)){r.bests.push('New depth record');stats.rescueBestDepth=r.depth;}
      const cleanKey='cleanRescue'+['Shelf','Rift','Gardens','Cathedral','Abyss'][idx()];
      if(r.depth>=70&&r.damage<.001&&!stats[cleanKey]){stats[cleanKey]=1;r.bests.push('First clean return');}
      s.lastReport=r;s.trip=null;s.event=null;pauseReset();build();
    }
    function labels(){
      const s=state(),d=s?.drone;
      if(!d||s.done)return '';
      return NAMES[idx()]+' · '+({stranded:d.seen?'AWAITING RESTART':'DISTRESS SIGNAL',follow:'FOLLOWING',wait:'WAITING AT '+api.depth(d.y)+' m'})[d.status];
    }
    function dockHTML(){
      const s=state(),r=s?.lastReport;
      const recovered=Object.values(api.levels()).filter(f=>f.rescue?.done).length;
      return '<section class="rescue-arrival"><div><span class="section-overline">'+(r?'LAST EXPEDITION':'DEEPWATER RESCUE')+'</span><strong>'+(r?'+'+(r.credits+r.rescueCredit+r.contractCredit).toLocaleString('en-GB')+' CR <i>·</i> '+r.crystals+' CRYSTALS':'Bring a little life home')+'</strong><small>'+(r?r.recorders+' recorders · '+r.depth+' m deepest · '+Math.floor(r.seconds/60)+' min':recovered+' / 5 survey drones rescued')+'</small></div><button id="rescueLogBtn" class="alt-btn">'+(r?'VIEW REPORT':'RESCUE LOG')+'</button></section>';
    }
    function bindDock(){const b=document.getElementById('rescueLogBtn');if(b)b.onclick=openLog;}
    function openLog(){
      const s=state(),r=s?.lastReport;const box=document.getElementById('rescueBody');
      const rows=r?[['Scrap banked',r.scrap+' → '+r.credits+' CR'],['Crystals secured',r.crystals],['Recorders delivered',r.recorders],['Wreck identities',r.plates],['Survey drone',r.rescued?'RESCUED · +'+r.rescueCredit+' CR':'None this return'],['Contract payment',r.contractCredit+' CR'],['New chart contacts',r.discoveries],['Deepest point',r.depth+' m'],['Active time',Math.floor(r.seconds/60)+':'+String(Math.floor(r.seconds%60)).padStart(2,'0')],['Air transferred',Math.floor(r.airAdded)+' units']]:[];
      const achievements=api.achievementProgress().filter(a=>['contractTen','crystals','cleanGetaway'].includes(a.id)||/Trusted Contractor|Crystal Archivist/.test(a.name||''));
      const fleet=api.levelDefinitions().map((l,i)=>{const f=api.levels()[l.id]?.rescue,d=f?.drone;return '<article class="rescue-fleet '+(f?.done?'is-home':'')+'"><span class="rescue-bot-symbol">◈</span><div><h3>'+NAMES[i]+' <small>'+l.name+'</small></h3><p>'+(f?.done?MESSAGES[i]:d?(d.status==='stranded'?'Distress signal detected. Locate the drone, then hold USE to restart it.':'Waiting for your return. Use FOLLOW / WAIT beside the drone.'):'No transmission logged. Explore this level to listen for a signal.')+'</p></div><b>'+(f?.done?'HOME':d?'IN FIELD':'UNKNOWN')+'</b></article>';}).join('');
      box.innerHTML=(r?'<div class="rescue-report-heading"><span class="section-overline">'+api.levelDefinitions()[idx()].name+'</span><h3>Every return tells a story.</h3><strong>+'+(r.credits+r.rescueCredit+r.contractCredit).toLocaleString('en-GB')+' <small>CR BANKED</small></strong></div><div class="rescue-report-grid">'+rows.map(([k,v])=>'<div><span>'+k+'</span><b>'+v+'</b></div>').join('')+'</div>'+ (r.bests.length?'<div class="rescue-records">'+r.bests.map(t=>'<span>✧ '+t+'</span>').join('')+'</div>':''):'<p class="rescue-explainer">A faint signal can become an unexpected journey home. Explore with enough oxygen for the return.</p>')+
        (s?.drone&&!s.done?'<button id="rescuePinBtn" class="alt-btn rescue-pin">PIN '+(s.drone.seen?'DRONE POSITION':'DISTRESS SEARCH AREA')+'</button>':'')+'<div class="rescue-progress">'+achievements.map(a=>'<span>'+a.name+' <b>'+Math.min(a.progress,a.target)+' / '+a.target+'</b></span>').join('')+'</div><h3 class="rescue-section-title">THE HARBOUR FLEET <small>ONE UNIQUE RESCUE PER LEVEL</small></h3>'+fleet+
        '<p class="rescue-explainer">Hold USE to restart a drone or transfer oxygen at an air station. Tap USE next to a running drone to switch FOLLOW / WAIT. Rescue rewards are credits only. Air stations never bank cargo, reload weapons or protect you from predators.</p>';
      const pin=document.getElementById('rescuePinBtn');if(pin)pin.onclick=()=>{const d=state().drone;if(!d||state().done)return;const p=d.seen?d:d.search;api.field().survey.waypoint={x:p.x,y:p.y};api.save();pin.textContent=d.seen?'DRONE POSITION PINNED':'SEARCH AREA PINNED';};
      if(!document.getElementById('rescueDialog').open)api.openLog();
    }
    function map(g,project){
      const s=state();if(!s)return;
      function ring(o,r,label,col){const p=project(o.x,o.y);g.save();g.translate(p.x,p.y);g.strokeStyle=col;g.fillStyle=col;g.lineWidth=1.3;g.setLineDash([4,4]);g.beginPath();g.arc(0,0,r,0,TAU);g.stroke();g.setLineDash([]);g.font='9px ui-monospace,monospace';g.fillText(label,r+5,-4);g.restore();}
      for(const n of s.stations)if(n.seen){const p=project(n.x,n.y);g.save();g.strokeStyle=available(n)?'#9cdddb':'#71858e';g.lineWidth=1.5;g.strokeRect(p.x-5,p.y-6,10,12);g.fillStyle=g.strokeStyle;g.font='9px ui-monospace,monospace';g.fillText('AIR '+(available(n)?'AVAILABLE':'DEPLETED'),p.x+10,p.y+3);g.restore();}
      const d=s.drone;if(d&&!s.done){
        if(d.seen){const p=project(d.x,d.y);g.fillStyle='#f5cf91';g.beginPath();g.arc(p.x,p.y,4,0,TAU);g.fill();g.font='bold 10px ui-monospace,monospace';g.fillText(NAMES[idx()]+' · '+d.status.toUpperCase(),p.x+9,p.y-5);}
        else ring(d.search,26,'DISTRESS / SEARCH','#e8cfa0');
      }
      if(s.event?.kind==='beacon')ring(s.event,30,'INTERMITTENT SIGNAL','#b8c9de');
    }
    function drawStation(g,n,echo){
      const availableNow=available(n),color=availableNow?'#9ce9da':'#69858e';
      g.save();g.translate(n.x,n.y);
      g.strokeStyle=echo?color:'#517780';g.fillStyle='#0b2632';g.lineWidth=2;
      if(!echo){g.fillStyle='#08202b';g.beginPath();g.roundRect(-30,-19,60,39,8);g.fill();g.stroke();}
      for(const x of [-19,19]){g.beginPath();g.roundRect(x-7,-26,14,47,5);if(!echo){g.fillStyle='#285461';g.fill();}g.stroke();g.beginPath();g.moveTo(x-5,-12);g.lineTo(x+5,-12);g.stroke();}
      g.strokeStyle=color;g.beginPath();g.arc(0,-6,11,0,TAU);g.stroke();g.beginPath();g.moveTo(-5,-6);g.lineTo(5,-6);g.moveTo(0,-11);g.lineTo(0,-1);g.stroke();
      g.fillStyle=color;const left=n.allowance?clamp(1-n.spent/n.allowance,0,1):1;g.fillRect(-12,12,24*left,3);
      g.strokeStyle='#729799';g.beginPath();g.moveTo(28,12);g.bezierCurveTo(45,24,45,45,22,43);g.stroke();g.strokeRect(16,40,8,5);
      g.fillStyle=color;g.font='bold 8px ui-monospace,monospace';g.textAlign='center';g.fillText('O₂',0,32);g.restore();
    }
    function drawDrone(g,d,echo=false,name=true){
      g.save();g.translate(d.x,d.y);g.rotate(d.heading||0);g.strokeStyle=echo?'#edcf93':'#94c9c5';g.lineWidth=1.2;
      if(!echo){const shade=g.createLinearGradient(-16,-8,16,8);shade.addColorStop(0,'#476675');shade.addColorStop(1,'#102d3a');g.fillStyle=shade;}
      g.beginPath();g.ellipse(0,0,17,10,0,0,TAU);if(!echo)g.fill();g.stroke();g.fillStyle=d.status==='stranded'?'#efb77f':'#a3efdc';g.beginPath();g.arc(10,0,4,0,TAU);g.fill();
      g.beginPath();g.moveTo(-8,-8);g.lineTo(-14,-16);g.lineTo(2,-9);g.moveTo(-8,8);g.lineTo(-14,16);g.lineTo(2,9);g.stroke();
      g.strokeStyle='#e5bb7a';g.beginPath();g.moveTo(-7,-5);g.lineTo(-7,5);g.stroke();g.restore();
      if(name){g.save();g.font='8px ui-monospace,monospace';g.fillStyle='#e8d3a6';g.textAlign='center';g.fillText(NAMES[idx()],d.x,d.y-23);g.restore();}
    }
    function draw(g,echo=false){
      const s=state();if(!s)return;
      for(const o of api.objects()){
        if(!api.onScreen(o.x,o.y,65))continue;
        if(echo&&(!(o.revealUntil>api.clock())||visible(o)))continue;
        if(!echo&&!visible(o))continue;
        g.save();if(echo)g.globalAlpha=clamp((o.revealUntil-api.clock())/4,0,.75);
        if(o.id==='rescue-drone')drawDrone(g,o,echo);else drawStation(g,o,echo);g.restore();
      }
    }
    function drawHarbour(g){
      let n=0;for(const [i,l] of api.levelDefinitions().entries())if(api.levels()[l.id]?.rescue?.done){const t=api.clock(),x=api.harbour().x-100+(n%3)*90+Math.sin(t*.4+i)*11,y=api.harbour().y+95+Math.floor(n/3)*38+Math.cos(t*.6+i)*7;n++;g.save();g.globalAlpha=.85;drawDrone(g,api.harbourPose?.(i,n-1,t)||{x,y,heading:Math.sin(t*.25+i)*.5,status:'rescued'},false,false);g.restore();}
    }
    function drawEncounter(g){
      const e=state()?.event;if(!e)return;
      const t=e.age,fade=Math.min(1,t/3,(e.duration-t)/4);g.save();g.translate(e.x,e.y);g.globalAlpha=fade;
      if(e.kind==='migration'){
        // One lightweight visual school: no predators, loot, or permanent map markers.
        const travel=(t/e.duration-.5)*1100*e.direction;
        for(let i=0;i<32;i++){
          const x=travel+Math.sin(i*3.117)*105+Math.sin(t*(.7+i*.013)+i*2)*23,y=Math.cos(i*2.399)*70+Math.sin(t*.7+i)*21;
          if(!clear(e.x+x,e.y+y,5))continue;
          g.save();g.translate(x,y);g.scale(e.direction,1);g.fillStyle=['#87bbc9','#c7b682','#8bcebc','#b3a0d1'][i%4];g.globalAlpha=fade*.65;
          g.beginPath();g.ellipse(0,0,6+i%3,2.5+i%2,0,0,TAU);g.fill();g.beginPath();g.moveTo(-6,0);g.lineTo(-11,-3);g.lineTo(-11,3);g.closePath();g.fill();g.restore();
        }
      }else if(e.kind==='silt'){
        const swell=Math.sin(Math.min(1,t/5)*Math.PI/2);const cloud=g.createRadialGradient(0,0,5,0,-40,200);cloud.addColorStop(0,'rgba(130,153,142,.13)');cloud.addColorStop(1,'rgba(90,117,118,0)');g.fillStyle=cloud;g.scale(1,swell);g.fillRect(-220,-240,440,400);
        g.fillStyle='#899a9380';for(let i=0;i<50;i++){const x=Math.sin(i*127.1)*170+Math.sin(t*.6+i)*20,y=-((i*31+t*7)%220);g.beginPath();g.arc(x,y,1+i%3*.35,0,TAU);g.fill();}
      }else if(e.kind==='silhouette'){
        g.translate((t/e.duration-.5)*1200*e.direction,-100);g.scale(e.direction,1);g.globalAlpha=fade*.32;g.fillStyle='#010c14';g.beginPath();g.ellipse(0,0,150,40,-.05,0,TAU);g.fill();g.beginPath();g.moveTo(-120,0);g.lineTo(-220,-60);g.quadraticCurveTo(-190,0,-220,55);g.closePath();g.fill();g.beginPath();g.moveTo(10,20);g.lineTo(-70,90);g.lineTo(-35,20);g.fill();
      }
      g.restore();
    }
    function stateCopy(){return copy(state());}
    return {build,update,near,interact,hint,onWave,remember,loss,leaveLevel,reportBefore,dock,labels,dockHTML,bindDock,openLog,map,draw,drawHarbour,drawEncounter,pauseReset,state:stateCopy,spawnDrone,startEvent,
      fixture(fn){fn(state());build();},info:()=>({names:NAMES,rewards:REWARDS})};
  }
  window.AbyssRescue=Object.freeze({buildId,normalise,valid,validateCampaign,create});
})();
