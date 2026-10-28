"""Fixed exact defeat loadout, reserve stock, unlock gates, dock transactions and storage."""
from v0220_harness import *
from playwright.sync_api import sync_playwright

def expected(p):
 assert state(p)['weaponAmmo']=={'railgun':10,'torpedo':3},state(p)
 assert state(p)['mineAmmo']==3,state(p)

def respawn(p):p.locator('#retryBtn').click();p.evaluate('AbyssDiagnostics.step(0)')

def clear_water(p):
 point=p.evaluate("""()=>{const d=AbyssDiagnostics.debug();for(let y=600;y<1400;y+=80)for(let x=450;x<950;x+=40){
  const a={x,y:y-60},b={x,y:y+60};if(d.predators.some(e=>!e.dead&&Math.hypot(e.x-x,e.y-y)<210))continue;
  if(AbyssDiagnostics.guidanceLine(a,b,35)&&AbyssDiagnostics.wildClear(x,y,65))return {x,y};}return null;}""")
 assert point,'No clear test firing lane';move(p,point['x'],point['y']);p.evaluate('AbyssDiagnostics.face(-Math.PI/2)')

def run():
 with sync_playwright() as pw:
  b=launch_browser(pw);errors=[]
  for prior in ['empty','partial','full']:
   c,p,e=build(b);errors+=e
   fix(p,depth=50,upgrades={'hull':7,'railgun':4,'torpedo':4,'minePower':4,'mineCapacity':4},mineAmmo={'empty':0,'partial':1,'full':8}[prior])
   p.evaluate('v=>AbyssDiagnostics.weaponStock(v)',{'railgun':{'empty':0,'partial':5,'full':32}[prior],'torpedo':{'empty':0,'partial':1,'full':8}[prior]})
   p.evaluate('AbyssDiagnostics.loseDive()');expected(p);respawn(p);expected(p)
   clear_water(p)
   assert p.evaluate('AbyssDiagnostics.fire("railgun")') and p.evaluate('AbyssDiagnostics.fire("torpedo")') and p.evaluate('AbyssDiagnostics.mine()')
   assert state(p)['weaponAmmo']=={'railgun':9,'torpedo':2} and state(p)['mineAmmo']==2
   p.evaluate('AbyssDiagnostics.save()');ss=store(p);c.close();c,p,e=build(b,store=ss);errors+=e
   assert state(p)['weaponAmmo']=={'railgun':9,'torpedo':2} and state(p)['mineAmmo']==2
   dock(p);assert state(p)['weaponAmmo']=={'railgun':9,'torpedo':2} and state(p)['mineAmmo']==2
   depart(p);p.evaluate('AbyssDiagnostics.loseDive()');respawn(p);expected(p)
   # UI slot packing validates current ammo, including reserves.
   packed=p.evaluate("AbyssSignals.pack(JSON.parse(testStore['the-abyss-below-slot-1-v1']))")
   assert 'the-abyss-below/campaign' in packed
   c.close()
  print('PASS death replaces lower/equal/higher stocks with exactly 10 / 3 / 3; firing spends stock; docking and reload do not replenish; another genuine death resets exactly')

  # A default unfitted vessel still receives all reserves without free equipment.
  c,p,e=build(b,390,844,True);errors+=e
  upgrades=debug(p)['saved']['upgrades'].copy();p.evaluate('AbyssDiagnostics.loseDive()');respawn(p);expected(p)
  assert debug(p)['saved']['upgrades']==upgrades
  clear_water(p)
  for kind in ['railgun','torpedo']:assert not p.evaluate('k=>AbyssDiagnostics.fire(k)',kind)
  assert not p.evaluate('AbyssDiagnostics.mine()');expected(p)
  for id in ['mobileRail','mobileTorpedo','mobileMine']:assert p.locator('#'+id).evaluate('e=>e.classList.contains("equipment-locked")')
  # Ordinary docking and fitting do not delete these promised reserves.
  dock(p);p.evaluate('AbyssDiagnostics.grantCredits(5000);AbyssDiagnostics.grantCrystals(1000)');p.locator('#ammunitionTab').click()
  assert 'rescue rounds stored' in p.locator('#dockPanel').inner_text()
  assert p.locator('#buyRailBtn').is_disabled() and p.locator('#buyTorpedoBtn').is_disabled() and p.locator('#buyMineBtn').is_disabled()
  p.locator('#upgradesTab').click()
  for id in ['railgun','torpedo','minePower']:buy(p,id)
  expected(p);assert state(p)['mineCapacity']==2
  p.locator('#ammunitionTab').click();credits=state(p)['credits']
  assert '1 emergency round' in p.locator('.ordnance-card.mine').inner_text()
  assert p.locator('#buyMineBtn').is_disabled() and p.locator('#fillMinesBtn').is_disabled()
  assert not p.evaluate('AbyssDiagnostics.buyOrdnance("mine",true)') and state(p)['credits']==credits
  # Excess stock cannot make a negative fill transaction give credits.
  assert p.locator('.ordnance-card.mine .ordnance-track i').evaluate('e=>parseFloat(e.style.width)')==100
  p.evaluate('AbyssDiagnostics.save()');ss=store(p);c.close();c,p,e=build(b,store=ss);errors+=e;expected(p)
  # All three emergency mines are actually deployable with the original two-slot rack.
  clear_water(p)
  for i in range(3):
   assert p.evaluate('AbyssDiagnostics.mine()'),i
   step(p,1.11)
  assert state(p)['mineAmmo']==0 and not p.evaluate('AbyssDiagnostics.mine()')
  dock(p);p.locator('#ammunitionTab').click();balance=state(p)['credits'];p.locator('#fillMinesBtn').click()
  assert state(p)['mineAmmo']==2 and state(p)['credits']==balance-36
  print('PASS reserves survive unfitted launchers and later purchases; no free unlocks; three usable starter-rack mines; normal paid fill remains two slots with no negative-price exploit')
  # Invalid over-reserve export is rejected, legal emergency stock accepted.
  checks=p.evaluate('''()=>{const original=JSON.parse(testStore['the-abyss-below-slot-1-v1']);
   const good=structuredClone(original);good.activeDive=null;good.profile.mineAmmo=3;AbyssSignals.validateCampaign(good);
   const bad=structuredClone(good);bad.profile.mineAmmo=4;try{AbyssSignals.validateCampaign(bad);return false;}catch(_){return true;}}''')
  assert checks;assert not errors,errors;c.close();b.close()
if __name__=='__main__':run()
