"""Real archived v0.13 code creates a synthetic save; new code migrates it.
Pass --baseline /path/to/v0.13.0-complete.zip, or use the retained fixture.
"""
from v0172_harness import *
from playwright.sync_api import sync_playwright
import zipfile,argparse

def old_build(b,z,w=390,h=844):
 c=b.new_context(viewport={'width':w,'height':h},is_mobile=True,has_touch=True,service_workers='block');p=c.new_page();p.set_default_timeout(4000)
 p.set_content(z.read('index.html').decode());p.add_style_tag(content=z.read('styles.css').decode())
 p.evaluate('''()=>{window.ABYSS_TEST_MODE=true;window.testStore={};Object.defineProperty(window,'localStorage',{value:{getItem:k=>testStore[k]??null,setItem:(k,v)=>testStore[k]=v,removeItem:k=>delete testStore[k]}})}''')
 p.add_script_tag(content=z.read('game.js').decode());p.add_script_tag(content=z.read('version-sync.js').decode());p.locator('#startBtn').click();p.evaluate('requestAnimationFrame=()=>0');p.wait_for_timeout(65);p.evaluate('AbyssDiagnostics.step(0)')
 return c,p

def run(baseline):
 with sync_playwright() as pw:
  b=launch_browser(pw);compare=[]
  fixture=ROOT/'tests/fixtures/v0130_campaign.json'
  if baseline:
   z=zipfile.ZipFile(baseline);c,p=old_build(b,z)
   assert state(p)['version']=='0.13.0'
   p.evaluate('AbyssDiagnostics.grantCredits(3000);AbyssDiagnostics.grantCrystals(100)');dock(p)
   for name in ['hull','engine','minePower','shield']:buy(p,name)
   p.locator('#ammunitionTab').click();p.locator('#fillMinesBtn').click();depart(p)
   d=debug(p)
   for n in [next(n for n in d['items'] if n['type']=='scrap'),next(n for n in d['items'] if n['type']=='crystal')]:move(p,n['x'],n['y']);use(p)
   enemy=debug(p)['predators'][0];p.evaluate('([id])=>AbyssDiagnostics.hurtEnemy(id,20)',[enemy['id']]);p.evaluate('AbyssDiagnostics.save()')
   data=store(p);fixture.write_text(json.dumps(data,indent=2)+'\n');c.close()
   for w,h in [(390,844),(844,390)]:
    c,p=old_build(b,z,w,h);fix(p,depth=210,upgrades={'hull':7,'engine':4,'shield':4})
    compare.append({'width':w,'height':h,'old_hud_height':p.locator('.cockpit-hud').bounding_box()['height']});c.close()
   z.close()
  else:data=json.loads(fixture.read_text())
  old=json.loads(data['the-abyss-below-campaign-v3']);profile=old['profile'];field=old['levels'][old['selectedLevel']]
  c,p,e=build(b,store=data);d=debug(p)
  assert d['saved']['credits']==profile['credits'] and d['saved']['crystals']==profile['crystals']
  assert all(d['saved']['upgrades'][k]==v for k,v in profile['upgrades'].items()) and d['saved']['mineAmmo']==profile['mineAmmo']
  assert state(p)['campaignId']==old['id'] and state(p)['levelId']==old['selectedLevel']
  for key in ['loot','looted','secured','seed','cycle','health','killed']:
   assert d['field'].get(key)==field.get(key),key
  assert 'survey' in d['field'] and d['field']['survey']['contacts']['station']['type']=='station'
  # Old build journalled cargo but could not resume it. Keep its recovery behaviour.
  assert state(p)['recoveryPods']==1
  again=store(p);c.close();c,p,e2=build(b,store=again);e+=e2
  assert state(p)['recoveryPods']==1 and state(p)['paused'] and state(p)['running']
  assert not e,e;c.close();print('PASS actual v0.13 credits/crystals/12 upgrade marks/owned ammo/campaign ID/level/seed/finite stocks/depletion/recorder/enemy damage preserved; chart starts partial; old pending cargo recovered once')
  for v in compare:
   c,p,e=build(b,v['width'],v['height'],True);fix(p,depth=210,upgrades={'hull':7,'engine':4,'shield':4});v['new_hud_height']=p.locator('.cockpit-hud').bounding_box()['height'];v['reduction_percent']=round(100*(1-v['new_hud_height']/v['old_hud_height']),2);c.close()
  if compare:
   (ROOT/'verification/v0.17.2/hud-before-after.json').write_text(json.dumps(compare,indent=2)+'\n');print('PASS production old/new HUD comparison',compare)
  b.close()
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--baseline',default=None);run(a.parse_args().baseline)
