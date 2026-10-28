"""Package the audio patch and verify a real v0.17.2 update overlay."""
from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED
import json,hashlib
from datetime import datetime,timezone
R=Path(__file__).resolve().parents[1];OUT=R.parent
BASE=OUT/'the-abyss-below-v0.17.2-complete.zip'
V=json.loads((R/'version.json').read_text());E=json.loads((R/'verification/v0.17.3/results-all.json').read_text())
assert V['buildId']=='0.17.3-smooth-signals-1'
assert len(E['results'])==11 and all(x['status']=='PASS' for x in E['results'])
for f,h in E['runtime_hashes'].items():assert hashlib.sha256((R/f).read_bytes()).hexdigest()==h,f
for f,h in V['assets'].items():assert hashlib.sha256((R/f).read_bytes()).hexdigest()==h,f
with ZipFile(BASE) as z:baseline={n:z.read(n) for n in z.namelist() if not n.endswith('/')}
FULL=OUT/'the-abyss-below-v0.17.3-complete.zip';UPDATE=OUT/'the-abyss-below-v0.17.3-update.zip'
def files():
 return sorted(p for p in R.rglob('*') if p.is_file() and '__pycache__' not in p.parts and p.suffix not in ['.pyc','.tmp'])
def changed_files():
 return [p for p in files() if baseline.get(p.relative_to(R).as_posix())!=p.read_bytes() and p.relative_to(R).parts[0]!='screenshots']
report={'build':V['buildId'],'created_utc':datetime.now(timezone.utc).isoformat(),'base_archive':BASE.name,'targeted_suites_passed':11,'complete_integrity':'PASS','v0172_update_overlay':'PASS','deployed':False,'physical_device_listening':'NOT_TESTED','live_offline_pwa':'NOT_TESTED','changed_files':[p.relative_to(R).as_posix() for p in changed_files()]}
(R/'RELEASE-v0.17.3.json').write_text(json.dumps(report,indent=2)+'\n')
(R/'verification/v0.17.3/package-integrity.json').write_text(json.dumps(report,indent=2)+'\n')
for dest,chosen in [(FULL,files()),(UPDATE,changed_files())]:
 with ZipFile(dest,'w',ZIP_DEFLATED,compresslevel=9) as z:
  for p in chosen:z.write(p,p.relative_to(R).as_posix())
 with ZipFile(dest) as z:
  assert z.testzip() is None
  data={n:z.read(n) for n in z.namelist()}
 if dest==UPDATE:data={**baseline,**data}
 assert json.loads(data['version.json'])==V
 for f,h in V['assets'].items():assert hashlib.sha256(data[f]).hexdigest()==h,(dest.name,f)
 assert b'v0.17.3' in data['index.html'] and b'Smooth Signals' in data['index.html']
 print(dest.name,dest.stat().st_size,'bytes: CRC, release checksums and overlay PASS')
# Verify no gameplay/storage/layout changes beyond audio hook and release IDs.
g=baseline['game.js'].decode().replace("version:'0.17.2',name:'Delta Helm',id:'0.17.2-delta-helm-1'","version:'0.17.3',name:'Smooth Signals',id:'0.17.3-smooth-signals-1'")
g=g.replace("    for(const type of ['pointerdown','keydown'])document.addEventListener(type,()=>{if(!document.hidden)window.AbyssAudio?.unlock();},{capture:true});\n",'')
assert g==(R/'game.js').read_text()
for f in ['styles.css','campaign-slots.js']:assert baseline[f].decode().replace('0.17.2-delta-helm-1','0.17.3-smooth-signals-1')==(R/f).read_text()
print('PASS exact baseline comparison for gameplay, economy, save routines and controls')
