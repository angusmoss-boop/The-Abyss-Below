"""Production render captures, with explicitly synthetic gear, positions and targets."""
from v0200_harness import *
from v0200_giants_test import prime,giants,visit
from playwright.sync_api import sync_playwright
from PIL import Image,ImageDraw,ImageFont
import math
with sync_playwright() as pw:
 b=launch_browser(pw)
 c,p,errors=build(b,1440,900);prime(p);p.evaluate("document.querySelector('#focusToggleBtn').click()")
 for level in range(5):
  p.evaluate('(i)=>AbyssDiagnostics.fixtureLevel(i)',level);v=giants(p)['site']
  visit(p,{'x':v['x']+v['direction']*20,'y':v['y']+80});p.evaluate('AbyssDiagnostics.face(-Math.PI*.65);AbyssDiagnostics.ping()');step(p,1.1)
  p.screenshot(path=str(OUT/f'wreck-{v["id"]}.png'))
 # Three genuine simultaneous target hints are unnecessary. Two predators make
 # the narrower rail cone and wider torpedo cone understandable in one view.
 for w,h,touch,name in [(1440,900,False,'desktop-targeting'),(390,844,True,'mobile-targeting')]:
  if touch:
   assert not errors,errors;c.close();c,p,errors=build(b,w,h,touch)
  fix(p,depth=210,facing=-math.pi/2,lights=True,upgrades={'hull':4,'railgun':4,'torpedo':4,'engine':3,'shield':2,'flashlight':3},predators=[{'id':'rail-target','dx':-12,'dy':-185,'stunnedUntil':100},{'id':'torpedo-target','tier':'apex','dx':100,'dy':-210,'stunnedUntil':100}],rocks=[{'dx':-160,'dy':-110,'radius':38},{'dx':190,'dy':30,'radius':52}])
  p.evaluate('AbyssDiagnostics.weaponStock({railgun:28,torpedo:7});AbyssDiagnostics.step(0)')
  assert p.evaluate('AbyssDiagnostics.giants().indicators').__len__()==2
  p.screenshot(path=str(OUT/f'{name}.png'))
 assert not errors,errors;c.close();b.close()
