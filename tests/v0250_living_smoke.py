from v0250_harness import *
from playwright.sync_api import sync_playwright
import math

def animal(kind,x,y,i=0):
 return dict(id=kind+'-'+str(i),kind=kind,x=x,y=y,homeX=x,homeY=y,goalX=x+180,goalY=y+70,heading=.12,phase=1.7,pace=22,fear=0,goalTimer=12,callTimer=18,swim=2)
with sync_playwright() as pw:
 b=launch_browser(pw);c,p,errors=build(b,1440,900)
 for i in range(5):
  p.evaluate('i=>AbyssDiagnostics.fixtureLevel(i)',i)
  e=p.evaluate('AbyssDiagnostics.ecology()');print(i,len(e['creatures']),p.evaluate('AbyssDiagnostics.ecologyClear()'))
 p.evaluate('AbyssDiagnostics.fixtureLevel(0)')
 f=fix(p,depth=65,lights=True,facing=0,upgrades={'hull':5,'engine':4,'flashlight':4,'railgun':3,'torpedo':2})
 p.evaluate('v=>AbyssDiagnostics.ecologyFixture(v)',{'creatures':[animal('glider',f['x']+175,f['y']-85)]})
 p.evaluate('AbyssDiagnostics.wildFixture({schools:[{dx:120,dy:15,species:0},{dx:-115,dy:-70,species:2}],benthos:[{dx:260,dy:130,kind:1}]})')
 p.evaluate('AbyssDiagnostics.ecologyPulse(2.6)')
 print('OBS',p.evaluate('AbyssDiagnostics.ecology().state.observations'))
 p.screenshot(path=str(OUT/'early-glider.png'))
 assert p.evaluate('AbyssDiagnostics.photo()')
 print('PHOTO',p.evaluate('AbyssDiagnostics.photoState()'))
 p.screenshot(path=str(OUT/'early-photo.png'))
 p.locator('#photoClose').click();assert state(p)['paused'] and state(p)['pauseOpen']
 p.evaluate('AbyssDiagnostics.openWildlife()');p.screenshot(path=str(OUT/'early-journal.png'))
 print('ERRORS',errors);assert not errors
 c.close();b.close()
