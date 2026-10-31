# Tactical Depths verification

Current build: `0.26.0-tactical-depths-1`. The runtime is plain HTML/CSS/JavaScript. No npm compilation is needed.

```sh
python tests/build_release.py
python tests/run_v0260.py
python tests/v0260_live_pwa_probe.py
python tests/v0260_tactical_previews.py
```

Requirements: Python 3, Playwright Python with Chromium, Node.js, Pillow for some retained preview utilities. Tests invoke `/usr/bin/chromium` when found by `shutil.which`.

The runner contains 62 suites: six new feature suites (tuning, trial isolation, actual simulated course completion, v0.25 migration, 13-size tuning/trial layouts and combat feedback/audio), plus 56 retained gameplay/UI/save/audio/cache suites. Each result captures the version-manifest digest before and after its execution. The final machine-readable aggregate contains exact runtime SHA-256 hashes.

`course_play` uses scripted steering through shared physics and firing through the production weapon path. Its weapons controller also uses the test-mode heading fixture to aim. It does not fabricate hits, provide additional rounds or set the final score. These runs establish mechanically completable objectives, not human control comfort or difficulty balance. The separate isolation suite uses explicitly labelled synthetic completion fixtures to exercise medals, best-score replacement and cosmetic ownership.

`trials` checks exact world/profile restoration for all four modes after firing, boost, repair and defeat. Local checkpoint `updatedAt` metadata changes on a normal real save; it is excluded from exit timestamp equivalence, not from resource or world comparisons. During a simulation the saved campaign payload stays byte-identical to the pre-launch checkpoint.

The actual v0.25 source ZIP must be adjacent to the extracted project to reproduce the preceding-build migration suite. Historical retained migration and pixel-comparison suites use earlier complete ZIPs or their archived synthetic fixtures. Inspect their prerequisites. Missing historical input is not a passing test. All test saves are synthetic; no user campaign was accessed.

The HTTP/PWA probe is separate from the 62 suites. A browser navigation block is recorded as BLOCKED, never PASS. Browser/network mocks used by sync and worker tests do not establish real offline operation or a hosted update.

Current logs: `verification/v0.26.0/`. Previous-version results are historical evidence only. After changing runtime files, rebuild version.json and rerun tests before packaging.

Not established: physical Android/iOS performance, touch comfort, heat/battery consumption, human audio listening, Safari/Firefox/WebKit, real hosting or installed PWA updates, full human campaign balance. This is still web/PWA source, not a signed Android App Bundle.
