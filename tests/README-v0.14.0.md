# Living Depths tests

Current runtime: v0.14.0 / Living Depths. Earlier test scripts, guides and screenshots are retained as historical evidence and may assert superseded save behaviour. Use the v0140 scripts for this release.

## Requirements and execution

Python 3.10+ with Playwright, Chromium and Node.js. The harness uses a `chromium` executable when available, otherwise Playwright's installed browser. No game framework or runtime package install is needed to play the game.

```sh
python -m pip install playwright
python -m playwright install chromium
python tests/build_release.py
python tests/run_v0140.py --jobs 1
```

Serial execution is the safe default. The large parallel run was unreliable in the authoring environment. Smaller groups can be run separately:

```sh
python tests/run_v0140.py --group core --jobs 1
python tests/run_v0140.py --group world --jobs 1
python tests/run_v0140.py --group interface --jobs 1
python tests/run_v0140.py --group release --jobs 1
```

The geometry and achievement phases share a script but have independent execution switches, avoiding an unnecessarily long single browser test:

```sh
python tests/v0140_world_achievements_test.py --geometry-only
python tests/v0140_world_achievements_test.py --achievements-only
```

`v0140_migration_test.py` uses a retained synthetic v0.13 fixture. Supply `--baseline /path/to/the-abyss-below-v0.13.0-complete.zip` to regenerate that fixture using the actual archived runtime and repeat the before/after HUD measurement. It never reads a real user profile.

`v0140_previews.py` captures production screenshots using synthetic gear and positions. It is not a campaign playthrough. `v0140_live_pwa_test.py` attempts a real local HTTP/worker/offline flow without mocked networking; a blocked or failed result must not be counted as a pass.

## Scope

The harness reads actual HTML script tags and injects the referenced production assets. An in-memory localStorage implementation isolates the tests, so JSON transaction behaviour is exercised without claiming native browser-storage durability. Test-only diagnostics are enabled by an explicit test flag; ordinary hosted play exposes only read-only runtime status.

The main suites cover resume, survey/current rules, audio lifecycle, input/layout, combat/lighting, adaptive systems, terrain/achievements, harbour/breaches, migration and release wiring. Node worker/version tests use mocked browser/network boundaries and are labelled accordingly.

Latest packaged successful results: `verification/v0.14.0/results.json`. Each entry links its stdout/stderr log; packaged runtime hashes are included. See `VERIFICATION-v0.14.0.md` for untested hardware and blocked live-PWA scope.
