# Current verification

Run `python tests/run_v0160.py --jobs 3` from the game root. This executes 21 suites against production code. Run the separate `python tests/v0160_live_pwa_test.py` for real localhost HTTP / worker / offline integration; it can be blocked by the environment and is not replaced by mocked tests.

The campaign-slot test creates a synthetic migration save from the supplied v0.15 ZIP at `/mnt/data/the-abyss-below-v0.15.0-complete.zip`. A generated fixture is retained at `tests/fixtures/v0150_campaign_slots.json`. When that archive is unavailable the test uses the retained synthetic fixture instead; no real user data is needed. The other migration suites use retained synthetic fixtures.

The Chromium harness freezes animation for deterministic simulation and uses in-memory localStorage. Production functions, native dialogs, actual HTML/CSS/JS, real AudioContext and CDP touch events are exercised. This does not prove live-origin storage quotas, hosted cache transitions, actual device performance or subjective music quality.

`python tests/v0160_previews.py` captures the real renderer using synthetic credits/gear; preview file copies go to /mnt/data. Rebuild version.json after runtime edits. Historical tests may target old layouts and are not evidence for this release.
