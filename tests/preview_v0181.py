"""Staged combat with the real game renderer. No generated art or fabricated targeting UI."""
from v0181_harness import *
from playwright.sync_api import sync_playwright
from PIL import Image
from io import BytesIO
import math

def capture(p):
 return Image.open(BytesIO(p.screenshot())).convert('RGB')
with sync_playwright() as pw:
 b=launch_browser(pw);c,p,errors=build(b,390,844,True)
 fix(p,depth=90,facing=-math.pi/2,lights=True,upgrades={'hull':5,'railgun':3,'torpedo':3,'minePower':3,'mineCapacity':4,'engine':3,'shield':2,'flashlight':4},predators=[{'id':'homing-preview','dx':190,'dy':-250,'tier':'apex','stunnedUntil':100}],rocks=[{'dx':-190,'dy':-280,'radius':45},{'dx':210,'dy':140,'radius':50},{'dx':-200,'dy':100,'radius':35}],items=[{'dx':150,'dy':60,'type':'crystal'}])
 p.evaluate('AbyssDiagnostics.weaponStock({railgun:24,torpedo:6});AbyssDiagnostics.step(0,{freezeAfter:false});AbyssDiagnostics.fire("torpedo")')
 frames=[]
 for n in range(42):
  step(p,.04,freeze=False);frames.append(capture(p))
  if n==13:p.screenshot(path=str(OUT/'guided-torpedo-mobile.png'))
 frames[0].save(OUT/'homing-torpedo.gif',save_all=True,append_images=frames[1:]+[frames[-1]]*8,duration=40,loop=0,optimize=True)
 assert not errors,errors;c.close();b.close()
 print('Captured real renderer: off-axis torpedo interception at normal simulation speed. Predator and scenery are staged test fixtures.')
