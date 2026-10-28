# Verification: v0.21.0 / Lifeline

Build: `0.21.0-lifeline-1`  
Base: v0.20.0 / Fluid Frontiers  
Final suite completion (UTC): 2026-10-28T16:35:01.501658+00:00

## Result

**All 43 current automated suites passed** on the final production runtime. The manifest's 18 SHA-256 entries match the tested files. The browser suites use actual production HTML, CSS and script entry points inside isolated Chromium with synthetic local storage; the version-checker and worker suites use explicit mocked boundaries in Node.

This is not a claim of a deployed release, a physical-phone test, a human music-listening test or a completed human campaign playthrough. A separate real HTTP probe was attempted and blocked by the environment.

## Added Lifeline coverage

| Suite | Verified |
|---|---|
| Life support / power | Actual consumption at all six recycler settings; capacity/endurance display; reduced idle draw; full-thrust and boosted drain; standard sonar cost; zero-power transition and nonnegative energy; all five thruster settings retain exactly half their normal commanded speed; no boost or sonar on empty power; restoring energy restores normal thrust; actual paused animation frames consume no resources. |
| Rare battery cells | Full-battery and tiny-deficit protection; actual capped +25 restoration; floating pickup quantity; no cargo/crystal contamination; free pickup at zero power; no duplicate grant; no pause/harbour/dock refill; 480-second eligibility and 90-second staggering; no visible respawn; saved locations/timers; import validation; 25 seeded-level layouts with 3/4/5/6/7 cells and no relocation of finite deposits. |
| Actual v0.20 migration | Boots the archived v0.20.0 production scripts to create a used campaign, then opens the same three-slot store in Lifeline. Exact old player and active dive, credits/crystals/prices, original loot/depletion, fish, wounded predators, in-flight ordnance, missions, discoveries and survey state are retained. Only new battery items are appended. Inactive slots initially remain byte-for-byte unchanged; real slot switching preserves isolation. |
| Command interfaces | 13 sizes from 320x568 to 1920x1080; main/pause/dock bounds, reachable action targets and no horizontal overflow; three-column system grid; actual campaign counts, oxygen/propulsion gauges and checkpoint state; tabs, upgrade details, pause/map/audio/main/resume flow; keyboard focus containment. |

The older item-array equality tests were updated only to filter the newly appended `battery` item category before comparing every original item exactly. Historical price-transition assertions remain as appropriate to each old release. The mock future-version scenario now uses a genuinely newer version than 0.21.0.

## Interaction issue caught during regression

An initial run found an intermittent Warden prompt failure. A deterministic seed-1 probe showed a crystal about 1.24 m from the submarine consuming USE even though the submarine was directly on the observation buoy. The old interaction search always preferred loose resources over signals. The release now chooses the nearer eligible resource or signal; explicit Warden consent is unchanged. A seeded regression verifies that the prompt opens without taking the nearby crystal. See `interaction-investigation.md` for the observed coordinates and root cause. All suites were rerun on the corrected final runtime, not merely carried forward from before the fix.

## Regression coverage

The remaining 39 suites cover original lamp pixel comparisons and new fan geometry, predator world collisions and routes, individual fish behaviour, 30 achievements and currency totals, the five-level economy, wrecks/navigation/discovery recovery, predator variants, guidance candidate markers, repeated deaths and exact rescue stock, every level's recovery rules, guided bullets and seeking mines, ordnance checkpoint state, paid weapon ammunition, automatic salvage and its regeneration, procedural placement, contracts, backup validation, Warden state/reward guards, journal/UI layouts, older migrations, saved expeditions, all three slots, simultaneous touch combat, passive stealth, audio fades/rapid transitions, generated music, approved branding/startup and truthful version/cache logic.

## Visual review

Production screenshots were captured at 390x844 portrait, 844x390 landscape and 1440x900 desktop. The original approved icon/launch art is used, not a newly generated mock-up. New main-menu, dock and pause interfaces were visually reviewed; the command-layout suite additionally checks all 13 sizes. Staged pause/dock shots use synthetic gear and credits. A generated battery-cell location and reserve-drive pause state were also captured. The main-menu preview truthfully reports LOCAL PREVIEW / NOT VERIFIED.

## Save and economy scope

No live user save was accessed. Active storage uses the same local campaign keys and schema; new per-level battery-cell state is optional for older campaigns and is validated on portable import. Oxygen uses the new rate after resuming; existing oxygen/power amounts are not reset or retrospectively deducted by migration. All prior upgrade credit/crystal prices, weapon-ammunition costs, finite crystals, scrap regeneration and recovery rules remain unchanged.

The standard oxygen estimate is 5:33 and Mk I is 8:40 at uninterrupted active simulation, excluding cache pickups. These arithmetic checks do not establish that every player will find the difficulty ideal. Reserve thrust still experiences current, inertia, collision and hazard effects; it does not guarantee escape from a pursuing predator.

## Blocked and untested

The real local HTTP navigation probe returned `net::ERR_BLOCKED_BY_ADMINISTRATOR`. Therefore real service-worker installation, actual cached offline relaunch, hosted update refresh and an already-installed phone app moving from v0.20 to v0.21 were **not verified**. Mocked worker/cache tests do not replace those tests.

Physical Android/iOS devices, human sound listening, Safari/Firefox, real-device touch ergonomics, frame-rate/thermal/battery profiling, the user's hosted deployment and a full human campaign/balance playthrough remain untested. Browser storage is local, not cloud storage; backups are recommended.

## Reproduction and package checks

See `tests/README-v0.21.0.md`. Current runner: `python tests/run_v0210.py`. Machine-readable results and individual logs are in `verification/v0.21.0/`. Current final evidence is `results-all.json`; earlier reports are historical.

`tests/package_v0210.py` checks each ZIP's CRC and every runtime hash, and reconstructs the update over the actual v0.20.0 complete archive. Its result is recorded separately in `package-integrity.json`. Packaging does not deploy the game.
