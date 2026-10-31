/* The Living Abyss: one renderer shared by the live vessel and dock previews.
 * Visual geometry never changes the narrow collision capsule or weapon rules.
 * No game-state mutations, audio, networking or external assets in this module.
 */
(() => {
  'use strict';
  const buildId='0.25.0-the-living-abyss-1', TAU=Math.PI*2;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const ENGINES=Object.freeze([
    {color:'#8cbec9',edge:'#4b7d99',length:0,width:0,name:'STANDARD DRIVE'},
    {color:'#69f6ea',edge:'#2fb9c2',length:36,width:4.6,name:'CYAN / MK I'},
    {color:'#74cdff',edge:'#387dff',length:52,width:6,name:'ELECTRIC BLUE / MK II'},
    {color:'#b09bff',edge:'#714ae9',length:72,width:7.5,name:'VIOLET / MK III'},
    {color:'#e5faff',edge:'#9b63ff',length:94,width:9,name:'ION WHITE / MK IV'}
  ]);
  const HULL_NAMES=['SURVEY FRAME','REINFORCED SEAMS','PRESSURE RIBS','ARMOURED BOW','LAMINATED PLATING','DEEP-SEA KEEL','COMPOSITE CARAPACE','ABYSSAL EXOFRAME'];
  function path(c,pts,fill,stroke,width=.7){c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}}
  function line(c,pts,color,width=.7){c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=width;c.stroke();}
  function rect(c,x,y,w,h,r,fill,stroke){c.beginPath();c.roundRect(x,y,w,h,r);if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.lineWidth=.65;c.strokeStyle=stroke;c.stroke();}}
  function lamp(c,x,y,r,color){c.fillStyle=color;c.beginPath();c.arc(x,y,r,0,TAU);c.fill();}
  function outline(c,h){
    c.beginPath();c.moveTo(-28,-6.5);
    c.bezierCurveTo(-23,-10.4,-4,-11.7,14,-9.4);
    c.quadraticCurveTo(26,-7.7,31,0);
    c.quadraticCurveTo(26,7.7,14,9.4);
    c.bezierCurveTo(-4,11.7,-23,10.4,-28,6.5);
    c.quadraticCurveTo(-31,0,-28,-6.5);c.closePath();
  }
  function draw(c,opts={}){
    const u=opts.upgrades||{},h=clamp(u.hull||0,0,7),engine=clamp(u.engine||0,0,4),eng=ENGINES[engine];
    const t=Number.isFinite(opts.time)?opts.time:0,thrust=clamp(opts.thrust||0,0,1),boost=engine?clamp(opts.boost||0,0,1):0;
    const health=clamp(opts.health??1,0,1),wear=1-health;
    const palette=opts.palette||['#d4eef2','#73a5b7','#204b63','#90e8e1'];
    const trim=palette[3],accent=eng.color;
    c.save();
    // Exhaust is drawn on the same darkened world layer, never on the light mask.
    if(!opts.airborne&&(boost>.005||thrust>.04)){
      const length=10+thrust*10+boost*eng.length,width=2.2+boost*eng.width;
      for(const side of [-1,1]){
        const y=side*(engine>=2?9.3:5.8),wobble=Math.sin(t*26+side)*boost*2.2;
        const g=c.createLinearGradient(-27,y,-32-length,y);
        g.addColorStop(0,'#efffff');g.addColorStop(.16,accent);g.addColorStop(.55,eng.edge+'8a');g.addColorStop(1,eng.edge+'00');
        c.fillStyle=g;c.globalAlpha=.35+boost*.55;
        c.beginPath();c.moveTo(-28,y-width*.55);c.bezierCurveTo(-39-length*.2,y-width,-40-length*.7,y+wobble,-32-length,y+wobble);
        c.bezierCurveTo(-40-length*.6,y-width*.05,-38,y+width,-28,y+width*.55);c.closePath();c.fill();
        if(boost>.1){line(c,[[-31,y],[-40-length*.28,y+wobble*.3],[-30-length*.7,y+wobble*.5]],'#edffffbb',.7+boost*.75);}
      }
      c.globalAlpha=1;
      for(let i=0;i<5;i++){
        const travel=(t*(18+thrust*30)+i*9)%52;
        c.globalAlpha=(1-travel/52)*(.12+thrust*.25);
        c.strokeStyle=accent;c.lineWidth=.5;c.beginPath();c.arc(-33-travel,(i%2?1:-1)*(4+travel*.08)+Math.sin(t*2+i),.65+travel*.025,0,TAU);c.stroke();
      }c.globalAlpha=1;
    }
    // Swept stabilisers and propulsion pods. Increased marks reshape the pods.
    for(const side of [-1,1]){
      c.save();c.scale(1,side);
      path(c,[[-22,5],[-33,15+engine*.45],[-24,11+engine*.3],[-10,8]],'#122b40',trim,.65);
      if(engine>=2)path(c,[[-25,9],[-30,16],[-17,12],[-10,8]],'#233e56',accent,.55);
      rect(c,-30,engine>=2?7.2:3.8,13+engine*1.6,4.8+engine*.45,2,'#102a40','#6990a7');
      for(let j=0;j<engine+1;j++)line(c,[[-25+j*2.7,engine>=2?7.7:4.3],[-24+j*2.7,engine>=2?11.6:7.7]],j<engine?accent:'#6d96a5',.65);
      rect(c,-32,engine>=2?8:4.3,3,3.5,1,thrust>.08?accent:'#44647c');
      if(u.torpedo>0){
        const m=clamp(u.torpedo,1,4),yy=9.8;
        path(c,[[-10,yy],[-8,yy+4.2],[10+m,yy+4.2],[16+m*.5,yy+1.3],[10,yy-1]],'#173449',trim,.6);
        rect(c,7,yy+.15,7+m*.7,2.3,1,'#081b2e','#d6a775');
        for(let j=0;j<m;j++)line(c,[[-6+j*3.5,yy+.3],[-5+j*3.5,yy+3.6]],'#cf9f72',.65);
        lamp(c,14+m*.4,yy+1.4,.85,'#ffcc8e');
      }
      c.restore();
    }
    // Hull silhouette and lighting. Each purchased hull mark has an additive detail.
    const shell=c.createLinearGradient(0,-12,0,12);
    shell.addColorStop(0,palette[0]);shell.addColorStop(.18,palette[1]);shell.addColorStop(.50,palette[2]);shell.addColorStop(.84,'#102b40');shell.addColorStop(1,'#061c2d');
    outline(c,h);c.fillStyle=shell;c.fill();c.strokeStyle=trim;c.lineWidth=.9;c.stroke();
    line(c,[[-23,-7],[-7,-9.5],[11,-8.3],[23,-4.7]],'#e8ffff8c',.5);
    if(h>=1){for(const x of [-20,-13]){line(c,[[x,-8.4],[x+2,-3],[x+2,3],[x,8.4]],'#a7cad4',.7);}}
    if(h>=2){for(const side of [-1,1])path(c,[[-18,side*7],[-11,side*9.6],[-1,side*9.7],[-6,side*6.7]],palette[2],trim,.6);}
    if(h>=3){for(const side of [-1,1])path(c,[[17,side*7],[23,side*6],[29,side*2.5],[23,side*2.3]],palette[1],trim,.7);}
    if(h>=4){for(const side of [-1,1])path(c,[[-25,side*5.5],[-22,side*10],[-10,side*10.4],[-15,side*6.4]],'#24465b',trim,.65);}
    if(h>=5){path(c,[[-25,-2],[-29,0],[-25,2],[-9,2],[-5,0],[-9,-2]],'#09283d',trim,.7);for(const x of [-22,-17,-12])lamp(c,x,0,.55,trim);}
    if(h>=6){for(const side of [-1,1]){line(c,[[-26,side*8],[-18,side*10.7],[-5,side*10.8],[2,side*8.5]],palette[0],1.1);rect(c,-19,side>0?7.8:-10.6,7,2.5,.8,palette[2],trim);}}
    if(h>=7){for(const side of [-1,1]){path(c,[[19,side*8],[26,side*6],[31,side*1.8],[30,side*.5],[24,side*3],[18,side*5.3]],'#315b70',palette[0],.8);line(c,[[-22,side*9],[-12,side*11],[1,side*10]],trim,1.1);}}
    // Vents and battery banks remain subordinate to the canopy and silhouette.
    if(u.oxygen>0)for(let i=0;i<Math.min(5,u.oxygen);i++)line(c,[[-20+i*2.3,-6.3],[-19+i*2.3,-3.3]],'#092334',1);
    if(u.battery>0){rect(c,-16,3,12,3.3,1,'#061e31','#6997a5');for(let i=0;i<Math.min(5,u.battery);i++)rect(c,-14+i*2.1,3.8,1.1,1.5,.2,'#9bd9c2');}
    if(u.quiet>0){line(c,[[-25,-5],[-19,-3],[-14,-3]],'#4b788b',.4+u.quiet*.15);}
    // Rail accelerator along the port shoulder, visible only when installed.
    if(u.railgun>0){const m=clamp(u.railgun,1,4);
      rect(c,-9,-9.8,25+m*2.3,3.4,1,'#0a263b','#9bc6d6');
      rect(c,13,-9.1,8+m*2.2,1.8,.6,'#7bb7c7');
      for(let i=0;i<m+1;i++)rect(c,-5+i*4,-10.4,1.4,4.4,.4,'#72e9ee');
      lamp(c,20+m*2,-8.2,.8,'#e2ffff');
    }
    if(u.minePower>0){
      rect(c,-26,-3.5,7,7,1.7,'#10263a','#ba9784');
      line(c,[[-25,-2.3],[-21,2.3]],'#e2ad84',.6);line(c,[[-25,2.3],[-21,-2.3]],'#e2ad84',.6);
      for(let i=0;i<Math.min(4,u.minePower);i++)line(c,[[-25+i*1.5,-2.2],[-25+i*1.5,2.2]],'#bb8f79',.35);
      for(let i=0;i<Math.min(4,u.mineCapacity||1);i++)lamp(c,-27+i*2,5.7,.65,'#d2a47e');
    }
    if(u.magnet>0){path(c,[[-3,6],[-5,8],[0,10],[5,8],[3,6]],'#123c48','#8ce8b9',.65);for(let i=0;i<u.magnet;i++)lamp(c,-2+i*1.5,7.5,.4,'#a5e5be');}
    if(u.sonar>0||u.disruptor>0){
      const m=u.sonar||0;rect(c,-6,-3,5+m,5,2,'#183b50','#80b5cc');
      c.beginPath();c.arc(-2,0,1.1+m*.3,0,TAU);c.strokeStyle=u.disruptor>0?'#d8aeff':'#a5cddc';c.lineWidth=.65;c.stroke();
      if(u.disruptor>0)for(let j=0;j<u.disruptor;j++)line(c,[[-6+j*2,-3.5],[-5+j*2,-2]],'#d8aeff',.65);
    }
    // Cockpit rim gains struts without hiding the observation glass.
    const glass=c.createLinearGradient(1,-6,19,7);glass.addColorStop(0,'#8ef3f0');glass.addColorStop(.3,'#245d7e');glass.addColorStop(.8,'#041a2d');glass.addColorStop(1,'#2c91a6');
    c.beginPath();c.moveTo(3,-5.8);c.bezierCurveTo(10,-8,18,-5.5,21,0);c.bezierCurveTo(18,6,8,7,3,5);c.quadraticCurveTo(0,0,3,-5.8);c.closePath();c.fillStyle=glass;c.fill();c.strokeStyle=palette[0];c.lineWidth=h>=2?1.15:.7;c.stroke();
    line(c,[[4,-4.5],[10,-5],[16,-2]],'#caffffbb',.6);
    if(h>=3)line(c,[[4,-6],[5,-2],[5,2],[4,5.5]],trim,.7);
    if(u.shield>0){
      const m=clamp(u.shield,1,4),size=1.25+m*.2;
      for(const x of [-18,22])for(const side of [-1,1]){
        path(c,[[x-size,side*7],[x,side*(8.4+m*.25)],[x+size,side*7],[x,side*5.5]],'#25415c','#a7c8ff',.35+m*.12);
        lamp(c,x,side*7,.45+m*.1,'#9bd6ff');
        for(let j=1;j<m;j++)line(c,[[x-1.7,side*(7.5+j*.6)],[x+1.7,side*(7.5+j*.6)]],'#7aaddc',.45);
      }
    }
    const lights=clamp(u.flashlight||1,1,4);
    rect(c,28,-2.8,4,5.6,1,'#638ba0',trim);lamp(c,31,0,1.4,'#efffff');
    for(let i=0;i<lights;i++){
      const yy=(i-(lights-1)/2)*2.6;lamp(c,lights>=3?27.6:25.7,yy,lights>2?.75:1.1,'#ffe2a1');
    }
    lamp(c,-21,-6,.65,'#e69a7f');lamp(c,-21,6,.65,'#91e9c1');
    // Deterministic wear: rendering consumes no RNG that could affect the world.
    if(wear>.12){
      const scratches=[[-20,-4,-16,-2],[-12,6,-6,5],[-7,-7,-3,-5],[17,7,21,4],[-22,3,-18,5],[23,-5,26,-3]];
      c.globalAlpha=clamp(wear*.9,0,.7);
      scratches.slice(0,Math.ceil(wear*scratches.length)).forEach(([x,y,x2,y2])=>line(c,[[x,y],[x2,y2]],'#07111c',.8));c.globalAlpha=1;
      if(wear>.5&&!opts.airborne){for(let i=0;i<3;i++){const a=(t*.75+i*.31)%1;c.globalAlpha=(1-a)*wear*.6;c.strokeStyle='#c8e5e9';c.lineWidth=.5;c.beginPath();c.arc(-15-a*5, -8-a*14, .6+a*1.5,0,TAU);c.stroke();}c.globalAlpha=1;}
      if(wear>.65&&Math.sin(t*3.2)> .93){line(c,[[-14,-7],[-12,-10],[-15,-11]],'#ffc9a5',.65);}
    }
    c.restore();
  }
  window.AbyssShip=Object.freeze({buildId,draw,engines:ENGINES,hullNames:HULL_NAMES});
})();
