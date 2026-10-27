/* Three isolated local campaigns. Original single-campaign saves remain read-only
   migration sources. A slot transition reloads the runtime so no world state leaks. */
(() => {
  'use strict';
  const INDEX='abyss-campaign-slots-v1', LEGACY='the-abyss-below-campaign-v3';
  const keyFor=i=>'the-abyss-below-slot-'+i+'-v1';
  const parse=text=>{try{return JSON.parse(text||'null');}catch(_){return null;}};
  const usable=v=>v?.schema===3&&v.profile&&typeof v.profile==='object'&&v.levels&&Object.values(v.levels).some(f=>Array.isArray(f?.loot)&&f.loot.length);
  const cleanName=(value,i)=>String(value||'Campaign '+i).trim().slice(0,32)||'Campaign '+i;
  let index={schema:1,active:1,titles:['Campaign 1','Campaign 2','Campaign 3']},error='',recovered=false,disabled=false,corruptActive=false;
  const get=key=>{try{return localStorage.getItem(key);}catch(_){disabled=true;error='Device storage is unavailable. Campaign switching is disabled.';return null;}};
  const put=(key,value)=>{localStorage.setItem(key,value);if(localStorage.getItem(key)!==value)throw Error('Storage verification failed');};
  let oldIndex=parse(get(INDEX));
  if(oldIndex?.schema===1&&[1,2,3].includes(oldIndex.active)){
    index={...index,active:oldIndex.active,titles:index.titles.map((n,i)=>cleanName(oldIndex.titles?.[i],i+1))};
  }else if(!disabled){
    try{
      // Import once. Never replace an existing slot, and never migrate again after deletion.
      const existing=[1,2,3].find(i=>get(keyFor(i))!==null);
      if(existing)index.active=existing;
      else{
        const primary=get(LEGACY),backup=get(LEGACY+'.backup');
        const legacy=usable(parse(primary))?primary:usable(parse(backup))?backup:null;
        if(legacy){put(keyFor(1),legacy);if(usable(parse(backup)))put(keyFor(1)+'.backup',backup);}
        else if(primary||backup){disabled=true;error='The old campaign is unreadable. Its files have been preserved; no new save will overwrite them.';}
      }
      if(!disabled)put(INDEX,JSON.stringify(index));
    }catch(_){disabled=true;error='Could not create campaign slots. The original save has been preserved.';}
  }
  const active=index.active,key=keyFor(active);
  let expected=get(key),expectedIndex=get(INDEX);
  const isEmpty=raw=>raw===null||parse(raw)?.empty===true;
  function load(validate=usable){
    const raw=get(key),data=parse(raw);expected=raw;
    if(isEmpty(raw))return null;
    if(validate(data))return data;
    const backup=parse(get(key+'.backup'));
    if(validate(backup)){recovered=true;return backup;}
    corruptActive=true;error='This campaign is damaged. Its data has been preserved. Choose another slot or delete it explicitly.';return null;
  }
  function save(snapshot,validate=usable){
    if(disabled||corruptActive)return false;
    try{
      const current=get(key);
      if(current!==expected||get(INDEX)!==expectedIndex){error='Another game window changed this save. Reload before continuing; your older state has not overwritten it.';return false;}
      const old=parse(current);
      if(validate(old))put(key+'.backup',current);
      const next=JSON.stringify({...snapshot,title:cleanName(snapshot.title||index.titles[active-1],active),updatedAt:Date.now()});
      put(key,next);expected=next;error='';return true;
    }catch(_){error='Save failed. Device storage may be full or blocked. Your previous checkpoint is still available.';return false;}
  }
  function summaries(){return [1,2,3].map(i=>{
    const raw=get(keyFor(i));let data=isEmpty(raw)?null:parse(raw),backup=false;
    if(!isEmpty(raw)&&!usable(data)){data=parse(get(keyFor(i)+'.backup'));backup=usable(data);}
    const good=usable(data),empty=isEmpty(raw);
    return {slot:i,active:i===active,empty,corrupt:!empty&&!good,recovered:backup,
      title:cleanName(good?data.title||index.titles[i-1]:index.titles[i-1],i),
      updatedAt:good?data.updatedAt||0:0,credits:good?data.profile.credits||0:0,crystals:good?data.profile.crystals||0:0,
      recorders:good?Object.values(data.levels).reduce((n,f)=>n+(f.secured?.length||0),0):0,
      depth:good?data.profile.bestDepth||0:0,levelId:good?data.selectedLevel:null,
      activeDive:good&&Boolean(data.activeDive),diveDepth:good&&data.activeDive?Math.max(0,Math.round((data.activeDive.player.y-120)/10)):0};
  });}
  function activate(i,title){
    if(![1,2,3].includes(i)||disabled)return false;
    try{
      if(get(INDEX)!==expectedIndex){error='The selected campaign changed in another window. Reload first.';return false;}
      const next={...index,active:i,titles:[...index.titles]};
      if(title!==undefined){if(!isEmpty(get(keyFor(i)))){error='That slot already contains a campaign. Nothing was replaced.';return false;}next.titles[i-1]=cleanName(title,i);}
      put(INDEX,JSON.stringify(next));index=next;expectedIndex=JSON.stringify(next);error='';return true;
    }catch(_){error='Could not switch campaigns. Your current save is unchanged.';return false;}
  }
  function remove(i){
    if(![1,2,3].includes(i))return false;
    try{
      // A tombstone prevents a stale backup or an old legacy file resurrecting this slot.
      put(keyFor(i),JSON.stringify({empty:true,deletedAt:Date.now()}));
      try{localStorage.removeItem(keyFor(i)+'.backup');}catch(_){}
      if(i===active){expected=get(key);disabled=false;corruptActive=false;}
      error='';return true;
    }catch(_){error='Could not delete that campaign. Storage is unavailable.';return false;}
  }
  window.AbyssSlots={active,key,title:()=>cleanName(index.titles[active-1],active),load,save,summaries,activate,remove,
    buildId:'0.17.2-delta-helm-1',status:()=>({active,key,error,recovered,disabled,corruptActive}),
    // Only pre-v3 profiles may enter the old converter on a first-ever installation.
    allowLegacy:()=>active===1&&isEmpty(expected)&&!oldIndex&&!get(LEGACY)&&!get(LEGACY+'.backup')};
})();
