# Verification: v0.15.0 / Wild Waters

Build: `0.15.0-wild-waters-1`  
Base: v0.14.0 / Living Depths  
Suite completion (UTC): 2026-10-27T20:21:22.526339+00:00

## Result

**All 17 current automated suites passed against the packaged runtime.** Browser mechanics, real audio, migration and static checks are detailed below; version sync and worker lifecycle use mocked external boundaries. The suite runner records exact runtime SHA-256 values and per-suite completion times in `verification/v0.15.0/results-all.json`.

This is not a claim of a hosted release, native Android package, physical-device test, successful live offline integration, perceptual audio review or complete campaign playthrough.

## New feature coverage

| Suite | Verified |
|---|---|
| Wild mechanics | 25 generated maps across five levels and five seeds. Mine/vent/school counts, clear harbour/objective/resource approaches, clear full sway paths, independent generation with unchanged rocks/finite loot/upgrades. |
| Contact mines | High-speed swept collision, single detonation, nonlethal isolated first-level mine, shield absorption/overflow, separate impact after recent damage, paid ammo unchanged. Predator trigger/drop once and permanent clearing through real storage reload, dock refresh and relaunch. |
| Remote accidents | Distant environmental kills preserve salvage but do not award harbour-camping kills or raise the ship's noise. |
| Visibility | Full-black canvas at 1,000+ m with lights off. Sonar arrival reveals new mine/tether/vent contacts and fish silhouettes; echoes expire back to darkness. Sonar does not detonate mines; fish do not spam chart contacts. |
| Vents and wildlife | Quiet/warning/active/settling phases, no force during warning, upward force on player and predator, harmless first-level seep, rate-limited thermal damage. Four distinct designs, 6–14 fish, formation movement, rock avoidance, sonar/boost/predator reactions, nearby-school cap and retracting seabed organisms. |
| Wild migration | Synthetic campaign produced by the actual archived v0.14 code: old ship/cargo/owned ammo/upgrades/currency/predators/finite stock/depletion preserved. Unsafe newly added encounters retired near the saved submarine. Current wildlife, benthos, clock, hazards and paused state restore exactly. |
| Audio signal | Actual Chromium AudioContext/analyser output for twelve new/revised cues, each against a quiet baseline. Persisted independent settings, mute, pause suspension, repeated-event throttling and voice cap. This checks electrical/audio-buffer output, not whether the mix sounds good to a listener. |

## Retained coverage

The remaining suites exercise gameplay regression, all ship systems, full-dive resume, exploration maps/currents, harbour and breach physics, generated geometry, achievements, prior-save migration, dock/menu layouts, simultaneous touch controls, explorer/telemetry/audio interfaces, release wiring, version checking and worker lifecycle.

Dock/interface checks include 13 touch/desktop sizes. Other touch and desktop checks retain their own viewport matrices. Normal controls, mobile zoom, dual-currency purchase rules, finite-resource states and ammunition purchasing remain covered. See individual logs for the exact assertions rather than treating the suite count as a claim of exhaustive testing.

## Visual inspection and previews

Portrait mine, four-species and active-vent previews were inspected from the actual game renderer. Portrait/landscape/desktop and survey-chart screenshots were generated without JavaScript page errors. The 42-frame wildlife GIF advances the actual schooling simulation.

Equipment and preview positions are synthetic. The four-species composition intentionally stages all four designs together for comparison; it is not a claim that every natural habitat contains all species. No user save was accessed or modified.

## Release integrity

The runtime manifest includes ten SHA-256 asset entries. HTML, CSS, game, audio, version checker and worker markers agree on the current build. The update ZIP is checked by overlaying it on the actual v0.14 complete archive and comparing every published runtime hash. The complete ZIP is checked independently. Packaging results are recorded in `verification/v0.15.0/package-integrity.json` and the release manifest.

Historical guides, tests and reports retained in the full source are development history, not evidence for this build. The supported runner is `python tests/run_v0150.py --group all --jobs 2`.

## Blocked or not tested

The optional real HTTP/worker test attempted localhost navigation and was blocked with **net::ERR_BLOCKED_BY_ADMINISTRATOR**. Real service-worker installation, cache refresh, offline relaunch and updating an already-installed hosted game were not verified. Mocked lifecycle tests do not replace those checks.

Physical Android/iOS devices, battery/heat/frame-rate profiling, Safari/WebKit/Firefox, real headphone/phone-speaker listening, a full campaign balance playthrough and production GitHub Pages deployment remain untested. This release is a browser/PWA source package, not an APK/AAB.

Active-dive writes still depend on browser storage. Power loss may roll back to the most recent successful checkpoint, and clearing browser data can erase local progress. No new cloud/native save guarantees are made.

## Reproduction

See `tests/README-v0.15.0.md`. The prior snapshot is reproducible using `python tests/v0150_wild_migration_test.py /path/to/the-abyss-below-v0.14.0-complete.zip`. Run `python tests/build_release.py` after changing runtime code and before deployment.
