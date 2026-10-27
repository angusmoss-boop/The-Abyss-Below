"""One-time compatibility fixture from the actual prior archive, synthetic data only."""
from pathlib import Path
import sys,json,zipfile,shutil
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
archive=Path(sys.argv[1]) if len(sys.argv)>1 else R.parent/'the-abyss-below-v0.12.0-complete.zip'
with zipfile.ZipFile(archive) as z:assets={name:z.read(name).decode() for name in ['index.html','styles.css','game.js','version-sync.js']}
with sync_playwright() as pw:
 b=pw.chromium.launch(headless=True,executable_path=shutil.which('chromium'));c=b.new_context(service_workers='block');p=c.new_page();errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
 p.set_content(assets['index.html']);p.add_style_tag(content=assets['styles.css'])
 p.evaluate("window.ABYSS_TEST_MODE=true;window.testStore={};Object.defineProperty(window,'localStorage',{value:{getItem:k=>testStore[k]??null,setItem:(k,v)=>testStore[k]=v,removeItem:k=>delete testStore[k]}})")
 for name in ['game.js','version-sync.js']:p.add_script_tag(content=assets[name])
 p.locator('#startBtn').click();p.evaluate('requestAnimationFrame=()=>0');p.wait_for_timeout(80)
 p.evaluate('AbyssDiagnostics.step(0);AbyssDiagnostics.grantCredits(2000);AbyssDiagnostics.grantCrystals(80)')
 # Generate/deplete all five real levels; preserve banked progress and partial objectives.
 p.evaluate('''()=>{for(let i=0;i<5;i++){AbyssDiagnostics.fixtureLevel(i);const d=AbyssDiagnostics.debug();for(const type of ['scrap','crystal','recorder']){const n=d.items.find(n=>n.type===type&&!n.collected);AbyssDiagnostics.moveTo(n.x,n.y);AbyssDiagnostics.use();}AbyssDiagnostics.moveTo(600,160);AbyssDiagnostics.use();}AbyssDiagnostics.fixtureLevel(0);AbyssDiagnostics.moveTo(600,160);AbyssDiagnostics.use();}''')
 for system in ['hull','engine','minePower','shield']:
  p.locator('[data-system="'+system+'"]').click();p.locator('#upgradePurchase').click();p.locator('#upgradeDetailClose').click()
 p.locator('#ammunitionTab').click();p.locator('#buyMineBtn').click();p.locator('#launchAgain').click()
 p.evaluate('''()=>{const e=AbyssDiagnostics.debug().predators[0];AbyssDiagnostics.hurtEnemy(e.id,23);AbyssDiagnostics.setStats({sonarPulses:17});AbyssDiagnostics.save();}''')
 (R/'tests/fixtures/v0120_campaign.json').write_text(json.dumps(p.evaluate('testStore'),indent=2)+'\n')
 assert not errors,errors;b.close()
 print('Generated synthetic five-level fixture using actual v0.12.0 runtime')
