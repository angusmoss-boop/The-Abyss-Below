"""Checks the actual runtime assets and release wiring, not string-only marketing claims."""
from pathlib import Path
import json,hashlib,re,subprocess
R=Path(__file__).resolve().parents[1]
v=json.loads((R/'version.json').read_text())
assert v['version']=='0.13.0' and v['name']=='Harbour Rising' and v['buildId']=='0.13.0-harbour-rising-1'
assert len(v['assets'])==9
for name,expected in v['assets'].items():assert hashlib.sha256((R/name).read_bytes()).hexdigest()==expected,name
html=(R/'index.html').read_text();css=(R/'styles.css').read_text();game=(R/'game.js').read_text();worker=(R/'service-worker.js').read_text()
ids=re.findall(r'\bid="([^"]+)"',html);assert len(ids)==len(set(ids))
assert re.findall(r'<script\s+[^>]*src="([^"]+)"',html)==['game.js?v=0.13.0','version-sync.js?v=0.13.0']
assert len(re.findall(r'<script[^>]+defer',html))==2
for s in [html,css,game,worker]:assert v['buildId'] in s
for path in ['styles.css?v=0.13.0','game.js?v=0.13.0','version-sync.js?v=0.13.0','manifest.webmanifest?v=0.13.0']:assert path in html and path in worker,path
for id in ['achievementsDialog','menuAchievementsBtn','pauseAchievementsBtn','menuHubBtn','bankedCrystalCount']:assert id in ids
for name in ['game.js','version-sync.js','service-worker.js']:subprocess.run(['node','--check',str(R/name)],check=True)
assert 'the-abyss-below-campaign-v3' in game and 'the-abyss-below-campaign-v2' in game
print('PASS release name/version/build markers; nine current SHA-256 assets; script/defer order; unique DOM IDs; versioned shell URLs; JavaScript syntax; explicit v2-to-v3 storage boundary')
