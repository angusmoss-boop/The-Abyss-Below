from v0210_harness import *
from playwright.sync_api import sync_playwright
with sync_playwright() as pw:
 b=launch_browser(pw);c,p,errors=build(b);p.evaluate('AbyssDiagnostics.fixtureLevel(4)')
 def scenario(**kw):
  fix(p,depth=1100,facing=0,lights=False,upgrades={'hull':7,'railgun':4,'torpedo':4},**kw)
  p.evaluate('AbyssDiagnostics.weaponStock({railgun:32,torpedo:8})')
 scenario(predators=[{'id':'ahead','dx':220,'dy':0,'stunnedUntil':100}])
 assert p.evaluate('AbyssDiagnostics.giants().indicators')==[]
 p.evaluate('AbyssDiagnostics.mutateEnemy("ahead",{revealUntil:4})')
 targets=p.evaluate('AbyssDiagnostics.giants().indicators');assert [t['kind'] for t in targets]==['railgun','torpedo']
 for kind in ['railgun','torpedo']:
  p.evaluate('(k)=>AbyssDiagnostics.fire(k)',kind)
 p.evaluate('AbyssDiagnostics.ordnancePulse(.01)')
 assert all(s['targetId']=='ahead' for s in debug(p)['projectiles'])
 print('PASS no aiming markers in total darkness; sonar echoes enable distinct markers matching actual acquired projectile targets')
 scenario(predators=[{'id':'wide','dx':220,'dy':150,'revealUntil':100,'stunnedUntil':100}])
 assert [t['kind'] for t in p.evaluate('AbyssDiagnostics.giants().indicators')]==['torpedo']
 scenario(predators=[{'id':'wall','dx':220,'dy':0,'revealUntil':100,'stunnedUntil':100}],rocks=[{'dx':100,'dy':0,'radius':35}])
 assert p.evaluate('AbyssDiagnostics.giants().indicators')==[]
 scenario(predators=[]);assert p.evaluate('AbyssDiagnostics.giants().indicators')==[]
 p.evaluate('AbyssDiagnostics.weaponStock({railgun:0,torpedo:0})');assert p.evaluate('AbyssDiagnostics.giants().indicators')==[]
 print('PASS separate acquisition cones, no through-wall contacts, no wildlife targeting and no empty-magazine markers')
 assert not errors,errors;c.close();b.close()
