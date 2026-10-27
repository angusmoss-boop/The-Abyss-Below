"""Merge focused reruns only when the entire production runtime matches the full run."""
from pathlib import Path
import json,hashlib,concurrent.futures,sys
from datetime import datetime,timezone
import run_v0170 as runner
R=runner.R;O=runner.O
old=json.loads((O/'results-all.json').read_text())
for name,digest in old['runtime_hashes'].items():assert hashlib.sha256((R/name).read_bytes()).hexdigest()==digest,('runtime changed; full rerun required',name)
(O/'attempts').mkdir(exist_ok=True);(O/'attempts/full-run-before-focused-reruns.json').write_text(json.dumps(old,indent=2)+'\n')
names=['economy','economy-migration','ui','sync']
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:results=list(pool.map(runner.check,[(n,runner.SUITES[n]) for n in names]))
by={r['suite']:r for r in old['results']};by.update({r['suite']:r for r in results})
final={**old,'results':[by[name] for name in runner.SUITES],'focused_reruns':names,'finalised_utc':datetime.now(timezone.utc).isoformat(),'note':'Full production run plus focused reruns; identical runtime SHA-256 required before merging. Future-version sync fixture now uses 0.18; UI includes 13-size ammo-card/44px-target coverage with 8-second action timeout.'}
for name,digest in old['runtime_hashes'].items():assert hashlib.sha256((R/name).read_bytes()).hexdigest()==digest
(O/'results-all.json').write_text(json.dumps(final,indent=2)+'\n')
assert len(final['results'])==23 and all(v['status']=='PASS' for v in final['results']),final['results']
print('23 suites passed against the identical final production runtime.',flush=True)
