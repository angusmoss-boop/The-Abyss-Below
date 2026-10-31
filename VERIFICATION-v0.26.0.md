# Verification: v0.26.0 / Tactical Depths

Build: `0.26.0-tactical-depths-1`  
Base: v0.25.0 / The Living Abyss  
Final suite run completed UTC: 2026-10-29T00:06:11.125177+00:00

## Result

**All 62 suites in the final run passed.** Six new feature suites and 56 retained regression suites executed against the same final runtime manifest. Each suite records matching manifest digests before and after execution. All 22 runtime asset hashes match the package inputs.

These are automated Chromium and Node checks, not physical-device testing, a hosted release, a human difficulty review or an Android bundle certification.

## Feature verification

| Area | Evidence |
|---|---|
| Tuning | Actual dock purchases unlock all five modifications. Two distinct slots; locked/unknown/duplicate selections rejected. Exact HP, boost, range and power modifiers; effective sonar coverage cooldown; quiet cruising movement/noise. Dock-only fitting, health fraction preserved, no currency/ammo/repair refill. |
| Presets | Three escaped named configurations. Saving stores the fitted configuration. Loading restores tuning/finish/accent without inventories or new campaign slots. Current values survive actual save/reload. |
| Trial isolation | All four modes exercise firing, boost, repair, damage, defeat and return. Profile, field, world arrays and original player restored. During a trial the campaign checkpoint remains byte-identical to the entry snapshot. Save metadata timestamps can change after a normal real save. Reload restores the real dock checkpoint, never loaned magazines. |
| Actual course completion | Scripted keyboard pilots complete all eight gates through shared collisions and boost; production projectiles destroy nine moving rigs; survival simulation runs all 90 seconds with three waves. No fabricated hits, additional rounds or completion hooks in this suite. Weapons aiming uses the test-mode facing helper; this is not evidence of human aiming ease. |
| Record transactions | Explicit synthetic completion fixtures separately exercise bronze/silver/gold logic, best-score preservation, completed-run counts, and earned-accent gates. Unfinished/defeated drills grant no campaign rewards. Successful results are saved on returning to dock. |
| Migration | Actual archived v0.25 production source creates synthetic states for three slots. The current build retains resources, geometry, damage, cargo, ammo, spent repair, prices and inactive slots. Existing field defaults normalise absent legacy flags/recorder-depth override to false/false/null; no deposits are regenerated. New tuning state exports/imports, while malformed tuning, records and preset shapes are rejected. |
| Interface | Tuning, presets, trials, paused-exercise controls and seven-button bounds checked at 13 viewport sizes. Campaign-only menu options hidden in trials. Dock panel scroll and displayed tuned hull capacity corrected during development. |
| Feedback | Pixel comparisons of the actual shared vessel show weapon recoil/launch hatches, accents and tuning hardware. Real rail damage and stun state unchanged. Optional numbers respect visibility, zero shake removes impulse, reduced density decreases cosmetic particles, empty fire consumes nothing, preferences persist. |
| Audio | Four new cues render finite nonzero audio through Chromium OfflineAudioContext; peaks remain below clipping and tails return to silence. Existing real-time fade, worker/fallback music preparation and interface transitions pass retained suites. No human listening conclusion. |

UI viewports: 320x568, 360x780, 390x844, 430x932, 568x320, 640x360, 844x390, 915x412, 768x1024, 1024x768, 1280x720, 1440x900 and 1920x1080. Retained touch-input suites exercise real browser multi-finger control events. Phone ergonomics are still untested.

## Retained regression coverage

Wildlife routines/giants, day/weather cycle, field guide, photo export and crop gestures, ship models/Shipyard, direct-contact crystals/repair packs, emergency repair, gameplay zoom, stronghold navigation/relays/traps/guards, drones and oxygen stations, battery cells, HUD/menu layout, depth darkness and flashlight cones, fish schooling, all achievements, predator navigation/behaviours, guided weapons and seeking mines, death/recovery, exact rescue ammunition, paid ammo, fixed crystal economy, contracts, Warden, journals, save/resume, three-slot isolation, backups, simultaneous mobile controls, stealth, music/audio transitions, startup art and mocked version/cache lifecycle.

## Preview and presentation scope

Fifteen screenshots were captured from production interfaces/rendering in portrait 390x844, landscape 844x390 and desktop 1440x1000. They show tuning, the proving ground, precision gates, weapons targets and telemetry settings. Equipment and positions are staged synthetic fixtures. The mobile tuning screen, desktop trial board and weapons-trial view were visually inspected; previews are not generated concept art or real user campaign data.

