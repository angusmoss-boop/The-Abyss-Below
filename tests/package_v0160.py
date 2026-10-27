"""Build reproducible root-level full/update ZIPs and verify runtime overlay integrity."""
from pathlib import Path
import zipfile,json,hashlib,datetime
R=Path(__file__).resolve().parents[1];OUT=R.parent
BASE=OUT/'the-abyss-below-v0.15.0-complete.zip'
FULL=OUT/'the-abyss-below-v0.16.0-complete.zip';UPDATE=OUT/'the-abyss-below-v0.16.0-update.zip'
V=json.loads((R/'version.json').read_text());E=json.loads((R/'verification/v0.16.0/results-all.json').read_text())
assert len(E['results'])==21 and all(s['status']=='PASS' for s in E['results'])
for file,expected in E['runtime_hashes'].items():assert hashlib.sha256((R/file).read_bytes()).hexdigest()==expected,file
for file,expected in V['assets'].items():assert hashlib.sha256((R/file).read_bytes()).hexdigest()==expected,file

def included(p):
 rel=p.relative_to(R)
 return p.is_file() and '__pycache__' not in rel.parts and p.suffix not in ('.pyc','.tmp') and not p.name.startswith('initial-')
files=sorted([p for p in R.rglob('*') if included(p)])
with zipfile.ZipFile(BASE) as z:baseline={n:z.read(n) for n in z.namelist() if not n.endswith('/')}
changed=[p for p in files if baseline.get(p.relative_to(R).as_posix())!=p.read_bytes() and p.relative_to(R).parts[0]!='screenshots']

def write_zip(path,chosen):
 with zipfile.ZipFile(path,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
  for p in chosen:z.write(p,p.relative_to(R).as_posix())
write_zip(FULL,files);write_zip(UPDATE,changed)
for path in [FULL,UPDATE]:
 with zipfile.ZipFile(path) as z:assert z.testzip() is None
with zipfile.ZipFile(FULL) as z:
 complete={n:z.read(n) for n in z.namelist() if not n.endswith('/')}
with zipfile.ZipFile(UPDATE) as z:overlay={**baseline,**{n:z.read(n) for n in z.namelist() if not n.endswith('/')}}
for title,data in [('complete',complete),('overlay',overlay)]:
 assert json.loads(data['version.json'])==V
 for file,expected in V['assets'].items():assert hashlib.sha256(data[file]).hexdigest()==expected,(title,file)
 assert b'campaign-slots.js?v=0.16.0' in data['index.html']
 assert b'Arsenal &amp; Archives' in data['index.html'] or b'Arsenal & Archives' in data['index.html']
report={'build_id':V['buildId'],'timestamp_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'runtime_assets':list(V['assets']), 'complete':'PASS','overlay':'PASS','base_archive':BASE.name,'suites_passed':21,'live_offline':'BLOCKED'}
(R/'verification/v0.16.0/package-integrity.json').write_text(json.dumps(report,indent=2)+'\n')
release=json.loads((R/'RELEASE-v0.16.0.json').read_text());release['package_checks']=report;(R/'RELEASE-v0.16.0.json').write_text(json.dumps(release,indent=2)+'\n')
# Include the evidence in the delivered archives; it does not change runtime hashes.
files=sorted(p for p in R.rglob('*') if included(p));changed=[p for p in files if baseline.get(p.relative_to(R).as_posix())!=p.read_bytes() and p.relative_to(R).parts[0]!='screenshots']
write_zip(FULL,files);write_zip(UPDATE,changed)
for path in [FULL,UPDATE]:
 with zipfile.ZipFile(path) as z:
  assert z.testzip() is None
  data={n:z.read(n) for n in z.namelist() if not n.endswith('/')}
  if path==UPDATE:data={**baseline,**data}
  for file,expected in V['assets'].items():assert hashlib.sha256(data[file]).hexdigest()==expected,(path,file)
print(json.dumps({'complete':str(FULL),'update':str(UPDATE),'final_bytes':{'complete':FULL.stat().st_size,'update':UPDATE.stat().st_size},'runtime_integrity':'PASS','suites':21},indent=2))
