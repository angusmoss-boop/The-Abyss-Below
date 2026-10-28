/* Forgotten Giants: campaign discoveries and declarative wreck geometry.
 * Data and validation are separate from simulation so exports can be checked
 * without constructing a game or changing any finite resource placements.
 */
(() => {
  'use strict';
  const buildId='0.24.0-nereid-reforged-1';
  const vessels=Object.freeze([
    {id:'wayfarer',level:'sunbreak-shelf',name:'THE WAYFARER',kind:'COASTAL FREIGHTER',depth:190,side:-1,w:1340,h:740,color:'#edaa75',finish:'RESCUE ORANGE',palette:['#ffdbc0','#cf7945','#744a36','#f0e5d4'],rooms:['FORWARD STORES','CARGO HOLD','SERVICE DECK'],story:'The Wayfarer never carried scientists. Her manifest lists food, spare filters and letters from home. When the coastal evacuation began, the captain emptied the forward hold for passengers and turned back towards the research harbour. A hand-painted arrow still points to the emergency exit. The last entry in her log contains no coordinates, only: "Room for twelve more."'},
    {id:'prospector-nine',level:'glassbone-rift',name:'PROSPECTOR NINE',kind:'MINERAL SURVEY VESSEL',depth:430,side:1,w:1480,h:820,color:'#d5bc60',finish:'INDUSTRIAL GRAPHITE',palette:['#d5dce3','#646f7a','#303d49','#efce67'],rooms:['PROCESSING BAY','ORE TRANSFER','CREW ACCESS'],story:'Prospector Nine mapped the fractures before the research stations existed. Her cutters were shut down from the bridge, not by a power failure. Scored into a maintenance plate is a sketch of a repeating waveform beside the words "not a bearing fault". The crew left every floodlight facing the same empty stretch of water.'},
    {id:'verdant',level:'drowned-gardens',name:'THE VERDANT',kind:'BIOLOGICAL RESEARCH SHIP',depth:760,side:-1,w:1660,h:920,color:'#87d7b5',finish:'GARDEN GREEN',palette:['#c5ead5','#518774','#234e49','#8ae5ce'],rooms:['OBSERVATION LAB','SPECIMEN TRANSIT','FIELD STATION'],story:'The Verdant studied how living things adapt to darkness. Now kelp occupies her observation rooms and fish pass through the laboratory windows. One intact label reads "CONTROL GROUP: NO SIGNAL EXPOSURE". The tank behind it is empty. Beside the crew names, someone has added the names of every specimen released before the evacuation.'},
    {id:'halcyon',level:'midnight-cathedral',name:'STATION HALCYON',kind:'SUBMERGED HABITAT',depth:1110,side:1,w:1840,h:1020,color:'#bda9df',finish:'HALCYON PEARL',palette:['#ede9f5','#b3aec3','#555574','#bba5ed'],rooms:['HABITATION RING','TRANSFER HALL','SERVICE TRUNK'],story:'Halcyon was designed to make long assignments feel ordinary: a dining room, a tiny greenhouse, a library of borrowed books. The emergency bulkhead was opened manually from the inside. The identification plate carries thirty-one crew names and a thirty-second line scratched by hand: "Whoever comes looking, please take this home."'},
    {id:'atlas',level:'calypso-abyss',name:'THE ATLAS',kind:'EXPEDITION CARRIER',depth:1600,side:-1,w:2000,h:1120,color:'#8ebcd8',finish:'ATLAS MIDNIGHT',palette:['#abc9e6','#425e80','#1d344e','#98d9ee'],rooms:['EXPEDITION ARCHIVE','VEHICLE HANGAR','COMMAND RELAY'],story:'The Atlas brought the first habitats into the trench. Her cargo bay contains mounting points for every station you have visited. The final shipment was never unloaded. A sealed dispatch is addressed to the surface with a simple instruction: "Do not send another expedition until you know which voice is ours." Her nameplate is heavy, intact, and still cold when brought aboard.'}
  ]);
  // Explicit room topology: every pressure chamber has an honest collider.
  // Coordinates are local to the hull; positive X faces the main trench.
  const strongholdNames = [
    ['COLD STORES','MANIFEST OFFICE','FORWARD GALLERY','ID VAULT','CARGO TRANSFER','FLOODED FOYER','BALLAST CONTROL','ENGINE ROOM','SERVICE DOCK'],
    ['DRILL CONTROL','ORE TRANSFER','CUTTER GALLERY','SURVEY VAULT','CRUSHER HALL','BREACHED INTAKE','COOLANT CONTROL','TURBINE ROOM','SERVICE DOCK'],
    ['SPECIMEN CONTROL','OBSERVATION LAB','KELP GALLERY','BIOLOGICAL VAULT','CULTURE HALL','FIELD AIRLOCK','HABITAT CONTROL','FILTER ROOM','SERVICE DOCK'],
    ['HABITATION CONTROL','CREW QUARTERS','OBSERVATION RING','STATION VAULT','TRANSFER HALL','ARRIVAL MODULE','LIFE SUPPORT','REACTOR ROOM','SERVICE DOCK'],
    ['COMMAND CONTROL','EXPEDITION ARCHIVE','VEHICLE GALLERY','CARRIER VAULT','LAUNCH HALL','HANGAR AIRLOCK','REACTOR CONTROL','DRIVE CHAMBER','SERVICE DOCK']
  ];
  const defaults=()=>({layout:2,relayScans:[false,false],relays:[false,false],guardHealth:{},hazardClock:0,hazardHits:{},alarm:false});
  function site(value={}){
    const o={discovered:value.discovered===true,scanned:value.scanned===true||value.opened===true,opened:value.opened===true,...defaults()};
    if(value.layout===2){
      for(const key of ['relayScans','relays'])if(Array.isArray(value[key]))o[key]=[value[key][0]===true,value[key][1]===true];
      o.relays.forEach((done,i)=>{if(done)o.relayScans[i]=true;});
      o.hazardClock=Number.isFinite(value.hazardClock)?Math.max(0,Math.min(1e9,value.hazardClock)):0;
      o.guardHealth=Object.fromEntries(Object.entries(value.guardHealth||{}).filter(([k,v])=>/^guard-[0-7]$/.test(k)&&Number.isFinite(v)&&v>=0&&v<=1000));
      o.hazardHits=Object.fromEntries(Object.entries(value.hazardHits||{}).filter(([k,v])=>/^trap-[0-7]$/.test(k)&&Number.isFinite(v)&&v>=0&&v<=o.hazardClock));
      o.alarm=value.alarm===true;
    }
    return o;
  }
  function layout(v){
    const i=vessels.findIndex(q=>q.id===v.id),{w,h}=v,t=20,rows=[-h/3,0,h/3],cols=[-w/3,0,w/3];
    const walls=[];
    const add=(id,l,top,r,bottom,gate='')=>walls.push({id,l,top,r,bottom,gate});
    // Two escape routes: the arrival breach is always open. A service hatch
    // opens permanently from the lower deck. The vault has exactly one door.
    add('roof-a',-w/2,-h/2,w/2,-h/2+t);
    add('stern-a',-w/2,-h/2,-w/2+t,h/2);
    add('bow-a',w/2-t,-h/2,w/2,-88);add('bow-b',w/2-t,88,w/2,h/2);
    add('floor-a',-w/2,h/2-t,w/3-90,h/2);add('floor-b',w/3+90,h/2-t,w/2,h/2);
    add('escape-hatch',w/3-90,h/2-t,w/3+90,h/2,'service');
    // Horizontal decks have two wide stairs/shafts. Vault ceiling and floor
    // are solid, so there is no route around the identification vault lock.
    for(const [n,y]of [[0,-h/6],[1,h/6]]){
      let x=-w/2+t;
      for(const gap of [0,w/3]){add('deck-'+n+'-'+gap,x,y-t/2,gap-75,y+t/2);x=gap+75;}
      add('deck-'+n+'-end',x,y-t/2,w/2-t,y+t/2);
    }
    // Three bays per deck, every passage at least 140 world units (14 m).
    for(const [n,x] of [[0,-w/6],[1,w/6]]){
      let y=-h/2+t;
      rows.forEach((cy,j)=>{add('bulkhead-'+n+'-'+j,x-t/2,y,x+t/2,cy-72);y=cy+72;});
      add('bulkhead-'+n+'-end',x-t/2,y,x+t/2,h/2-t);
      if(n===0)add('vault-door',x-t/2,-72,x+t/2,72,'vault');
      else add('service-door',x-t/2,-72,x+t/2,72,'service');
    }
    const rooms=[];for(let row=0;row<3;row++)for(let col=0;col<3;col++)rooms.push({x:cols[col],y:rows[row],w:w/3-28,h:h/3-28,name:strongholdNames[i][row*3+col],row,col});
    // Small physical machinery along side walls, never in narrow passages.
    for(const [row,col]of [[0,1],[2,1],[1,1]]){
      const x=cols[col]-w/6+36,y=rows[row]+h/9-20;add('machinery-'+row,x,y,x+60,y+34);
    }
    const relays=[{x:cols[0],y:rows[0],index:0,name:'UPPER ISOLATION RELAY'},{x:cols[0],y:rows[2],index:1,name:'LOWER ISOLATION RELAY'}];
    const spots=[
      {x:w/6,y:-h/3,group:0,kind:'arc'},
      {x:0,y:h/6,group:1,kind:'jet'},
      {x:-w/6,y:h/3,group:1,kind:'arc'},
      {x:0,y:-h/6,group:0,kind:'jet'},
      {x:-w/6,y:-h/3,group:0,kind:'arc'},
      {x:w/6,y:h/3,group:1,kind:'jet'},
      {x:0,y:0,group:2,kind:'arc'}
    ];
    const traps=spots.slice(0,3+i).map((a,n)=>({...a,id:'trap-'+n,radius:a.kind==='arc'?62:74,phase:n*1.71,period:9.5-i*.45,warn:1.8,active:2.2,damage:8+i*3}));
    const positions=[
      {x:w/2+44,y:-104,tier:'common',role:'APPROACH PATROL'},
      {x:0,y:-h/3,tier:i?'apex':'common',role:'GALLERY HUNTER'},
      {x:-w/3,y:0,tier:i>=3?'reaper':i?'apex':'common',role:'VAULT GUARD'},
      {x:0,y:h/3,tier:'apex',role:'MACHINERY HUNTER'},
      {x:w/3,y:h/3,tier:'common',role:'SERVICE PATROL'},
      {x:0,y:0,tier:'reaper',role:'TRANSFER GUARD'},
      {x:w/3,y:-h/3,tier:'apex',role:'GALLERY HUNTER'},
      {x:w/2+44,y:104,tier:'reaper',role:'APPROACH PATROL'}
    ];
    const counts=[3,4,5,6,8];
    return {walls,rooms,relays,traps,guards:positions.slice(0,counts[i]).map((g,n)=>({...g,id:'guard-'+n,behaviour:g.tier==='apex'?'ambush':g.tier==='reaper'?'interceptor':'ordinary'})),
      plate:{x:-w/3,y:0},panel:{x:w/3,y:h/3},entry:{x:w/2+54,y:0},exit:{x:w/3,y:h/2+45}};
  }
  const ids=new Set(vessels.map(v=>v.id));
  const plates=value=>Array.isArray(value)?[...new Set(value.filter(id=>ids.has(id)))]:[];
  const fresh=()=>({version:1,banked:[],livery:'standard',sites:{}});
  function normalise(value){
    const out=fresh();if(!value||value.version!==1)return out;
    out.banked=plates(value.banked);
    out.livery=out.banked.includes(value.livery)?value.livery:'standard';
    for(const v of vessels){const s=value.sites?.[v.id];if(s)out.sites[v.id]=site(s);}
    return out;
  }
  function validGuard(e,level){
    if(e.wreckId===undefined&&e.guardId===undefined)return true;
    const v=vessels.find(v=>v.id===e.wreckId&&v.level===level);
    if(!v)return false;
    return layout(v).guards.some(g=>g.id===e.guardId&&g.tier===e.tier)&&e.id==='stronghold-'+v.id+'-'+e.guardId;
  }
  function validateBackup(data){
    const fail=msg=>{throw Error(msg);};
    const value=data.giants;if(!value)return true;
    if(value.version!==1||!Array.isArray(value.banked)||plates(value.banked).length!==value.banked.length)fail('Invalid discovery archive.');
    if(value.livery!=='standard'&&!value.banked.includes(value.livery))fail('Hull finish has not been recovered.');
    if(!value.sites||typeof value.sites!=='object')fail('Invalid wreck survey data.');
    for(const [id,s] of Object.entries(value.sites))if(!ids.has(id)||!s||!['discovered','scanned','opened'].every(k=>typeof s[k]==='boolean')||s.opened&&!s.scanned)fail('Invalid wreck shortcut state.');
    for(const v of Object.values(value.sites))if(v.layout!==undefined){
      if(v.layout!==2||!['relays','relayScans'].every(k=>Array.isArray(v[k])&&v[k].length===2&&v[k].every(b=>typeof b==='boolean'))||v.relays.some((b,i)=>b&&!v.relayScans[i]))fail('Invalid wreck relay state.');
      if(!Number.isFinite(v.hazardClock)||v.hazardClock<0||v.hazardClock>1e9||typeof v.alarm!=='boolean')fail('Invalid wreck hazard state.');
      if(!v.guardHealth||Object.entries(v.guardHealth).some(([k,n])=>!/^guard-[0-7]$/.test(k)||!Number.isFinite(n)||n<0||n>1000))fail('Invalid wreck defenders.');
      if(!v.hazardHits||Object.entries(v.hazardHits).some(([k,n])=>!/^trap-[0-7]$/.test(k)||!Number.isFinite(n)||n<0||n>v.hazardClock))fail('Invalid wreck hazard cooldown.');
    }
    const owned=new Set(value.banked);
    const take=(list,where)=>{if(list===undefined)return;if(!Array.isArray(list)||plates(list).length!==list.length)fail('Invalid identification plates in '+where);for(const id of list){if(owned.has(id))fail('An identification plate has more than one owner.');owned.add(id);}};
    for(const [level,f] of Object.entries(data.levels||{})){
      for(const r of f.recoveries||[])take(r.plates,'recovery manifest');
      if(data.activeDive?.levelId!==level)take(f.pendingCargo?.plates,'pending cargo');
    }
    if(data.activeDive){
      const guards=data.activeDive.predators.filter(e=>e.wreckId!==undefined||e.guardId!==undefined);
      if(guards.some(e=>!validGuard(e,data.activeDive.levelId)||e.health!==value.sites[e.wreckId]?.guardHealth[e.guardId])||new Set(guards.map(e=>e.id)).size!==guards.length)fail('Invalid wreck defender checkpoint.');
      take(data.activeDive.player?.cargo?.plates,'active cargo');
      const f=data.levels[data.activeDive.levelId];
      if(JSON.stringify(plates(f.pendingCargo?.plates))!==JSON.stringify(plates(data.activeDive.player?.cargo?.plates)))fail('Pending identification plates do not match the active dive.');
      for(const pod of data.activeDive.items.filter(i=>i.type==='recovery'&&!i.collected)){
        const r=f.recoveries.find(r=>r.id===pod.id);if(JSON.stringify(plates(pod.plates))!==JSON.stringify(plates(r?.plates)))fail('Recovery identification plates are inconsistent.');
      }
    }
    return true;
  }
  window.AbyssGiants=Object.freeze({buildId,vessels,plates,fresh,normalise,validateBackup,site,layout,validGuard});
})();