The proving ground deliberately uses an abstract grid pool with mechanical targets. Trials do not save mid-run, and paused exercises cannot access the campaign map, journal, save-slot manager or photo mode. Normal campaign play remains untimed. No new story or gameplay economy was added.

## Blocked / untested

A separate real localhost HTTP navigation attempt returned **net::ERR_BLOCKED_BY_ADMINISTRATOR**. See `live-pwa-probe.json`. Real service-worker install, offline launch, hosted deployment, installed-app upgrade and launcher behaviour remain unverified. Mocked sync/worker passes do not replace those checks.

Physical Android/iOS touch comfort, frame rate, heat/battery use, human music/effects listening, Safari/WebKit/Firefox, and a complete human campaign or medal-difficulty playthrough remain untested. Decoration density is a user option, not a measured guarantee of frame-rate improvement on a particular device. Existing data was tested using synthetic saves, not the user's files.

## Final results

| Suite | Result | Seconds |
|---|---|---:|
| tuning | PASS | 25.38 |
| trials | PASS | 15.33 |
| course_play | PASS | 18.28 |
| tactical_migration | PASS | 22.24 |
| tactical_ui | PASS | 23.35 |
| feedback | PASS | 10.41 |
| ecology | PASS | 13.8 |
| ecology_routines | PASS | 7.72 |
| photo | PASS | 24.43 |
| living_migration | PASS | 24.85 |
| living_ui | PASS | 41.64 |
| reforged_pickups | PASS | 18.25 |
| reforged_repair | PASS | 11.35 |
| reforged_zoom | PASS | 21.46 |
| reforged_migration | PASS | 21.2 |
| reforged_world | PASS | 7.0 |
| shipyard | PASS | 27.29 |
| strongholds | PASS | 45.39 |
| stronghold_hazards | PASS | 13.22 |
| stronghold_migration | PASS | 12.6 |
| rescue_mechanics | PASS | 7.58 |
| air_stations | PASS | 8.18 |
| rescue_navigation | PASS | 43.1 |
| encounters | PASS | 12.63 |
| rescue_ui | PASS | 49.02 |
| rescue_audio | PASS | 5.86 |
| rescue_visibility | PASS | 8.51 |
| lifeline | PASS | 9.39 |
| cells | PASS | 38.65 |
| command_ui | PASS | 84.0 |
| baseline_beam | PASS | 6.52 |
| frontiers | PASS | 28.64 |
| shoals | PASS | 8.19 |
| achievements_extra | PASS | 58.3 |
| regression | PASS | 25.46 |
| world_achievements | PASS | 37.42 |
| behaviours | PASS | 6.09 |
| targeting | PASS | 5.24 |
| recovery | PASS | 39.24 |
| rescue_ammo | PASS | 29.49 |
| recovery_levels | PASS | 54.47 |
| guidance | PASS | 26.47 |
| seeking_mines | PASS | 7.62 |
| guidance_save | PASS | 9.59 |
| weapons | PASS | 22.43 |
| economy | PASS | 25.49 |
| placement | PASS | 61.09 |
| contracts | PASS | 17.16 |
| backups | PASS | 9.07 |
| warden | PASS | 36.48 |
| journal | PASS | 11.35 |
| signals_layout | PASS | 55.11 |
| resume | PASS | 27.55 |
| slots | PASS | 21.4 |
| combat_touch | PASS | 11.27 |
| stealth | PASS | 28.65 |
| audio_transitions | PASS | 17.18 |
| music | PASS | 10.45 |
| branding_ui | PASS | 22.95 |
| launch | PASS | 17.31 |
| sync | PASS | 0.5 |
| worker | PASS | 0.16 |

## Reproduction

See `tests/README-v0.26.0.md`. Current runner: `python tests/run_v0260.py`. Keep the preceding complete ZIP alongside the project for actual old-source migration. Retained historical suites also require their archived sources or synthetic fixtures. Missing prerequisites are not passing evidence. Earlier reports in this archive are historical, not substitutes for the current logs.

After runtime changes run `python tests/build_release.py`, rerun verification and package the changed files together. Deploying only game.js or only the new module creates an inconsistent checked release.

## Packaging checks

The packaging script verifies CRC integrity, SHA-256 for every runtime asset in the complete archive, and byte-for-byte reconstruction by overlaying the update onto the actual v0.25 complete archive. `PACKAGE-CHECK-v0.26.0.json` is generated after both archives and records their hashes, sizes and changed-file list. It is separate rather than self-embedded. Packaging is not a hosted deployment.
