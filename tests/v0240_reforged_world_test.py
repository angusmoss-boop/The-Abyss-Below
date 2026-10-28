"""All seeded contact pickups have a collision-clear hull contact position."""
from v0240_harness import *
from playwright.sync_api import sync_playwright
with sync_playwright() as pw:
 b=launch_browser(pw);c,p,errors=build(b)
 checks=[]
 for level in range(5):
  p.evaluate('i=>AbyssDiagnostics.fixtureLevel(i)',level)
  for seed in [24,2400,4191,65535,100003]:
   p.evaluate('s=>AbyssDiagnostics.regenerate(s)',seed)
   result=p.evaluate('''()=>{
    const d=AbyssDiagnostics,all=d.debug().items.filter(n=>['crystal','air'].includes(n.type));
    const clear=n=>{
      if(d.wildClear(n.x,n.y,26))return true;
      for(const radius of [0,12,24,32])for(let i=0;i<16;i++){
        const a=i*Math.PI/8,x=n.x+Math.cos(a)*radius,y=n.y+Math.sin(a)*radius;
        if([-15,0,15].every(s=>d.wildClear(x+Math.cos(a)*s,y+Math.sin(a)*s,10.5))&&d.guidanceLine({x,y},n,0))return true;
      }return false;
    };
    return {count:all.length,blocked:all.filter(n=>!clear(n)).map(n=>({id:n.id,type:n.type,x:n.x,y:n.y}))};
   }''')
   assert not result['blocked'],(level,seed,result)
   checks.append({'level':level+1,'seed':seed,'contact_pickups':result['count']})
 assert not errors,errors;c.close();b.close()
 (ROOT/'verification/v0.24.0/contact-placements.json').write_text(json.dumps(checks,indent=2)+'\n')
 print('PASS 25 generated level layouts: every crystal and hull repair pack has a clear contact position for the unchanged three-circle ship capsule')
