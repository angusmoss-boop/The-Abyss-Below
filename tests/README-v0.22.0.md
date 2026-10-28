# Deepwater Rescue verification

Use Python 3, Playwright Python, a Chromium binary, and Node.js. The production-file harness reads all entry points directly from `index.html`, injects the actual source into Chromium, and uses synthetic in-memory localStorage. It is not a live network, real service-worker, physical-device, or human balance test.

```
python tests/build_release.py
python tests/run_v0220.py
python tests/v0220_live_pwa_probe.py
python tests/capture_v0220.py
```

The current runner has 51 suites: eight new Deepwater Rescue suites and 43 existing gameplay/interface/audio/update regressions, updated to load the current entry points. Outputs are written to `verification/v0.22.0/`. Historical tests/reports elsewhere in this archive are retained for development history, not evidence for the current release.

The new suites cover real USE interactions, held restart and follow/wait, obstacle routing, harbour rewards, failure recovery, reserve transfers, active-only clocks, sonar arrival, live deep darkness, exact reload state, actual v0.21 source migration, three slots, thirteen screen sizes and seven newly rendered Web Audio cues.

Migration suites require their named older complete ZIPs beside the extracted working directory. The v0.22 migration test specifically boots the actual v0.21 code, produces synthetic old progress, and loads it through the new production entry points. Current-feature tests do not require historical archives. No real user's campaign data is included.

`build_release.py` generates checksums for all nineteen runtime assets. After changing any runtime file, regenerate checksums and rerun tests before packaging. The version/worker suites model lifecycle/network boundaries; a pass does not establish real offline installation.

Current preview generation stages positions, equipment and progress, then captures the unmodified game renderer and interfaces. It does not fabricate artwork or guarantee that the shown encounter will occur at the same place in every seed.
