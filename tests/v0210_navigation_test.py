"""Conservative full-capsule route checks plus real steering/boost wall collision."""
from v0210_harness import *
from v0210_giants_test import giants,prime,visit
from playwright.sync_api import sync_playwright
import math,json
PROBE='''()=>{
 const d=AbyssDiagnostics,g=d.giants(),v=g.site,S=22,pad=135;
 const left=v.x-v.w/2-pad,top=v.y-v.h/2-pad,cols=Math.ceil((v.w+2*pad)/S),rows=Math.ceil((v.h+2*pad)/S);
 const nodes=new Map();for(let y=0;y<=rows;y++)for(let x=0;x<=cols;x++){const px=left+x*S,py=top+y*S;if(d.wildClear(px,py,28))nodes.set(x+':'+y,{x:px,y:py,cx:x,cy:y});}
 const closest=p=>[...nodes.entries()].sort((a,b)=>Math.hypot(a[1].x-p.x,a[1].y-p.y)-Math.hypot(b[1].x-p.x,b[1].y-p.y))[0];
 const start=closest(v.entry),seen=new Set([start[0]]),queue=[start[1]];
 for(let i=0;i<queue.length;i++){const n=queue[i];for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const key=(n.cx+dx)+':'+(n.cy+dy),q=nodes.get(key);if(!q||seen.has(key))continue;
   if(!d.wildClear((q.x+n.x)/2,(q.y+n.y)/2,28))continue;seen.add(key);queue.push(q);}}
 const points=[v.panel,v.plate,{x:v.x,y:v.y-v.h/2-45},{x:v.x,y:v.y+v.h/2+45},{x:v.x-v.w/2-45,y:v.y},{x:v.x+v.w/2+45,y:v.y}];
 return {id:v.id,plateReachable:seen.has(closest(v.plate)[0]),allExits:points.every(p=>seen.has(closest(p)[0])),nodes:seen.size,plateClear:d.wildClear(v.plate.x,v.plate.y,28),panelClear:d.wildClear(v.panel.x,v.panel.y,28),rockOverlap:g.walls.some(w=>d.debug().rocks.some(r=>Math.abs(r.x-w.x)<r.radius+(w.right-w.left)/2&&Math.abs(r.y-w.y)<r.radius+(w.bottom-w.top)/2))};
}'''
with sync_playwright() as pw:
 b=launch_browser(pw);c,p,errors=build(b);prime(p);results=[]
 for level in range(5):
  p.evaluate('(i)=>AbyssDiagnostics.fixtureLevel(i)',level)
  for seed in [17,53,1900,9911,65535,1234567]:
   p.evaluate('(s)=>AbyssDiagnostics.regenerate(s)',seed)
   before=debug(p)['field']['loot'];r=p.evaluate(PROBE)
   assert r['plateReachable'] and r['allExits'] and r['panelClear'] and r['plateClear'] and not r['rockOverlap'],(level,seed,r)
   assert before==debug(p)['field']['loot']
   results.append(dict(level=level+1,seed=seed,**r))
  g=giants(p);v=g['site'];right={'x':v['x']+v['w']/2+50,'y':v['y']}
  visit(p,right);p.evaluate('AbyssDiagnostics.face(Math.PI)');step(p,1.1,keys=['a']);s=state(p)
  assert s['x']<v['x']+v['w']/2-55 and abs(s['y']-v['y'])<40,(level,s,right)
  # Try to boost straight through an intact roof plate, not through the opening.
  wall=next(w for w in g['walls'] if w['id'].endswith('roof-a'))
  visit(p,{'x':wall['x'],'y':wall['top']-60});p.evaluate('AbyssDiagnostics.face(Math.PI/2)');step(p,1.3,keys=['s',' ']);s=state(p)
  assert s['y']<wall['bottom'] and not p.evaluate('([x,y])=>AbyssDiagnostics.giantSolid(x,y,0)',[s['x'],s['y']]),(level,s,wall)
  print('PASS',v['name'],'six seeds, all four exits + panel/plate routes at 28-unit clearance; real entry traversal and boosted roof collision')
 assert not errors,errors
 (ROOT/'verification/v0.21.0/giant-route-checks.json').write_text(json.dumps(results,indent=2)+'\n')
 c.close();b.close()
