"""Generate deterministic browser screenshots from the production renderer."""
from pathlib import Path
import shutil
from playwright.sync_api import sync_playwright
from v090_exploration_test import build, details, fixture
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'screenshots/v0.9.0';OUT.mkdir(parents=True,exist_ok=True)
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path=shutil.which('chromium'))
 for touch,w,h in [(True,390,844),(True,844,390),(False,1440,900)]:
  context,page,errors=build(browser,w,h,touch)
  if not touch:
   page.locator('#focusToggleBtn').click();page.wait_for_timeout(100)
  fixture(page,depth=280,lights=True,upgrades={'flashlight':2,'minePower':3,'mineCapacity':3,'battery':3},mineAmmo=6)
  page.evaluate('AbyssDiagnostics.regenerate(227136)')
  page.evaluate('AbyssDiagnostics.lightingFixture({depth:280,facing:1.1,lights:true,freeze:true})')
  page.screenshot(path=str(OUT/f'{"mobile" if touch else "desktop"}-{w}x{h}-wide-trench.png'))
  if touch and w==390:
   for mark in [1,4]:
    fixture(page,depth=1100,lights=True,facing=1.1,upgrades={'flashlight':mark,'hull':7,'minePower':3,'mineCapacity':3},mineAmmo=6)
    page.evaluate('AbyssDiagnostics.regenerate(227136)')
    page.evaluate('AbyssDiagnostics.lightingFixture({depth:1100,facing:1.1,lights:true,freeze:true})')
    page.screenshot(path=str(OUT/f'mobile-flashlight-mk{mark}.png'))
  if not touch:
   page.evaluate('AbyssDiagnostics.moveTo(600,160)');page.evaluate('AbyssDiagnostics.use()')
   page.locator('[data-upgrade="flashlight"]').scroll_into_view_if_needed()
   page.screenshot(path=str(OUT/'desktop-flashlight-upgrade.png'))
  assert not errors,errors;context.close()
 browser.close()
print('PASS screenshot capture: actual production renderer, seeded gameplay scenes')
