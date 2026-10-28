/* Forgotten Giants: campaign discoveries and declarative wreck geometry.
 * Data and validation are separate from simulation so exports can be checked
 * without constructing a game or changing any finite resource placements.
 */
(() => {
  'use strict';
  const buildId='0.19.0-forgotten-giants-1';
  const vessels=Object.freeze([
    {id:'wayfarer',level:'sunbreak-shelf',name:'THE WAYFARER',kind:'COASTAL FREIGHTER',depth:190,side:-1,w:620,h:340,color:'#edaa75',finish:'RESCUE ORANGE',palette:['#ffdbc0','#cf7945','#744a36','#f0e5d4'],rooms:['FORWARD STORES','CARGO HOLD','SERVICE DECK'],story:'The Wayfarer never carried scientists. Her manifest lists food, spare filters and letters from home. When the coastal evacuation began, the captain emptied the forward hold for passengers and turned back towards the research harbour. A hand-painted arrow still points to the emergency exit. The last entry in her log contains no coordinates, only: "Room for twelve more."'},
    {id:'prospector-nine',level:'glassbone-rift',name:'PROSPECTOR NINE',kind:'MINERAL SURVEY VESSEL',depth:430,side:1,w:700,h:380,color:'#d5bc60',finish:'INDUSTRIAL GRAPHITE',palette:['#d5dce3','#646f7a','#303d49','#efce67'],rooms:['PROCESSING BAY','ORE TRANSFER','CREW ACCESS'],story:'Prospector Nine mapped the fractures before the research stations existed. Her cutters were shut down from the bridge, not by a power failure. Scored into a maintenance plate is a sketch of a repeating waveform beside the words "not a bearing fault". The crew left every floodlight facing the same empty stretch of water.'},
    {id:'verdant',level:'drowned-gardens',name:'THE VERDANT',kind:'BIOLOGICAL RESEARCH SHIP',depth:760,side:-1,w:760,h:420,color:'#87d7b5',finish:'GARDEN GREEN',palette:['#c5ead5','#518774','#234e49','#8ae5ce'],rooms:['OBSERVATION LAB','SPECIMEN TRANSIT','FIELD STATION'],story:'The Verdant studied how living things adapt to darkness. Now kelp occupies her observation rooms and fish pass through the laboratory windows. One intact label reads "CONTROL GROUP: NO SIGNAL EXPOSURE". The tank behind it is empty. Beside the crew names, someone has added the names of every specimen released before the evacuation.'},
    {id:'halcyon',level:'midnight-cathedral',name:'STATION HALCYON',kind:'SUBMERGED HABITAT',depth:1110,side:1,w:800,h:440,color:'#bda9df',finish:'HALCYON PEARL',palette:['#ede9f5','#b3aec3','#555574','#bba5ed'],rooms:['HABITATION RING','TRANSFER HALL','SERVICE TRUNK'],story:'Halcyon was designed to make long assignments feel ordinary: a dining room, a tiny greenhouse, a library of borrowed books. The emergency bulkhead was opened manually from the inside. The identification plate carries thirty-one crew names and a thirty-second line scratched by hand: "Whoever comes looking, please take this home."'},
    {id:'atlas',level:'calypso-abyss',name:'THE ATLAS',kind:'EXPEDITION CARRIER',depth:1600,side:-1,w:880,h:500,color:'#8ebcd8',finish:'ATLAS MIDNIGHT',palette:['#abc9e6','#425e80','#1d344e','#98d9ee'],rooms:['EXPEDITION ARCHIVE','VEHICLE HANGAR','COMMAND RELAY'],story:'The Atlas brought the first habitats into the trench. Her cargo bay contains mounting points for every station you have visited. The final shipment was never unloaded. A sealed dispatch is addressed to the surface with a simple instruction: "Do not send another expedition until you know which voice is ours." Her nameplate is heavy, intact, and still cold when brought aboard.'}
  ]);
  const ids=new Set(vessels.map(v=>v.id));
  const plates=value=>Array.isArray(value)?[...new Set(value.filter(id=>ids.has(id)))]:[];
  const fresh=()=>({version:1,banked:[],livery:'standard',sites:{}});
  function normalise(value){
    const out=fresh();if(!value||value.version!==1)return out;
    out.banked=plates(value.banked);
    out.livery=out.banked.includes(value.livery)?value.livery:'standard';
    for(const v of vessels){const s=value.sites?.[v.id];if(s)out.sites[v.id]={discovered:s.discovered===true,scanned:s.scanned===true||s.opened===true,opened:s.opened===true};}
    return out;
  }
  function validateBackup(data){
    const fail=msg=>{throw Error(msg);};
    const value=data.giants;if(!value)return true;
    if(value.version!==1||!Array.isArray(value.banked)||plates(value.banked).length!==value.banked.length)fail('Invalid discovery archive.');
    if(value.livery!=='standard'&&!value.banked.includes(value.livery))fail('Hull finish has not been recovered.');
    if(!value.sites||typeof value.sites!=='object')fail('Invalid wreck survey data.');
    for(const [id,s] of Object.entries(value.sites))if(!ids.has(id)||!s||!['discovered','scanned','opened'].every(k=>typeof s[k]==='boolean')||s.opened&&!s.scanned)fail('Invalid wreck shortcut state.');
    const owned=new Set(value.banked);
    const take=(list,where)=>{if(list===undefined)return;if(!Array.isArray(list)||plates(list).length!==list.length)fail('Invalid identification plates in '+where);for(const id of list){if(owned.has(id))fail('An identification plate has more than one owner.');owned.add(id);}};
    for(const [level,f] of Object.entries(data.levels||{})){
      for(const r of f.recoveries||[])take(r.plates,'recovery manifest');
      if(data.activeDive?.levelId!==level)take(f.pendingCargo?.plates,'pending cargo');
    }
    if(data.activeDive){take(data.activeDive.player?.cargo?.plates,'active cargo');
      const f=data.levels[data.activeDive.levelId];
      if(JSON.stringify(plates(f.pendingCargo?.plates))!==JSON.stringify(plates(data.activeDive.player?.cargo?.plates)))fail('Pending identification plates do not match the active dive.');
      for(const pod of data.activeDive.items.filter(i=>i.type==='recovery'&&!i.collected)){
        const r=f.recoveries.find(r=>r.id===pod.id);if(JSON.stringify(plates(pod.plates))!==JSON.stringify(plates(r?.plates)))fail('Recovery identification plates are inconsistent.');
      }
    }
    return true;
  }
  window.AbyssGiants=Object.freeze({buildId,vessels,plates,fresh,normalise,validateBackup});
})();
