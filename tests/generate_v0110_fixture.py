"""Generate a synthetic save using the unmodified v0.11.0 production runtime."""
from v0110_harness import *
import v0110_harness as old
from playwright.sync_api import sync_playwright
old.ROOT=Path('/mnt/data/abyss_v0110_legacy_runtime')
with sync_playwright() as pw:
 b=launch_browser(pw);c,p,e=old.build(b)
 p.evaluate('AbyssDiagnostics.grantCredits(5000)');old.dock(p)
 for u in ['hull','engine','minePower','magnet','shield']:old.buy(p,u)
 p.locator('#ammunitionTab').click();p.locator('#fillMinesBtn').click();p.locator('#launchAgain').click()
 old.move(p,600,700);old.step(p,.02)
 for kind in ['scrap','crystal','recorder']:
  n=next(n for n in old.debug(p)['items'] if n['type']==kind)
  old.move(p,n['x'],n['y']);old.use(p)
 old.dock(p);p.locator('#launchAgain').click();old.move(p,600,700);old.step(p,.02)
 enemy=old.debug(p)['predators'][0];p.evaluate('([i,d])=>AbyssDiagnostics.hurtEnemy(i,d)',[enemy['id'],34])
 assert not e,e
 fixture=old.store(p)
 (Path(__file__).parent/'fixtures/v0110_campaign.json').write_text(json.dumps(fixture,indent=2)+'\n')
 print('Generated fixture from v0.11.0 runtime:',old.state(p)['credits'],'credits; 1 secured recorder; 2 purchased mine rounds; finite deposits depleted; wounded predator')
 c.close();b.close()
