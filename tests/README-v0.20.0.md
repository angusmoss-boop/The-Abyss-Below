# Reproducing Fluid Frontiers verification

Use Python 3 with Playwright and a Chromium binary named `chromium` in PATH, plus Node.js. The browser suites use actual production HTML, CSS and scripts injected into a Chromium page, with an isolated synthetic local-storage boundary and service workers disabled. They never use a user's real save. Some migration suites also use the earlier complete ZIP files in the parent folder, as named in each test. The actual v0.19.0 complete archive is required for the newest migration and unchanged-lamp comparison tests.

Run:

```
python tests/build_release.py
python tests/run_v0200.py
python tests/v0200_live_pwa_probe.py
python tests/v0200_capture.py
```

The main runner executes 39 current suites with two workers. Exit zero requires every suite to pass. A subset can be selected by suffix, for example `python tests/run_v0200.py frontiers shoals achievements_extra`. Each selected suite writes a log and `*-result.json` into `verification/v0.20.0/`; `results-latest.json` records that invocation and the final runtime hashes. `results-all.json` supplied in this release combines the final full run and the final baseline-pixel comparison. Do not treat reports from earlier releases as current evidence.

The version checker and worker suites use Node with explicitly mocked boundaries. The separate real HTTP probe records a blocked connection as BLOCKED, never PASS. It is not itself a full installed-PWA test even when HTTP navigation is available.

The `ABYSS_TEST_MODE` inspection hooks create controlled scenes, gear and stored campaigns. The tests then exercise production movement, collisions, purchases, collection, combat, banking, save/restore, input and rendering. UI screenshots use production rendering with staged positions and synthetic equipment.

For release packaging, verify and freeze the runtime manifest, assemble the final evidence with matching runtime hashes, then run `python tests/package_v0200.py`. It checks every runtime asset against the manifest and reconstructs the update over the real v0.19.0 ZIP. It does not publish the files to a remote server.
