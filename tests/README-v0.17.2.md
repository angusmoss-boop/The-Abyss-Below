# Current verification: v0.17.2 / Delta Helm

Run `python tests/build_release.py` after any runtime change, then `python tests/run_v0172.py --jobs 3`. The runner has 25 suites. Production browser checks use Chromium with synthetic localStorage and test-only deterministic scene hooks. Version-sync and worker lifecycle suites have mocked boundaries; they are not live offline evidence.

`v0172_patch_test.py` measures actual geometry, graduated sizing, a seven-button count, accessible labels, non-intercepting decorative gaps and grey-to-purchased transitions at four sizes. It generates a campaign with the actual archived v0.17.1 runtime, compares all three slots, and checks inherited pause fade/music behaviour with native Web Audio signal probes.

`v0172_stealth_test.py` exercises actual CDP touch drags at three throttle strengths, release/coasting, passive insulation, removal of Shift slowdown, five telemetry layouts, paused-safe lamp switching and saved lamp state. It also restores a legacy active dive carrying a quiet-mode flag without losing the purchased upgrade.

The touch suite covers eleven touch sizes and five desktop sizes. Circle separation is checked by centre distance, since diagonally arranged circular buttons intentionally overlap in their rectangular bounding boxes. Hit-testing checks actual browser targets. Existing multi-finger combat, gameplay, save/slots, economy, survey, wildlife, audio, dock, generated-world, harbour and release suites remain.

The only changed legacy harbour expectation replaces the removed Shift mode with a genuinely sub-threshold approach. New screenshots are taken from the production renderer. `v0172_previews.py` stages synthetic equipment, not a user's save.

Optional real HTTP/worker integration: `python tests/v0172_live_pwa_test.py`. Its actual result is retained in `verification/v0.17.2/live-pwa.json`, never inferred from mocked tests. A physical Android device, external deployment and full campaign balance are outside this local run.

Package after a passing final run: `python tests/finalise_v0172_verification.py` then `python tests/package_v0172.py`. The update overlay is compared to the actual v0.17.1 complete archive. Python, Playwright, Chromium and Node are required. Baseline archives are expected beside the project directory, or retained synthetic fixtures are used where supported.
