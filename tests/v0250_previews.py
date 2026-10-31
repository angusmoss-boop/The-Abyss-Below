"""Actual renderer; staged gear, position, time and observations, not real player saves."""
from v0250_harness import *
from playwright.sync_api import sync_playwright
import math,json
from PIL import Image
GEAR={'hull':7,'engine':4,'flashlight':4,'railgun':4,'torpedo':4,'minePower':4,'mineCapacity':4,'shield':4,'magnet':4,'battery':4,'oxygen':4}

def equipment(p):
 fix(p,depth=50,lights=True,facing=0,upgrades=GEAR)
 p.evaluate('AbyssDiagnostics.weaponStock({railgun:32,torpedo:8})')

def world(p,index=0,seed=117):
 p.evaluate('i=>AbyssDiagnostics.fixtureLevel(i)',index)
 equipment(p)
 p.evaluate('s=>AbyssDiagnostics.regenerate(s)',seed)
 p.evaluate('AbyssDiagnostics.enableEnvironment();AbyssDiagnostics.enableWild()')

def beside(p,kind,offset=160):
 animal=next(x for x in p.evaluate('AbyssDiagnostics.ecology().creatures') if x['kind']==kind)
 # A staged camera position, not a promise of a fixed spawn location.
 move(p,animal['x']-offset,animal['y']+55)
 p.evaluate('a=>AbyssDiagnostics.face(a)',math.atan2(-55,offset))
 return animal

def clean_photo(p,path):
 assert p.evaluate('AbyssDiagnostics.photo()')
 with p.expect_download() as download:
  p.locator('#photoSave').click()
 download.value.save_as(str(path))
 p.locator('#photoClose').click()
 p.locator('#resumeBtn').click()
 p.evaluate('AbyssDiagnostics.step(0)')

with sync_playwright() as pw:
 b=launch_browser(pw);errors=[]
 c,p,e=build(b,1440,900);errors+=e
 world(p,0,117);glider=beside(p,'glider')
 p.evaluate('AbyssDiagnostics.ecologyPulse(2.5)')
 p.screenshot(path=str(OUT/'desktop-glider.png'))
 clean_photo(p,OUT/'photo-glider.png')
 world(p,2,818231);drift=beside(p,'driftback',185)
 p.evaluate('AbyssDiagnostics.ecologyPulse(2.5)')
 p.screenshot(path=str(OUT/'desktop-driftback.png'))
 clean_photo(p,OUT/'photo-driftback.png')
 # Previously rescued drones for the harbour presentation.
 for i in range(5):
  p.evaluate('i=>AbyssDiagnostics.fixtureLevel(i)',i)
  p.evaluate('AbyssDiagnostics.rescueSpawn()')
  d=p.evaluate('AbyssDiagnostics.rescue().drone')
  if d:
   d.update(status='rescued',seen=True,trail=[])
   p.evaluate('d=>AbyssDiagnostics.rescueFixture({done:true,drone:d})',d)
 p.evaluate('AbyssDiagnostics.fixtureLevel(0)');move(p,600,170)
 p.evaluate('AbyssDiagnostics.face(0)')
 for title,t in [('day',160),('sunset',500),('rain',840)]:
  p.evaluate('t=>AbyssDiagnostics.ecologyFixture({elapsed:t})',t)
  clean_photo(p,OUT/('harbour-'+title+'.png'))
 p.evaluate('AbyssDiagnostics.openWildlife()')
 species=p.evaluate('AbyssLiving.species.map(s=>s.id)')
 p.locator('#signalsClose').click()
 observations={k:{'levelId':'sunbreak-shelf' if i<5 else 'drowned-gardens','time':35+i*24,'depth':75 if i<5 else 520} for i,k in enumerate(species)}
 p.evaluate('o=>AbyssDiagnostics.ecologyFixture({observations:o})',observations)
 p.evaluate('AbyssDiagnostics.openWildlife()')
 p.screenshot(path=str(OUT/'desktop-field-guide.png'))
 p.locator('#signalsClose').click()
 if p.locator('#resumeBtn').is_visible():p.locator('#resumeBtn').click()
 p.evaluate('AbyssDiagnostics.step(0)')
 # Rebuild Glider shot for the photo-mode interface.
 world(p,0,117);beside(p,'glider');p.evaluate('AbyssDiagnostics.photo()')
 p.screenshot(path=str(OUT/'desktop-photo-mode.png'))
 c.close()
 c,p,e=build(b,390,844,True);errors+=e
 world(p,0,117);beside(p,'glider',105);p.evaluate('AbyssDiagnostics.ecologyPulse(2.5)')
 p.screenshot(path=str(OUT/'mobile-glider.png'))
 p.evaluate('AbyssDiagnostics.photo()');p.screenshot(path=str(OUT/'mobile-photo-mode.png'))
 p.locator('#photoClose').click()
 p.evaluate('o=>AbyssDiagnostics.ecologyFixture({observations:o})',observations)
 p.evaluate('AbyssDiagnostics.openWildlife()');p.screenshot(path=str(OUT/'mobile-field-guide.png'))
 c.close();b.close();assert not errors,errors
 print('PASS renderer previews / staged equipment, positions, observation records and sky time; no user save used')
