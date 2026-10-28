"""Production-file Chromium harness. No network or service-worker claims."""
from pathlib import Path
import json, shutil, re
from urllib.parse import urlsplit
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'screenshots/v0.18.1'; OUT.mkdir(parents=True,exist_ok=True)
SAVE='the-abyss-below-v01'; CAMPAIGN='the-abyss-below-slot-1-v1'; FIELD='the-abyss-below-field-v1'
def build(browser,w=1440,h=900,touch=False,store=None,launch=True,stop_raf=True):
 context=browser.new_context(viewport={'width':w,'height':h},is_mobile=touch,has_touch=touch,device_scale_factor=1,service_workers='block')
 page=context.new_page();page.set_default_timeout(4000);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content((ROOT/'index.html').read_text());page.add_style_tag(content=(ROOT/'styles.css').read_text())
 page.evaluate('''store=>{window.ABYSS_TEST_MODE=true;window.testStore=store;Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>testStore[k]??null,setItem:(k,v)=>testStore[k]=v,removeItem:k=>delete testStore[k]}})}''',store or {})
 # Read entry points from the actual HTML: a missing script tag must fail the boot check.
 sources=re.findall(r'<script\s+[^>]*src=["\']([^"\']+)',(ROOT/'index.html').read_text())
 assert sources==['launch.js?v=0.18.1','campaign-slots.js?v=0.18.1','audio.js?v=0.18.1','lost-signals.js?v=0.18.1','game.js?v=0.18.1','version-sync.js?v=0.18.1'],sources
 for src in sources:page.add_script_tag(content=(ROOT/urlsplit(src).path).read_text())
 if launch: page.locator('#startBtn').click()
 if stop_raf:
  page.evaluate('requestAnimationFrame=()=>0');page.wait_for_timeout(65)
  if launch: page.evaluate('AbyssDiagnostics.step(0)')
 return context,page,errors

def state(p):return p.evaluate('AbyssDiagnostics.state()')
def debug(p):return p.evaluate('AbyssDiagnostics.debug()')
def store(p):return p.evaluate('testStore')
def fix(p,**kwargs):return p.evaluate('a=>AbyssDiagnostics.simulationFixture(a)',kwargs)
def step(p,seconds=0,keys=[],freeze=True):return p.evaluate('([t,keys,freeze])=>AbyssDiagnostics.step(t,{heldKeys:keys,freezeAfter:freeze})',[seconds,keys,freeze])
def move(p,x,y):p.evaluate('([x,y])=>AbyssDiagnostics.moveTo(x,y)',[x,y])
def use(p):p.evaluate('AbyssDiagnostics.use()')
def dock(p):
 if p.locator('#pauseOverlay').is_visible():p.locator('#resumeBtn').click()
 move(p,600,160);use(p)
def depart(p):
 if p.locator('#launchAgain').count():p.locator('#launchAgain').click()
 move(p,600,600);step(p,.01)
def centre(p,id):
 r=p.locator('#'+id).bounding_box();return r['x']+r['width']/2,r['y']+r['height']/2

def launch_browser(pw):return pw.chromium.launch(headless=True,executable_path=shutil.which('chromium'))

# Exercise the production pop-up before purchasing, never inject a purchase.
def buy(p,system):
 p.locator('[data-system="'+system+'"]').click()
 p.locator('#upgradePurchase').click()
 p.locator('#upgradeDetailClose').click()
