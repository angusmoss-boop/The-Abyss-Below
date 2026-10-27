"""Package only a verified runtime; compare update overlay against the actual v0.17.1 ZIP."""
from pathlib import Path
import zipfile,json,hashlib
from datetime import datetime,timezone
R=Path(__file__).resolve().parents[1];OUT=R.parent
BASE=OUT/'the-abyss-below-v0.17.1-complete.zip'
FULL=OUT/'the-abyss-below-v0.17.2-complete.zip';UPDATE=OUT/'the-abyss-below-v0.17.2-update.zip'
V=json.loads((R/'version.json').read_text());E=json.loads((R/'verification/v0.17.2/results-all.json').read_text())
assert V['buildId']=='0.17.2-delta-helm-1'
assert len(E['results'])==25 and all(s['status']=='PASS' for s in E['results'])
for file,expected in E['runtime_hashes'].items():assert hashlib.sha256((R/file).read_bytes()).hexdigest()==expected,file
for file,expected in V['assets'].items():assert hashlib.sha256((R/file).read_bytes()).hexdigest()==expected,file

def included(p):
 rel=p.relative_to(R)
 return p.is_file() and '__pycache__' not in rel.parts and p.suffix not in ('.pyc','.tmp') and not p.name.startswith(('initial-','draft-','ui-failure'))
with zipfile.ZipFile(BASE) as z:baseline={n:z.read(n) for n in z.namelist() if not n.endswith('/')}

def package():
 files=sorted(p for p in R.rglob('*') if included(p))
 changed=[p for p in files if baseline.get(p.relative_to(R).as_posix())!=p.read_bytes() and p.relative_to(R).parts[0]!='screenshots']
 for path,chosen in [(FULL,files),(UPDATE,changed)]:
  with zipfile.ZipFile(path,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
   for p in chosen:z.write(p,p.relative_to(R).as_posix())
 return files,changed

def verify():
 for path in [FULL,UPDATE]:
  with zipfile.ZipFile(path) as z:
   assert z.testzip() is None
   data={n:z.read(n) for n in z.namelist() if not n.endswith('/')}
  if path==UPDATE:data={**baseline,**data}
  assert json.loads(data['version.json'])==V
  for f,h in V['assets'].items():assert hashlib.sha256(data[f]).hexdigest()==h,(path.name,f)
  assert b'campaign-slots.js?v=0.17.2' in data['index.html'] and b'Delta Helm' in data['index.html']

files,changed=package();verify()
report={'build_id':V['buildId'],'timestamp_utc':datetime.now(timezone.utc).isoformat(),'runtime_assets':list(V['assets']),'complete':'PASS','v0171_update_overlay':'PASS','base_archive':BASE.name,'suites_passed':25,'changed_files':[p.relative_to(R).as_posix() for p in changed],'live_offline':'BLOCKED_BY_BROWSER_POLICY'}
(R/'verification/v0.17.2/package-integrity.json').write_text(json.dumps(report,indent=2)+'\n')
p=R/'RELEASE-v0.17.2.json';release=json.loads(p.read_text());release['package_checks']=report;p.write_text(json.dumps(release,indent=2)+'\n')
package();verify()
print(json.dumps({'complete':str(FULL),'update':str(UPDATE),'bytes':{'complete':FULL.stat().st_size,'update':UPDATE.stat().st_size},'overlay_integrity':'PASS','suites':25},indent=2))
