# v0.18.0 / Lost Signals verification

Run `python tests/build_release.py` after runtime edits, then `python tests/run_v0180.py`. Do not change source while the suites run: the release checker intentionally rejects mismatched hashes.

Seventeen current suites use production scripts in isolated Chromium documents or Node boundaries. Python Playwright, Node, Pillow and Chromium are required. `tests/v0180_harness.py` records page errors, uses the real HTML script order and synthetic localStorage. It does not simulate a real installed Android application.

New suites cover contracts, backups, Warden phases and rewards, all twenty bank-gated entries, responsive screens, forty seeded placements and migration. Migration prefers the actual archived v0.17.4 ZIP; a synthetic fixture is included as a reproducible fallback. No real user save is used.

`python tests/v0180_live_pwa_probe.py` attempts real HTTP separately. A blocked result is not PASS. `python tests/preview_v0180.py` renders the new interfaces and staged boss preview with synthetic progress; no screenshot demonstrates real campaign balance.

Current logs and runtime hashes are in `verification/v0.18.0/`. Historical reports in the full archive concern their named builds, not this one.
