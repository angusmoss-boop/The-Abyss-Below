# Verification: v0.22.0 / Deepwater Rescue

Build: `0.22.0-deepwater-rescue-1`  
Base: actual v0.21.0 complete archive  
Verification date: 28 October 2026 (UTC)

## Final outcome

**51 final automated suites passed against the frozen runtime.** This comprises eight Deepwater Rescue suites and 43 current gameplay, interface, audio, migration and update regressions. Final results and SHA-256 source hashes are in `verification/v0.22.0/results-all.json`.

These are actual production-code tests in Chromium plus Node tests for modeled update/worker boundaries. They are not a claim of deployment, physical-device performance, live offline installation or a complete human playthrough. All campaigns used for testing are synthetic, never the user's live saves.

## New feature coverage

| Suite | Checked |
| --- | --- |
| Rescue mechanics | Actual held USE restart, stable continuous hold, release-to-toggle FOLLOW / WAIT, normal-speed following, exact saved state, death leaving a waiting drone, no remote rescue, single harbour payment, report and export. |
| Oxygen stations | Six-second quarter-tank transfer, zero-power operation, normal air consumption, no gun/ammo/battery replenishment, depletion, paused clocks, exact reload, real-dock restock, upgraded-tank budget, full-tank protection, malformed reserve import rejection. |
| Escort navigation / placement | Shared A* routing around a rock with every movement sample collision-checked; harbour entry without changing predator protection; 25 generated level/seed combinations with 1/2/2/2/2 clear service sites, early stock-hull access and unchanged original loot. |
| Encounters | No paused/harbour clock accumulation, delayed approximate distress, sonar-front arrival, save/resume age and expiry, silt excluded from the shallow level, no new event damage, harbour cancellation. |
| Real v0.21 migration | Boot the archived v0.21 source, generate old equipment/resources/cargo/projectiles/enemies/wildlife/mission progress, then load with v0.22. Verify exact prior data and all prices, additive new sites, unmodified inactive slots and real slot-switch UI. |
| Rescue interfaces | 13 viewport sizes from 320x568 to 1920x1080; main/pause/dock access, actual docking report, search pin, reachable close/departure controls, scrolling without horizontal overflow, Escape and paused resource state, unchanged seven mobile actions. |
| New audio cues | Seven real OfflineAudioContext renders with finite nonzero output, no full-scale clipping, and silent tails. These are signal checks, not a musical or device-speaker listening review. |
| New-object visibility | Pixel sampling shows station/drone blacked out in deep water with lamps off, sonar appears on wave arrival rather than the button press, and saved sonar references restore by stable IDs. |

## Existing regression coverage

The 43 retained suites exercise oxygen, reserve propulsion, replenishing battery cells, all ship prices and crystal guards, finite resources, salvage regeneration, paid ammo, death wrecks and fixed rescue magazines, all five floors and map generation, 30 achievements, five optional wrecks and finishes, predator collision/routing/behaviour, weapon guidance and mines, contracts, the Warden, save slots, export/import, checkpoint resume, mobile multi-touch, desktop key controls, movement noise, darkness and flashlight marks, fish motion, main/pause/dock layouts, icon/launch presentation, music and the existing click-free audio lifecycle.

An inherited reserve-test fixture used a raw Y-coordinate cutoff instead of the production depth's rounding. The fixture was adjusted to use the actual rounded depth classification, then the complete suite was rerun successfully. No economy or pricing runtime code was changed for that fixture correction.

## Packaging and online-status wiring

All **19 runtime assets** have consistent release identifiers and published SHA-256 hashes, including `deepwater-rescue.js`. The HTML loads the new module before the main game. The version checker verifies its loaded build ID as well as the existing entry points. The worker refuses a partial or mismatched shell.

Both archives are CRC-checked. The update is applied over the actual v0.21 complete ZIP in memory, and every reconstructed runtime byte is checked against the frozen manifest. Package verification is recorded in `verification/v0.22.0/package-integrity.json` and `RELEASE-v0.22.0.json`.

Mocked worker installation/activation, offline fallback and partial-upload refusal passed. Mocked network verification passed. These tests explicitly do not stand in for the live browser checks below.

## Real HTTP / offline limitation

A localhost HTTP server was started and real Chromium navigation was attempted without intercepted networking. It failed with **`net::ERR_BLOCKED_BY_ADMINISTRATOR`**. Therefore real worker installation, hosted deployment, installed-app refresh, offline relaunch and physical launcher updates were not verified. See `live-pwa-probe.json` for the actual error.

## Visual inspection

The actual game renderer and interfaces were captured at portrait 390x844, landscape 844x390 and desktop 1440x900. The portrait air-station/escort view, portrait report, landscape report and compact docking summary were visually inspected. Report content scrolls separately from its header/footer, and departure remains available without dismissing an automatic modal.

Screenshots use synthetic equipment, position and progress. The docking report shown was produced by the real pickup and docking flow with a staged follower and trip statistics. It is not evidence that every seed has the same positions or outcome.

## Not established

- Physical Android/iOS ergonomics, frame-rate stability, heat, battery drain and speaker output.
- Safari/WebKit/Firefox compatibility.
- Human musical listening, encounter pacing or a full campaign balance playthrough.
- Every possible escort route in every procedural seed. The drone cannot teleport or phase through obstacles; rejoining it in open water may be needed if a route remains blocked.
- Play Store readiness, signing, store review or deployment to the user's live repository.

## Reproduce

See `tests/README-v0.22.0.md`. Run `python tests/build_release.py` after any runtime edit, then `python tests/run_v0220.py`. Real archived-code migration suites need their specified older ZIPs beside the source directory. Use `python tests/v0220_live_pwa_probe.py` separately to record the actual live-network capability of your own environment.
