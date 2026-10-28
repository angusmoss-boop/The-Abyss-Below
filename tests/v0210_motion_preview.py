"""Staged schooling animation using the shipped renderer and actual simulation."""
from v0210_harness import *
from playwright.sync_api import sync_playwright
from PIL import Image
from io import BytesIO
import math
with sync_playwright() as pw:
 b=launch_browser(pw);c,p,errors=build(b,640,600,False)
 p.evaluate("document.getElementById('focusToggleBtn').click()")
 f=fix(p,depth=130,lights=True,facing=-math.pi/2,upgrades={'hull':7,'engine':4,'flashlight':4},rocks=[{'dx':-160,'dy':-80,'radius':40},{'dx':150,'dy':-120,'radius':48}])
 p.evaluate('AbyssDiagnostics.wildFixture({schools:[{dx:70,dy:-145,species:2},{dx:-40,dy:-50,species:0}]})')
 # Warm the loose formation, then approach without any injected per-fish movement.
 p.evaluate('for(let i=0;i<120;i++)AbyssDiagnostics.fishPulse(1/60)')
 frames=[]
 for i in range(48):
  step(p,1/12,keys=['arrowup'] if i<24 else [])
  data=p.locator('#gameCanvas').screenshot()
  frames.append(Image.open(BytesIO(data)).convert('RGB').crop((40,110,600,460)).resize((560,350)))
 frames[0].save(OUT/'schooling-motion.gif',save_all=True,append_images=frames[1:],duration=83,loop=0,optimize=False)
 assert not errors,errors;c.close();b.close()
print('PASS production fish motion preview captured, no JavaScript errors')
