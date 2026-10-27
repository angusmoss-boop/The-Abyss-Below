"""Checks the actual runtime assets and release wiring, not string-only marketing claims."""
from pathlib import Path
import json,hashlib,re,subprocess
R=Path(__file__).resolve().parents[1]
v=json.loads((R/'version.json').read_text())
assert v['version']=='0.17.1' and v['name']=='Quiet Command' and v['buildId']=='0.17.1-quiet-command-1'
assert len(v['assets'])==11
for name,expected in v['assets'].items():assert hashlib.sha256((R/name).read_bytes()).hexdigest()==expected,name
html=(R/'index.html').read_text();css=(R/'styles.css').read_text();game=(R/'game.js').read_text();worker=(R/'service-worker.js').read_text()
ids=re.findall(r'\bid="([^"]+)"',html);assert len(ids)==len(set(ids))
assert re.findall(r'<script\s+[^>]*src="([^"]+)"',html)==['campaign-slots.js?v=0.17.1','audio.js?v=0.17.1','game.js?v=0.17.1','version-sync.js?v=0.17.1']
assert len(re.findall(r'<script[^>]+defer',html))==4
for s in [html,css,game,worker]:assert v['buildId'] in s
for path in ['audio.js?v=0.17.1','styles.css?v=0.17.1','game.js?v=0.17.1','version-sync.js?v=0.17.1','manifest.webmanifest?v=0.17.1']:assert path in html and path in worker,path
for id in ['achievementsDialog','menuAchievementsBtn','pauseAchievementsBtn','menuHubBtn','bankedCrystalCount']:assert id in ids
for name in ['campaign-slots.js','audio.js','game.js','version-sync.js','service-worker.js']:subprocess.run(['node','--check',str(R/name)],check=True)
assert 'the-abyss-below-campaign-v3' in (R/'campaign-slots.js').read_text() and 'the-abyss-below-campaign-v2' in game
print('PASS release name/version/build markers; eleven current SHA-256 assets; script/defer order; unique DOM IDs; versioned shell URLs; JavaScript syntax; explicit v2-to-v3 storage boundary')
