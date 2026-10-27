"""Runs current production checks. No network mock is labelled a live-PWA pass.
Usage: python tests/run_v0140.py [--group core|world|interface|release|all]
"""
from pathlib import Path
import subprocess,sys,time,json,argparse,concurrent.futures,hashlib,os
from datetime import datetime,timezone
R=Path(__file__).resolve().parents[1];O=R/'verification/v0.14.0';O.mkdir(parents=True,exist_ok=True)
SUITES={
 'regression':('core',[sys.executable,'tests/v0140_regression_test.py']),
 'systems':('core',[sys.executable,'tests/v0140_systems_test.py']),
 'resume':('core',[sys.executable,'tests/v0140_resume_test.py']),
 'survey':('core',[sys.executable,'tests/v0140_survey_test.py']),
 'harbour':('world',[sys.executable,'tests/v0140_harbour_test.py']),
 'geometry':('world',[sys.executable,'tests/v0140_world_achievements_test.py','--geometry-only']),
 'achievements':('world',[sys.executable,'tests/v0140_world_achievements_test.py','--achievements-only']),
 'migration':('world',[sys.executable,'tests/v0140_migration_test.py']),
 'ui':('interface',[sys.executable,'tests/v0140_ui_test.py']),
 'touch':('interface',[sys.executable,'tests/v0140_touch_test.py']),
 'explorer-ui':('interface',[sys.executable,'tests/v0140_explorer_ui_test.py']),
 'release':('release',[sys.executable,'tests/v0140_release_test.py']),
 'sync':('release',['node','tests/v0140_sync_test.mjs']),
 'worker':('release',['node','tests/v0140_worker_test.mjs'])}
def check(item):
 name,(_,cmd)=item;t=time.monotonic()
 try:
  r=subprocess.run(cmd,cwd=R,capture_output=True,text=True,timeout=300,env={**os.environ,'PYTHONUNBUFFERED':'1'});text=r.stdout+r.stderr;code=r.returncode
 except subprocess.TimeoutExpired as e:
  text='TIMEOUT\n'+str(e.stdout or '')+'\n'+str(e.stderr or '');code=124
 (O/(name+'.log')).write_text(text)
 value={'suite':name,'status':'PASS' if code==0 else 'FAIL','returncode':code,'seconds':round(time.monotonic()-t,2),'command':cmd[1:],'completed_utc':datetime.now(timezone.utc).isoformat()}
 print(name,value['status'],value['seconds'],flush=True)
 if code:print(text[-3500:],flush=True)
 return value
if __name__=='__main__':
 a=argparse.ArgumentParser();a.add_argument('--group',choices=['core','world','interface','release','all'],default='all');a.add_argument('--jobs',type=int,default=1);args=a.parse_args()
 items=[item for item in SUITES.items() if args.group=='all' or item[1][0]==args.group]
 with concurrent.futures.ThreadPoolExecutor(max_workers=args.jobs) as pool:results=list(pool.map(check,items))
 hashes={f:hashlib.sha256((R/f).read_bytes()).hexdigest() for f in ['index.html','styles.css','audio.js','game.js','version-sync.js','service-worker.js','version.json']}
 (O/('results-'+args.group+'.json')).write_text(json.dumps({'build':'0.14.0-living-depths-1','results':results,'runtime_hashes':hashes},indent=2)+'\n')
 sys.exit(0 if all(r['status']=='PASS' for r in results) else 1)
