import json
from playwright.sync_api import sync_playwright
from v0250_harness import *
def signal(p):return p.evaluate('AbyssDiagnostics.signals()')
def offers(p):return signal(p)['state']['boards'][state(p)['levelId']]['offers']
def open_board(p):
 dock(p);p.locator('#contractsTab').click()
def accept(p,kind):
 c=next(c for c in offers(p) if c['kind']==kind);p.locator('[data-accept-contract="'+c['id']+'"]').click();return signal(p)['state']['active']
def bank(p):
 before=state(p)['credits'];cargo=debug(p)['player']['cargo']['scrap'];dock(p);return state(p)['credits']-before-cargo*18
with sync_playwright() as pw:
 b=launch_browser(pw);c,p,errors=build(b,390,844,True)
 open_board(p);o=offers(p);assert len(o)==3 and [x['kind'] for x in o]==['cargo','survey','silent']
 assert all(pt['y']<120+130*10 for x in o for pt in x['points'])
 p.locator('#upgradesTab').click();p.locator('#contractsTab').click();assert offers(p)==o
 task=accept(p,'cargo');assert state(p)['credits']==0;depart(p)
 target=task['points'][0];move(p,target['x'],target['y']);use(p)
 assert signal(p)['state']['active']['status']=='return'
 # Accept/collect is not a payout. Saving/reloading retains the same assignment.
 p.evaluate('AbyssDiagnostics.save()'); checkpoint=store(p)
 c2,q,err2=build(b,390,844,True,store=checkpoint,launch=False)
 assert signal(q)['state']['active']['id']==task['id'];q.locator('#startBtn').click();assert state(q)['pauseOpen'];q.locator('#resumeBtn').click();q.evaluate('AbyssDiagnostics.step(0)')
 assert bank(q)==task['reward'];assert signal(q)['state']['active'] is None
 assert signal(q)['state']['completed']==1
 q.locator('#launchAgain').click();assert bank(q)==0
 # Survey counts wave arrival only, then requires a genuine return.
 q.locator('#contractsTab').click();task=accept(q,'survey');depart(q)
 for point in task['points']:
  move(q,point['x'],point['y']);q.evaluate('AbyssDiagnostics.setSystems({hull:100,battery:100,oxygen:100})')
  before=sum(x['done'] for x in signal(q)['state']['active']['points'])
  q.evaluate('AbyssDiagnostics.ping()');assert sum(x['done'] for x in signal(q)['state']['active']['points'])==before
  step(q,6);assert next(x for x in signal(q)['state']['active']['points'] if x['id']==point['id'])['done']
 assert signal(q)['state']['active']['status']=='return';assert bank(q)==task['reward']
 # Quiet zones fail on actual boosted motion, not a harmless button tap.
 q.evaluate('AbyssDiagnostics.grantCredits(10000);AbyssDiagnostics.grantCrystals(1000)');q.locator('#upgradesTab').click();buy(q,'engine')
 q.locator('#contractsTab').click();task=accept(q,'silent');depart(q);point=task['points'][0];move(q,point['x'],point['y'])
 step(q,.15,keys=[' ','arrowup']);assert signal(q)['state']['active']['status']=='retry'
 assert bank(q)==0;q.locator('#contractsTab').click();q.locator('#contractRetry').click();assert signal(q)['state']['active']['status']=='active'
 depart(q);move(q,point['x'],point['y']);use(q);assert bank(q)==task['reward']
 # Hunting is generated only after fitting a damaging weapon. Paid ammunition unchanged.
 q.locator('#upgradesTab').click();buy(q,'railgun');q.locator('#contractsTab').click()
 # The existing board was generated pre-weapon: completing one task advances it.
 if not any(x['kind']=='hunt' for x in offers(q)):
  task=accept(q,'cargo');depart(q);pt=task['points'][0];move(q,pt['x'],pt['y']);use(q);bank(q);q.locator('#contractsTab').click()
 task=accept(q,'hunt');depart(q)
 enemies=[e for e in debug(q)['predators'] if e['tier']==task['tier']][:task['required']]
 for e in enemies:q.evaluate('([id,hp])=>AbyssDiagnostics.hurtEnemy(id,hp)',[e['id'],e['health']])
 assert signal(q)['state']['active']['status']=='return';assert bank(q)==task['reward']

 def earned(a):return next(x for x in q.evaluate('AbyssDiagnostics.achievementCatalog()') if x['id']==a)['earned']
 assert earned('first-commission') and earned('versatile-operator')
 # Repeated real accepted cargo contracts, with manual use and physical docking.
 while signal(q)['state']['completed']<10:
  q.locator('#contractsTab').click();kind=next(o['kind'] for o in offers(q) if o['kind'] in ['cargo','silent']);task=accept(q,kind);depart(q)
  pt=task['points'][0];move(q,pt['x'],pt['y']);use(q);assert bank(q)==task['reward']
 assert earned('trusted-contractor')
 print('PASS first/ten-contract and four-distinct-type achievement triggers through actual accepting, completing and banking; no duplicate payment')
 assert not errors and not err2,(errors,err2)
 print('PASS: persistent offers, safe depths, cargo, wave arrival surveys, quiet-zone failure/retry, credited kills, bank-only payouts, no repeated payouts, resume.')
 c.close();c2.close();b.close()
