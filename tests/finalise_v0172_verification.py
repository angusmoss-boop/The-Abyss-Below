"""Generate release evidence from actual passing results and final asset hashes."""
from pathlib import Path
from datetime import datetime,timezone
import json,hashlib,shutil
R=Path(__file__).resolve().parents[1];O=R/'verification/v0.17.2'
e=json.loads((O/'results-all.json').read_text())
assert len(e['results'])==25 and all(s['status']=='PASS' for s in e['results'])
for f,h in e['runtime_hashes'].items():assert hashlib.sha256((R/f).read_bytes()).hexdigest()==h,f
measure=json.loads((O/'control-measurements.json').read_text());audio=json.loads((O/'pause-audio.json').read_text());live=json.loads((O/'live-pwa.json').read_text())
m=next(x for x in measure if x['width']==390)
area_reduction=(1-m['new_circle_area']/m['old_circle_area'])*100
now=datetime.now(timezone.utc).isoformat()
table='\n'.join('| '+s['suite']+' | PASS | '+str(s['seconds'])+' s |' for s in e['results'])
text=f'''# Verification: v0.17.2 / Delta Helm

Build: `0.17.2-delta-helm-1`  
Base: v0.17.1 / Quiet Command  
Finalised (UTC): {now}

## Recorded result

**25 automated suites passed against the final runtime files.** Production-file browser suites use Chromium, synthetic localStorage and deterministic scene/time hooks. The sync and worker lifecycle suites use mocked boundaries. The separate real HTTP/offline attempt was blocked, not passed.

| Suite | Result | Runtime |
|---|---|---|
{table}

## New controls and behaviour

- Exactly seven mobile buttons. Railgun is centred above torpedo and mine; the row beneath is Boost, Use, Sonar, Repair, with strictly decreasing diameters and a shared bottom baseline.
- All action circles retain at least 44 CSS pixels in diameter. Icons are enlarged and centred, visible text is absent, accessible names remain, and unfitted equipment is grey. Actual dock purchases update the fitted states and stock rings.
- Four direct before/after measurements compare the actual v0.17.1 runtime with this build. At 390x844 the summed circular button area is {area_reduction:.1f}% lower. The bank changes from 202x168 to {m['new_bank']['width']:.1f}x{m['new_bank']['height']:.1f} CSS pixels: the bottom row is wider, not a smaller rectangle in every dimension. Decorative triangle edges and the central gap pass pointer hit-testing through to the canvas.
- The retained touch suite checks eleven touch viewports and five desktop sizes. It tests actual browser hit targets and radial button separation, appropriate for a triangle of circular controls. The dock UI suite covers thirteen sizes. Desktop retains its key-reference strip with no Shift/Silent entry.
- Actual Chrome DevTools Protocol multi-touch events verify steering with held rail, single-shot torpedo and mines at three phone sizes. The existing boost/Use combinations, pointer cancellation, orientation changes and focus-loss cleanup remain covered.
- Actual small, medium and large steering drags produce strictly increasing speed and noise. Releasing the drag clears throttle and the ship coasts down. Shift no longer changes speed/noise. Passive Silent Drive insulation reduces noise without reducing speed; boost remains loud.
- The flashlight switch operates in telemetry at five mobile/desktop sizes, without resuming simulation, changing ammo or grabbing the helm. Closing the dialog restores the previous pause state. Saved lamp state survives reload; desktop L remains functional.
- A restored legacy active dive carrying a quiet-mode flag discards only that retired mode, preserving its purchased insulation upgrade.

## Save and gameplay regression evidence

A synthetic campaign is generated using the actual archived v0.17.1 runtime, with purchases, resource recovery and an active saved dive. Copies populate all three slots. Each slot is then loaded by this runtime and compared with the old runtime's normalised per-level state. Credits, crystals, upgrade levels, prices, paid ammunition, achievements, resources, regeneration state, cargo and submarine systems are unchanged. Inactive slots remain byte-for-byte untouched. No actual player save is accessed.

Existing suites cover weapon damage/collisions, mine safety, fixed crystals, salvage regeneration/automatic pickup, paid supplies, 20 achievements, five-level generation, sonar, darkness, shields, pressure damage, survey, active-dive resume, wildlife and harbour/breach behaviour. The removed Shift-based harbour test is replaced by a genuine below-threshold surface approach; it still checks that low-speed contact does not create a free breach.

## Audio regression evidence

Native Web Audio instrumentation confirms a 0.38-second gameplay fade on pause, scheduled event release, no immediate AudioContext suspension, and the retained 40-second chilled pause theme. Background output reaches zero before suspension; quick resume cancels stale suspend timers. Repeated scene updates do not add duplicate themes. Independent effects preview and mute remain functional.

The pause buffer peak measured {audio['pause_loop']['peak']:.6f}, RMS {audio['pause_loop']['rms']:.6f}, and endpoint sample difference {audio['pause_loop']['seam']:.6f}. These are signal and scheduling checks, not human listening or a guarantee of click-free playback on all devices. Engine gain now scales with speed rather than a manual silent-mode flag.

## Screenshots

Current production screenshots cover portrait 390x844, landscape 844x390, desktop 1440x900, unfitted equipment and pause. Portrait and landscape control layouts were visually inspected. Synthetic funds, purchased equipment and camera staging are used; the screenshots are not concept artwork or a player's save.

## Live/offline boundary

The separate real HTTP/service-worker test returned `{live['status']}`. Its error was:

```text
{live.get('error','No error')}
```

Therefore this run does not verify real worker installation, hosted replacement, offline relaunch or a live installed PWA upgrading. Mocked worker and checksum tests are not substitutes for that evidence.

## Untested

Physical Android/iOS hardware, other browser engines, thumb comfort, frame-time/battery/thermal profiling, speaker/headphone listening, GitHub Pages deployment and a complete human playthrough remain untested. The application remains a web/PWA source package, not a signed Android bundle.

## Reproduction and packaging

Run `python tests/build_release.py`, then `python tests/run_v0172.py --jobs 3`. Optional real integration: `python tests/v0172_live_pwa_test.py`. Screenshots: `python tests/v0172_previews.py`. Finalise and package using the matching v0172 scripts.

Machine-readable results and logs are in `verification/v0.17.2/`. Both ZIPs are tested for archive integrity, and the update is overlaid on the actual v0.17.1 complete archive before all eleven runtime asset checksums are compared. See `package-integrity.json` for the packaging result. Historical reports are not current evidence.
'''
(R/'VERIFICATION-v0.17.2.md').write_text(text)
release={'version':'0.17.2','name':'Delta Helm','buildId':'0.17.2-delta-helm-1','baseVersion':'0.17.1','release_utc':now,'verification_summary':{'suites_passed':25,'runtime_hashes':e['runtime_hashes'],'live_offline':live['status'],'physical_devices':'UNTESTED','human_audio_listening':'UNTESTED'}}
(R/'RELEASE-v0.17.2.json').write_text(json.dumps(release,indent=2)+'\n')
for name in ['VERIFICATION-v0.17.2.md','DELTA-HELM-v0.17.2.md']:shutil.copy2(R/name,R.parent/name)
print('Recorded 25 passing suites; report generated from final hashes and measured geometry/audio.')
