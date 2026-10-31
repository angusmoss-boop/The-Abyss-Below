from v0250_harness import *
from playwright.sync_api import sync_playwright
with sync_playwright() as pw:
 b=launch_browser(pw);c,p,errors=build(b,390,844,True)
 rows=p.evaluate('AbyssDiagnostics.signals().records');assert len(rows)==20 and not any(r['unlocked'] for r in rows)
 p.evaluate('AbyssDiagnostics.openJournal()');assert p.locator('[data-record]').count()==20
 assert 'A voice still below' in p.locator('.transcript').inner_text();assert state(p)['paused'];p.locator('#signalsClose').click()
 first=next(n for n in debug(p)['items'] if n['type']=='recorder');move(p,first['x'],first['y']);use(p)
 p.evaluate('AbyssDiagnostics.openJournal()');assert 'A voice still below' in p.locator('.transcript').inner_text();p.locator('#signalsClose').click()
 dock(p);p.locator('#archiveTab').click();p.locator('[data-chapter="0"]').click()
 assert 'Routine maintenance' in p.locator('.transcript').inner_text();assert 'MARA VENN' in p.locator('.transcript').inner_text()
 p.screenshot(path=str(OUT/'journal-390x844.png'));p.locator('#signalsClose').click();p.locator('#launchAgain').click()
 fix(p,upgrades={'hull':7,'battery':4,'oxygen':5})
 for index in range(5):
  p.evaluate('(i)=>AbyssDiagnostics.fixtureLevel(i)',index)
  for item in [i for i in debug(p)['items'] if i['type']=='recorder']:
   move(p,item['x'],item['y']);use(p)
  dock(p)
  if p.locator('#victoryClose').is_visible():p.locator('#victoryClose').click()
  if p.locator('#launchAgain').is_visible():p.locator('#launchAgain').click()
 assert state(p)['totalRecorders']==20
 assert all(r['unlocked'] for r in p.evaluate('AbyssDiagnostics.signals().records'))
 p.evaluate('AbyssDiagnostics.openJournal()');p.locator('[data-record="calypso-abyss:5"]').click();assert 'Open water' in p.locator('.transcript').inner_text()
 assert not p.evaluate('AbyssDiagnostics.signals().state.warden.activated'),'Story progression activated optional boss'
 p.locator('#signalsClose').click();p.evaluate('AbyssDiagnostics.unfreeze();AbyssDiagnostics.backgroundPause()')
 p.locator('#pauseJournalBtn').click();p.locator('#signalsClose').click();assert state(p)['pauseOpen'] and state(p)['paused']
 p.locator('#pauseMenuBtn').click();p.locator('#menuJournalBtn').click();p.locator('#signalsClose').click();assert state(p)['menuOpen']
 p.evaluate('AbyssDiagnostics.save()');checkpoint=store(p);c.close();c,p,e=build(b,store=checkpoint,launch=False)
 assert sum(r['unlocked'] for r in p.evaluate('AbyssDiagnostics.signals().records'))==20
 assert not errors+e,errors+e
 print('PASS 20 distinct bank-gated transcripts; carrying is not decrypting; all five existing chapter gates work; optional Warden stays asleep; journal pauses safely, closes to its prior interface and persists via secured recorders.')
 c.close();b.close()
