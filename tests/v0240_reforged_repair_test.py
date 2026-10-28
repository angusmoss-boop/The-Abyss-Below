"""One half-hull charge. No scrap fee; no reload/menu/pickup refill."""
from v0240_harness import *
from playwright.sync_api import sync_playwright
import copy

def run():
 with sync_playwright() as pw:
  b=launch_browser(pw);c,p,errors=build(b)
  for mark in range(8):
   p.evaluate('AbyssDiagnostics.relaunch()')
   fix(p,depth=45,upgrades={'hull':mark},battery=0)
   assert not p.evaluate('AbyssDiagnostics.repair()') and state(p)['repairReady']
   mx=state(p)['maxHull'];p.evaluate('h=>AbyssDiagnostics.setSystems({hull:h,oxygen:35,shield:0})',mx*.1)
   assert p.evaluate('AbyssDiagnostics.repair()')
   s=state(p);assert abs(s['hull']-mx*.6)<1e-8 and not s['repairReady'] and s['battery']==0 and s['oxygen']==35
   assert not p.evaluate('AbyssDiagnostics.repair()')
   assert debug(p)['player']['cargo']['scrap']==0
   assert p.locator('#desktop-repair .desktop-readout').inner_text()=='0 / 1'
  print('PASS every hull tier: full-health no-op preserves charge; single instant 50% maximum HP repair, no scrap/power/air/shield change; second activation rejected',flush=True)
  # A spent charge cannot be refreshed by a repair pack or elapsed time.
  fix(p,depth=45,upgrades={'hull':7},items=[{'dx':0,'dy':0,'type':'air'}]);p.evaluate('AbyssDiagnostics.setSystems({hull:60});AbyssDiagnostics.contactPickups()')
  assert state(p)['hull']==134 and not state(p)['repairReady']
  step(p,1);assert not state(p)['repairReady']
  # Live UI pause/menu keeps the spent charge, then actually persist the checkpoint.
  p.evaluate('AbyssDiagnostics.unfreeze()');p.locator('#focusPauseBtn').click();p.locator('#pauseMenuBtn').click()
  assert not state(p)['repairReady'];p.locator('#startBtn').click();p.evaluate('AbyssDiagnostics.save()')
  ss=store(p);before=debug(p);c.close();c,p,e=build(b,store=ss);errors+=e
  assert state(p)['paused'] and not state(p)['repairReady']
  assert state(p)['hull']==before['player']['hull']
  # Export includes the charge and validates it as a boolean.
  assert p.evaluate('''()=>{const x=AbyssSlots.exportSlot(1);return AbyssSignals.unpack(AbyssSignals.pack(x)).payload.activeDive.player.repairReady===false;}''')
  assert p.evaluate('''()=>{const x=AbyssSlots.exportSlot(1);x.activeDive.player.repairReady="refill";try{AbyssSignals.pack(x);return false;}catch(_){return true;}}''')
  # A physical dock visit services the charge, without free ammunition.
  ammo=state(p)['weaponAmmo'];dock(p);assert state(p)['repairReady'] and state(p)['weaponAmmo']==ammo
  depart(p);p.evaluate('AbyssDiagnostics.setSystems({hull:280})');assert p.evaluate('AbyssDiagnostics.repair()')
  assert state(p)['hull']==296 and not state(p)['repairReady']
  p.evaluate('AbyssDiagnostics.unfreeze()');p.keyboard.press('r');assert not state(p)['repairReady']
  assert not errors,errors;c.close();b.close()
  print('PASS pack/time/pause/menu/reload/export do not refill; strict import field; physical docking restores one charge, ammo unchanged; capped heal and keyboard guard')
if __name__=='__main__':run()
