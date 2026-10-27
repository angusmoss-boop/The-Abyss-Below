# Verification: v0.11.0 / Adaptive Systems

Build: `0.11.0-adaptive-systems-1`  
Base: v0.10.0 / Persistent Depths  
Suite completion (UTC): 2026-10-27T15:57:32.416287+00:00

## Result

**Eight current automated suites passed:** five production-code Chromium suites, one static release-integrity suite, and two Node suites exercising production update/worker code with mocked boundaries. All source changes were in place for the recorded run. Preview generation also completed without JavaScript page errors.

This is not a claim of a hosted release, a successful real offline integration test, a physical-device test or a complete campaign playthrough.

## Passed coverage

| Suite | Verified |
|---|---|
| Dock and migration | 13 sizes from 320x568 to 1920x1080. Exactly three columns and twelve name-only tiles. Scrollable landscape catalogue, visible undock/purchase controls, native modal focus and Escape handling. All 51 paid upgrade increments via actual UI buttons; total price 11,924 credits. Unaffordable/max-level guards, no ammo grants, persistence, real archived v0.10 save migration. |
| Adaptive systems | All four magnet marks, exact power/range, free close pickup, rocks and darkness, sonar/beam gating, recorders/cache exclusions and held E. All shield marks, capacities, damage overflow, 8-second delay, recharge power, boost/low-power inhibition and pressure/oxygen bypass. All twelve disruptor mark/predator-tier combinations, wave arrival, stopped movement/bites, local range, duration resistance, expiry, cooldown and low-power normal-scan fallback. |
| Campaign/economy | Thruster-based boost, actual dock purchase/ammo controls, finite map resources, unchanged 8,640-credit untouched map, dock-only predator/cache refresh, repeat-visit guards, kill drops, stock/depletion across reloads, v0.9 migration, backup recovery and confirmed New Game reset. |
| Touch/desktop | Eleven touch sizes and five desktop sizes, including fitted-shield HUD stress cases. Floating steering, hidden idle joystick, left-side circular controls, unchanged zoom, actual multi-finger steer/boost/mine/salvage, button isolation, cancellation, orientation/blur resets and desktop click-held steering. |
| Gameplay regression | Canvas pixel darkness and flashlight cones at every mark, lamp off/empty battery, continuous depth fade, sonar arrival/expiry, 12 warhead/predator health combinations, mine arming and safety guards, narrow passages, boosted collisions, pursuit/reaper depth floor, all seven hull upgrades, pressure and eight world seeds/objectives. |
| Release wiring | Real HTML scripts/defer order, versioned local URLs, unique IDs, consistent HTML/CSS/game/worker markers and all nine runtime SHA-256 asset entries. |
| Version checker, mocked | Published checksums, loaded build markers and verified worker are all required for green status. Offline status invalidates verification. Handles partial/missing/stale assets, update ordering and active-dive reload protection. |
| Worker lifecycle, mocked | Verified nine-entry shell, scoped old-cache cleanup, offline fallback logic, missing cache entries and refusal to install a partial/mismatched release. |

Dock sizes: 320x568, 320x740, 360x780, 390x844, 430x932, 568x320, 640x360, 844x390, 915x412, 768x1024, 1024x768, 1440x900 and 1920x1080. Historical reports in this archive are not evidence for the current build; use the v0.11.0 logs.

## Migration and storage

The migration test boots the actual archived v0.10.0 production code, generates a synthetic campaign, collects a resource, damages a predator and buys ammunition. It then loads that storage with v0.11.0 and compares the campaign ID, complete per-level layout/depletion/drop state, credits, XP, secured recorders, owned ammunition and all previous upgrade marks. The only added profile fields are `magnet: 0`, `shield: 0` and `disruptor: 0`.

A synthetic migration fixture is retained in `tests/fixtures/v0100_campaign.json` so the test remains reproducible without the old ZIP. No real user save was accessed. The campaign schema and canonical key remain unchanged. Active dives are still not reload-persistent.

## Visual inspection

Actual Chromium screenshots were captured at portrait 390x844, landscape 844x390 and desktop 1440x900. The dock, shield pop-up, post-purchase state, ammo shop and fitted-module HUD were rendered from production files. The dock catalogue and shield pop-up were visually inspected; the landscape header was tightened so two tile rows fit above the pinned departure footer at 844x390. Portrait tile type was increased after initial inspection. Screenshots use synthetic credits/gear, not a user's save. The title-menu preview truthfully reports a local unverified preview rather than a fabricated sync badge.

## Blocked and untested

The optional real HTTP/worker test attempted a localhost navigation without mocked networking. The browser blocked it with **`net::ERR_BLOCKED_BY_ADMINISTRATOR`**. Therefore real worker installation, live cache refresh, offline relaunch, and an already-installed app moving from v0.10 to v0.11 were **not verified**. Mocked lifecycle checks do not replace those tests.

Physical Android/iOS devices, Safari/WebKit/Firefox, real-device touch ergonomics, frame-rate/battery profiling, production GitHub Pages deployment and a full campaign/balance playthrough remain untested. The fixed resource value and upgrade cost are arithmetic checks, not a guarantee that a player can afford every upgrade without predator hunting or losses.

## Reproduction

See `tests/README-v0.11.0.md`. Current runner: `python tests/run_v0110.py`. Machine-readable results and individual stdout/stderr are in `verification/v0.11.0/`. Run `python tests/build_release.py` after any runtime edit and before hosting; otherwise the menu correctly reports a checksum mismatch.
