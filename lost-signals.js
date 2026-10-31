/* Lost Signals: data-only narrative and bounded local backup format.
   Backups are portable JSON, not encrypted, cloud-synchronised or cheat-proof. */
(() => {
  'use strict';
  const buildId='0.25.0-the-living-abyss-1';
  const levels=['sunbreak-shelf','glassbone-rift','drowned-gardens','midnight-cathedral','calypso-abyss'];
  const lengths=[2,3,4,5,6];
  const chapters=['The wrong timestamp','Something in the walls','An ocean that remembers','The listening chamber','The other end of the call'];
  const records=[
    ['Routine maintenance','ENGINEER MARA VENN · DAY 01',
      'The Shelf beacon is losing four seconds every hour. Nothing dramatic. A corroded reference crystal, probably. I have asked Calypso to send a clean clock pulse.\n\nSomeone has already answered. Three rising notes, then a voice asking us to keep the receiver open. Calypso says their transmitter is still in its shipping crate.'],
    ['An earlier emergency','DISPATCHER IONA REED · DAY 03',
      'At 06:14 every station received the same distress call: "Do not shut the listening array down. There are people inside." We logged it as interference until the checksum matched a packet in our commissioning archive.\n\nThat packet was recorded eleven days before construction began. The director wants the timestamps corrected. I am keeping both copies.'],
    ['Glassbone','GEOLOGIST DR SEN KORA · DAY 06',
      'The pale ribs are not glass. Under pressure the mineral layers store mechanical vibration and release it in order. A natural recording medium, larger than any instrument we brought.\n\nWe pinged the east wall this morning. It returned yesterday’s ping, followed by our own voices. We had not spoken into the hydrophone.'],
    ['Missing hours','ENGINEER MARA VENN · DAY 08',
      'Our navigation network takes its time from Calypso. Calypso takes its time from the crystal seam. You can see the problem.\n\nThe "old" distress packet is not proof of a message from the future. It is proof that our clocks have been trusting the thing we are trying to measure. An independent mechanical clock is on its way down.'],
    ['A map of quiet places','SURVEY PILOT ADA SLOANE · DAY 09',
      'The miners left charges along the fracture. Please stop calling them unexploded salvage. Give the chains room.\n\nThere is a route west of the main ribs where the echo falls away. Small fish gather there. Whatever is happening below, they seem to know where the water is quiet. I have marked the route for the evacuation boats.'],
    ['The garden listens','BIOLOGIST NELL ARDEN · DAY 11',
      'The colonies close before a pressure pulse reaches our instruments. Their roots run through the seam; each colony is a little receiver.\n\nNo mind is speaking to us. Not yet. But the ocean is carrying impressions of things that happened elsewhere, and the gardens are responding. I wish the company would find that extraordinary enough.'],
    ['The demonstration','DIRECTOR HALDEN ROE · DAY 12',
      'A continuous model of an entire sea. No cables. No moving parts. Every vibration stored and retrievable. That was the proposal.\n\nThe investors asked for a voice. I played them the distress fragment and told them it was a controlled test. I am recording this because I want the person who finds it to know exactly where the lie began.'],
    ['Three notes','DISPATCHER IONA REED · DAY 13',
      'The three rising notes are our evacuation beacon, stretched by pressure. The voice belongs to Mara. She is alive. She has not said those words.\n\nThe independent clock agrees with our surface clock. The message is not old. It is repeating along paths of different lengths, then entering a network that has assigned every repeat the wrong date. A very convincing haunting.'],
    ['Turn it down','BIOLOGIST NELL ARDEN · DAY 14',
      'The amplification test is frightening the animals. They leave the gardens in waves. The large hunters follow the noise, not the lights.\n\nI asked for silence and received a revised schedule. We are building a loudspeaker in a habitat we barely understand. The gardens close every time it charges. They are not applauding.'],
    ['The cathedral','SURVEY PILOT ADA SLOANE · DAY 15',
      'The chamber is natural. The columns are the old seam folded back into itself. We bolted our listening equipment to the only part that was still growing.\n\nSomething very large lives in the outer passage. It waits, listens, then commits to one violent line. When it misses, it has to turn its whole body. I came back with paint missing, but I came back.'],
    ['Do not wake it','ENGINEER MARA VENN · DAY 15',
      'The observation buoy is on a separate circuit. Leave it alone unless you intend to meet the resident. Its test sequence sounds like a wounded animal.\n\nThere is nothing beyond that creature we need for evacuation. No recorder, no crystal quota. Curiosity is a choice. Please make it while you still have enough air to choose differently.'],
    ['Inside','ENGINEER MARA VENN · DAY 16',
      'The elevator gates have lost power. Six of us are behind the inner maintenance bulkhead. The emergency release is driven by the listening array’s return circuit.\n\nDo not shut the listening array down. There are people inside.\n\nThere. Now I have said it. Send that on the independent channel. Do not let another broken timestamp bury it.'],
    ['The wrong rescue','DIRECTOR HALDEN ROE · DAY 16',
      'Surface control believed the call was an old test and ordered the array isolated. I signed the test report that convinced them.\n\nAda has gone below with a battery tow. I have opened every gate I can still reach. There is no elegant technical explanation for what I did. When the logs are recovered, leave my name on this one.'],
    ['Last boat upward','SURVEY PILOT ADA SLOANE · DAY 17',
      'Six passengers. One spare battery. Far too much weight. Mara is taking the pump apart with a dinner knife and telling me to stop watching the depth gauge.\n\nWe are clear of the chamber. Calypso is still calling. Not because someone is trapped there now, but because we taught the stone to repeat an emergency. The animals do not know the difference.'],
    ['Calypso control','ENGINEER MARA VENN · AFTER EVACUATION',
      'Everyone from the inner bulkhead reached the surface. I am making this clear before the rest: everyone.\n\nThe array remains in automatic repetition. Cutting its power at the top would leave the pressure bank cycling for months. We need the original calibration records to identify the safe release sequence. They are spread across five stations.'],
    ['A stored ocean','GEOLOGIST DR SEN KORA · AFTER EVACUATION',
      'The seam stores impressions, not souls. It cannot distinguish a distress call from a passing shoal. We can choose what our machines amplify.\n\nThe quieting sequence does not erase the reef. It removes our repeating signal and lets the mineral return to its own slow conversation. That distinction matters.'],
    ['The cost of a signal','BIOLOGIST NELL ARDEN · AFTER EVACUATION',
      'We have a count of the people who survived. We do not have a count of the migrations we interrupted, or the hunting grounds we displaced.\n\nWhen you return, watch the small fish. If they have begun to settle, that will tell us something the company’s dashboard cannot. You do not need to collect them. Let a living thing be enough.'],
    ['A pilot named Nereid','SURVEY PILOT ADA SLOANE · RECOVERY BRIEF',
      'They are fitting a little survey boat for the recorder run. NEREID. Narrow enough for the old service passages, stubborn enough for the pressure.\n\nThe pilot will get a list of equipment and a very tidy map. Tell them maps do not bring you home. Knowing when to turn around does. And leave a little room for the joy of seeing something no one else has seen.'],
    ['The release sequence','DISPATCHER IONA REED · RECOVERY BRIEF',
      'Twenty recorders carry the independent timing references. Together they let the harbour transmitter separate the real call from its returning copies.\n\nNo final switch in a monster’s mouth. No heroic sacrifice. Bring the records home, let the calibration finish, and we can stop asking the water to remember our worst day.'],
    ['Open water','ENGINEER MARA VENN · RECOVERY COMPLETE',
      'The correction is accepted. The repeaters are winding down. For the first time in weeks, the receiver has nothing urgent to say.\n\nThank you for bringing our voices back in the right order. The research stations can wait. There is still an ocean outside them.\n\nNEREID, you are free to explore.']
  ].map(([title,speaker,text],i)=>{
    let chapter=0,n=i;while(n>=lengths[chapter])n-=lengths[chapter++];
    return Object.freeze({id:levels[chapter]+':'+n,levelId:levels[chapter],index:n,number:i+1,chapter:chapters[chapter],title,speaker,text});
  });
  const kinds=Object.freeze({cargo:{title:'LOST CARGO',verb:'Recover the sealed container with USE, then return to the dock.',hint:'Sonar reveals the container. The chart marks a search area, not its exact location.'},survey:{title:'SURVEY EXPEDITION',verb:'Reach and sonar-scan all three survey buoys, then return.',hint:'A scan counts when its wave reaches the buoy from within 20 m.'},hunt:{title:'PREDATOR CONTROL',verb:'Neutralise the assigned predator tier in this level, then return.',hint:'Only your kills count. Buy sufficient ammunition before departure.'},silent:{title:'SILENT RECOVERY',verb:'Recover the research package with USE without boosting within 25 m of it.',hint:'The quiet zone is marked on your chart. Boost inside it and you must retry at the dock.'}});
  const number=v=>Number.isFinite(v)?Math.max(0,Math.floor(v)):0;
  const fresh=()=>({schema:1,boards:{},active:null,completed:0,earned:0,warden:{site:null,health:1200,activated:false,discovered:false,defeated:false,pending:false,claimed:false,livery:'standard'}});
  function normalise(value){
    const out=fresh();if(value?.schema!==1)return out;
    const point=p=>p&&Number.isFinite(p.x)&&p.x>-1200&&p.x<2400&&Number.isFinite(p.y)&&p.y>=400&&p.y<=18100;
    const contract=c=>c&&typeof c.id==='string'&&/^[a-z0-9-]{1,80}$/.test(c.id)&&kinds[c.kind]&&levels.includes(c.levelId)&&Number.isInteger(c.reward)&&c.reward>0&&c.reward<=1500&&Array.isArray(c.points)&&c.points.length<=3&&c.points.every(point)&&['active','return','retry'].includes(c.status||'active');
    const clean=c=>({id:c.id,kind:c.kind,levelId:c.levelId,reward:c.reward,maxDepth:Math.min(1800,number(c.maxDepth)),
      points:c.points.map((p,i)=>({x:p.x,y:p.y,id:/^[a-z0-9-]{1,80}$/.test(p.id||'')?p.id:'assignment-point-'+i,done:p.done===true,located:p.located===true,
        searchX:Number.isFinite(p.searchX)&&Math.abs(p.searchX)<3000?p.searchX:p.x,searchY:Number.isFinite(p.searchY)&&p.searchY>=300&&p.searchY<=18100?p.searchY:p.y})),
      required:c.kind==='hunt'?Math.max(2,Math.min(3,number(c.required))):c.points.length,kills:Math.min(3,number(c.kills)),tier:['common','apex'].includes(c.tier)?c.tier:'common',status:['active','return','retry'].includes(c.status)?c.status:'active'});
    for(const levelId of levels){const b=value.boards?.[levelId];if(b&&Number.isInteger(b.serial)&&b.serial>0&&b.serial<1e6)out.boards[levelId]={serial:b.serial,offers:Array.isArray(b.offers)?b.offers.filter(c=>contract(c)&&c.levelId===levelId).slice(0,3).map(clean):[]};}
    if(contract(value.active))out.active=clean(value.active);
    out.completed=number(value.completed);out.earned=number(value.earned);
    const w=value.warden||{};out.warden={site:point(w.site)?{x:w.site.x,y:w.site.y}:null,health:Number.isFinite(w.health)?Math.max(0,Math.min(1200,w.health)):1200,activated:w.activated===true,discovered:w.discovered===true,defeated:w.defeated===true,pending:w.pending===true,claimed:w.claimed===true,livery:w.claimed&&w.livery==='hunter'?'hunter':'standard'};
    if(out.warden.defeated){out.warden.health=0;out.warden.activated=false;}
    return out;
  }
  // Integrity detects damaged/truncated files, not intentional save editing.
  function checksum(text){let h=2166136261;for(let i=0;i<text.length;i++)h=Math.imul(h^text.charCodeAt(i),16777619);return (h>>>0).toString(16).padStart(8,'0');}
  const maxBytes=12*1024*1024;
  function validateCampaign(data){
    const fail=message=>{throw Error(message);};
    if(!data||data.schema!==3||!data.profile||!data.levels||!levels.includes(data.selectedLevel))fail('Not a supported campaign save.');
    let count=0;function walk(v,depth){if(depth>24||++count>450000)fail('Backup is too complex.');if(typeof v==='number'&&!Number.isFinite(v))fail('Invalid numeric data.');if(typeof v==='string'&&v.length>20000)fail('Invalid text field.');if(v&&typeof v==='object'){if(Array.isArray(v)&&v.length>20000)fail('Backup array is too large.');for(const k of Object.keys(v)){if(['__proto__','prototype','constructor'].includes(k))fail('Unsafe field in backup.');walk(v[k],depth+1);}}}walk(data,0);
    const p=data.profile,counts=['credits','crystals','xp','bestDepth','mineAmmo'];for(const k of counts)if(!Number.isInteger(p[k])||p[k]<0||p[k]>1e9)fail('Invalid campaign balance: '+k);
    const limits={hull:7,oxygen:5,battery:5,engine:4,sonar:4,quiet:4,minePower:4,mineCapacity:4,flashlight:4,magnet:4,shield:4,disruptor:4,railgun:4,torpedo:4};
    for(const [k,max]of Object.entries(limits))if(!Number.isInteger(p.upgrades?.[k])||p.upgrades[k]<(['flashlight','mineCapacity'].includes(k)?1:0)||p.upgrades[k]>max)fail('Invalid upgrade: '+k);
    if(!['railgun','torpedo'].every(k=>Number.isInteger(p.weaponAmmo?.[k])&&p.weaponAmmo[k]>=0&&p.weaponAmmo[k]<100))fail('Invalid weapon ammunition.');
    if(p.mineAmmo>Math.max(3,[0,2,4,6,8][p.upgrades.mineCapacity])||p.weaponAmmo.railgun>Math.max(10,[0,12,18,24,32][p.upgrades.railgun])||p.weaponAmmo.torpedo>Math.max(3,[0,3,4,6,8][p.upgrades.torpedo]))fail('Ammunition exceeds fitted capacity.');
    let fieldCount=0;for(const [id,f]of Object.entries(data.levels)){
      const i=levels.indexOf(id);if(i<0||f?.schema!==3||!Number.isInteger(f.seed)||f.seed<0||f.seed>0xffffffff||!Number.isInteger(f.cycle)||f.cycle<0)fail('Invalid level record.');
      if(!Array.isArray(f.loot)||!f.loot.length||f.loot.length>3000||!Array.isArray(f.looted)||!Array.isArray(f.secured)||!f.secured.every(v=>Number.isInteger(v)&&v>=0&&v<lengths[i])||new Set(f.secured).size!==f.secured.length)fail('Invalid level resources or recorders.');
      if(f.batteryCells!=null){
        const b=f.batteryCells;
        if(b.version!==1||!Array.isArray(b.nodes)||b.nodes.length>7||!Number.isFinite(b.elapsed)||b.elapsed<0||!Number.isFinite(b.nextSpawnAt)||b.nextSpawnAt<0||!b.due||typeof b.due!=='object')fail('Invalid battery cell state.');
        if(!b.nodes.every(n=>typeof n.id==='string'&&/^battery-[0-6]$/.test(n.id)&&Number.isFinite(n.x)&&n.x>=-2440&&n.x<=3640&&Number.isFinite(n.y)&&n.y>=500&&n.y<=17900)||new Set(b.nodes.map(n=>n.id)).size!==b.nodes.length)fail('Invalid battery cell layout.');
        if(Object.entries(b.due).some(([id,t])=>!b.nodes.some(n=>n.id===id)||!Number.isFinite(t)||t<0||t>b.elapsed+480.01))fail('Invalid battery cell recharge timer.');
      }
      if(!f.loot.every(n=>typeof n.id==='string'&&/^loot-\d+$/.test(n.id)&&['scrap','crystal','air'].includes(n.type)&&Number.isFinite(n.x)&&Math.abs(n.x)<3000&&Number.isFinite(n.y)&&n.y>=58&&n.y<=18120&&Number.isInteger(n.quantity)&&n.quantity>=1&&n.quantity<=100)||new Set(f.loot.map(n=>n.id)).size!==f.loot.length)fail('Invalid resource layout.');
      for(const key of ['drops','recoveries'])if(!Array.isArray(f[key])||f[key].length>6000)fail('Invalid recovery data.');
      const ids=new Set(),heldRecorders=new Set(f.secured);
      for(const r of f.recoveries){
        if(!r||typeof r.id!=='string'||!/^recovery-/.test(r.id)||ids.has(r.id)||!Number.isFinite(r.x)||(r.x<-4800||r.x>6000)||!Number.isFinite(r.y)||r.y<58||r.y>18120||!['scrap','crystal'].every(k=>Number.isInteger(r[k])&&r[k]>=0&&r[k]<=1e9))fail('Invalid recovery manifest.');
        ids.add(r.id);
        if(r.recorders!==undefined&&(!Array.isArray(r.recorders)||!r.recorders.every(n=>Number.isInteger(n)&&n>=0&&n<lengths[i])||new Set(r.recorders).size!==r.recorders.length))fail('Invalid recovery recorders.');
        for(const n of r.recorders||[]){if(heldRecorders.has(n))fail('A recorder has more than one owner.');heldRecorders.add(n);}
      }
      if(f.pendingCargo?.recorders!==undefined&&(!Array.isArray(f.pendingCargo.recorders)||new Set(f.pendingCargo.recorders).size!==f.pendingCargo.recorders.length||!f.pendingCargo.recorders.every(n=>Number.isInteger(n)&&n>=0&&n<lengths[i]&&!heldRecorders.has(n))))fail('Invalid pending recorders.');
      if(data.activeDive?.levelId===id){
        const carried=data.activeDive.player?.cargo?.recorders;
        if(!Array.isArray(carried)||new Set(carried).size!==carried.length||carried.some(n=>heldRecorders.has(n)))fail('Duplicate active recorder ownership.');
        const pods=data.activeDive.items?.filter(n=>n.type==='recovery'&&!n.collected)||[];
        if(pods.length!==f.recoveries.length||new Set(pods.map(n=>n.id)).size!==pods.length)fail('Dive recovery manifest is inconsistent.');
        for(const pod of pods){const r=f.recoveries.find(n=>n.id===pod.id);if(!r||pod.scrap!==r.scrap||pod.crystal!==r.crystal||JSON.stringify(pod.recorders||[])!==JSON.stringify(r.recorders||[]))fail('Dive recovery manifest is inconsistent.');}
      }
      fieldCount++;
    }
    if(!fieldCount||!data.levels[data.selectedLevel])fail('Selected level is missing.');
    for(let i=0;i<levels.indexOf(data.selectedLevel);i++)if(data.levels[levels[i]]?.secured.length!==lengths[i])fail('Selected level is not unlocked.');
    if(data.activeDive){const a=data.activeDive,q=a.player;if(a.schema!==1||a.levelId!==data.selectedLevel||a.seed!==data.levels[a.levelId].seed||a.cycle!==data.levels[a.levelId].cycle||!q||!['x','y','vx','vy','facing','hull','oxygen','battery','boost','mineAmmo'].every(k=>Number.isFinite(q[k]))||q.hull<=0)fail('Invalid active dive.');
      if(q.repairReady!==undefined&&typeof q.repairReady!=='boolean')fail('Invalid emergency repair state.');
      if(q.mineAmmo!==p.mineAmmo||!['railgun','torpedo'].every(k=>q.weaponAmmo?.[k]===p.weaponAmmo[k]))fail('Dive ammunition is inconsistent.');
      for(const k of ['items','predators','mines','blasts','waves','echoes','terrain'])if(!Array.isArray(a[k])||a[k].length>6000)fail('Incomplete active dive.');
      if(!q.cargo||!['scrap','crystal'].every(k=>Number.isInteger(q.cargo[k])&&q.cargo[k]>=0)||!Array.isArray(q.cargo.recorders)||!q.cargo.recorders.every(i=>Number.isInteger(i)&&i>=0&&i<lengths[levels.indexOf(a.levelId)]))fail('Invalid dive cargo.');
      if(!a.items.every(n=>Number.isFinite(n.x)&&Number.isFinite(n.y)&&['scrap','crystal','air','recorder','recovery','battery'].includes(n.type)))fail('Invalid dive items.');
      if(!a.predators.every(n=>['common','apex','reaper','warden'].includes(n.tier)&&Number.isFinite(n.x)&&Number.isFinite(n.y)&&Number.isFinite(n.health)))fail('Invalid dive contacts.');
      if(!Number.isFinite(a.clock)||a.clock<0||q.x<-4800||q.x>6000||q.y<-2000||q.y>120+[300,600,1000,1400,1800][levels.indexOf(a.levelId)]*10+10)fail('Dive position or clock is invalid.');
      const guidanceValid=o=>(o.targetId==null||typeof o.targetId==='string'&&o.targetId.length<=100||Number.isInteger(o.targetId)&&o.targetId>=0&&o.targetId<=1e9)&&['launchHeading','originX','originY','heading','vx','vy'].every(k=>o[k]===undefined||Number.isFinite(o[k])&&Math.abs(o[k])<=100000);
      if(!a.mines.every(m=>Number.isFinite(m.x)&&Number.isFinite(m.y)&&Number.isFinite(m.armedAt)&&Number.isFinite(m.damage)&&m.damage>=0&&guidanceValid(m)))fail('Invalid mine checkpoint.');
      if(!a.waves.every(w=>Number.isFinite(w.x)&&Number.isFinite(w.y)&&Number.isFinite(w.birth)&&Number.isFinite(w.radius)&&Array.isArray(w.contacts)&&w.contacts.every(c=>['items','predators','rocks','wrecks','vents','mines','landmarks','derelictMines','ventFields','schools','signals','giantObjects','rescueObjects','livingCreatures','wall','floor'].includes(c.kind)&&typeof c.hit==='boolean')))fail('Invalid sonar checkpoint.');
      if(a.projectiles&&(!Array.isArray(a.projectiles)||a.projectiles.length>200||!a.projectiles.every(o=>['railgun','torpedo'].includes(o.kind)&&['x','y','vx','vy','damage','remaining','radius'].every(k=>Number.isFinite(o[k]))&&o.damage>0&&o.remaining>=0&&guidanceValid(o))))fail('Invalid projectile checkpoint.');
      for(const e of a.predators){
        if(e.behaviour!==undefined&&!['ordinary','pack','ambush','interceptor'].includes(e.behaviour))fail('Invalid predator behaviour.');
        if(!['seenX','seenY','seenVX','seenVY','seenAt','huntLeft','rushAngle','previousX','previousY'].every(k=>e[k]===undefined||Number.isFinite(e[k])&&Math.abs(e[k])<1e9))fail('Invalid predator memory.');
        if(e.huntPhase!==undefined&&!['idle','windup','rush','retreat','recover'].includes(e.huntPhase))fail('Invalid ambush phase.');
        if(e.packIndex!==undefined&&(!Number.isInteger(e.packIndex)||e.packIndex<0||e.packIndex>2))fail('Invalid predator pack.');
        if(e.packId!==undefined&&(typeof e.packId!=='string'||!/^pack-\d+$/.test(e.packId)))fail('Invalid predator pack.');
      }
      for(const e of a.predators)if(e.tier==='warden'&&(!['listen','windup','charge','recover'].includes(e.wardenPhase)||!['homeX','homeY','phaseLeft','heading','aimX','aimY'].every(k=>Number.isFinite(e[k]))))fail('Invalid Warden checkpoint.');
      if(a.signals&&(!Array.isArray(a.signals)||a.signals.length>5||!a.signals.every(o=>['contract-package','survey-buoy','warden-site'].includes(o.kind)&&Number.isFinite(o.x)&&Number.isFinite(o.y))))fail('Invalid assignment checkpoint.');
      if(a.events&&!a.events.every(e=>typeof e==='string'&&e.length<300&&!/[<>]/.test(e)))fail('Invalid event log.');
    }
    window.AbyssGiants?.validateBackup(data);window.AbyssRescue?.validateCampaign(data);window.AbyssLiving?.validateCampaign(data);
    return true;
  }
  function pack(payload,version='0.25.0'){
    validateCampaign(payload);const text=JSON.stringify(payload);
    return JSON.stringify({format:'the-abyss-below/campaign',formatVersion:1,gameVersion:version,exportedAt:new Date().toISOString(),integrity:{algorithm:'fnv1a32',value:checksum(text)},payload},null,2);
  }
  function unpack(text){
    if(typeof text!=='string'||text.length>maxBytes)throw Error('Choose a campaign backup smaller than 12 MB.');
    let file;try{file=JSON.parse(text);}catch(_){throw Error('The file is not valid JSON. Your campaigns have not changed.');}
    if(file?.format!=='the-abyss-below/campaign'||file.formatVersion!==1)throw Error('Not a supported Abyss Below campaign export.');
    if(!/^0\.\d+\.\d+$/.test(file.gameVersion||'')||Number(file.gameVersion.split('.')[1])>Number(buildId.split('.')[1]))throw Error('This backup requires a newer game version.');
    if(file.integrity?.algorithm!=='fnv1a32'||file.integrity.value!==checksum(JSON.stringify(file.payload)))throw Error('Backup integrity check failed. Nothing was imported.');
    validateCampaign(file.payload);return {payload:file.payload,gameVersion:file.gameVersion,exportedAt:file.exportedAt};
  }
  window.AbyssSignals=Object.freeze({buildId,levels,chapters,records,kinds,fresh,normalise,pack,unpack,validateCampaign,maxBytes});
})();
