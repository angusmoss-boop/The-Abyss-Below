# Verification: v0.24.0 / NEREID Reforged

Build: `0.24.0-nereid-reforged-1`  
Base: v0.23.0 / Sunken Strongholds  
Final suite completion (UTC): 2026-10-28T21:48:46.987822+00:00

## Result

**All 51 current automated suites passed on the final runtime files.** This comprises the new refit/contact/repair/zoom/migration/placement coverage plus the retained gameplay, UI, persistence and audio suites. The two Node version-checker and service-worker suites use mocked boundaries. No administrative network block is counted as a pass.

The final runtime SHA-256 values recorded by the runner match all 20 manifest entries. Both complete and update ZIPs undergo archive CRC verification. Applying the update to the actual v0.23.0 complete archive reproduces every v0.24.0 runtime file and its published digest. See the separately supplied package-integrity report for ZIP sizes and hashes.

## New release-specific evidence

| Suite | Observed coverage |
|---|---|
| Contact pickups | All 8 hull marks receive exactly 25% maximum hull HP from packs, capped. Full-health packs remain. No air, battery, shield or currency grant. All 5 magnet states deny remote crystals. Actual contact works empty-powered and dark; USE still retrieves a recorder instead. Capsule endpoints, a thin wall, high-speed movement substeps, notice amount, actual seeded depletion and death/reload conservation are checked. |
| Emergency repair | All 8 hull marks restore exactly 50% maximum HP once. Full-hull activation preserves the charge. No scrap/energy fee. A pack, elapsed time, menus, checkpoint reload or portable export do not refill it. A real dock visit does, without ammunition grants. Strict imported boolean field and spent desktop readout are checked. |
| Live zoom | Actual Chromium/CDP two-finger gestures at 390x844, 320x568 and 844x390. Both clamps, fixed action sizes, no unintended movement/fire, action-touch isolation, remaining-finger guard, preference reload and telemetry reset. Desktop wheel, independent survey zoom and completely black world pixels at the three view scales with lights off below 1000 m are checked. |
| Actual v0.23 migration | The archived production v0.23.0 build creates valid synthetic progress and a saved dive. All 3 slots migrate with the same position, motion, vitals, cargo, ammo, upgrades, prices, resource coordinates/depletion, rocks and predators. Earned finish is retained. Inactive slots remain byte-identical. Old saves receive one initial charge; spending and reloading preserves the spent state. No user's real storage is accessed. |
| Contact-world access | 25 generated cases across all 5 levels. Every crystal and pack has at least one collision-clear hull contact position and clear approach line. Existing deposits are not relocated to make these checks pass. |
| Shipyard and renderer | 8 distinct hull appearances, 13 graded fitted-module appearances, four larger/colour-changing exhaust tiers and health-based wear. Previewing/test-thrust does not mutate campaign upgrades, credits or stock. Six actual purchase paths, max-tier gold state, unearned-finish exclusion, first-open canvas pixels and 12 responsive dock sizes are checked. |

Shipyard viewports: 320x568, 360x780, 390x844, 430x932, 568x320, 640x360, 844x390, 915x412, 768x1024, 1024x768, 1440x900 and 1920x1080. Retained command-menu suites cover their additional existing layouts too.

## Retained regression evidence

The final runner also passed enlarged-wreck relays, traps, defenders and old-layout migration; research-drone/station interactions, navigation, persistence, encounters and audio; oxygen/reserve drive/battery cells; Mk I beam pixels outside the deliberately changed vessel model; upgraded flashlight cones; fish motion; all 30 achievements; predator obstacle/navigation behaviour and targeting; repeated cargo-recovery deaths across five levels; exact 10/3/3 rescue ammo; guided rail/torpedoes/mines; paid ammunition and economy; contract placement/rewards; backup validation; Warden/journal; three slots and active-dive resumes; simultaneous touch combat; speed-based noise; fade-safe audio transitions and unchanged music; launch artwork/layouts; deployment verification and worker-cache logic.

The 40 generated mission/level placement cases are recorded in `placements.json`. These and the 25 new contact cases are generation checks, not human completion of all those maps.

Tests whose obsolete assumptions were intentionally replaced have explicit updates: crystals/caches use contact rather than manual collection, and the original Mk I beam comparison masks the redesigned submarine footprint. Historical test files remain historical, not proof of this build. Current logs are in `verification/v0.24.0/`.

## Visual inspection

Production screenshots show the mobile/desktop Shipyard, fitted-versus-next hull pop-up, the three world zoom settings, contact notices and emergency repair. The mobile Shipyard and upgrade pop-up were visually inspected, as were the world view and a renderer-based vessel evolution sheet. Previews use synthetic equipment/credits and staged positions; they are not a full campaign playthrough. The evolution sheet uses the same Canvas vessel renderer as live gameplay, not generated concept art. The version preview does not fabricate a verified online deployment.

## Blocked and untested

The real local-HTTP probe returned `net::ERR_BLOCKED_BY_ADMINISTRATOR`. Real service-worker installation, hosted GitHub Pages deployment, actual offline launch and updating an already-installed PWA were **not verified**. Mocked lifecycle tests do not substitute for them.

Physical Android/iOS hardware, Safari/WebKit/Firefox, finger comfort on real screens, frame rate/heat/battery on phones, human audio listening and a full campaign difficulty/balance playthrough remain untested. Contact-only crystals reduce convenience and the repair rules change survival decisions; automated correctness does not establish that their pacing feels ideal. No signed native Android package or Play Store release is included.

## Reproduce

See `tests/README-v0.24.0.md`. Run `python tests/build_release.py`, then `python tests/run_v0240.py`. Use the actual previous complete archive beside the extracted project for the migration test. `results-latest.json` records the final suite list and runtime hashes. Rerun after any runtime change.
