/** Verified service-worker lifecycle in a mock. Not a live offline-browser test. */
import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import path from 'node:path';import {webcrypto} from 'node:crypto';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),base='https://example.test/abyss/';
const release=JSON.parse(fs.readFileSync(path.join(root,'version.json'),'utf8'));
const code=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');
function env({tamper=null,manifest=release}={}){
 const events=new Map(),stores=new Map();let offline=false,claimed=false,skipped=false;
 const key=r=>new URL(typeof r==='string'?r:r.url,base).href;
 class Cache{constructor(){this.entries=new Map();}async put(k,v){this.entries.set(key(k),v.clone());}async match(k){return this.entries.get(key(k))?.clone();}}
 const caches={async open(k){if(!stores.has(k))stores.set(k,new Cache());return stores.get(k);},async keys(){return [...stores.keys()];},async delete(k){return stores.delete(k);}};
 const sandbox={URL,Response,Promise,Uint8Array,Date,crypto:webcrypto,caches,
  fetch:async req=>{if(offline)throw new Error('offline');const pathname=new URL(typeof req==='string'?req:req.url,base).pathname;const file=pathname.endsWith('/')?'index.html':path.basename(pathname);if(file==='version.json')return new Response(JSON.stringify(manifest));if(!fs.existsSync(path.join(root,file)))return new Response('',{status:404});return new Response(tamper===file?'bad bytes':fs.readFileSync(path.join(root,file)));},
  self:{location:{origin:new URL(base).origin},addEventListener:(n,f)=>events.set(n,f),skipWaiting:async()=>{skipped=true;},clients:{claim:async()=>{claimed=true;}}}};
 vm.createContext(sandbox);vm.runInContext(code,sandbox);
 async function dispatch(name,args={}){const work=[];let response;events.get(name)({...args,waitUntil:p=>work.push(p),respondWith:p=>{response=p;}});const result=response?await response:undefined;await Promise.all(work);return result;}
 return {stores,caches,dispatch,offline:()=>{offline=true;},claimed:()=>claimed,skipped:()=>skipped};
}
const cacheName='abyss-below-shell-'+release.buildId;
let e=env();await e.caches.open('abyss-below-shell-v0.9.0');await e.caches.open('another-app');await e.dispatch('install');assert.ok(e.skipped());
let cache=await e.caches.open(cacheName);assert.equal(cache.entries.size,17);assert.ok(await cache.match('./version-sync.js?v=0.18.0'));
await e.dispatch('activate');assert.ok(e.claimed());assert.ok(!e.stores.has('abyss-below-shell-v0.9.0')&&e.stores.has('another-app'));
let message;await e.dispatch('message',{data:{type:'ABYSS_BUILD'},ports:[{postMessage:x=>message=x}]});assert.equal(message.buildId,release.buildId);assert.equal(message.cacheVerified,true);
console.log('PASS all 17 shell assets checksum-verified before install; current-version cache; scoped activation cleanup; worker build handshake');
e.offline();const nav=await e.dispatch('fetch',{request:{method:'GET',url:base+'?_abyss_update=123',mode:'navigate'}});assert.match(await nav.text(),/v0.18.0/);
const js=await e.dispatch('fetch',{request:{method:'GET',url:base+'game.js?v=0.18.0',mode:'same-origin'}});assert.equal(await js.text(),fs.readFileSync(path.join(root,'game.js'),'utf8'));
for(const url of [base+'version.json',base+'version.json?_abyss_verify=123',base+'game.js?_abyss_verify=123'])assert.equal(await e.dispatch('fetch',{request:{method:'GET',url}}),undefined);
assert.equal(await e.dispatch('fetch',{request:{method:'POST',url:base+'game.js'}}),undefined);assert.equal(await e.dispatch('fetch',{request:{method:'GET',url:'https://other.test/game.js'}}),undefined);
cache.entries.delete(new URL('./game.js?v=0.18.0',base).href);await e.dispatch('message',{data:{type:'ABYSS_BUILD'},ports:[{postMessage:x=>message=x}]});assert.equal(message.cacheVerified,false);
console.log('PASS offline shell/navigation fallback; version checks bypass caches; origin/method guards; missing cached asset detected');
for(const options of [{tamper:'game.js'},{manifest:{...release,buildId:'other-build'}}]){
 e=env(options);await e.caches.open('abyss-below-shell-v0.9.0');let failed=false;try{await e.dispatch('install');}catch(_){failed=true;}
 assert.ok(failed&&!e.skipped());assert.ok(!e.stores.has(cacheName)&&e.stores.has('abyss-below-shell-v0.9.0'));
}
console.log('PASS partial upload / mismatching manifest abort installation without replacing the previous cache');
