"""Artwork, app identity and source-level no-gameplay-change assertions."""
from pathlib import Path
from PIL import Image
import json,re,hashlib,zipfile,subprocess
R=Path(__file__).resolve().parents[1]
V=json.loads((R/'version.json').read_text())
assert V['version']=='0.17.4' and V['buildId']=='0.17.4-crystal-descent-1' and V['name']=='Crystal Descent'
assert len(V['assets'])==16
for name,digest in V['assets'].items():assert hashlib.sha256((R/name).read_bytes()).hexdigest()==digest,name
expected={'icon-192.png':192,'icon-512.png':512,'icon-maskable-512.png':512,'icon-1024.png':1024,'apple-touch-icon.png':180,'favicon-32.png':32,'launch-art.webp':1024}
for name,size in expected.items():
 with Image.open(R/name) as im:
  assert im.size==(size,size),(name,im.size)
  assert im.mode=='RGB',name
  im.verify()
with Image.open(R/'favicon.ico') as im:assert im.ico.sizes()=={(16,16),(32,32),(48,48)}
# Sampled extremities of the actual central ship, within the 40%-radius circle.
ship_extrema=[(.525,.185),(.245,.593),(.712,.65),(.52,.78),(.36,.74),(.58,.82)]
assert all((x-.5)**2+(y-.5)**2 < .4**2 for x,y in ship_extrema)
manifest=json.loads((R/'manifest.webmanifest').read_text())
assert [i['purpose'] for i in manifest['icons']]==['any','any','maskable']
for icon in manifest['icons']:
 assert icon['src'].endswith('?v=0.17.4')
 f=R/icon['src'].split('?')[0]
 with Image.open(f) as im:assert icon['sizes']==f'{im.width}x{im.height}'
html=(R/'index.html').read_text();css=(R/'styles.css').read_text();worker=(R/'service-worker.js').read_text()
ids=re.findall(r'\bid="([^"]+)"',html);assert len(ids)==len(set(ids))
script_names=re.findall(r'<script\s+[^>]*src="([^"]+)"',html)
assert script_names==['launch.js?v=0.17.4','campaign-slots.js?v=0.17.4','audio.js?v=0.17.4','game.js?v=0.17.4','version-sync.js?v=0.17.4'],script_names
for js in [s.split('?')[0] for s in script_names]+['service-worker.js']:subprocess.run(['node','--check',str(R/js)],check=True)
for src in script_names:assert src in worker
for f in ['launch-art.webp','apple-touch-icon.png','favicon-32.png','favicon.ico']:assert f+'?v=0.17.4' in html and f+'?v=0.17.4' in worker
assert 'launch.js' in (R/'version-sync.js').read_text() and 'launch-art.webp' in (R/'version-sync.js').read_text()
# Compare the actual archived release, not a synthetic fixture.
base=R.parent/'the-abyss-below-v0.17.3-complete.zip'
with zipfile.ZipFile(base) as z:
 def updated(name):return z.read(name).decode().replace('0.17.3-smooth-signals-1',V['buildId']).replace('0.17.3','0.17.4').replace('Smooth Signals','Crystal Descent')
 for f in ['audio.js','campaign-slots.js']:assert (R/f).read_text()==updated(f),f
 assert (R/'game.js').read_text().replace('  window.AbyssLaunch?.ready();\n','')==updated('game.js'),'game logic changed'
 assert css.startswith(updated('styles.css')),'previous gameplay styles changed'
 oldmanifest=json.loads(z.read('manifest.webmanifest'))
 for key,value in oldmanifest.items():
  if key!='icons':assert manifest[key]==value,key
 assert z.read('icon-192.png')!=(R/'icon-192.png').read_bytes()
print('PASS 16 release hashes; icon sizes; opaque maskable art and sampled ship silhouette; versioned image URLs; unchanged app identity; syntax; exact unchanged game/storage/audio logic excluding release IDs and startup signal')
