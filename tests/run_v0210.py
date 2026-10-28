"""Lifeline, plus current gameplay/interface/audio regressions."""
from pathlib import Path
import sys,subprocess,time,json,hashlib,concurrent.futures
from datetime import datetime,timezone
R=Path(__file__).resolve().parents[1];O=R/'verification/v0.21.0';O.mkdir(parents=True,exist_ok=True)
NAMES=['lifeline','cells','lifeline_migration','command_ui','baseline_beam','frontiers','shoals','frontiers_migration','achievements_extra','regression','world_achievements','giants','navigation','behaviours','targeting','current_migration','discovery_safety','recovery','rescue_ammo','recovery_migration','recovery_levels','guidance','seeking_mines','guidance_save','weapons','economy','placement','contracts','backups','warden','journal','signals_layout','migration','resume','slots','combat_touch','stealth','audio_transitions','music','branding_ui','launch','sync','worker']
def run(name):
 ext='.mjs' if name in ('sync','worker') else '.py';exe='node' if ext=='.mjs' else sys.executable
 cmd=[exe,'tests/v0210_'+name+'_test'+ext];t=time.monotonic()
 try:
  p=subprocess.run(cmd,cwd=R,capture_output=True,text=True,timeout=180);code=p.returncode;log=p.stdout+p.stderr
 except subprocess.TimeoutExpired as e:code=124;log=str(e.stdout)+'\n'+str(e.stderr)
 (O/(name+'.log')).write_text(log);result={'suite':name,'status':'PASS' if code==0 else 'FAIL','returncode':code,'seconds':round(time.monotonic()-t,2)}
 (O/(name+'-result.json')).write_text(json.dumps(result,indent=2)+'\n')
 print(name,result['status'],result['seconds'],flush=True)
 if code:print(log[-3500:],flush=True)
 return result
if __name__=='__main__':
 names=sys.argv[1:] or NAMES
 with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:results=list(pool.map(run,names))
 report={'build':'0.21.0-lifeline-1','completed_utc':datetime.now(timezone.utc).isoformat(),'results':results,'runtime_hashes':{f:hashlib.sha256((R/f).read_bytes()).hexdigest() for f in json.loads((R/'version.json').read_text())['assets']}}
 (O/'results-latest.json').write_text(json.dumps(report,indent=2)+'\n');sys.exit(0 if all(x['status']=='PASS' for x in results) else 1)
