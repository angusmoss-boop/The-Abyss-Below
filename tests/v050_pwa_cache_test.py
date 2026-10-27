"""Real HTTP + service-worker offline smoke test under a GitHub-Pages-like subpath."""
from pathlib import Path
from functools import partial
import http.server
import socketserver
import threading
import tempfile
import shutil
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
class Server(socketserver.TCPServer):
    allow_reuse_address=True

def run():
    with tempfile.TemporaryDirectory() as tmp:
        site=Path(tmp)/'expedition';site.mkdir()
        for name in ['index.html','game.js','styles.css','manifest.webmanifest','service-worker.js','icon-192.png','icon-512.png','icon-maskable-512.png']:
            shutil.copy2(ROOT/name,site/name)
        server=Server(('127.0.0.1',0),partial(Quiet,directory=tmp))
        threading.Thread(target=server.serve_forever,daemon=True).start()
        try:
            with sync_playwright() as pw:
                browser=pw.chromium.launch(headless=True,executable_path=shutil.which('chromium'))
                context=browser.new_context(viewport={'width':1440,'height':900})
                page=context.new_page();errors=[]
                page.on('pageerror',lambda e:errors.append(str(e)))
                url=f'http://127.0.0.1:{server.server_address[1]}/expedition/'
                page.goto(url)
                page.evaluate('navigator.serviceWorker.ready')
                page.wait_for_function('navigator.serviceWorker.controller !== null')
                assert 'v0.7.0' in page.locator('footer').inner_text()
                keys=page.evaluate('''async()=>{
                    const cache=await caches.open('abyss-below-shell-v0.7.0');
                    return (await cache.keys()).map(r=>new URL(r.url).pathname+new URL(r.url).search);
                }''')
                for asset in ['game.js','styles.css','manifest.webmanifest']:
                    assert '/expedition/'+asset+'?v=0.6.0' in keys,(asset,keys)
                page.evaluate('''localStorage.setItem('the-abyss-below-v01',JSON.stringify({credits:777,xp:250,secured:[0,1],upgrades:{hull:4}}))''')
                context.set_offline(True)
                page.reload(wait_until='load')
                page.wait_for_function('window.AbyssDiagnostics !== undefined')
                assert 'v0.7.0' in page.locator('footer').inner_text()
                page.locator('#startBtn').click()
                state=page.evaluate('AbyssDiagnostics.state()')
                assert state['running'] and state['credits']==777 and state['hullLevel']==4 and state['secured']==2,state
                assert state['blackoutDepth']==1000
                page.locator('#pauseBtn').click()
                assert page.locator('#resumeBtn').is_visible()
                assert not errors,errors
                browser.close()
                print('PASS: real service worker caches version-matched assets under /expedition/; offline reload, gameplay and banked save work')
        finally:
            server.shutdown();server.server_close()

if __name__=='__main__':run()
