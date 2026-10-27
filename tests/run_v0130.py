"""Run the current release checks and retain process exit codes and raw logs."""
from pathlib import Path
import subprocess,sys,json,datetime,time
from concurrent.futures import ThreadPoolExecutor
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'verification/v0.13.0';OUT.mkdir(parents=True,exist_ok=True)
suites={
 'harbour-surface-tiers':[sys.executable,'-u','tests/v0130_harbour_test.py'],
 'v012-save-compatibility':[sys.executable,'-u','tests/v0130_save_test.py'],
 'campaign':[sys.executable,'-u','tests/v0130_campaign_test.py'],
 'world-achievements':[sys.executable,'-u','tests/v0130_world_achievements_test.py'],
 'migration':[sys.executable,'-u','tests/v0130_migration_test.py'],
 'responsive-hub':[sys.executable,'-u','tests/v0130_ui_test.py'],
 'touch-desktop':[sys.executable,'-u','tests/v0130_touch_test.py'],
 'ship-systems':[sys.executable,'-u','tests/v0130_systems_test.py'],
 'gameplay-regression':[sys.executable,'-u','tests/v0130_regression_test.py'],
 'release-integrity':[sys.executable,'-u','tests/v0130_release_test.py'],
 'version-checker':['node','tests/v0130_sync_test.mjs'],
 'worker-lifecycle':['node','tests/v0130_worker_test.mjs']}
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
report={'build':'0.13.0-harbour-rising-1','completed_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'results':results,'limitations':['Chromium production asset harness; no physical phone or complete human balance playthrough.','Most suites use synthetic equipment/coordinates for isolated assertions.','Network, cache and deployment boundaries in the Node suites are mocked. See live-pwa.json for the separate real-network attempt.']}
(OUT/'results.json').write_text(json.dumps(report,indent=2)+'\n')
sys.exit(any(r['status']!='PASS' for r in results))
