# The Living Abyss: verification

The current release is **0.25.0-the-living-abyss-1**. Runtime code is plain HTML/CSS/JavaScript; no npm build is required.

```sh
python tests/build_release.py
python tests/run_v0250.py
python tests/v0250_live_pwa_probe.py
```

Requirements: Python 3, Playwright Python, Chromium, Node.js, and Pillow for previews. The Chromium harness executes the actual entry points from index.html with synthetic localStorage. It never accesses a player's real save. Browser/network mocking in the harness does not establish a live PWA install.

The runner contains 56 suites: five new suites for ecology, wildlife routines/surface cycles, photo mode, actual v0.24 migration, and the field-guide layouts, plus 51 retained gameplay/interface/backup/audio/cache regressions. `verification/v0.25.0/results-latest.json` records the final run, hashes and results. Historical version reports are not evidence for this build. Development failures, when retained, are labelled separately.

The ecology suite checks 20 generated maps across all five levels, safe giant placement and movement, non-combat status, observation lighting, sonar echoes, and pause/save behaviour. The photo suite exercises seven screen sizes, real Chromium touch-pinching, mouse cropping, PNG export, resource/clock/survey invariance and return-to-pause. The journal suite checks 13 sizes.

Keep the v0.24 complete ZIP next to the extracted project to repeat the actual previous-release migration test. Retained historic migration/pixel suites also use the v0.23, v0.22, v0.19 and other historical ZIPs or synthetic fixtures; inspect individual suite prerequisites. Missing prerequisites are not passes.

The scripts in this directory include older releases for reproducibility. Run the current `run_v0250.py`, not an old runner with hard-coded previous build identities. The sync/worker tests intentionally mock browser/network boundaries; a separate live probe reports a navigation block as BLOCKED.

Physical-phone touch ergonomics, frame rate, heat and battery use, hardware listening, real hosted update/install/offline behaviour and a complete human playthrough are not verified by these suites.
