/** Runs the unmodified version module with mocked browser/network boundaries. */
import assert from 'node:assert/strict';
import fs from 'node:fs';import vm from 'node:vm';import path from 'node:path';
import {webcrypto} from 'node:crypto';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=fs.readFileSync(path.join(root,'version-sync.js'),'utf8');
const release=JSON.parse(fs.readFileSync(path.join(root,'version.json'),'utf8'));
const base='https://example.test/abyss/';
function setup(options={}){
 const nodes=new Map(),events=new Map(),calls=[];
 function node(id){if(!nodes.has(id))nodes.set(id,{textContent:'',dataset:{},disabled:false,classList:{toggle(){},contains(){return false;}},addEventListener(type,fn){this[type]=fn;}});return nodes.get(id);}
 const settings={online:true,manifest:structuredClone(release),htmlBuild:release.buildId,cssBuild:release.buildId,worker:{buildId:release.buildId,cacheVerified:true},audioBuild:release.buildId,slotsBuild:release.buildId,signalsBuild:release.buildId,giantsBuild:release.buildId,rescueBuild:release.buildId,shipBuild:release.buildId,livingBuild:release.buildId,running:false,hasSavedDive:false,fail:null,tamper:null,...options};
 const location={protocol:'https:',href:base,replace(url){settings.reloaded=url;}};
 class Channel{constructor(){this.port1={onmessage:null,close(){}};this.port2={postMessage:data=>queueMicrotask(()=>this.port1.onmessage?.({data}))};}}
 const navigator={get onLine(){return settings.online;},serviceWorker:{get controller(){return settings.worker?{postMessage:(_,ports)=>ports[0].postMessage(settings.worker)}:null;},addEventListener(){},getRegistration:async()=>({update:async()=>{settings.updated=true;}})}};
 const window={AbyssLiving:{buildId:settings.livingBuild},AbyssShip:{buildId:settings.shipBuild},AbyssRescue:{buildId:settings.rescueBuild},AbyssGiants:{buildId:settings.giantsBuild},AbyssSignals:{buildId:settings.signalsBuild},AbyssSlots:{buildId:settings.slotsBuild},AbyssAudio:{status:()=>({buildId:settings.audioBuild})},AbyssBuild:{version:release.version,name:release.name,id:release.buildId},AbyssDiagnostics:{state:()=>({running:settings.running,hasSavedDive:settings.hasSavedDive})},addEventListener:(name,fn)=>events.set(name,fn)};
 if(options.missingBuild)delete window.AbyssBuild;
 const sandbox={URL,Response,Promise,Date,Math,Uint8Array,AbortController,MessageChannel:Channel,crypto:webcrypto,console,setTimeout,clearTimeout,setInterval:()=>0,window,navigator,location,
  document:{baseURI:base,hidden:false,documentElement:{},getElementById:node,querySelector:()=>({content:settings.htmlBuild}),addEventListener(){}},
  getComputedStyle:()=>({getPropertyValue:()=>JSON.stringify(settings.cssBuild)}),
  fetch:async(url,opts)=>{
   calls.push({url:String(url),cache:opts.cache});
   if(settings.fail)throw new TypeError('Network blocked');
   const file=path.basename(new URL(url).pathname);
   if(file==='version.json')return new Response(JSON.stringify(settings.manifest),{status:settings.http||200});
   return new Response(settings.tamper===file?'incomplete upload':fs.readFileSync(path.join(root,file)));
  }};
 vm.createContext(sandbox);vm.runInContext(source,sandbox);
 return {api:window.AbyssVersion,settings,node,calls,events};
}
let t=setup();await t.api.check();assert.equal(t.api.state().status,'current');assert.match(t.node('syncStatus').textContent,/UP TO DATE/);assert.ok(t.api.state().checkedAt);
assert.equal(t.calls.length,22);assert.ok(t.calls.every(c=>c.cache==='no-store'&&c.url.includes('_abyss_verify=')));
console.log('PASS network-only manifest + 21 SHA-256 runtime files + loaded HTML/CSS/code build IDs + verified worker required for green sync status');
t.settings.online=false;t.events.get('offline')();assert.equal(t.api.state().status,'offline');assert.doesNotMatch(t.node('syncStatus').textContent,/UP TO DATE/);
await t.api.check(true);assert.equal(t.api.state().status,'offline');assert.equal(t.calls.length,22);
t.settings.online=true;await t.api.check(true);assert.equal(t.api.state().status,'current');
console.log('PASS offline invalidates green status, does not claim cached latest, and reconnection can verify');
for(const scenario of [{livingBuild:'old'},{shipBuild:'old'},{rescueBuild:'old'},{giantsBuild:'old'},{htmlBuild:'old'},{cssBuild:'old'},{audioBuild:'old'},{slotsBuild:'old'},{signalsBuild:'old'}]){t=setup(scenario);await t.api.check();assert.equal(t.api.state().status,'mismatch');}
t=setup({worker:{buildId:'old',cacheVerified:true}});await t.api.check();assert.equal(t.api.state().status,'unverified');
t=setup({worker:{buildId:release.buildId,cacheVerified:false}});await t.api.check();assert.equal(t.api.state().status,'unverified');
t=setup({worker:null});await t.api.check();assert.equal(t.api.state().status,'unverified');
console.log('PASS stale HTML/CSS, old worker, missing cache and no worker never report fully synced');
t=setup({manifest:{...release,version:'0.26.0',name:'Future test build',buildId:'future'}});await t.api.check();assert.equal(t.api.state().status,'update');
t.settings.running=true;await t.api.loadUpdate();assert.equal(t.settings.reloaded,undefined);assert.match(t.node('syncDetail').textContent,/active/);
t.settings.running=false;t.settings.hasSavedDive=true;await t.api.loadUpdate();assert.equal(t.settings.reloaded,undefined);t.settings.hasSavedDive=false;await t.api.loadUpdate();assert.ok(t.settings.updated);assert.ok(t.settings.reloaded.startsWith(base+'?_abyss_update='));
t=setup({manifest:{...release,version:'0.9.0'}});await t.api.check();assert.equal(t.api.state().status,'unverified');assert.match(t.node('syncStatus').textContent,/AHEAD/);
console.log('PASS numeric semver ordering (0.17 vs 0.9), update notification, no downgrade, and active-dive reload guard');
t=setup({tamper:'styles.css'});await t.api.check();assert.equal(t.api.state().status,'mismatch');assert.match(t.node('syncStatus').textContent,/INCOMPLETE/);
for(const scenario of [{fail:true},{manifest:{version:'0.25.0'}},{http:404}]){t=setup(scenario);await t.api.check();assert.equal(t.api.state().status,'unverified');}
console.log('PASS partial upload, malformed/missing manifest and network failure never report synced');

// The new menu must not pretend to verify when old/missing game code was loaded.
t=setup({missingBuild:true});assert.equal(t.api,undefined);assert.match(t.node('syncStatus').textContent,/MISSING OR OUTDATED/);assert.match(t.node('menuVersion').textContent,/UNVERIFIED/);assert.equal(t.calls.length,0);
console.log('PASS missing/older game entry point reports an incomplete build, not a verified version');

for(const file of ["living-abyss.js","ship-systems.js","deepwater-rescue.js","forgotten-giants.js","lost-signals.js","launch.js","launch-art.webp","icon-192.png","icon-512.png","icon-maskable-512.png","apple-touch-icon.png","favicon-32.png","favicon.ico"]){t=setup({tamper:file});await t.api.check();assert.equal(t.api.state().status,"mismatch",file);}
console.log("PASS missing/mismatched launch code and every new icon/art asset prevent verified sync");
