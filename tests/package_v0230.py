"""Package frozen production sources; verify actual v0.22.0 overlay bytes."""
from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED
from datetime import datetime,timezone
import json,hashlib
R=Path(__file__).resolve().parents[1];OUT=R.parent
BASE=OUT/'the-abyss-below-v0.22.0-complete.zip'
V=json.loads((R/'version.json').read_text());E=json.loads((R/'verification/v0.23.0/results-latest.json').read_text())
assert V['buildId']=='0.23.0-sunken-strongholds-1' and V['name']=='Sunken Strongholds'
assert len(E['results'])==45 and all(x['status']=='PASS' for x in E['results'])
for f,h in V['assets'].items():assert hashlib.sha256((R/f).read_bytes()).hexdigest()==h==E['runtime_hashes'][f],f
with ZipFile(BASE) as z:
 assert z.testzip() is None
 old={n:z.read(n) for n in z.namelist() if not n.endswith('/')}
def files():
 return sorted(p for p in R.rglob('*') if p.is_file() and '__pycache__' not in p.parts and p.suffix not in ['.pyc','.tmp'] and p.name not in ['results-initial.json'])
def delta():
 return [p for p in files() if p.relative_to(R).parts[0]!='screenshots' and old.get(p.relative_to(R).as_posix())!=p.read_bytes()]
# Preflight the intended overlay before writing a successful release report.
new={p.relative_to(R).as_posix():p.read_bytes() for p in files()}
overlay={**old,**{p.relative_to(R).as_posix():p.read_bytes() for p in delta()}}
for f,data in new.items():
 if not f.startswith('screenshots/'):assert overlay.get(f)==data,('preflight',f)
for f,h in V['assets'].items():assert hashlib.sha256(overlay[f]).hexdigest()==h
report={'build':V['buildId'],'created_utc':datetime.now(timezone.utc).isoformat(),'base_archive':BASE.name,'current_suites_passed':len(E['results']),'generated_navigation_cases':15,'complete_integrity':'PASS','v0220_overlay':'PASS','deployed':False,'physical_android':'NOT_TESTED','human_balance_playthrough':'NOT_TESTED','live_offline_pwa':'BLOCKED','runtime_asset_count':len(V['assets']),'changed_files':[p.relative_to(R).as_posix() for p in delta()]}
(R/'RELEASE-v0.23.0.json').write_text(json.dumps(report,indent=2)+'\n')
(R/'verification/v0.23.0/package-integrity.json').write_text(json.dumps(report,indent=2)+'\n')
created=[]
try:
 for name,chosen in [('complete',files()),('update',delta())]:
  dest=OUT/f'the-abyss-below-v0.23.0-{name}.zip';tmp=dest.with_suffix('.tmp')
  with ZipFile(tmp,'w',ZIP_DEFLATED,compresslevel=7) as z:
   for p in chosen:z.write(p,p.relative_to(R).as_posix())
  with ZipFile(tmp) as z:
   assert z.testzip() is None
   data={n:z.read(n) for n in z.namelist()}
  if name=='update':data={**old,**data}
  assert json.loads(data['version.json'])==V
  for f,h in V['assets'].items():assert hashlib.sha256(data[f]).hexdigest()==h,(name,f)
  assert b'Sunken Strongholds' in data['index.html'] and b'0.23.0-sunken-strongholds-1' in data['game.js']
  for p in files():
   f=p.relative_to(R).as_posix()
   if not f.startswith('screenshots/'):assert data.get(f)==p.read_bytes(),(name,'source-overlay',f)
  tmp.replace(dest);created.append(dest)
  print(dest.name,dest.stat().st_size,'bytes; CRC, 19 runtime hashes and exact source overlay PASS',flush=True)
except Exception:
 for p in created:p.unlink(missing_ok=True)
 raise
