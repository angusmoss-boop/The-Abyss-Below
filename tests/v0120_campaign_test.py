"""Campaign progression, actual collection/docking paths, two currencies, recovery and save reloads."""
from v0120_harness import *
from playwright.sync_api import sync_playwright
import math

def take(p,node):
 move(p,node['x'],node['y']);use(p)
def close_dock(p):
 if p.locator('#victoryClose').count():p.locator('#victoryClose').click()
 if p.locator('#launchAgain').count():p.locator('#launchAgain').click()
def complete(p):
 close_dock(p);move(p,600,700);step(p,.01)
 for node in debug(p)['items']:
  if node['type']=='recorder' and not node['collected']:take(p,node)
 dock(p)
 if p.locator('#victoryClose').count():p.locator('#victoryClose').click()
def boot(pw,store_=None):
 b=launch_browser(pw);c,p,e=build(b,store=store_);return b,c,p,e

def run():
 with sync_playwright() as pw:
  b,c,p,errors=boot(pw)
  assert state(p)['version']=='0.12.0' and state(p)['maxWorldDepth']==300
  assert state(p)['recorderDepths']==[75,260] and state(p)['predators']==15
  assert len(p.evaluate('AbyssDiagnostics.achievementCatalog()'))==20
  dock(p);p.locator('#expeditionsTab').click()
  assert p.locator('[data-travel]').count()==5
  assert not p.evaluate("AbyssDiagnostics.selectLevel('glassbone-rift')")
  fixed={};stocks=[];densities=[]
  for index in range(5):
   d=debug(p);l=d['levels'][index];sid=l['id'];s=state(p)
   assert s['levelId']==sid and s['maxWorldDepth']==[300,600,1000,1400,1800][index]
   assert len(s['recorderDepths'])==index+2
   assert s['predators']==l['common']+l['apex']+l['reaper']
   densities.append(s['predators']/l['depth'])
   loot=d['field']['loot'];fixed[sid]=loot
   gems=sum(n['quantity'] for n in loot if n['type']=='crystal');scrap=sum(n['quantity'] for n in loot if n['type']=='scrap')
   assert gems==[36,70,100,130,160][index]
   assert scrap==[84,130,170,210,250][index]
   stocks.append((scrap*18,gems))
   assert all(58<=n['y']<120+l['depth']*10 for n in loot)
   # Resource pickups do not grant either banked currency until physically docked.
   close_dock(p);move(p,600,700);step(p,.01)
   before=state(p);target=next(n for n in loot if n['type']=='crystal');take(p,target)
   assert state(p)['crystals']==before['crystals'] and debug(p)['player']['cargo']['crystal']==2
   # Recorders in the cargo hold alone do not unlock the next level.
   for n in debug(p)['items']:
    if n['type']=='recorder':take(p,n)
   if index<4:assert not debug(p)['levels'][index+1]['unlocked']
   dock(p)
   assert state(p)['crystals']==before['crystals']+2 and state(p)['credits']==before['credits']
   assert state(p)['levelComplete']
   p.locator('#victoryClose').click()
   if index<4:
    assert debug(p)['levels'][index+1]['unlocked']
    p.locator('[data-travel="'+debug(p)['levels'][index+1]['id']+'"]').click()
  assert densities==sorted(densities) and len(set(densities))==5
  assert sum(x[0] for x in stocks)==15192 and sum(x[1] for x in stocks)==496
  assert state(p)['totalRecorders']==20
  # Hub revisits do not reset any fixed resources or generate a second layout.
  for sid,nodes in fixed.items():
   if state(p)['levelId']!=sid:p.locator('[data-travel="'+sid+'"]').click()
   assert debug(p)['field']['loot']==nodes
   assert next(n for n in debug(p)['items'] if n['id']==next(n for n in nodes if n['type']=='crystal')['id'])['collected']
  snapshot=store(p)
  c.close();c,p,e2=build(b,store=snapshot);errors+=e2
  assert state(p)['totalRecorders']==20 and len(debug(p)['campaignLevels'])==5
  assert all(debug(p)['campaignLevels'][sid]['loot']==nodes for sid,nodes in fixed.items())
  assert all(l['unlocked'] for l in debug(p)['levels'])
  print('PASS five physical level definitions, 2/3/4/5/6 recorder gates, banking requirement, increasing threat density, hub revisit and reload persistence, exact 15,192 CR / 496 crystal stock')
  assert not errors,errors;c.close()
  # Independent currency guard and full purchase path through actual modal buttons.
  c,p,errors=build(b);dock(p);p.evaluate('AbyssDiagnostics.grantCredits(80);AbyssDiagnostics.grantCrystals(1)')
  p.locator('[data-system="hull"]').click();assert p.locator('#upgradePurchase').is_disabled()
  assert 'crystals' in p.locator('#upgradePriceNote').inner_text()
  p.locator('#upgradeDetailClose').click();p.evaluate('AbyssDiagnostics.grantCrystals(2)')
  buy(p,'hull');assert state(p)['credits']==0 and state(p)['crystals']==0 and state(p)['safeDepth']==330
  p.evaluate('AbyssDiagnostics.grantCredits(100000);AbyssDiagnostics.grantCrystals(100000)')
  before=state(p)
  purchases=p.evaluate('''()=>{let n=0,spentCR=0,spentGems=0;
    for(const u of AbyssDiagnostics.upgradeCatalog()){
      document.querySelector('[data-system="'+u.id+'"]').click();
      for(let i=u.level;i<u.limit;i++){
        const old=AbyssDiagnostics.state();const b=document.getElementById('upgradePurchase');
        if(b.disabled)throw Error(u.id+' blocked at '+i+': '+document.getElementById('upgradePriceNote').textContent);
        b.click();const now=AbyssDiagnostics.state();spentCR+=old.credits-now.credits;spentGems+=old.crystals-now.crystals;n++;
      }document.getElementById('upgradeDetailClose').click();
    }return {n,spentCR,spentGems};}''')
  assert purchases['n']==50,purchases
  assert purchases['spentCR']+80==12223 and purchases['spentGems']+2==432,purchases
  assert state(p)['safeDepth']==1830 and state(p)['mineAmmo']==0
  p.locator('[data-system="hull"]').click();assert p.locator('#upgradePurchase').is_disabled();p.locator('#upgradeDetailClose').click()
  before=state(p);p.locator('#ammunitionTab').click();p.locator('#buyMineBtn').click()
  assert state(p)['credits']==before['credits']-12 and state(p)['crystals']==before['crystals'] and state(p)['mineAmmo']==1
  assert not errors,errors;c.close()
  print('PASS all 51 paid upgrade increments cost credits AND crystals (12,223 CR + 432 crystals); insufficient/max guards; hull III 297 CR + 10 crystals; ammunition credits-only/no free rounds')
  # One-copy recovery on interruption. A fresh browser models a reload from the committed save.
  c,p,errors=build(b)
  d=debug(p)
  nodes=[next(n for n in d['field']['loot'] if n['type']==kind) for kind in ['scrap','crystal']]
  for n in nodes:take(p,n)
  assert debug(p)['player']['cargo']['scrap']==2 and debug(p)['player']['cargo']['crystal']==2
  pre=store(p);c.close();c,p,errors=build(b,store=pre)
  assert state(p)['credits']==0 and state(p)['crystals']==0 and state(p)['recoveryPods']==1
  pod=next(n for n in debug(p)['items'] if n['type']=='recovery')
  take(p,pod);assert state(p)['recoveryPods']==0
  dock(p);assert state(p)['credits']==36 and state(p)['crystals']==2
  snapshot=store(p);c.close();c,p,errors=build(b,store=snapshot)
  assert state(p)['recoveryPods']==0 and state(p)['credits']==36 and state(p)['crystals']==2
  assert all(next(i for i in debug(p)['items'] if i['id']==n['id'])['collected'] for n in nodes)
  # Death also puts each unbanked resource into exactly one pod.
  node=next(n for n in debug(p)['items'] if n['type']=='crystal' and not n['collected']);take(p,node)
  p.evaluate('AbyssDiagnostics.loseDive()');assert state(p)['recoveryPods']==1
  p.locator('#retryBtn').click();p.evaluate('AbyssDiagnostics.step(0)')
  assert state(p)['recoveryPods']==1
  take(p,next(n for n in debug(p)['items'] if n['type']=='recovery'));dock(p)
  assert state(p)['crystals']==4 and state(p)['recoveryPods']==0
  assert not errors,errors;c.close()
  print('PASS crash/reload and death recoveries: no duplicate currency, no resurrected deposits, crystal bank persists')
  b.close()
if __name__=='__main__':run()
