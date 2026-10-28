"""Recompute the published checksums after changing a runtime file."""
from pathlib import Path
import json,hashlib
ROOT=Path(__file__).resolve().parents[1]
FILES=['service-worker.js', 'index.html', 'styles.css', 'campaign-slots.js', 'audio.js', 'lost-signals.js','forgotten-giants.js', 'game.js', 'version-sync.js', 'manifest.webmanifest', 'launch.js', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png', 'favicon-32.png', 'favicon.ico', 'launch-art.webp']
release={'schema':1,'version':'0.20.0','name':'Fluid Frontiers','buildId':'0.20.0-fluid-frontiers-1','assets':{p:hashlib.sha256((ROOT/p).read_bytes()).hexdigest() for p in FILES}}
(ROOT/'version.json').write_text(json.dumps(release,indent=2)+'\n')
print('Release manifest:', release['buildId'])
