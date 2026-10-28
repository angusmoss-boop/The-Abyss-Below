# NEREID Reforged verification

Requirements: Python 3, Playwright Python, Chromium, Node.js; Pillow for preview montage creation. No npm build is needed for the game. The harness boots actual HTML-ordered production scripts in Chromium using isolated synthetic localStorage, without accessing a player's real saves.

```sh
python tests/build_release.py
python tests/run_v0240.py
python tests/v0240_live_pwa_probe.py
python tests/v0240_previews.py
```

The default runner contains **51 suites**, including six new release-specific suites: contact pickups, emergency repair, real CDP pinch gestures, actual v0.23 migration across three slots, contact access in 25 generated maps, and graded appearance/Shipyard tests. The retained gameplay, resource, control, audio, mission, wildlife, wreck, layout, export and cache-verifier regressions are run against this build too.

Put `the-abyss-below-v0.23.0-complete.zip` beside the extracted directory for actual legacy migration. The inherited wreck-migration suite also uses v0.22.0. The Mk I beam comparison uses v0.19.0. Other historic tests may use earlier archives or retained synthetic fixtures; inspect their source for prerequisites. A missing prerequisite is not a passing test.

The beam comparison deliberately excludes the newly redesigned vessel footprint, then compares the surrounding rendered beam pixel-for-pixel against the original Mk I code. Pickup regressions were adapted to use real contact collection rather than the removed manual crystal/cache behaviour. History remains in the earlier-version test files.

`verification/v0.24.0/results-latest.json` records statuses and runtime SHA-256 hashes. Each suite has a log and JSON result. `contact-placements.json` checks all generated crystal/repair-pack access positions. Node worker/sync suites mock browser/network boundaries; they do not demonstrate a live hosted install. The separate live HTTP probe records administrative network blocks as blocked, not passed.

Preview screenshots use actual production code with staged equipment and positions. The vessel-evolution sheet is composed of the same renderer at three fitted stages. It is a demonstration, not an image-generated promise of different in-game art.

Rebuild all twenty runtime checksums after any runtime edit, then rerun the tests. Physical-phone gesture ergonomics, frame rate, heat/battery, hardware audio and a full human survival-balance playthrough require separate testing. See `VERIFICATION-v0.24.0.md` for this run's evidence and limits.
