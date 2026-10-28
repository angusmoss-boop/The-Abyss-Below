"""Actual production renderer with synthetic gear/progress; no real player saves."""
from v0180_harness import *
from v0180_branding_ui_test import images
from playwright.sync_api import sync_playwright
import json
with sync_playwright() as pw:
 b=launch_browser(pw)
 c,p,errors=build(b,390,844,True);images(p);dock(p);p.locator('#contractsTab').click()
 p.screenshot(path=str(OUT/'release-contracts.png'))
 p.locator('#launchAgain').click()
 item=next(n for n in debug(p)['items'] if n['type']=='recorder');move(p,item['x'],item['y']);use(p);dock(p)
 p.locator('#archiveTab').click();p.locator('[data-chapter="0"]').click();p.screenshot(path=str(OUT/'release-journal.png'))
 p.locator('#signalsClose').click();p.locator('#launchAgain').click();p.evaluate('AbyssDiagnostics.unfreeze();AbyssDiagnostics.backgroundPause()');p.locator('#pauseSlotsBtn').click()
 p.evaluate('AbyssDiagnostics.save()');text=p.evaluate('AbyssSignals.pack(AbyssSlots.exportSlot(1))');p.locator('#importSlot').select_option('2')
 p.locator('#importFile').set_input_files({'name':'sunbreak-expedition.abyss.json','mimeType':'application/json','buffer':text.encode()});p.locator('#confirmImport').scroll_into_view_if_needed()
 p.screenshot(path=str(OUT/'release-backup-preview.png'));assert not errors,errors;c.close()
 c,p,errors=build(b,844,390,True);images(p)
 fix(p,depth=30,lights=True,upgrades={'hull':6,'engine':4,'shield':4,'battery':4,'oxygen':5,'railgun':4,'torpedo':4,'sonar':4,'flashlight':4})
 for i in range(3):
  p.evaluate('(i)=>AbyssDiagnostics.fixtureLevel(i)',i)
  for item in [n for n in debug(p)['items'] if n['type']=='recorder']:move(p,item['x'],item['y']);use(p)
  dock(p)
  if p.locator('#victoryClose').is_visible():p.locator('#victoryClose').click()
  p.locator('#launchAgain').click()
 p.evaluate('AbyssDiagnostics.fixtureLevel(3)');site=p.evaluate('AbyssDiagnostics.signals().state.warden.site')
 p.evaluate('AbyssDiagnostics.wardenFixture();AbyssDiagnostics.weaponStock({railgun:32,torpedo:8})')
 move(p,site['x']-190,site['y']);p.evaluate('AbyssDiagnostics.face(0)')
 if not state(p)['lights']:
  p.evaluate('AbyssDiagnostics.unfreeze()');p.keyboard.press('l');step(p,0)
 p.evaluate('AbyssDiagnostics.ping()');step(p,3.15)
 p.evaluate('AbyssDiagnostics.face(Math.atan2(AbyssDiagnostics.debug().predators.find(e=>e.tier==="warden").y-AbyssDiagnostics.state().y,AbyssDiagnostics.debug().predators.find(e=>e.tier==="warden").x-AbyssDiagnostics.state().x))')
 # Stage an isolated saved encounter so other generated predators do not cover the boss.
 # This is explicitly synthetic preview progress, not a balance playthrough.
 p.evaluate('AbyssDiagnostics.save()');snapshot=store(p);saved=json.loads(snapshot[CAMPAIGN])
 saved['activeDive']['predators']=[e for e in saved['activeDive']['predators'] if e['tier']=='warden']
 saved['activeDive']['events']=[];saved['activeDive']['player']['hull']=state(p)['maxHull'];saved['activeDive']['player']['shield']=70
 snapshot[CAMPAIGN]=json.dumps(saved);snapshot[CAMPAIGN+'.backup']=json.dumps(saved);c.close()
 c,p,errors=build(b,844,390,True,store=snapshot,launch=False);images(p);p.locator('#startBtn').click();p.locator('#resumeBtn').click();step(p,0)
 p.screenshot(path=str(OUT/'release-warden-landscape.png'));assert not errors,errors
 c.close();b.close()
 print('Rendered contracts, banked journal, import preview and optional Warden using production UI. Synthetic progress/equipment, unchanged production scenery.')
