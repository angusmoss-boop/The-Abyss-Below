"""Full-capsule geometric reachability with sealed and released vaults, 15 cases across three seeds."""
from v0240_harness import *
from v0240_strongholds_test import strong,prime,relay,point
from playwright.sync_api import sync_playwright
import json
PROBE='''()=>{
 const d=AbyssDiagnostics,g=d.giants(),v=g.site,S=20,pad=125;
 const left=v.x-v.w/2-pad,top=v.y-v.h/2-pad,cols=Math.ceil((v.w+pad*2)/S),rows=Math.ceil((v.h+pad*2)/S);
 const nodes=new Map();for(let y=0;y<=rows;y++)for(let x=0;x<=cols;x++){const px=left+x*S,py=top+y*S;if(d.wildClear(px,py,28))nodes.set(x+':'+y,{x:px,y:py,cx:x,cy:y});}
 const closest=p=>[...nodes.entries()].sort((a,b)=>Math.hypot(a[1].x-p.x,a[1].y-p.y)-Math.hypot(b[1].x-p.x,b[1].y-p.y))[0];
 const start=closest(v.entry),seen=new Set([start[0]]),queue=[start[1]];
 for(let i=0;i<queue.length;i++){const n=queue[i];for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const key=(n.cx+dx)+':'+(n.cy+dy),q=nodes.get(key);if(!q||seen.has(key))continue;if(!d.wildClear((q.x+n.x)/2,(q.y+n.y)/2,28))continue;seen.add(key);queue.push(q);}}
 const reachable=p=>seen.has(closest(p)[0]);
 return {id:v.id,relays:v.relays.map(reachable),panel:reachable(v.panel),plate:reachable(v.plate),exit:reachable(v.exit),vaultClear:d.wildClear(v.plate.x,v.plate.y,28),nodes:seen.size,
 rockOverlap:g.walls.some(w=>d.debug().rocks.some(r=>Math.abs(r.x-w.x)<r.radius+(w.right-w.left)/2&&Math.abs(r.y-w.y)<r.radius+(w.bottom-w.top)/2)),
 guards:d.stronghold().guards.every(e=>d.predatorClear(e.id)),bounds:[v.x-v.w/2,v.x+v.w/2],bottom:v.y+v.h/2};
}'''
if __name__=='__main__':
 with sync_playwright() as pw:
  b=launch_browser(pw);c,p,errors=build(b);prime(p);results=[]
  for level in range(5):
   p.evaluate('i=>AbyssDiagnostics.fixtureLevel(i)',level)
   for seed in [17,9911,1234567]:
    # A fresh independent run, not a previously opened gate, for each topology check.
    ss=store(p);data=json.loads(ss[CAMPAIGN]);data['giants']={'version':1,'banked':[],'livery':'standard','sites':{}};data['activeDive']=None
    ss[CAMPAIGN]=json.dumps(data);c.close();c,p,e=build(b,store=ss);errors+=e
    p.evaluate('i=>AbyssDiagnostics.fixtureLevel(i)',level);p.evaluate('s=>AbyssDiagnostics.regenerate(s)',seed)
    before=debug(p)['field']['loot'];r=p.evaluate(PROBE)
    assert all(r['relays']) and r['panel'] and not r['plate'] and r['vaultClear'] and not r['rockOverlap'] and r['guards'],(level,seed,r)
    # Even boosting cannot cut through the actual sealed vault door.
    g=p.evaluate('AbyssDiagnostics.giants()');wall=next(w for w in g['walls'] if w['gateType']=='vault');v=g['site'];x=wall['x']+v['direction']*65
    move(p,x,wall['y']);p.evaluate('a=>AbyssDiagnostics.face(a)',3.14159 if v['direction']>0 else 0)
    step(p,.8,keys=['a' if v['direction']>0 else 'd',' ']);assert abs(state(p)['x']-wall['x'])>=10,(level,state(p))
    relay(p,0);relay(p,1);r2=p.evaluate(PROBE);assert r2['plate'] and all(r2['relays']) and r2['panel'],r2
    point(p,v['panel']);p.evaluate('AbyssDiagnostics.ping()');step(p,5.6);point(p,v['panel']);p.evaluate('AbyssDiagnostics.ping()');step(p,.2);use(p)
    assert strong(p)['state']['opened'];r3=p.evaluate(PROBE);assert r3['exit'] and r3['plate']
    assert debug(p)['field']['loot']==before
    results.append(dict(level=level+1,seed=seed,closed=r,opened=r3));print('PASS',level+1,seed,'relay routes / sealed vault / open vault and exit / guards / resources',flush=True)
  assert not errors,errors
  out=ROOT/'verification/v0.24.0';out.mkdir(exist_ok=True,parents=True);(out/'stronghold-routes.json').write_text(json.dumps(results,indent=2)+'\n');c.close();b.close()
