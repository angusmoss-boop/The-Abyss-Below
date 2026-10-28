/* One verified, self-contained shell per release. No campaign data lives here. */
const BUILD={version:'0.17.3',id:'0.17.3-smooth-signals-1'};
const CACHE='abyss-below-shell-'+BUILD.id;
const SHELL=['./','./index.html','./styles.css?v=0.17.3','./campaign-slots.js?v=0.17.3','./audio.js?v=0.17.3','./game.js?v=0.17.3','./version-sync.js?v=0.17.3','./manifest.webmanifest?v=0.17.3','./icon-192.png','./icon-512.png','./icon-maskable-512.png'];
const digest=async data=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',data)),b=>b.toString(16).padStart(2,'0')).join('');
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const manifestResponse=await fetch('./version.json?_abyss_verify='+Date.now(),{cache:'no-store'});
    if(!manifestResponse.ok)throw new Error('Release manifest missing');
    const manifest=await manifestResponse.json();
    if(manifest.version!==BUILD.version||manifest.buildId!==BUILD.id)throw new Error('Release still deploying');
    // Do not activate an old/new mixture after a partial upload.
    const responses=await Promise.all(SHELL.map(async path=>{
      const response=await fetch(path,{cache:'no-store'});
      if(!response.ok)throw new Error('Shell asset unavailable: '+path);
      const key=path==='./'?'index.html':path.slice(2).split('?')[0];
      if(await digest(await response.clone().arrayBuffer())!==manifest.assets[key])throw new Error('Shell checksum mismatch: '+key);
      return [path,response];
    }));
    const cache=await caches.open(CACHE);
    await Promise.all(responses.map(([path,response])=>cache.put(path,response)));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(names=>Promise.all(names.filter(name=>name.startsWith('abyss-below-shell-')&&name!==CACHE).map(name=>caches.delete(name)))).then(()=>self.clients.claim()));
});
self.addEventListener('message',event=>{
  if(event.data?.type==='ABYSS_BUILD')event.waitUntil(caches.open(CACHE).then(async cache=>{
    const entries=await Promise.all(SHELL.map(path=>cache.match(path)));
    event.ports?.[0]?.postMessage({version:BUILD.version,buildId:BUILD.id,cacheVerified:entries.every(Boolean)});
  }));
});
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
  // Verification must fail offline, never report a cached release as latest.
  if(url.pathname.endsWith('/version.json')||url.searchParams.has('_abyss_verify'))return;
  if(event.request.mode==='navigate'){
    event.respondWith(fetch(event.request,{cache:'no-store'}).then(response=>{
      if(!response.ok)throw new Error('Navigation unavailable');return response;
    }).catch(()=>caches.open(CACHE).then(cache=>cache.match('./index.html'))));return;
  }
  // The installed shell is immutable. Network updates cannot silently poison it.
  event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match(event.request))||fetch(event.request)));
});
