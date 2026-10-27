# Current verification: v0.17.0

Run `python tests/build_release.py` after runtime edits, then `python tests/run_v0170.py --jobs 3` for 23 suites. The new economy suite checks every credit/crystal price against the actual v0.16 source, delayed/off-screen/paced regeneration, saved clocks, first-survey progression, auto/manual pickups and paid stock transactions. The economy-migration suite creates a synthetic save using the actual v0.16 archive and verifies all three slots independently. Its retained fixture is `tests/fixtures/v0160_economy.json`.

The v0.16 full ZIP is used from the parent of the project directory when available. Otherwise the baseline-price audit uses retained `tests/fixtures/v0160_economy_prices.json`, extracted from that archive. Other archived migration suites use retained synthetic fixtures or locally available prior archives. No real user save is read. The harness runs production HTML/CSS/JS in Chromium with deterministic scene/time probes and in-memory localStorage. This is not physical-device or hosted-origin evidence.

`python tests/v0170_live_pwa_test.py` separately attempts real local HTTP navigation, service-worker install and offline reload. A blocked request is not a pass. Mocked sync/worker tests are distinct.

`python tests/v0170_previews.py` captures production UI with synthetic funds and purchased equipment. Current result files: `verification/v0.17.0/`. Historical tests/reports are retained for history, not current proof.
