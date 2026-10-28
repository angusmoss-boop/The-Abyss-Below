# v0.18.1 / Guided Ordnance verification

Run `python tests/build_release.py` after runtime edits, then `python tests/run_v0181.py`. Do not edit runtime files during testing. Current suites run production scripts in Chromium with synthetic storage and isolated encounters, or use Node with mocked worker/network boundaries. Required: Python, Playwright, Chromium, Node and Pillow (preview capture).

New suites: `guidance`, `seeking_mines`, `guidance_save`. Regressions include weapon purchases/impacts, the economy, contracts, backup validation, Warden, journal, level placement, save/resume, slots, touch controls, movement noise, audio envelopes/music, branding, launch, version checks and cache lifecycle. Guidance tests include actual moving AI, independent crossing targets, forward cones, stable locks, terrain blocking and bounded turn/speed/range. Mine tests cover partial-frame arming and moving relative collision, not just visual motion.

The v0.18.0 migration suite uses the actual previous complete ZIP when present; its synthetic fixture is retained under `tests/fixtures/v0180_guidance_migration.json` for standalone reproduction. No personal save was used.

`python tests/preview_v0181.py` captures the off-axis torpedo animation using test fixtures and the production renderer. `python tests/v0181_live_pwa_probe.py` attempts actual local HTTP independently; a blocked attempt is not a pass. Physical-phone listening, performance, launcher updates and full campaign balance are not proven by browser harness tests.

Final logs and runtime hashes: `verification/v0.18.1/`. Historical tests/reports in the archive belong to their named releases.
