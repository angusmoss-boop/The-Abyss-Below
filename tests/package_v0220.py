"""Package frozen production files and verify the real v0.21 update overlay."""
from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED
from datetime import datetime,timezone
import json,hashlib
R=Path(__file__).resolve().parents[1];OUT=R.parent
BASE=OUT/'the-abyss-below-v0.21.0-complete.zip'
V=json.loads((R/'version.json').read_text());E=json.loads((R/'verification/v0.22.0/results-all.json').read_text())
assert V['buildId']=='0.22.0-deepwater-rescue-1' and V['name']=='Deepwater Rescue'
assert len(E['results'])==51 and all(x['status']=='PASS' for x in E['results'])
for f,h in V['assets'].items():assert hashlib.sha256((R/f).read_bytes()).hexdigest()==h==E['runtime_hashes'][f],f
with ZipFile(BASE) as z:old={n:z.read(n) for n in z.namelist() if not n.endswith('/')}
def files():
 return sorted(p for p in R.rglob('*') if p.is_file() and '__pycache__' not in p.parts and p.suffix not in ['.pyc','.tmp'] and p.name not in ['results-initial.json'])
def delta():
 return [p for p in files() if old.get(p.relative_to(R).as_posix())!=p.read_bytes() and p.relative_to(R).parts[0]!='screenshots']
report={'build':V['buildId'],'created_utc':datetime.now(timezone.utc).isoformat(),'base_archive':BASE.name,'current_suites_passed':len(E['results']),'complete_integrity':'PASS','v0210_overlay':'PASS','deployed':False,'physical_android':'NOT_TESTED','live_offline_pwa':'BLOCKED','runtime_asset_count':len(V['assets']),'changed_files':[p.relative_to(R).as_posix() for p in delta()]}
(R/'RELEASE-v0.22.0.json').write_text(json.dumps(report,indent=2)+'\n')
(R/'verification/v0.22.0/package-integrity.json').write_text(json.dumps(report,indent=2)+'\n')
for name,chosen in [('complete',files()),('update',delta())]:
 dest=OUT/f'the-abyss-below-v0.22.0-{name}.zip'
 with ZipFile(dest,'w',ZIP_DEFLATED,compresslevel=7) as z:
  for p in chosen:z.write(p,p.relative_to(R).as_posix())
 with ZipFile(dest) as z:
  assert z.testzip() is None;data={n:z.read(n) for n in z.namelist()}
 if name=='update':data={**old,**data}
 assert json.loads(data['version.json'])==V
 for f,h in V['assets'].items():assert hashlib.sha256(data[f]).hexdigest()==h,(name,f)
 assert b'Deepwater Rescue' in data['index.html'] and b'0.22.0-deepwater-rescue-1' in data['game.js']
 assert b'deepwater-rescue.js?v=0.22.0' in data['index.html']
 print(dest.name,dest.stat().st_size,'bytes; CRC, all runtime hashes and actual v0.21 overlay reconstruction PASS',flush=True)
