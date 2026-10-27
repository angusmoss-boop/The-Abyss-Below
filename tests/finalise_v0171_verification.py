from pathlib import Path
import json,hashlib,shutil
from datetime import datetime,timezone
R=Path(__file__).resolve().parents[1];OUT=R/'verification/v0.17.1'
e=json.loads((OUT/'results-all.json').read_text());assert len(e['results'])==24 and all(s['status']=='PASS' for s in e['results'])
for f,h in e['runtime_hashes'].items():assert hashlib.sha256((R/f).read_bytes()).hexdigest()==h
measurements=json.loads((OUT/'control-measurements.json').read_text());audio=json.loads((OUT/'pause-audio.json').read_text());live=json.loads((OUT/'live-pwa.json').read_text())
now=datetime.now(timezone.utc).isoformat();table='\n'.join('| '+s['suite']+' | PASS | '+str(s['seconds'])+' s |' for s in e['results'])
text=f'''# Verification: v0.17.1 / Quiet Command

Build: `0.17.1-quiet-command-1`  
Base: v0.17.0 / Salvage & Supply  
Finalised (UTC): {now}

## Recorded result

**24 automated suites passed against the final runtime files.** Browser suites execute the production HTML/CSS/JavaScript in Chromium with synthetic localStorage and deterministic time/scene probes. Sync and worker lifecycle suites use mocked boundaries. The separate live offline attempt did not pass.

| Suite | Result | Runtime |
|---|---|---|
{table}

## Patch-specific findings

- Actual v0.17.0 and v0.17.1 measurements at 320x568, 390x844, 568x320 and 844x390 confirm a smaller control bounding area and lower top edge. At 390x844 the action bank changes from 182x252 to 202x168 CSS pixels, one third shorter and 26% smaller in bounding area. It is slightly wider, not smaller in every dimension.
- Ten icon-only circular controls retain at least 44-pixel hit targets. Visible text nodes are hidden. Railgun, torpedo and mine are vertically ordered. Icon widths are larger. Real dock purchases change grey unfitted buttons to fitted states without requiring a reload.
- Existing responsive touch and explorer suites cover eleven touch sizes; dock UI covers thirteen sizes including desktop. Buttons do not overlap each other or the HUD, and normal desktop retains its key-reference strip. Actual CDP touches exercise simultaneous steering, rail fire, torpedo launch and mine deployment, plus the existing boost and Use combinations.
- Actual v0.17.0 synthetic saves loaded in all three slots retain balances, upgrade marks, purchased ammunition, resources, regeneration state, achievements, active cargo and position. Per-level state is compared with the same save normalised by the old runtime; harmless omitted/default fields are not confused with progression changes. Inactive slots remain untouched. All upgrade prices match exactly.
- Native Web Audio instrumentation confirms the game gain ramps to zero over 0.38 seconds on pause, current voices receive scheduled releases, and the AudioContext is not immediately suspended. The pause theme runs while the expedition stays frozen.
- The original stereo pause loop is 40 seconds at 48 BPM. Its measured buffer peak is {audio['pause_loop']['peak']:.6f}, RMS {audio['pause_loop']['rms']:.6f}, and endpoint sample difference {audio['pause_loop']['seam']:.6f}. These are sample/signal checks, not a human judgement of musical quality or a guarantee of imperceptible seams.
- Background output reaches zero before context suspension. Rapid resume cancels pending suspension. Repeated scene updates do not add duplicate loops. Sonar preview in paused settings remains audible with game audio muted. Global mute produces a near-zero signal. Delayed event gains initialise at zero.
- Existing gameplay/economy, weapon collisions, shields, sonar, darkness, hull pressure, save/resume, world generation, survey and harbour suites pass. There is no intentional balance or campaign-schema change.

## Screenshots

Portrait 390x844, landscape 844x390 and desktop 1440x900 screenshots were captured from the production renderer with synthetic money/equipment and staged camera positions. Portrait controls were visually inspected; no external concept artwork is substituted. Additional images show locked gear and the pause menu. No real user save was accessed.

## Offline limitation

The real local HTTP/service-worker test returned `{live['status']}`. Chromium blocked localhost navigation with `net::ERR_BLOCKED_BY_ADMINISTRATOR`. Thus service-worker installation, live hosted replacement, real offline relaunch and migration of an already-installed PWA are **not verified** by this run. Mocked worker/checksum checks do not establish live offline behaviour.

## Untested

Physical Android/iOS hardware, Safari/WebKit/Firefox, phone-speaker/headphone listening, perceptual click removal, touch comfort, frame-time/battery/thermal profiling, production GitHub Pages deployment and a complete human campaign playthrough remain untested. An operating system can freeze background execution before a requested fade completes. Audio scheduling checks cannot guarantee that every device or driver is free from clicks.

## Reproduction and packaging

`python tests/build_release.py`  
`python tests/run_v0171.py --jobs 3`  
`python tests/v0171_live_pwa_test.py`  
`python tests/v0171_previews.py`  
`python tests/finalise_v0171_verification.py`  
`python tests/package_v0171.py`

See `tests/README-v0.17.1.md`. Machine-readable results, runtime hashes and individual logs are in `verification/v0.17.1/`. Package verification reads both resulting ZIPs, tests archive integrity, and overlays the update onto the actual v0.17.0 full ZIP before comparing all eleven runtime checksums. The package report is separate in `package-integrity.json`.
'''
(R/'VERIFICATION-v0.17.1.md').write_text(text)
p=R/'RELEASE-v0.17.1.json';release=json.loads(p.read_text());release['verification_summary']={'suites_passed':24,'runtime_hashes':e['runtime_hashes'],'finalised_utc':now,'live_offline':'BLOCKED_BY_BROWSER_POLICY','physical_devices':'UNTESTED','human_audio_listening':'UNTESTED'};p.write_text(json.dumps(release,indent=2)+'\n')
for name in ['VERIFICATION-v0.17.1.md','QUIET-COMMAND-v0.17.1.md']:shutil.copy2(R/name,R.parent/name)
print('Verification report created from 24 passing suites and final runtime hashes.')
