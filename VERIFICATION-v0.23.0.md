# Verification: v0.23.0 / Sunken Strongholds

Build: `0.23.0-sunken-strongholds-1`  
Base: v0.22.0 / Deepwater Rescue  
Final suite completion (UTC): 2026-10-28T19:31:03.516945+00:00

## Observed result

**45 final automated suites passed**, plus a separate navigation run covering **15 generated level/seed cases**. The final runtime SHA-256 values match all nineteen entries in `version.json`. Actual production files were used throughout; synthetic storage, equipment and positions kept tests independent of the user's campaigns.

This does not establish a deployed release, a real offline install, physical-phone performance, or a full human balance playthrough. Earlier reports in this archive describe previous builds and must not be counted as current evidence.

## New wreck coverage

| Test | Executed checks |
|---|---|
| Five stronghold retrieval loops | Nine rooms, correct 3/4/5/6/8 defender rosters, tier depth restrictions and clear starting positions. Unscanned relays reject USE; real sonar arrival enables them; both are required to unlock the actual vault door. Plate pickup alerts survivors and opens the escape hatch. Each level retains permanent defender wounds/kills through defeat, recovery and docking. Plate-only deaths retain unique ownership; recovery and banking award the existing finish. Original fixed loot is unchanged, and exports round-trip. |
| Hazard lifecycle | Safe amber warning, actual active-stage hull damage and red feedback, pressure-jet force, pause freeze, exact saved phase and hit cooldown, permanent relay shutdown, invalid relay/guard/hazard state rejection. Deep-water pixel checks show zero trap scenery in blackout and a visible echo only after a sonar wave reaches it. |
| Actual v0.22 migration | Boots archived production v0.22, creates an old safe position that intersects a new wall, and migrates its active submarine plus cargo recovery pod. Confirms nearby safe relocation with health, oxygen, power, cargo, ammunition, resources, ordinary enemies, currencies, equipment and opened shortcuts preserved. Canonical recovery data and rendered item position agree. Inactive slots remain untouched. Banked plates keep their finish and are not duplicated or relocked. |
| Separate navigation run | Five levels at seeds 17, 9911 and 1234567. Uses the real collision surface, radius 28, grid spacing 20 and swept edge midpoint checks. Both relays and service control are reachable with the vault sealed; the vault plate becomes reachable only after unlocking. Service-panel release opens a reachable exit. Actual boosted movement cannot penetrate the sealed gate. Guards are clear of solid terrain and original rocks/resources remain unchanged. |

Navigation is a conservative collider-based connectivity check, not a claim of fifteen complete human combat playthroughs. Shared layout topology is intentional; level sizes, themes, defender rosters and trap placement vary.

## Regression coverage

The other final suites exercise existing rescue drones, oxygen stations, currents/encounters, oxygen and reserve drive, battery cells, unchanged Mk I beam pixels, all predator tiers around solid rocks, fish schooling, pickup notices, thirty achievements, lost cargo and exact rescue ammunition, guided ordnance, seeking mines, paid weapon economy, world placement, contracts, Warden, journals, portable backups, three slots, save/resume, simultaneous touch controls, speed-based noise, audio transitions, music, branding and startup.

The command-interface suite checks **13 viewport sizes**, from 320x568 through 1920x1080, including landscape, all three command surfaces, readable telemetry, reachable controls, the three-column upgrade grid and modal focus behaviour. New previews were captured at 390x844 and 1600x1080 without page JavaScript errors. The full-hull image uses a test-only overview camera; production camera zoom was not changed.

Node sync/worker tests check checksums, incomplete releases, offline status, worker/cache consistency and update protection through mocked boundaries. They are not substitutes for a real PWA installation.

## Live probe and untested areas

A real local HTTP navigation was attempted with Chromium. The browser returned **`net::ERR_BLOCKED_BY_ADMINISTRATOR`**. Consequently real worker installation, hosted updates, offline relaunch and migration of an installed app remain unverified in this environment.

Physical Android/iOS hardware, mobile frame rate/temperature/battery impact, other browser engines, human listening for new sound cues, complete-game economy and full human combat difficulty remain untested. No user's actual saved campaign was accessed. Tests support the implemented rules, not a guarantee that every player's preferred difficulty is met.

## Package checks

`tests/package_v0230.py` verifies the complete ZIP and reconstructs the update over the actual v0.22.0 complete archive. It checks ZIP CRCs, release/build markers and every runtime manifest hash, then compares all non-screenshot source bytes in the reconstructed overlay. Results are recorded in `verification/v0.23.0/package-integrity.json` and `RELEASE-v0.23.0.json`. Downloads are only retained after these checks pass.

## Reproduction

See `tests/README-v0.23.0.md`. Main runner: `python tests/run_v0230.py`. Navigation: `python tests/v0230_stronghold_routes_test.py`. Rebuild checksums with `python tests/build_release.py` after every runtime edit. Current evidence is under `verification/v0.23.0/`; `results-latest.json` includes final runtime hashes.
