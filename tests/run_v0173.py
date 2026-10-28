"""Targeted audio fix and selected unchanged-gameplay regressions, not full campaign QA."""
from pathlib import Path
import sys,subprocess,time,json,hashlib,concurrent.futures
from datetime import datetime,timezone
R=Path(__file__).resolve().parents[1];O=R/'verification/v0.17.3';O.mkdir(exist_ok=True)
NAMES=['audio_comparison','audio_transitions','audio','music','resume','slots','combat_touch','stealth','release','sync','worker']
def run(name):
 ext='.mjs' if name in ('sync','worker') else '.py';exe='node' if ext=='.mjs' else sys.executable
 cmd=[exe,'tests/v0173_'+name+'_test'+ext];t=time.monotonic()
 try:
  p=subprocess.run(cmd,cwd=R,capture_output=True,text=True,timeout=160);code=p.returncode;log=p.stdout+p.stderr
 except subprocess.TimeoutExpired as e:code=124;log=str(e.stdout)+'\n'+str(e.stderr)
 (O/(name+'.log')).write_text(log);result={'suite':name,'status':'PASS' if code==0 else 'FAIL','returncode':code,'seconds':round(time.monotonic()-t,2)}
 (O/(name+'-result.json')).write_text(json.dumps(result,indent=2)+'\n')
 print(name,result['status'],result['seconds'],flush=True)
 if code:print(log[-3000:],flush=True)
 return result
if __name__=='__main__':
 names=sys.argv[1:] or NAMES
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:results=list(pool.map(run,names))
 report={'build':'0.17.3-smooth-signals-1','completed_utc':datetime.now(timezone.utc).isoformat(),'results':results,'runtime_hashes':{f:hashlib.sha256((R/f).read_bytes()).hexdigest() for f in ['audio.js','game.js','campaign-slots.js','index.html','styles.css','version-sync.js','service-worker.js','version.json']}}
 (O/'results-latest.json').write_text(json.dumps(report,indent=2)+'\n');sys.exit(0 if all(x['status']=='PASS' for x in results) else 1)
