"""Create a real v0.14 snapshot, then migrate and resume using current production files."""
from v0182_harness import *
from playwright.sync_api import sync_playwright
import zipfile,sys,copy

def old_build(browser,z):
 c=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,service_workers='block');p=c.new_page();p.set_default_timeout(4000)
 p.set_content(z.read('index.html').decode());p.add_style_tag(content=z.read('styles.css').decode());errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
 p.evaluate('''()=>{window.ABYSS_TEST_MODE=true;window.testStore={};Object.defineProperty(window,'localStorage',{value:{getItem:k=>testStore[k]??null,setItem:(k,v)=>testStore[k]=v,removeItem:k=>delete testStore[k]}})}''')
 for file in ['audio.js','game.js','version-sync.js']:p.add_script_tag(content=z.read(file).decode())
 p.locator('#startBtn').click();p.evaluate('requestAnimationFrame=()=>0');p.wait_for_timeout(65);p.evaluate('AbyssDiagnostics.step(0)')
 return c,p,errors

def run(baseline=None):
 with sync_playwright() as pw:
  b=launch_browser(pw)
  fixture=ROOT/'tests/fixtures/v0140_campaign_wild.json'
  if baseline:
   # Same seed, independent RNG. Identify a mine that would otherwise overlap the old saved vessel.
   c,p,e=build(b);p.evaluate('AbyssDiagnostics.regenerate(17)');candidate=p.evaluate('AbyssDiagnostics.wild().mines[0]');c.close()
   with zipfile.ZipFile(baseline) as z:c,p,e=old_build(b,z)
   assert state(p)['version']=='0.14.0'
   p.evaluate('AbyssDiagnostics.regenerate(17);AbyssDiagnostics.grantCredits(3000);AbyssDiagnostics.grantCrystals(150)');dock(p)
   for system in ['hull','engine','minePower','shield']:buy(p,system)
   p.locator('#ammunitionTab').click();p.locator('#fillMinesBtn').click();depart(p)
   data=debug(p)
   for node in [next(n for n in data['items'] if n['type']=='scrap'),next(n for n in data['items'] if n['type']=='crystal')]:move(p,node['x'],node['y']);use(p)
   p.evaluate('AbyssDiagnostics.hurtEnemy("enemy-0",20)');move(p,candidate['x'],candidate['y']);p.evaluate('AbyssDiagnostics.surveyNow();AbyssDiagnostics.save()')
   snapshot=store(p);fixture.write_text(json.dumps(snapshot,indent=2)+'\n');c.close()
  else:snapshot=json.loads(fixture.read_text())
  old=json.loads(snapshot['the-abyss-below-campaign-v3']);oldField=old['levels'][old['selectedLevel']];active=old['activeDive'];assert active
  c,p,e=build(b,390,844,True,store=snapshot,launch=False)
  assert state(p)['hasSavedDive']
  p.locator('#startBtn').click();new=debug(p);w=p.evaluate('AbyssDiagnostics.wild()')
  assert state(p)['paused'] and state(p)['running']
  assert new['saved']['credits']==old['profile']['credits'] and new['saved']['crystals']==old['profile']['crystals']
  assert all(new['saved']['upgrades'][k]==v for k,v in old['profile']['upgrades'].items()) and new['saved']['mineAmmo']==old['profile']['mineAmmo']
  for k in ['seed','cycle','loot','looted','health','secured','recoveries']:assert new['field'][k]==oldField[k],k
  for k in ['x','y','hull','oxygen','battery','boost','mineAmmo','cargo','vx','vy']:assert new['player'][k]==active['player'][k],k
  assert new['mines']==active['mines'] and new['predators']==active['predators'] and new['items']==active['items']
  assert any(m['detonated'] for m in w['mines']) and w['field']['retired']
  assert all(m['detonated'] or ((m['x']-state(p)['x'])**2+(m['y']-state(p)['y'])**2)**.5>120 for m in w['mines'])
  assert state(p)['recoveryPods']==0
  print('PASS actual v0.14 save migration: active ship/cargo/owned ammo/mine state/predators/finite loot/profile preserved; only unsafe new encounters near saved vessel are retired; no cargo duplication',flush=True)
  # New snapshots retain wildlife and close mine approaches rather than erasing them on every resume.
  p.locator('#resumeBtn').click();p.evaluate('AbyssDiagnostics.setSystems({hull:296,oxygen:150,battery:200})');step(p,.25)
  p.evaluate('AbyssDiagnostics.save()');newstore=store(p);w=p.evaluate('AbyssDiagnostics.wild()');clock=debug(p)['clock'];c.close()
  c,p,e2=build(b,390,844,True,store=newstore);ww=p.evaluate('AbyssDiagnostics.wild()')
  assert ww['schools']==w['schools'] and ww['benthos']==w['benthos']
  assert ww['field']==w['field'] and debug(p)['clock']==clock and state(p)['paused']
  assert ww['mines']==w['mines']
  assert not e+e2,e+e2;c.close();b.close()
  print('PASS current-build wildlife, fear, fish positions, reactions, hazard state and simulation time restore exactly without offline time advance or extra hazard retirement',flush=True)
if __name__=='__main__':run(sys.argv[1] if len(sys.argv)>1 else None)
