# Current verification: v0.17.1 / Quiet Command

Run `python tests/build_release.py` after runtime changes, then `python tests/run_v0171.py --jobs 3`. The current runner executes 24 suites against the production HTML/CSS/JavaScript. Evidence belongs in `verification/v0.17.1/`; earlier reports are historical.

The added `v0171_patch_test.py` checks the actual old and new control footprints at four sizes; icon sizes and absence of visible text; vertical weapons; grey locked states and actual purchased unlocks. It generates a synthetic save using the v0.17.0 ZIP, then compares all three slots, including per-level resources and prices, against the same save normalised by the actual old runtime. No real player data is used. That comparison intentionally accounts for default fields materialised during load rather than mislabelling them as a save migration.

Native Chromium Web Audio instrumentation checks scheduled pause releases, zero output before context suspension, a 40-second pause buffer and its seam, audible analyser signal, independent paused sonar preview, mute, idempotent scene routing and cancellation of a pending suspension after rapid input. These are signal and scheduling checks, not human listening or phone-speaker certification.

Existing gameplay, economy, save/resume, slots, combat-touch, layouts, world, weapons, harbour, shader, map and mocked release/update tests are retained. Tests that previously expected immediate context suspension on pause now expect pause music and delayed background suspension. The sound-isolation fixture explicitly enters gameplay with music off rather than using a paused renderer fixture.

Use `python tests/v0171_live_pwa_test.py` separately for actual local HTTP/worker/offline testing. Network mocks are not a live offline pass. Previews: `python tests/v0171_previews.py`. Packaging: `python tests/package_v0171.py`, after a passing final run and report generation.

Python, Playwright, Chromium and Node are required. The baseline `the-abyss-below-v0.17.0-complete.zip` should sit next to the project directory for the patch comparison. Older migration tests use previous local archives or retained synthetic fixtures where supported. This source package is still web/PWA code, not an Android AAB.
