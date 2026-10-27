/** Static and mocked-lifecycle checks; not a substitute for real offline browser testing. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base='https://example.test/expedition/';
const events=new Map(),stores=new Map();
const urlOf=request=>new URL(typeof request==='string'?request:request.url,base).href;
class MemoryCache {
  constructor(){this.entries=new Map();}
  async addAll(urls){for(const url of urls){
    const parsed=new URL(url,base),file=parsed.pathname.endsWith('/')?'index.html':path.basename(parsed.pathname);
    assert.ok(fs.existsSync(path.join(root,file)),`Missing cache asset: ${file}`);
    this.entries.set(urlOf(url),new Response(fs.readFileSync(path.join(root,file))));
  }}
  async put(request,response){this.entries.set(urlOf(request),response.clone());}
  async match(request){return this.entries.get(urlOf(request))?.clone();}
}
const caches={
  async open(name){if(!stores.has(name))stores.set(name,new MemoryCache());return stores.get(name);},
  async keys(){return [...stores.keys()];},
  async delete(name){return stores.delete(name);},
  async match(request){for(const store of stores.values()){const found=await store.match(request);if(found)return found;}}
};
let claimed=false,skipped=false,offline=false;
const sandbox={URL,Response,Promise,caches,
  fetch:async request=>{if(offline)throw new Error('Offline');return new Response('fresh network data');},
  self:{location:{origin:'https://example.test'},addEventListener:(name,fn)=>events.set(name,fn),
    skipWaiting:async()=>{skipped=true;},clients:{claim:async()=>{claimed=true;}}}};
vm.createContext(sandbox);vm.runInContext(fs.readFileSync(path.join(root,'service-worker.js'),'utf8'),sandbox);
async function dispatch(name,request){
  const work=[];let response;
  events.get(name)({request,waitUntil:p=>work.push(p),respondWith:p=>{response=p;}});
  if(response)response=await response;
  await Promise.all(work);return response;
}
await caches.open('abyss-below-shell-v0.6.0');await caches.open('other-app-cache');
await dispatch('install');assert.ok(skipped);
const cache=await caches.open('abyss-below-shell-v0.7.0');
for(const asset of ['styles.css','game.js','manifest.webmanifest']){
  const target=asset+'?v=0.7.0';assert.ok(await cache.match(target));
  assert.ok(fs.readFileSync(path.join(root,'index.html'),'utf8').includes(target));
}
await dispatch('activate');assert.ok(claimed);
assert.ok(!stores.has('abyss-below-shell-v0.6.0'));assert.ok(stores.has('other-app-cache'));
const request={method:'GET',url:base+'game.js?v=0.7.0',mode:'same-origin'};
assert.equal(await (await dispatch('fetch',request)).text(),'fresh network data');
offline=true;
assert.equal(await (await dispatch('fetch',request)).text(),'fresh network data');
const fallback=await dispatch('fetch',{method:'GET',url:base+'missing-page',mode:'navigate'});
assert.ok((await fallback.text()).includes('EXPEDITION BUILD v0.7.0'));
assert.equal((await dispatch('fetch',{method:'GET',url:base+'missing.png',mode:'same-origin'})).type,'error');
assert.equal(await dispatch('fetch',{method:'POST',url:base+'game.js'}),undefined);
assert.equal(await dispatch('fetch',{method:'GET',url:'https://other.test/data'}),undefined);
console.log('PASS: version-matched shell files, install/activate, scoped cache cleanup, network-first caching, offline fallback, method/origin guards (mocked worker lifecycle)');
