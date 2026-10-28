"""Package the artwork patch, then validate full and actual baseline-overlay archives."""
from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED
import json,hashlib,shutil
from datetime import datetime,timezone
R=Path(__file__).resolve().parents[1];OUT=R.parent
BASE=OUT/'the-abyss-below-v0.17.3-complete.zip'
V=json.loads((R/'version.json').read_text());E=json.loads((R/'verification/v0.17.4/results-latest.json').read_text())
assert V['buildId']=='0.17.4-crystal-descent-1' and E['build']==V['buildId']
assert len(E['results'])==11 and all(x['status']=='PASS' for x in E['results']),E['results']
for f,h in E['runtime_hashes'].items():assert hashlib.sha256((R/f).read_bytes()).hexdigest()==h,f
for f,h in V['assets'].items():assert hashlib.sha256((R/f).read_bytes()).hexdigest()==h,f
with ZipFile(BASE) as z:baseline={n:z.read(n) for n in z.namelist() if not n.endswith('/')}
def files():return sorted(p for p in R.rglob('*') if p.is_file() and '__pycache__' not in p.parts and p.suffix not in ['.pyc','.tmp'] and p.name!='ui-rerun.log')
def changed():return [p for p in files() if baseline.get(p.relative_to(R).as_posix())!=p.read_bytes() and p.relative_to(R).parts[0]!='screenshots']
report={'build':V['buildId'],'created_utc':datetime.now(timezone.utc).isoformat(),'base_archive':BASE.name,'targeted_suites_passed':11,'complete_integrity':'PASS','v0173_update_overlay':'PASS','deployed':False,'physical_device_install':'NOT_TESTED','live_offline_pwa':'BLOCKED','changed_files':[p.relative_to(R).as_posix() for p in changed()]}
(R/'RELEASE-v0.17.4.json').write_text(json.dumps(report,indent=2)+'\n')
(R/'verification/v0.17.4/package-integrity.json').write_text(json.dumps(report,indent=2)+'\n')
for suffix,chosen in [('complete',files()),('update',changed())]:
 dest=OUT/f'the-abyss-below-v0.17.4-{suffix}.zip'
 with ZipFile(dest,'w',ZIP_DEFLATED,compresslevel=9) as z:
  for p in chosen:z.write(p,p.relative_to(R).as_posix())
 with ZipFile(dest) as z:
  assert z.testzip() is None
  data={n:z.read(n) for n in z.namelist()}
 if suffix=='update':data={**baseline,**data}
 assert json.loads(data['version.json'])==V
 for f,h in V['assets'].items():assert hashlib.sha256(data[f]).hexdigest()==h,(dest.name,f)
 print(dest.name,dest.stat().st_size,'bytes: CRC, release hashes and overlay PASS')
icons=['icon-1024.png','icon-512.png','icon-192.png','icon-maskable-512.png','apple-touch-icon.png','favicon-32.png','favicon.ico','icon.svg','launch-art.webp','branding/approved-crystal-descent.png']
with ZipFile(OUT/'the-abyss-below-crystal-descent-icon-pack.zip','w',ZIP_DEFLATED,compresslevel=9) as z:
 for name in icons:z.write(R/name,name)
 z.write(R/'screenshots/v0.17.4/icon-shapes.png','icon-shape-preview.png')
 z.writestr('README.txt','THE ABYSS BELOW / CRYSTAL DESCENT\n\nApproved design, technically cropped and resized. Standard 192/512 icons, 512 maskable icon, 180 Apple touch icon, 32 PNG favicon, multi-size ICO, 1024 PNG master and WebP launch art.\n\nUse maskable-512 for Android PWA masking; the central ship stays inside the safe zone. The platform supplies final corner/circle shapes. The SVG embeds a raster PNG; it is not vector-traced.\n\nThis pack does not by itself update the game. Use the game update ZIP for manifest, offline-worker, menu and version wiring.\n')
with ZipFile(OUT/'the-abyss-below-crystal-descent-icon-pack.zip') as z:assert z.testzip() is None
copies={
 'icon-1024.png':'the-abyss-below-new-icon-1024.png',
 'screenshots/v0.17.4/menu-390x844.png':'v0.17.4-mobile-menu.png',
 'screenshots/v0.17.4/menu-1440x900.png':'v0.17.4-desktop-menu.png',
 'screenshots/v0.17.4/launch-390x844.png':'v0.17.4-startup-screen.png',
 'screenshots/v0.17.4/icon-shapes.png':'v0.17.4-icon-preview.png',
 'VERIFICATION-v0.17.4.md':'VERIFICATION-v0.17.4.md',
 'CRYSTAL-DESCENT-v0.17.4.md':'CRYSTAL-DESCENT-v0.17.4.md'}
for src,dest in copies.items():shutil.copy2(R/src,OUT/dest)
print('PASS standalone icon pack and preview/export paths')
