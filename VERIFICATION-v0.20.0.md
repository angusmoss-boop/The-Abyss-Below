# Verification: v0.20.0 / Fluid Frontiers

Build: `0.20.0-fluid-frontiers-1`  
Base: actual `the-abyss-below-v0.19.0-complete.zip`  
Completed (UTC): 2026-10-28T09:16:41.259579+00:00

## Result

**39 final automated suites passed: 37 Python-driven production Chromium suites and 2 Node suites with explicitly mocked update/worker boundaries.** Per-suite logs and results are in `verification/v0.20.0/`. `results-all.json` lists these results and the exact SHA-256 hashes of all 18 runtime assets. This is not a claim of a deployed game, physical Android testing, a successful real offline installation or a full human campaign playthrough.

## Current coverage

| Area | Verified |
|---|---|
| Flashlight | Mk I actual world-canvas pixels exactly equal the actual v0.19 build at four headings. Mk II/III/IV angles 70/110/150 degrees. Desktop/mobile pixel darkness, rotating cones, zero-battery and lights-off blackness, finite range and unchanged drain. |
| Predators | Real movement of all three tiers around a blocking rock, continuous solid clearance and speed caps; swept high-displacement collision; safe relocation of an already embedded legacy enemy retaining health and ID. Wreck navigation, behaviour variants, line-of-sight targeting, depth/harbour rules, Warden phases and optional encounter retained. |
| Pickups | Automatic scrap versus manual crystals, recorder/cache notices, actual quantities at the vessel, bounded notice lifetime, no collection tether; plate notices, recovery manifest transfer, contract package collection and existing ownership rules. |
| Fish | Independent headings, smoothly changing independent pace, no indexed rows, rear acceleration/front easing, actual scatter-and-regroup sequence, solid-rock avoidance, harmlessness, exact individual state restore. A controlled scene measured average spread about 22 to 89 world units, then about 18 after the disturbance left; this is one synthetic test, not a general gameplay metric. |
| PC instruments | Eleven circular action/key references, exact weapon/rack counts, firing and sonar timers, real Z/X/F/Q keyboard input, pass-through mouse helm, six expanded desktop viewport sizes, no overlapping/offscreen circles. Mobile triangle inputs and simultaneous steering/boost/fire remain tested. |
| Achievements | Thirty cards and both menu surfaces. Actual actions for all five plates/shortcuts, five death-wreck recoveries, ten breaches, 39/40 single-haul boundary, first/ten/four-type contracts and Warden defeat. Earned timestamps persist. Stored boss/plates/shortcuts/contract-total backfill; no fabricated missing historical counters. Original counter, seabed and resource-survey goals retain coverage. |
| Economy | Every paid step is exactly ceil(previous v0.19 credit price times 1.25). Every crystal price unchanged. Full tree 28,475 credits and 464 crystals; fresh stock 496 crystals. No retroactive charge. Auto-salvage, finite crystals, regeneration timers, reserve guard, paid weapon ammo and exact rescue magazines retained. |
| Migration | Real archived v0.19 production creates a three-slot store and active expedition, then the new build resumes it paused. Exact balances, resources/depletion, fish positions, wounds, projectiles, cargo, missions, discoveries and inactive slots preserved. Additional real v0.17.4/v0.18/v0.18.2 migration suites remain passing. |
| Combat and recovery | Homing interception, seeking mines, solid blasts, weapon damage/capacity/cooldowns, all five recovery levels, repeated deaths, recorders/plates in wrecks, unique delivery, exact 10/3/3 rescue stock, slots and backups. |
| Existing campaign | Thirty wreck-route checks and forty seeded placement checks, contract flows/retry/bank-only payout, Warden save/reward, journals, map/resume, mobile/desktop input, storage errors, artwork/startup and interface layouts. |
| Audio and release | Existing pause/resume fade and click-regression tests, interface music and branding/launch checks. Mocked version verification and worker lifecycle only; all final runtime markers and manifest hashes agree. |

## Fixes found during verification

The backup importer still had a literal maximum minor version of 19. It now derives the accepted minor from the running build, so v0.20 exports can be imported. Actual backup round-trips and malformed-file protections pass.

A legacy migration test assumed a fixed coordinate in an older randomly generated map was always suitable for dropping a mine. One random seed blocked that location. The test now chooses genuinely open water for the ship and stern in the actual old game, without deleting terrain or bypassing deployment checks. Its final rerun passed. A contract test also now selects an available recovery assignment rather than assuming every board always contains a cargo contract. These are fixture corrections, not removed gameplay guards.

## Visual inspection

Production captures were made at 390x844 portrait, 844x390 landscape and 1440x900 desktop. The desktop circular ammo/action rail, mobile pickup notices and achievement panel were visually inspected. Mk I/Mk IV comparison screenshots and a schooling animation are included. All use staged positions and synthetic equipment; no user's campaign was used. The schooling animation uses the actual fish simulation and game renderer.

The desktop rail is intentionally not a set of mouse-click fire buttons: click-and-hold piloting stays available underneath it, and weapons use Z/X/F. Mobile controls are unchanged. Deep-world darkness can hide the body behind the lamp's origin; the patch has not added an ambient rear glow or weakened the 1,000 m darkness rule.

## Blocked and untested

The real HTTP probe attempted localhost navigation with Chromium. It returned **net::ERR_BLOCKED_BY_ADMINISTRATOR**. Real worker installation, live cache update, offline launch, an installed PWA upgrading from the previous release, and launcher behaviour remain unverified. Node mock tests are not substitutes.

Physical Android/iOS hardware, Firefox/Safari/WebKit, real-device frame-rate/heat/battery profiling, subjective audio listening and a complete human balance playthrough remain untested. Routing is bounded local steering, not a proof that every possible maze can be solved. Arithmetic economy checks are not a balance guarantee.

## Packaging

`tests/package_v0200.py` builds both ZIPs, checks CRCs and all 18 asset hashes, and reconstructs the actual update over the v0.19.0 complete archive. The result is recorded in `verification/v0.20.0/package-integrity.json` and `RELEASE-v0.20.0.json`. These checks do not publish the game remotely.

## Reproduce

See `tests/README-v0.20.0.md`. Current runner: `python tests/run_v0200.py`. Run `python tests/build_release.py` after any runtime change, then rerun relevant tests before packaging. Historical reports in the archive apply only to their named releases.
