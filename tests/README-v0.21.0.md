# Reproducing Lifeline verification

Use Python 3 with Playwright and a Chromium binary named `chromium` in PATH, plus Node.js. The production-file browser harness reads the actual script tags from `index.html`, injects the real HTML/CSS/scripts, and gives the page isolated synthetic local storage. No real user save is accessed. These browser runs are not hosted-site or installed-PWA tests.

```
python tests/build_release.py
python tests/run_v0210.py
python tests/v0210_live_pwa_probe.py
python tests/v0210_quick_capture.py
```

The runner uses four workers and includes 43 current suites: four added Lifeline/UI/migration suites plus 39 current regressions. A subset is supported, for example `python tests/run_v0210.py lifeline cells command_ui lifeline_migration`. Exit zero means every selected suite passed. Each run writes individual logs/results and `results-latest.json` with runtime hashes into `verification/v0.21.0/`. The release's `results-all.json` is the final full-run evidence.

The newest migration boots the actual **v0.20.0 complete ZIP** in the parent directory, creates a synthetic used campaign in the old game, then loads that storage into Lifeline. Other historical migration and pixel-comparison suites use the earlier archives explicitly named in their source; keep those supplied prior releases alongside this folder to reproduce them. A comparison now explicitly excludes the newly appended `battery` items while checking every pre-existing resource exactly. This is an additive feature test, not permission to alter old resource positions or depletion.

The `sync` and `worker` suites execute production modules in Node with mocked network/browser boundaries. The real HTTP probe independently reports the environment's result. A blocked request is not an offline-test pass. Even successful HTTP navigation alone is not an installed-PWA integration test.

`ABYSS_TEST_MODE` hooks stage gear, positions and conditions. Tests exercise real movement, consumption, collection, regeneration, purchases, collisions, save/load and interface handlers. Menu screenshots use the actual approved artwork and production renderer; dock/pause examples include synthetic equipment and balances.

Once runtime changes are frozen and the full evidence matches the current manifest, run `python tests/package_v0210.py`. It validates ZIP CRCs, runtime hashes and reconstruction of the update over the actual v0.20.0 package. It does not deploy anything.
