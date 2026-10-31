# Verification: v0.25.0 / The Living Abyss

Build: `0.25.0-the-living-abyss-1`  
Base: v0.24.0 / NEREID Reforged  
Final main run completed UTC: 2026-10-28T23:04:53.876822+00:00

## Result

**All 56 suites in the final main run passed.** A separate final OfflineAudioContext audit also passed for all 13 rescue/ecology cues, including the six new ambient/observation effects. The runtime hashes in `verification/v0.25.0/results-latest.json` match the packaged runtime.

The main run contains five new feature suites and 51 retained gameplay, interface, audio, storage and mocked deployment checks. A suite is not a physical-device test. This is not evidence of a hosted deployment, successful real offline install, hardware listening review or full campaign balance playthrough.

## New coverage

| Area | Verified |
|---|---|
| Peaceful animals | 20 generated maps across all five levels; 32 total resident animals placed and simulated in clear water. Swept body, fin/tail and turning checks. Separate from enemy targeting and economy. Actual wave-arrival sonar echoes, no sighting credit from sonar alone, solid occlusion, observation and animal state across save/load. |
| Routines and surface | Quiet-player curiosity, multiple feeding/travelling/sheltering phases, boost startle, continuous palette/weather sampling through the 1,200-second cycle, no new deep ambient light. |
| Photo mode | Seven viewport sizes; actual Chromium touch pinch and mouse crop, PNG download, resource/clock/survey invariance, blocked gameplay firing while modal, close returns paused and Resume is explicit. |
| Three-slot migration | Actual archived v0.24 production code generates synthetic saved campaigns. The new build preserves credits, crystals, fitted systems, ammunition, resource geometry/depletion, active cargo, spent repair charge and inactive slots. New state is included in validated backup round-trips. |
| Field guide | Ten entries, native-dialog boundaries and tab selection at 13 viewport sizes, original journal tab compatibility, dock Archive entry, no viewport overflow. |
| New audio | Six new cues plus seven retained rescue cues rendered through real Chromium OfflineAudioContext. Nonzero finite output, no full-scale clipping, decaying tails return to silence. No human or phone-speaker listening verdict. |

Ecology map seeds: 117, 991, 64329 and 818231 at each level. The generated-map test is bounded sampling, not a mathematical guarantee for every possible seed. Distant animals are intentionally parked instead of running full-world pathfinding.

Journal sizes: 320x568, 320x740, 360x780, 390x844, 430x932, 568x320, 640x360, 844x390, 915x412, 768x1024, 1024x768, 1440x900 and 1920x1080. Photo sizes: 320x568, 390x844, 430x932, 568x320, 844x390, 1024x768 and 1440x900.

## Regressions retained

The current run covers modular ship/Shipyard, contact crystals and hull packs, one-shot emergency repair, gameplay pinch/wheel zoom, stronghold navigation/traps/defenders, rescue drones and oxygen stations, resource regeneration, continuous darkness/flashlights, schools, achievements, obstacle navigation, homing guns/mines, loss/recovery, fixed respawn ammunition, paid ammo/economy, contracts, backup import/export, Warden behaviour, journal layouts, save/resume, three-slot isolation, simultaneous touch controls, speed-based noise, music and audio fades, startup artwork, and mocked release/cache verification.

## Visual inspection and scope

Actual production-renderer captures show Glider and Driftback encounters, the harbour by day/sunset/rain, the Wildlife journal and photo mode on desktop and mobile. Positions, fitted equipment, rescued fleet, clock and journal completion were staged for clear previews; they are not a real user's save. Screenshots and exported PNGs were visually inspected. Photo mode crops the frozen visible frame, rather than moving a free camera through unexplored water. Enemy health labels, pointer overlays and depth-reference text are omitted from its capture.

Existing world placements, upgrade prices, crystal budgets, ammunition rules, ship collision size and combat stats are unchanged. Synthetic migrations compare source data; no real user data was accessed.

## Development findings resolved

The initial giant-turn implementation could turn its collision body into nearby terrain; the final version checks the new orientation before applying it and protects the animated wings and trailing tail as well as the central body. An archived ordnance migration test sometimes failed to find a staging point on a random old map. Its fixture now uses a fixed generated seed and searches real clear water more broadly, without removing terrain or weakening the save/migration assertions. These were corrected before the final successful run.

