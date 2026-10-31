"""Migration from actual v0.24 runtime in all three slots, followed by new save/export/import."""
from v0250_harness import *
from playwright.sync_api import sync_playwright
from zipfile import ZipFile
import copy,re,json

def old_build(b):
 with ZipFile(ROOT.parent/'the-abyss-below-v0.24.0-complete.zip') as z:
  c=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,service_workers='block');p=c.new_page();errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
  p.set_content(z.read('index.html').decode());p.add_style_tag(content=z.read('styles.css').decode())
  p.evaluate('''()=>{window.ABYSS_TEST_MODE=true;window.testStore={};Object.defineProperty(window,'localStorage',{value:{getItem:k=>testStore[k]??null,setItem:(k,v)=>testStore[k]=v,removeItem:k=>delete testStore[k]}})}''')
  for src in re.findall(r'<script\s+[^>]*src=["\']([^"\']+)',z.read('index.html').decode()):p.add_script_tag(content=z.read(src.split('?')[0]).decode())
 p.locator('#startBtn').click();p.evaluate('requestAnimationFrame=()=>0');p.wait_for_timeout(65);step(p,0);return c,p,errors

def run():
 with sync_playwright() as pw:
  b=launch_browser(pw);c,p,errors=old_build(b)
  assert state(p)['version']=='0.24.0'
  p.evaluate('AbyssDiagnostics.grantCredits(5000);AbyssDiagnostics.grantCrystals(40)');dock(p)
  for u in ['hull','engine','railgun','torpedo','shield']:buy(p,u)
  depart(p);p.evaluate('AbyssDiagnostics.weaponStock({railgun:9,torpedo:2})')
  for kind in ['scrap','crystal']:
   n=next(n for n in debug(p)['items'] if n['type']==kind and not n['collected']);move(p,n['x'],n['y'])
   p.evaluate('AbyssDiagnostics.autoPickup()' if kind=='scrap' else 'AbyssDiagnostics.contactPickups()')
  p.evaluate('AbyssDiagnostics.setSystems({hull:30,oxygen:73,battery:41});AbyssDiagnostics.repair();AbyssDiagnostics.save()')
  assert not state(p)['repairReady'];before=debug(p);ss=store(p);prices=p.evaluate('AbyssDiagnostics.costs()');original=json.loads(ss[CAMPAIGN]);c.close()
  for i in [1,2,3]:
   d=copy.deepcopy(original);d['id']+='-slot'+str(i);d['title']='Legacy ecology '+str(i);d['profile']['credits']+=i
   ss[f'the-abyss-below-slot-{i}-v1']=json.dumps(d)
  for active in [1,2,3]:
   current=copy.deepcopy(ss);idx=json.loads(current['abyss-campaign-slots-v1']);idx['active']=active;current['abyss-campaign-slots-v1']=json.dumps(idx)
   c,p,e=build(b,store=current);errors+=e;after=debug(p)
   for k in ['x','y','vx','vy','facing','hull','oxygen','battery','cargo','weaponAmmo','mineAmmo','repairReady']:assert before['player'][k]==after['player'][k],k
   for k in ['seed','cycle','loot','looted','salvage','secured','wild','batteryCells','rescue','recoveries']:assert before['field'][k]==after['field'][k],k
   assert before['rocks']==after['rocks'] and before['predators']==after['predators']
   assert prices==p.evaluate('AbyssDiagnostics.costs()')
   for other in [1,2,3]:
    if other!=active:assert store(p)[f'the-abyss-below-slot-{other}-v1']==current[f'the-abyss-below-slot-{other}-v1']
   assert len(p.evaluate('AbyssDiagnostics.ecology().creatures'))==1
   p.evaluate('AbyssDiagnostics.ecologyFixture({elapsed:763,observations:{glider:{levelId:"sunbreak-shelf",depth:90,time:732}}});AbyssDiagnostics.save()')
   ecology=p.evaluate('AbyssDiagnostics.ecology().state');newstore=store(p)
   payload=json.loads(newstore[f'the-abyss-below-slot-{active}-v1']);assert payload['living']==ecology
   assert p.evaluate('d=>AbyssSignals.unpack(AbyssSignals.pack(d)).payload.living',payload)==ecology
   bad=copy.deepcopy(payload);bad['living']['observations']['glider']['depth']=-4
   assert p.evaluate('d=>{try{AbyssSignals.validateCampaign(d);return false;}catch(e){return true;}}',bad)
   c.close();c,p,e=build(b,store=newstore);errors+=e
   assert p.evaluate('AbyssDiagnostics.ecology().state')==ecology
   assert state(p)['paused'] and not state(p)['repairReady'];c.close()
  assert not errors,errors;b.close()
 print('PASS actual v0.24 migration in all 3 slots: exact geometry/cargo/health/ammo/spent repair/prices retained, inactive slots unchanged; new clock/animals/observations round-trip through saves and validated backups')
if __name__=='__main__':run()
