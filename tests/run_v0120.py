"""Run the current release checks and retain process exit codes and raw logs."""
from pathlib import Path
import subprocess,sys,json,datetime,time
from concurrent.futures import ThreadPoolExecutor
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'verification/v0.12.0';OUT.mkdir(parents=True,exist_ok=True)
suites={
 'campaign':[sys.executable,'-u','tests/v0120_campaign_test.py'],
 'world-achievements':[sys.executable,'-u','tests/v0120_world_achievements_test.py'],
 'migration':[sys.executable,'-u','tests/v0120_migration_test.py'],
 'responsive-hub':[sys.executable,'-u','tests/v0120_ui_test.py'],
 'touch-desktop':[sys.executable,'-u','tests/v0120_touch_test.py'],
 'ship-systems':[sys.executable,'-u','tests/v0120_systems_test.py'],
 'gameplay-regression':[sys.executable,'-u','tests/v0120_regression_test.py'],
 'release-integrity':[sys.executable,'-u','tests/v0120_release_test.py'],
 'version-checker':['node','tests/v0120_sync_test.mjs'],
 'worker-lifecycle':['node','tests/v0120_worker_test.mjs']}
def run(item):
 name,cmd=item;t=time.monotonic()
 try:
  r=subprocess.run(cmd,cwd=ROOT,text=True,capture_output=True,timeout=240)
  (OUT/(name+'.log')).write_text(r.stdout+r.stderr)
  result={'suite':name,'command':cmd,'exit_code':r.returncode,'status':'PASS' if r.returncode==0 else 'FAIL','seconds':round(time.monotonic()-t,2)}
 except subprocess.TimeoutExpired as e:
  (OUT/(name+'.log')).write_text(str(e))
  result={'suite':name,'command':cmd,'exit_code':124,'status':'TIMEOUT','seconds':round(time.monotonic()-t,2)}
 print(result['status'],name,flush=True);return result
with ThreadPoolExecutor(max_workers=2) as pool:results=list(pool.map(run,suites.items()))
report={'build':'0.12.0-fivefold-descent-1','completed_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'results':results,'limitations':['Chromium production asset harness; no physical phone or complete human balance playthrough.','Most suites use synthetic equipment/coordinates for isolated assertions.','Network, cache and deployment boundaries in the Node suites are mocked. See live-pwa.json for the separate real-network attempt.']}
(OUT/'results.json').write_text(json.dumps(report,indent=2)+'\n')
sys.exit(any(r['status']!='PASS' for r in results))
