# v0.12.0 verification

Run from the repository root. Python 3, Node.js, Playwright for Python and Chromium are required. The harness uses `/usr/bin/chromium` when present, otherwise Playwright's Chromium installation. Install dependencies in your own development environment before running.

```sh
python tests/build_release.py
python tests/run_v0120.py
python tests/v0120_previews.py
python tests/v0120_live_pwa_test.py
```

The main runner executes ten suites, retaining stdout/stderr, exit codes and durations under `verification/v0.12.0`. It runs at most two suites concurrently. `v0120_previews.py` captures production HTML/CSS/canvas output at 390x844, 844x390 and 1440x900 and additionally checks exhaustive fixed-resource/recorder collection and related achievements with synthetic equipment. `v0120_live_pwa_test.py` is a separate optional real-network/worker attempt and has its own outcome; it is not silently included as a pass in the main runner.

## Coverage and isolation

- `v0120_campaign_test.py`: five banked-recorder gates; level switching; unchanged saved layouts/depletion; reloads; stock/cost arithmetic; every paid upgrade through actual UI controls; independent currency guards; paid ammo; crash/death recovery without duplicate cargo.
- `v0120_world_achievements_test.py`: all floors/headings/boosted collision; floor sonar; 40 seeds; starter resources; real achievement counters; modal entry/exit; per-pressure-gate crystal reserves and New Game.
- `v0120_migration_test.py`: fixture from actual archived v0.11 production runtime; profile, layout, old recorder and enemy-state preservation; first-four-level unlocks; one-time final crystal addition; idempotent reload and malformed-primary backup recovery.
- `v0120_ui_test.py`: thirteen portrait/landscape/tablet/desktop sizes; three upgrade columns; both currencies; expedition cards; native modals; keyboard tab navigation; viewport/pinned control checks.
- `v0120_touch_test.py`: eleven touch sizes/five desktop sizes; current controls, geometry, multitouch steering/actions, pointer ownership/cancellation/orientation and mouse/keyboard input.
- `v0120_systems_test.py`: magnet/shield/disruptor marks and interactions with power, visibility, damage, delays and predator tiers.
- `v0120_regression_test.py`: pixel darkness/beam marks, sonar arrival/expiry, mines, scaled predator HP, boost/collision, pursuit/depth limits, hull progression and unavailable-storage reporting.
- `v0120_release_test.py`: syntax, nine runtime hashes, unique IDs, script/defer order, markers and save-key wiring.
- `v0120_sync_test.mjs`: production version checker with mocked deployment and worker boundaries.
- `v0120_worker_test.mjs`: production worker with mocked cache/network lifecycle and partial-update rejection.

The browser harness injects the real production assets into Chromium with a controlled localStorage shim. Test-only diagnostics require the explicit `ABYSS_TEST_MODE` flag or `?testmode`; synthetic credits/equipment/coordinates are used to isolate assertions. Runtime code is not replaced by a parallel implementation. Most checks are not real HTTP navigation and do not exercise a physical phone or a human-paced campaign.

## Migration fixture

`fixtures/v0110_campaign.json` was generated using the real archived v0.11 game with synthetic actions. It contains no personal user save. `generate_v0110_fixture.py` documents the one-time generation procedure; to regenerate it elsewhere, set its legacy-runtime directory to an extracted v0.11 source folder. Routine migration tests use the bundled fixture and do not need the old ZIP.

## Historical files

Earlier test scripts and verification logs are retained as history. Their expected prices, depths, level count and controls can differ from v0.12.0. Run the current runner for current acceptance, not a wildcard over all historic scripts.

## Limits

No physical Android/iOS/Safari/Firefox run or CPU/heat/battery profile was performed. Exhaustive counter checks with repositioning are not a completed balance playthrough. The localhost worker integration attempt may be blocked by the execution environment; read `live-pwa.json` before making any offline/update claim. No repository push, production deployment, Android wrapper or signed app bundle is part of this release.
