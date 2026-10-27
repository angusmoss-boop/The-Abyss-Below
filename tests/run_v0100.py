"""Run the current release suites and write auditable logs, not inferred results."""
from pathlib import Path
import subprocess,sys,json,datetime
from concurrent.futures import ThreadPoolExecutor
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'verification/v0.10.0';OUT.mkdir(parents=True,exist_ok=True)
suites={
 'release':[sys.executable,'tests/v0100_release_test.py'],
 'campaign':[sys.executable,'tests/v0100_campaign_test.py'],
 'touch':[sys.executable,'tests/v0100_touch_test.py'],
 'regression':[sys.executable,'tests/v0100_regression_test.py'],
 'sync':['node','tests/v0100_sync_test.mjs'],
 'worker':['node','tests/v0100_worker_test.mjs'],
}
def run(item):
 name,command=item
 result=subprocess.run(command,cwd=ROOT,text=True,capture_output=True,timeout=180)
 (OUT/(name+'.log')).write_text(result.stdout+result.stderr)
 return {'suite':name,'command':command,'exit_code':result.returncode,'status':'PASS' if result.returncode==0 else 'FAIL'}
with ThreadPoolExecutor(max_workers=3) as pool:results=list(pool.map(run,suites.items()))
report={'build':'0.10.0-persistent-depths-1','completed_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'results':results,
 'limitations':['Browser renderer exercised via in-memory production assets, not a hosted navigation.','Network/service-worker boundaries are mocked; no live offline/update integration claim.','Physical Android/iOS and full-campaign balance playthrough not tested.']}
(OUT/'results.json').write_text(json.dumps(report,indent=2)+'\n')
for r in results:print(r['status'],r['suite'],r['exit_code'])
sys.exit(any(r['exit_code'] for r in results))
