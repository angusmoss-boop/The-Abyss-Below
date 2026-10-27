# Current release tests

The current suite is `v0100_*`. Historical scripts are retained as previous-release evidence, not as compatible assertions for the new finite-loot and paid-ammo rules.

Requirements: Python 3 with Playwright, a Chromium executable on PATH, and Node.js with WebCrypto support. The game itself has no runtime library dependency.

From the game root:

```sh
python tests/build_release.py
python tests/run_v0100.py
python tests/v0100_previews.py
```

The runner emits logs and `verification/v0.10.0/results.json`, preserving actual exit codes. It also runs static package checks so a missing HTML script entry or stale asset query is not hidden by direct script injection.

The three browser suites run the actual game files in Chromium through `page.set_content`, with a localStorage fixture and gated diagnostics enabled. HTML script URLs determine which files load and in what order. They use real DOM/CSS/canvas, purchase buttons, keyboard/mouse input and CDP multi-touch. This is not navigation to a hosted website. The storage fixture verifies serialization and reload reconstruction, not OS/browser storage eviction or privacy behaviour.

The migration test can additionally execute the original v0.9 game from `/mnt/data/the-abyss-below-v0.9.0-complete.zip` if present, comparing exact generated node IDs/coordinates against this build. When that historical ZIP is absent, that bytecode comparison is explicitly skipped; the remaining migration checks still run.

The two Node suites evaluate the production version-checker and service-worker source in VM contexts with mocked DOM/network/cache/worker boundaries and real SHA-256 hashing. They verify state logic, manifest integrity, install rejection, offline fallback and active-dive reload guards, but do not prove browser service-worker registration, HTTPS/CORS, live CDN behaviour, installation, offline launch or multi-tab update delivery.

Screenshots are rendered by production code using deterministic gameplay fixtures. Their local-preview status intentionally says NOT VERIFIED. No screenshot presents a fabricated live synced badge.

Live HTTP navigation in the authoring browser was blocked (`net::ERR_BLOCKED_BY_ADMINISTRATOR`). Test the hosted deployment separately on your real device: reopen online, check the release badge, install/update, then close and reopen offline after a successful verified install. Do not clear site data. Bank cargo and quit the dive before loading a release.
