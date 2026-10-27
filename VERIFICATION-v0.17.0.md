# Verification: v0.17.0 / Salvage & Supply

Build: `0.17.0-salvage-supply-1`  
Base release: v0.16.0 / Arsenal & Archives  
Final verification UTC: 2026-10-27T22:04:33.464195+00:00

## Result and boundary

**23 automated suites passed against the final production runtime.** This includes the full production run and four focused reruns. The merge requires identical SHA-256 hashes for every runtime file; it cannot combine evidence from different game builds. The earlier attempt summary is retained under `verification/v0.17.0/attempts/` for traceability.

This is not evidence of a production deployment, physical-phone test, full human campaign/balance playthrough or successful real offline integration. The real local-origin browser request was attempted separately and blocked by the environment.

## Current suites

| Suite | Result | Seconds |
|---|---|---:|
| economy | PASS | 19.84 |
| economy-migration | PASS | 13.98 |
| combat-touch | PASS | 10.36 |
| campaign-slots | PASS | 21.38 |
| weapons-damage | PASS | 23.55 |
| music | PASS | 13.96 |
| wild-mechanics | PASS | 60.21 |
| wild-migration | PASS | 8.5 |
| audio-signal | PASS | 14.3 |
| regression | PASS | 30.73 |
| systems | PASS | 28.9 |
| resume | PASS | 28.57 |
| survey | PASS | 25.73 |
| harbour | PASS | 38.75 |
| geometry | PASS | 24.1 |
| achievements | PASS | 29.2 |
| migration | PASS | 9.98 |
| ui | PASS | 49.3 |
| touch | PASS | 47.82 |
| explorer-ui | PASS | 39.12 |
| release | PASS | 1.67 |
| sync | PASS | 0.23 |
| worker | PASS | 0.29 |

## New economy coverage

- Every upgrade credit price is checked against the actual archived v0.16 source (or its retained extracted fixture): exactly 1.5 times the old cost, rounded up. Every crystal price is identical. All 59 paid increments total 22,765 CR and 464 crystals; standard zero-cost fitted entries remain zero.
- Production simulation frames collect scrap automatically without USE. Tested base reach and all four magnet marks, just-inside/just-outside distance, free close collection at zero battery, insufficient power at extended range, actual rock obstruction, deep darkness and sonar arrival. Nearby crystals, recorders and caches stay manual; manual selection is not diverted by ordinary scrap.
- Actual generated deposits are collected, matured, regenerated and recollected without changing IDs, coordinates, quantities or crystals. Tested five-minute delay, 45-second spacing, visible-site deferral, no backlog burst, pause/harbour/offline-clock guards, saved timers through reload, and original-site survey progress not decreasing after recovery.
- Timers advance together for visited levels within the active campaign. Predator drops collect once and cannot become regeneration sites.
- Rail, torpedo and mine stock purchases exercise real UI buttons. Verified individual, full and affordable-partial buys, exact credits, unchanged crystals, empty/full/unfitted/funds guards, outside-dock rejection and preserved stock after reload. New weapon installations and capacity upgrades grant no free rounds; unrelated upgrades, docking and relaunch also do not refill magazines.

## Migration and save coverage

A synthetic campaign is created by the actual v0.16 game code. It buys upgrades, collects scrap/crystals and fires both weapons before saving an active expedition. The updated game preserves balances, fitted upgrades, finite layout/depletion, seed/cycle, recorder state, health, wildlife, survey data, cargo, ammunition and in-flight projectiles. Restored play begins paused.

Three distinct synthetic campaign fixtures verify that recovery queues are independent, start with bounded recovery delays, survive another load and do not rewrite inactive slot files. Existing owned rounds are not removed or retrospectively charged. No real user save is accessed. Separate retained suites cover older migration sources, campaign creation/deletion, stale-window/storage guards and active-dive restoration.

## Regression and interface coverage

The retained production-code suites cover weapon marks and swept collisions, mine impacts, damage flashes in darkness, shields/disruption, lighting/sonar, seabeds, 40 generated-map geometry samples, harbour safety, breaches, seeded wildlife, map memory/gestures, audio signal and music, achievements, dual-currency reserve guards, simultaneous touch input, pause and saves.

The dock interface suite checks **13 screen sizes**, including 320x568 portrait, 568x320 landscape and desktop up to 1920x1080. The new ammunition tab is checked for all three cards, no horizontal overflow, scroll-to-reach purchase buttons and at least 44 CSS-pixel button height. Existing three-column upgrade tiers, modal focus, pinned departure controls and tablist keyboard behaviour remain covered. Other retained suites cover floating touch steering and desktop controls.

Portrait, landscape and desktop previews were captured from production HTML/CSS/JS with synthetic funds and purchased gear, not a user's save. The mobile and desktop ammunition screenshots were visually inspected. Portrait intentionally scrolls its card list while retaining the departure footer; desktop presents three ammunition cards alongside one another.

## Release checks

The static release suite checks version/name/build markers, local script URLs and defer order, unique static IDs, all 11 manifest SHA-256 assets and JavaScript syntax. Mocked version-checker and service-worker suites test matched/partial/stale releases, offline status, update-versus-mismatch ordering, active-dive reload protection and cache lifecycle. The future-version test uses 0.18.0 so it cannot accidentally compare the running 0.17 release with itself.

Package checks are written to `verification/v0.17.0/package-integrity.json`. They validate archive integrity, complete runtime hashes and the result of overlaying the update ZIP onto the actual v0.16 complete ZIP. The current report does not make a hosted deployment claim.

## Blocked and untested

`tests/v0170_live_pwa_test.py` attempted real HTTP navigation to its local server, without mocked networking. Chromium returned **net::ERR_BLOCKED_BY_ADMINISTRATOR**. Live worker installation, actual offline relaunch, real cache transition and hosted updating therefore remain unverified. Mocked worker/checksum checks do not replace that integration test.

Physical Android/iOS hardware, device-frame-rate/heat/battery profiling, subjective audio behaviour during repeated automatic pickups, Safari/WebKit/Firefox, and a full human campaign balance playthrough remain untested. The currency budget and kill-cost examples are arithmetic checks, not proof that every play style or map seed has ideal pacing.

## Reproduction

Run `python tests/build_release.py` following any runtime edit, then `python tests/run_v0170.py --jobs 3`. Current logs and runtime hashes are under `verification/v0.17.0/`. The exact prior-price fixture and a synthetic v0.16 save are retained for reproduction without the old archive. See `tests/README-v0.17.0.md` for the separate live-PWA test and preview command.
