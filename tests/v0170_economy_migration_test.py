"""Migrate actual v0.16 runtime save and exercise independent timed economies in all three slots."""
from v0170_harness import *
from playwright.sync_api import sync_playwright
import zipfile,copy
INDEX='abyss-campaign-slots-v1'

def make_old(browser):
 with zipfile.ZipFile(ROOT.parent/'the-abyss-below-v0.16.0-complete.zip') as z:
  c=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,service_workers='block');p=c.new_page();p.set_default_timeout(5000)
  html=z.read('index.html').decode();p.set_content(html);p.add_style_tag(content=z.read('styles.css').decode())
  p.evaluate('''()=>{window.ABYSS_TEST_MODE=true;window.testStore={};Object.defineProperty(window,'localStorage',{value:{getItem:k=>testStore[k]??null,setItem:(k,v)=>testStore[k]=v,removeItem:k=>delete testStore[k]}})}''')
  for path in re.findall(r'<script\s+[^>]*src=["\']([^"\']+)',html):p.add_script_tag(content=z.read(path.split('?')[0]).decode())
  p.locator('#startBtn').click();p.evaluate('requestAnimationFrame=()=>0');p.wait_for_timeout(65);p.evaluate('AbyssDiagnostics.step(0)')
  assert state(p)['version']=='0.16.0'
  p.evaluate('AbyssDiagnostics.grantCredits(2000);AbyssDiagnostics.grantCrystals(40)');dock(p)
  for u in ['railgun','torpedo','hull','magnet']:buy(p,u)
  depart(p);d=debug(p)
  for kind in ['scrap','crystal']:
   n=next(n for n in d['items'] if n['type']==kind);move(p,n['x'],n['y']);use(p)
  move(p,600,750);p.evaluate('AbyssDiagnostics.face(Math.PI/2)');assert p.evaluate("AbyssDiagnostics.fire('railgun')");assert p.evaluate("AbyssDiagnostics.fire('torpedo')")
  p.evaluate('AbyssDiagnostics.save()');data=store(p);c.close();return data

def run():
 with sync_playwright() as pw:
  b=launch_browser(pw);fixture=ROOT/'tests/fixtures/v0160_economy.json'
  if (ROOT.parent/'the-abyss-below-v0.16.0-complete.zip').exists():data=make_old(b);fixture.write_text(json.dumps(data,indent=2)+'\n')
  else:data=json.loads(fixture.read_text())
  old=json.loads(data[CAMPAIGN]);before=copy.deepcopy(old)
  assert old['profile']['weaponAmmo']=={'railgun':11,'torpedo':2}
  # Other campaigns are fixture copies of the real archived save, with distinct identities and balances.
  for slot in [2,3]:
   d=copy.deepcopy(old);d['id']='synthetic-campaign-'+str(slot);d['profile']['credits']=100*slot;d['title']='Economy '+str(slot);data['the-abyss-below-slot-'+str(slot)+'-v1']=json.dumps(d)
  index=json.loads(data[INDEX]);index['titles']=['Legacy campaign','Economy 2','Economy 3'];data[INDEX]=json.dumps(index)
  errors=[]
  for slot in [1,2,3]:
   index=json.loads(data[INDEX]);index['active']=slot;data[INDEX]=json.dumps(index);key='the-abyss-below-slot-'+str(slot)+'-v1'
   pristine_other={k:data.get(k) for k in ['the-abyss-below-slot-'+str(i)+'-v1' for i in [1,2,3] if i!=slot]}
   original=json.loads(data[key]);c,p,e=build(b,store=data);errors+=e;d=debug(p)
   assert state(p)['slot']==slot and state(p)['paused'] and state(p)['campaignId']==original['id']
   assert d['saved']['credits']==original['profile']['credits'] and d['saved']['crystals']==original['profile']['crystals']
   assert d['saved']['upgrades']==original['profile']['upgrades'] and state(p)['weaponAmmo']==original['profile']['weaponAmmo']
   f=original['levels'][original['selectedLevel']]
   for k in ['loot','looted','secured','seed','cycle','health','wild','survey']:
    assert d['field'][k]==f[k],(slot,k)
   assert d['player']['cargo']==original['activeDive']['player']['cargo'] and d['projectiles']==original['activeDive']['projectiles']
   regen=d['field']['salvage'];assert regen['elapsed']==0 and len(regen['due'])==1 and list(regen['due'].values())==[300]
   p.evaluate('AbyssDiagnostics.economyPulse(23,true)');assert debug(p)['field']['salvage']['elapsed']==23
   p.evaluate('AbyssDiagnostics.save()');after=store(p)
   for k,value in pristine_other.items():assert after[k]==value,(slot,k,'inactive save mutated')
   c.close();c,p,e=build(b,store=after);errors+=e;assert debug(p)['field']['salvage']['elapsed']==23
   assert state(p)['weaponAmmo']=={'railgun':11,'torpedo':2}
   data=store(p);c.close()
  assert not errors,errors;b.close()
  print('PASS actual v0.16 migration preserves campaign, currency, all upgrades, ammo, depletion, world, wildlife, chart, cargo and projectiles; all 3 slots get independent bounded recovery state; inactive campaigns untouched')
if __name__=='__main__':run()
