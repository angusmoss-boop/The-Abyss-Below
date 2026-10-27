"""Recompute the published checksums after changing a runtime file."""
from pathlib import Path
import json,hashlib
ROOT=Path(__file__).resolve().parents[1]
FILES=['index.html','styles.css','game.js','version-sync.js','service-worker.js','manifest.webmanifest','icon-192.png','icon-512.png','icon-maskable-512.png']
release={'schema':1,'version':'0.12.0','name':'Fivefold Descent','buildId':'0.12.0-fivefold-descent-1','assets':{p:hashlib.sha256((ROOT/p).read_bytes()).hexdigest() for p in FILES}}
(ROOT/'version.json').write_text(json.dumps(release,indent=2)+'\n')
print('Release manifest:', release['buildId'])
