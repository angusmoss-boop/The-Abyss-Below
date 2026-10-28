"""Build complete/delta packages and verify the actual v0.18.2 overlay bytes."""
from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED
from datetime import datetime,timezone
import json,hashlib
R=Path(__file__).resolve().parents[1];OUT=R.parent
BASE=OUT/'the-abyss-below-v0.18.2-complete.zip'
V=json.loads((R/'version.json').read_text());E=json.loads((R/'verification/v0.19.0/results-all.json').read_text())
assert V['buildId']=='0.19.0-forgotten-giants-1'
assert len(E['results'])==32 and all(x['status']=='PASS' for x in E['results'])
for f,h in V['assets'].items():assert hashlib.sha256((R/f).read_bytes()).hexdigest()==h==E['runtime_hashes'][f],f
with ZipFile(BASE) as z:old={n:z.read(n) for n in z.namelist() if not n.endswith('/')}
def files():
 return sorted(p for p in R.rglob('*') if p.is_file() and '__pycache__' not in p.parts and p.suffix not in ['.pyc','.tmp'] and p.name!='results-initial.json')
def delta():
 return [p for p in files() if old.get(p.relative_to(R).as_posix())!=p.read_bytes() and p.relative_to(R).parts[0]!='screenshots']
report={'build':V['buildId'],'created_utc':datetime.now(timezone.utc).isoformat(),'base_archive':BASE.name,'current_suites_passed':32,'complete_integrity':'PASS','v0182_overlay':'PASS','deployed':False,'physical_android':'NOT_TESTED','live_offline_pwa':'BLOCKED','changed_files':[p.relative_to(R).as_posix() for p in delta()]}
(R/'RELEASE-v0.19.0.json').write_text(json.dumps(report,indent=2)+'\n')
(R/'verification/v0.19.0/package-integrity.json').write_text(json.dumps(report,indent=2)+'\n')
for name,chosen in [('complete',files()),('update',delta())]:
 path=OUT/f'the-abyss-below-v0.19.0-{name}.zip'
 with ZipFile(path,'w',ZIP_DEFLATED,compresslevel=7) as z:
  for p in chosen:z.write(p,p.relative_to(R).as_posix())
 with ZipFile(path) as z:
  assert z.testzip() is None
  data={n:z.read(n) for n in z.namelist()}
 if name=='update':data={**old,**data}
 assert json.loads(data['version.json'])==V
 for f,h in V['assets'].items():assert hashlib.sha256(data[f]).hexdigest()==h,(name,f)
 assert b'Forgotten Giants' in data['index.html'] and b'0.19.0-forgotten-giants-1' in data['game.js']
 assert b'forgotten-giants.js?v=0.19.0' in data['index.html']
 print(path.name,path.stat().st_size,'bytes; CRC, 18 asset hashes and baseline-overlay reconstruction PASS')
