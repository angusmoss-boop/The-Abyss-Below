"""Actual production-renderer screenshots. Synthetic credits, upgrades and staged positions."""
from v0240_harness import *
from playwright.sync_api import sync_playwright
from PIL import Image,ImageDraw,ImageFont
import base64
OUT=ROOT/'screenshots/v0.24.0';OUT.mkdir(parents=True,exist_ok=True)
GEAR={'hull':7,'engine':4,'railgun':4,'torpedo':4,'minePower':4,'mineCapacity':4,'flashlight':4,'shield':4,'magnet':4,'sonar':4,'disruptor':4,'oxygen':5,'battery':5,'quiet':4}
with sync_playwright() as pw:
 b=launch_browser(pw)
 c,p,e=build(b,390,844,True)
 fix(p,depth=45,upgrades=GEAR);p.evaluate('AbyssDiagnostics.grantCredits(2480);AbyssDiagnostics.grantCrystals(28)');dock(p)
 p.locator('#shipyardTab').click();p.locator('#shipyardThrust').click();p.wait_for_timeout(3600);p.screenshot(path=str(OUT/'mobile-shipyard.png'))
 p.set_viewport_size({'width':1440,'height':900});p.wait_for_timeout(100);p.locator('#shipyardThrust').click();p.locator('#shipyardThrust').click();p.screenshot(path=str(OUT/'desktop-shipyard.png'))
 assert not e,e;c.close()
 c,p,e=build(b,390,844,True)
 fix(p,depth=45,upgrades={**GEAR,'hull':3});p.evaluate('AbyssDiagnostics.grantCredits(2480);AbyssDiagnostics.grantCrystals(28)');dock(p)
 p.locator('[data-system="hull"]').click();p.screenshot(path=str(OUT/'hull-upgrade.png'));p.locator('#upgradeDetailClose').click()
 p.locator('#launchAgain').click();p.evaluate('AbyssDiagnostics.relaunch()')
 spot=p.evaluate('''()=>{const d=AbyssDiagnostics,r=d.debug().rocks.filter(r=>r.y>900&&r.y<1800);for(const k of r)for(const dx of [k.radius+65,-k.radius-65]){const x=k.x+dx,y=k.y;if(d.wildClear(x,y,30))return {x,y};}return {x:600,y:1000};}''')
 move(p,spot['x'],spot['y']);p.evaluate('AbyssDiagnostics.face(-1.25)')
 # Use the real seeded map, not a painted illustration; fixed scene across zooms.
 for factor,name in [(.65,'mobile-zoom-wide'),(1,'mobile-zoom-default'),(2,'mobile-zoom-close')]:
  p.evaluate('v=>AbyssDiagnostics.viewZoom(v)',factor);p.wait_for_timeout(1100);p.evaluate('AbyssDiagnostics.renderWorld()');p.screenshot(path=str(OUT/(name+'.png')))
 p.evaluate('AbyssDiagnostics.viewZoom(1.65);AbyssDiagnostics.setSystems({hull:70})');p.evaluate('AbyssDiagnostics.repair()');p.evaluate('AbyssDiagnostics.renderWorld()');p.screenshot(path=str(OUT/'emergency-repair.png'))
 assert not e,e;c.close()
 # Contact notices staged using real collection functions.
 c,p,e=build(b,390,844,True)
 fix(p,depth=80,lights=True,facing=-1.57079632679,upgrades=GEAR,items=[{'type':'crystal','dx':0,'dy':0,'quantity':2},{'type':'air','dx':0,'dy':0}])
 p.evaluate('AbyssDiagnostics.viewZoom(1.8);AbyssDiagnostics.setSystems({hull:100,oxygen:70,battery:80});AbyssDiagnostics.contactPickups();AbyssDiagnostics.renderWorld()')
 p.screenshot(path=str(OUT/'contact-pickups.png'));assert not e,e
 # Renderer comparison at inspection scale. Same renderer used in live play.
 for h,engine,name in [(0,0,'standard'),(3,2,'mid-tier'),(7,4,'full-refit')]:
  gear={**GEAR,'hull':h,'engine':engine}
  if not h:gear={'hull':0,'engine':0,'flashlight':1,'mineCapacity':1}
  data=p.evaluate('''u=>{const c=document.createElement('canvas');c.width=1050;c.height=350;const g=c.getContext('2d');g.fillStyle='#061624';g.fillRect(0,0,c.width,c.height);g.strokeStyle='#335b6a44';for(let x=20;x<c.width;x+=40){g.beginPath();g.moveTo(x,0);g.lineTo(x,c.height);g.stroke();}for(let y=20;y<c.height;y+=40){g.beginPath();g.moveTo(0,y);g.lineTo(c.width,y);g.stroke();}g.translate(735,175);g.scale(5,5);AbyssShip.draw(g,{upgrades:u,time:1.5,health:1,boost:u.engine?1:0,thrust:u.engine?1:0});return c.toDataURL('image/png').split(',')[1];}''',gear)
  (OUT/(name+'.png')).write_bytes(base64.b64decode(data))
 c.close();b.close()
# A contact sheet of actual renderer output; labels identify staged fitted tiers.
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',24)
small=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',17)
board=Image.new('RGB',(1050,1230),'#061624');d=ImageDraw.Draw(board)
for y,name,title,subtitle in [(0,'standard','STANDARD / SURVEY FRAME','100 HP • Standard drive • Starting equipment'),(410,'mid-tier','MK III / ARMOURED BOW','184 HP • Mk II drive • Fitted module demonstration'),(820,'full-refit','MK VII / ABYSSAL EXOFRAME','296 HP • Mk IV ion-white boost • Fully fitted systems')]:
 board.paste(Image.open(OUT/(name+'.png')).convert('RGB'),(0,y+50));d.text((28,y+12),title,font=font,fill='#d5f6ef');d.text((28,y+380),subtitle,font=small,fill='#91b6c7')
board.save(OUT/'vessel-evolution.png')
print('PASS production previews rendered without JavaScript errors; staged gear/resources disclosed')
