"""Optional real local-origin navigation/worker/offline integration. No mocked networking."""
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from functools import partial
from threading import Thread
import shutil,json,sys
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*a):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT)))
Thread(target=server.serve_forever,daemon=True).start()
report={'status':'NOT_RUN','limitations':[]}
try:
 with sync_playwright() as pw:
  b=pw.chromium.launch(headless=True,executable_path=shutil.which('chromium'),args=['--no-proxy-server'])
  c=b.new_context();p=c.new_page();p.set_default_timeout(10000);errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
  url=f'http://127.0.0.1:{server.server_port}/'
  p.goto(url,wait_until='load',timeout=12000)
  p.wait_for_function('navigator.serviceWorker.controller!==null',timeout=12000)
  p.evaluate('AbyssVersion.check(true)')
  assert p.evaluate('AbyssVersion.state().status')=='current'
  p.locator('#startBtn').click();p.keyboard.press('e');assert p.locator('[data-system]').count()==14
  p.locator('[data-system="shield"]').click();assert p.locator('#upgradeDialog').is_visible();p.keyboard.press('Escape');p.locator('#launchAgain').click()
  c.set_offline(True);p.reload(wait_until='load',timeout=12000)
  assert p.evaluate('AbyssBuild.version')=='0.16.0'
  assert p.locator('#startBtn').is_visible()
  assert p.evaluate('AbyssVersion.state().status')=='offline'
  p.locator('#startBtn').click();assert p.locator('#resumeBtn').is_visible();p.locator('#resumeBtn').click();p.keyboard.press('e');assert p.locator('[data-system]').count()==14
  assert not errors,errors
  report={'status':'PASS','checks':['Real localhost HTTP boot','Service worker installed and controlling','Published hashes and loaded build verified current','Native nested dock popup','Offline cached reload of v0.16.0','Offline status never claims latest','Offline game and dock usable'],'limitations':['Localhost Chromium only, not GitHub Pages or physical phone','Upgrade from a previously installed live release not covered']}
  b.close()
except Exception as e:
 report={'status':'BLOCKED_OR_FAILED','error':str(e),'limitations':['No successful live offline integration claim']}
finally:
 server.shutdown();out=ROOT/'verification/v0.16.0';out.mkdir(parents=True,exist_ok=True)
 (out/'live-pwa.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
if report['status']!='PASS':sys.exit(2)
