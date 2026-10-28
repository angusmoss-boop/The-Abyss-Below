"""Launch success, image-failure, missing-code and accessibility fallbacks."""
from v0180_harness import *
from v0180_branding_ui_test import images
from playwright.sync_api import sync_playwright

def run():
 with sync_playwright() as pw:
  b=launch_browser(pw)
  c,p,e=build(b,390,844,True,launch=False);images(p)
  p.wait_for_function('!document.documentElement.classList.contains("abyss-launching")')
  assert p.evaluate('AbyssLaunch.status().ready && AbyssLaunch.status().finished')
  old=dict(store(p));p.evaluate('AbyssLaunch.ready();AbyssLaunch.ready()');assert store(p)==old
  c.close()
  for case in ['ready','image-error','image-stalled','missing-game','missing-launch','reduced-motion']:
   c=b.new_context(viewport={'width':390,'height':844},reduced_motion='reduce' if case=='reduced-motion' else 'no-preference')
   p=c.new_page();errors=[];p.on('pageerror',lambda x:errors.append(str(x)))
   p.set_content((ROOT/'index.html').read_text());p.add_style_tag(content=(ROOT/'styles.css').read_text());images(p)
   assert not p.locator('#launchScreen').is_visible()
   if case=='missing-launch':assert p.locator('#startBtn').is_visible();c.close();continue
   p.add_script_tag(content=(ROOT/'launch.js').read_text());assert p.locator('#launchScreen').is_visible()
   if case=='ready':
    p.screenshot(path=str(OUT/'launch-390x844.png'))
    p.keyboard.press('Tab');assert p.evaluate('document.activeElement.id')=='launchScreen'
   if case=='image-error':p.locator('#launchArt').evaluate('e=>e.decode=()=>Promise.reject(new Error("test image missing"))')
   if case=='image-stalled':p.locator('#launchArt').evaluate('e=>e.decode=()=>new Promise(()=>{})')
   if case!='missing-game':p.evaluate('AbyssLaunch.ready()')
   p.wait_for_function('!document.documentElement.classList.contains("abyss-launching")',timeout=10000)
   status=p.evaluate('AbyssLaunch.status()')
   expected={'ready':'ready','image-error':'image-unavailable','image-stalled':'image-timeout','missing-game':'startup-timeout','reduced-motion':'ready'}[case]
   assert status['reason']==expected,(case,status)
   assert p.locator('#launchScreen').get_attribute('aria-hidden')=='true'
   assert not errors,errors
   c.close()
  b.close()
 print('PASS launch handoff; decode error/stall and missing-game watchdog; missing-launch fallback; reduced motion; keyboard focus; repeat readiness cannot alter saves')
if __name__=='__main__':run()