## Blocked and untested

The separate real-HTTP/PWA probe attempted an actual local navigation and returned **`net::ERR_BLOCKED_BY_ADMINISTRATOR`**. See `verification/v0.25.0/live-pwa-probe.json`. Actual worker installation, hosted update delivery, offline relaunch and installed-app upgrade remain **unverified**. Mocked cache and sync passes are not substitutes for that integration test.

Physical Android/iOS touch comfort, launcher behaviour, frame rate, heat/battery profiling, human audio listening, Safari/WebKit/Firefox, production hosting and a complete human campaign playthrough remain untested. PNG export is exercised in Chromium; the save/download user experience on an installed phone app is not verified. This archive remains web/PWA source, not a signed Android bundle.

## Main run results

| Suite | Result | Seconds |
|---|---|---:|
| ecology | PASS | 16.37 |
| ecology_routines | PASS | 9.73 |
| photo | PASS | 28.19 |
| living_migration | PASS | 27.31 |
| living_ui | PASS | 47.79 |
| reforged_pickups | PASS | 20.41 |
| reforged_repair | PASS | 12.57 |
| reforged_zoom | PASS | 24.51 |
| reforged_migration | PASS | 25.98 |
| reforged_world | PASS | 8.44 |
| shipyard | PASS | 34.68 |
| strongholds | PASS | 60.21 |
| stronghold_hazards | PASS | 16.58 |
| stronghold_migration | PASS | 15.97 |
| rescue_mechanics | PASS | 9.14 |
| air_stations | PASS | 10.16 |
| rescue_navigation | PASS | 53.95 |
| encounters | PASS | 14.48 |
| rescue_ui | PASS | 64.38 |
| rescue_audio | PASS | 5.41 |
| rescue_visibility | PASS | 10.55 |
| lifeline | PASS | 12.72 |
| cells | PASS | 51.66 |
| command_ui | PASS | 107.01 |
| baseline_beam | PASS | 8.7 |
| frontiers | PASS | 40.08 |
| shoals | PASS | 10.9 |
| achievements_extra | PASS | 81.63 |
| regression | PASS | 31.53 |
| world_achievements | PASS | 44.87 |
| behaviours | PASS | 7.1 |
| targeting | PASS | 6.8 |
| recovery | PASS | 48.7 |
| rescue_ammo | PASS | 36.4 |
| recovery_levels | PASS | 67.57 |
| guidance | PASS | 31.49 |
| seeking_mines | PASS | 10.54 |
| guidance_save | PASS | 11.35 |
| weapons | PASS | 25.64 |
| economy | PASS | 32.28 |
| placement | PASS | 74.75 |
| contracts | PASS | 22.43 |
| backups | PASS | 10.51 |
| warden | PASS | 43.54 |
| journal | PASS | 14.88 |
| signals_layout | PASS | 66.73 |
| resume | PASS | 31.25 |
| slots | PASS | 25.73 |
| combat_touch | PASS | 12.11 |
| stealth | PASS | 34.61 |
| audio_transitions | PASS | 20.94 |
| music | PASS | 11.9 |
| branding_ui | PASS | 25.28 |
| launch | PASS | 19.12 |
| sync | PASS | 0.69 |
| worker | PASS | 0.25 |

## Reproduce

See `tests/README-v0.25.0.md`. Run `python tests/run_v0250.py`; inspect historical archive prerequisites before running migration or pixel-comparison suites. Current per-suite logs and machine-readable results are in `verification/v0.25.0/`. Rebuild checksums with `python tests/build_release.py` after any runtime edit. The final audio audit uses `tests/v0250_rescue_audio_test.py`.

## Packaging

The release packaging step checks ZIP CRCs, all 21 asset hashes, and reconstruction of every runtime asset by applying the update to the actual v0.24 complete archive. The separate `PACKAGE-CHECK-v0.25.0.json` accompanying delivery records package sizes, SHA-256 hashes and overlay results. It is generated after archive creation rather than self-embedded.
