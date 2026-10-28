from playwright.sync_api import sync_playwright
from v0210_harness import *
import json,copy
with sync_playwright() as pw:
 b=launch_browser(pw);c,p,errors=build(b,390,844,True)
 dock(p);p.locator('#contractsTab').click();p.locator('[data-accept-contract]').first.click();depart(p)
 p.evaluate('AbyssDiagnostics.save()');original=json.loads(store(p)[CAMPAIGN]);original_levels=copy.deepcopy(original['levels'])
 # Data-backed export and real browser download action.
 p.evaluate('AbyssDiagnostics.unfreeze();AbyssDiagnostics.backgroundPause()');p.locator('#pauseSlotsBtn').click()
 with p.expect_download() as dl:p.locator('[data-export-slot="1"]').click()
 download=dl.value;assert download.suggested_filename.endswith('.abyss.json');download.save_as(OUT/'sample-backup.abyss.json')
 text=(OUT/'sample-backup.abyss.json').read_text();file=json.loads(text);assert file['formatVersion']==1 and file['payload']['signals']['active']
 base=store(p)
 p.locator('#importSlot').select_option('3')
 p.locator('#importFile').set_input_files({'name':'test.abyss.json','mimeType':'application/json','buffer':text.encode()})
 p.locator('#confirmImport').wait_for();assert store(p)==base,'Preview modified a campaign'
 p.locator('#cancelImport').click();assert store(p)==base
 p.locator('#importFile').set_input_files({'name':'test.abyss.json','mimeType':'application/json','buffer':text.encode()})
 p.locator('#confirmImport').click();after=store(p);target=json.loads(after['the-abyss-below-slot-3-v1'])
 assert target['profile']==file['payload']['profile'] and target['levels']==file['payload']['levels'] and target['signals']==file['payload']['signals']
 assert target['activeDive']==file['payload']['activeDive'];assert json.loads(after['abyss-campaign-slots-v1'])['active']==1
 # Importing is a copy into a chosen slot, not a cross-slot reference.
 p.locator('[data-load-slot="3"]').click();switched=store(p);assert p.evaluate('AbyssSlotReloadRequested')
 c2,q,err2=build(b,390,844,True,store=switched,launch=False)
 assert state(q)['slot']==3 and state(q)['hasSavedDive'];q.locator('#startBtn').click();assert state(q)['pauseOpen']
 assert q.evaluate('AbyssDiagnostics.signals().state.active.id')==file['payload']['signals']['active']['id']
 q.evaluate('AbyssDiagnostics.grantCredits(777)');assert json.loads(store(q)[CAMPAIGN])['profile']['credits']==file['payload']['profile']['credits']
 # Stale slot token, malformed JSON, checksum corruption and hostile/nonsensical data.
 q.locator('#pauseSlotsBtn').click()
 untouched=store(q);bad=json.loads(text);bad['payload']['profile']['credits']+=1
 for value in ['{oops',json.dumps(bad),json.dumps({'format':'other'})]:
  result=q.evaluate('text=>{try{AbyssSignals.unpack(text);return "BAD";}catch(e){return e.message;}}',value);assert result!='BAD'
 assert store(q)==untouched
 # Pack rejects unbounded or unsafe nested data and invalid active dives.
 for key,value in [('credits',-1),('credits',float(1e11))]:
  payload=copy.deepcopy(file['payload']);payload['profile'][key]=value
  assert q.evaluate('x=>{try{AbyssSignals.pack(x);return false;}catch(e){return true;}}',payload)
 payload=copy.deepcopy(file['payload']);payload['activeDive']['events']=['<img src=x onerror=alert(1)>']
 assert q.evaluate('x=>{try{AbyssSignals.pack(x);return false;}catch(e){return true;}}',payload)
 payload=copy.deepcopy(file['payload']);payload['activeDive']['player']['x']=90000
 assert q.evaluate('x=>{try{AbyssSignals.pack(x);return false;}catch(e){return true;}}',payload)
 q.evaluate('([text])=>AbyssDiagnostics.signalPreview(text,2)',[text]);q.evaluate('testStore["the-abyss-below-slot-2-v1"]=JSON.stringify({empty:true,deletedAt:17})')
 before=store(q);q.locator('#confirmImport').click();assert store(q)['the-abyss-below-slot-2-v1']==before['the-abyss-below-slot-2-v1']
 assert 'changed' in q.locator('#slotsMessage').inner_text()
 # Simulated quota failure must not replace a target; existing runtime state remains.
 q.evaluate('AbyssDiagnostics.signalPreview('+json.dumps(text)+',2)')
 q.evaluate('window.originalSet=localStorage.setItem;localStorage.setItem=(k,v)=>{if(k==="the-abyss-below-slot-2-v1")throw Error("quota");originalSet(k,v)}')
 prior=store(q)['the-abyss-below-slot-2-v1'];q.locator('#confirmImport').click();assert store(q)['the-abyss-below-slot-2-v1']==prior
 q.evaluate('localStorage.setItem=originalSet')
 assert not errors+err2,errors+err2
 print('PASS real exported download, preview/cancel, independent imported slot, active expedition restore, damaged/unsafe file rejection, stale-slot conflict and quota failure protection.')
 c.close();c2.close();b.close()
