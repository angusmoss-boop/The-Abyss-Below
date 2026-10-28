/* A deployment check is not a cloud-save check. Never infer 'latest' offline. */
(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const BUILD=window.AbyssBuild;
  if(!BUILD){
    if($('syncStatus')){
      $('menuVersion').textContent='BUILD UNVERIFIED';$('menuVersionName').textContent='Incomplete update';
      $('syncIndicator').dataset.state='mismatch';$('syncStatus').textContent='GAME CODE MISSING OR OUTDATED';
      $('syncDetail').textContent='The menu and game code do not match. Finish uploading the update, then reopen online. Bank or quit any active dive first.';
      $('checkVersionBtn').textContent='RELOAD BUILD';
      $('checkVersionBtn').onclick=()=>{if(window.AbyssDiagnostics?.state().running){$('syncDetail').textContent='Bank or quit the active dive before reloading.';}else location.reload();};
    }
    return;
  }
  $('checkVersionBtn').onclick=null; // Clear the slow/missing-checker fallback.

  const CORE=['index.html','styles.css','campaign-slots.js','audio.js','lost-signals.js','game.js','version-sync.js','service-worker.js','manifest.webmanifest','launch.js','icon-192.png','icon-512.png','icon-maskable-512.png','apple-touch-icon.png','favicon-32.png','favicon.ico','launch-art.webp'];
  const state={status:'checking',checkedAt:null,remote:null,detail:'',inFlight:false};
  let currentCheck=null,lastAttempt=0,generation=0,canReload=false,recheckRequested=false;
  $('menuVersion').textContent='v'+BUILD.version;$('menuVersionName').textContent=BUILD.name;
  function status(kind,title,detail,reload=false){
    state.status=kind;state.detail=detail;canReload=reload;
    $('syncIndicator').dataset.state=kind;$('syncStatus').textContent=title;
    $('syncDetail').textContent=detail;$('updateVersionBtn').classList.toggle('hidden',!reload);
    $('updateVersionBtn').textContent=kind==='update'?'LOAD UPDATE':'RELOAD BUILD';
  }
  const networkURL=path=>{
    const url=new URL(path,document.baseURI);
    url.searchParams.set('_abyss_verify',Date.now()+'-'+Math.random().toString(36).slice(2));return url;
  };
  async function fetchFresh(path,signal){
    const response=await fetch(networkURL(path),{cache:'no-store',credentials:'same-origin',signal});
    if(!response.ok)throw new Error('HTTP '+response.status+' for '+path);
    return response;
  }
  const hash=async buffer=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',buffer)),b=>b.toString(16).padStart(2,'0')).join('');
  function compare(a,b){const av=a.split('.').map(Number),bv=b.split('.').map(Number);for(let i=0;i<3;i++){if(av[i]!==bv[i])return Math.sign(av[i]-bv[i]);}return 0;}
  function workerBuild(){
    return new Promise(resolve=>{
      const worker=navigator.serviceWorker?.controller;
      if(!worker){resolve(null);return;}
      const channel=new MessageChannel();let settled=false;
      const done=value=>{if(settled)return;settled=true;clearTimeout(timer);channel.port1.close();resolve(value);};
      const timer=setTimeout(()=>done(null),1500);
      channel.port1.onmessage=event=>done(event.data);
      try{worker.postMessage({type:'ABYSS_BUILD'},[channel.port2]);}catch(_){done(null);}
    });
  }
  async function check(force=false){
    if(currentCheck){if(force)recheckRequested=true;return currentCheck;}
    if(!force&&Date.now()-lastAttempt<30000)return state;
    lastAttempt=Date.now();const token=++generation;
    currentCheck=(async()=>{
      state.inFlight=true;$('checkVersionBtn').disabled=true;
      const abort=new AbortController(),timeout=setTimeout(()=>abort.abort(),12000);
      try{
        if(!['https:','http:'].includes(location.protocol)){
          status('unverified','LOCAL PREVIEW · NOT VERIFIED','Open the hosted game to check its published version.');return state;
        }
        if(!navigator.onLine){status('offline','OFFLINE · LATEST NOT VERIFIED','This is your installed build. Reconnect to check the latest published version.');return state;}
        status('checking','CHECKING DEPLOYMENT','Comparing this game with the published release and verifying its files.');
        const remote=await (await fetchFresh('./version.json',abort.signal)).json();
        if(remote?.schema!==1||!/^\d+\.\d+\.\d+$/.test(remote.version)||typeof remote.buildId!=='string'||typeof remote.name!=='string'||!CORE.every(file=>/^[a-f0-9]{64}$/.test(remote.assets?.[file]||''))){
          throw new Error('Invalid or incomplete version.json');
        }
        state.remote={version:remote.version,name:remote.name,buildId:remote.buildId};
        if(!crypto.subtle){status('unverified','FILE CHECK NOT AVAILABLE','Use the HTTPS game address to verify the published files.');return state;}
        const bad=[];
        await Promise.all(CORE.map(async file=>{
          const bytes=await (await fetchFresh('./'+file,abort.signal)).arrayBuffer();
          if(await hash(bytes)!==remote.assets[file])bad.push(file);
        }));
        if(token!==generation)return state;
        if(bad.length){status('mismatch','DEPLOYMENT INCOMPLETE','Published files do not match the release: '+bad.join(', ')+'. Finish uploading all update files, then check again.');return state;}
        const order=compare(remote.version,BUILD.version);
        if(order>0){status('update','UPDATE AVAILABLE · v'+remote.version,'Published: '+remote.name+'. Bank or quit any active dive before loading the update.',true);return state;}
        if(order<0){status('unverified','LOCAL BUILD AHEAD OF SERVER','Running v'+BUILD.version+'; the server still publishes v'+remote.version+'. Deployment may be in progress.');return state;}
        const htmlBuild=document.querySelector('meta[name="abyss-build"]')?.content;
        const cssBuild=getComputedStyle(document.documentElement).getPropertyValue('--abyss-build').trim().replace(/^["']|["']$/g,'');
        if(remote.buildId!==BUILD.id||htmlBuild!==BUILD.id||cssBuild!==BUILD.id||window.AbyssAudio?.status().buildId!==BUILD.id||window.AbyssSlots?.buildId!==BUILD.id||window.AbyssSignals?.buildId!==BUILD.id){
          status('mismatch','MIXED BUILD · RELOAD REQUIRED','The loaded interface, styles or game code do not belong to one release. Your saved campaign is kept.',true);return state;
        }
        const worker=await workerBuild();
        if(token!==generation)return state;
        if(!worker||worker.buildId!==BUILD.id||!worker.cacheVerified){
          status('unverified','GAME CURRENT · CACHE NOT VERIFIED','Published files match. The offline worker is not ready or belongs to another build. Reopen online, then check again.',true);return state;
        }
        state.checkedAt=new Date().toISOString();
        status('current','UP TO DATE · SYNC VERIFIED','v'+BUILD.version+' '+BUILD.name+' · game, interface and offline build match. Checked '+new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})+'.');
      }catch(error){
        if(token===generation)status(navigator.onLine?'unverified':'offline',navigator.onLine?'LATEST VERSION NOT VERIFIED':'OFFLINE · LATEST NOT VERIFIED',navigator.onLine?'Could not verify the deployment. Check the connection and that version.json was uploaded, then retry.':'Your installed game is available; reconnect before checking for updates.');
      }finally{
        clearTimeout(timeout);state.inFlight=false;$('checkVersionBtn').disabled=false;
      }
      return state;
    })();
    try{return await currentCheck;}finally{currentCheck=null;if(recheckRequested){recheckRequested=false;setTimeout(()=>check(true),0);}}
  }
  async function loadUpdate(){
    if(!canReload)return;
    const game=window.AbyssDiagnostics?.state();
    if(game?.running||game?.hasSavedDive){$('syncDetail').textContent='An expedition is still active. Bank your cargo and quit the dive first. Nothing has been reloaded.';return;}
    $('updateVersionBtn').disabled=true;
    try{
      const registration=window.AbyssWorkerRegistration||await navigator.serviceWorker?.getRegistration();
      if(registration)await registration.update();
      const url=new URL(location.href);url.searchParams.set('_abyss_update',Date.now());location.replace(url.href);
    }catch(_){$('syncDetail').textContent='The update could not be fetched. Reconnect, then try again.';$('updateVersionBtn').disabled=false;}
  }
  $('checkVersionBtn').addEventListener('click',()=>check(true));
  $('updateVersionBtn').addEventListener('click',loadUpdate);
  window.addEventListener('abyss-menu',()=>check());
  window.addEventListener('abyss-worker',()=>check(true));
  navigator.serviceWorker?.addEventListener('controllerchange',()=>check(true));
  window.addEventListener('online',()=>check(true));
  window.addEventListener('offline',()=>{generation++;status('offline','OFFLINE · LATEST NOT VERIFIED','Reconnect to verify the latest published version.');});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!$('menuOverlay').classList.contains('hidden'))check();});
  // Only recheck while the menu is open. This never reloads or interrupts play.
  setInterval(()=>{if(!document.hidden&&!$('menuOverlay').classList.contains('hidden'))check();},60000);
  window.AbyssVersion={check,state:()=>({...state}),loadUpdate};
  check(true);
})();
