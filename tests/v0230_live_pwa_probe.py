"""Attempt real local HTTP navigation; record a block separately, never as PASS."""
from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from functools import partial
from threading import Thread
from playwright.sync_api import sync_playwright
import shutil,json
R=Path(__file__).resolve().parents[1]
class Handler(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Handler,directory=str(R)))
Thread(target=server.serve_forever,daemon=True).start();result={}
try:
 with sync_playwright() as pw:
  b=pw.chromium.launch(headless=True,executable_path=shutil.which('chromium'))
  p=b.new_page()
  try:
   p.goto(f'http://127.0.0.1:{server.server_port}/',wait_until='load',timeout=15000)
   result={'status':'NAVIGATION_AVAILABLE','note':'This probe alone does not test installed-app or offline behaviour.'}
  except Exception as e:result={'status':'BLOCKED','error':str(e),'conclusion':'Live HTTP, real worker installation and offline launch not verified.'}
  b.close()
finally:server.shutdown();server.server_close()
(R/'verification/v0.23.0/live-pwa-probe.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))
