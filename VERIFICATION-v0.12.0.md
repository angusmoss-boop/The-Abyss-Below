# Verification: v0.12.0 / Fivefold Descent

Build: `0.12.0-fivefold-descent-1`  
Base: v0.11.0 / Adaptive Systems  
Final suite completion (UTC): 2026-10-27T17:03:23.536952+00:00

## Result

**All ten current suites passed:** seven production-asset Chromium suites, one release-integrity suite, and two Node suites exercising production version/worker code with mocked boundaries. The final run includes the corrected per-pressure-gate crystal reserve, which excludes deposits below each required hull threshold.

Production screenshots and the additional exhaustive achievement-accounting check also completed without JavaScript page errors. This is not a hosted release, physical-device test or full human balance playthrough.

## Current acceptance evidence

| Suite | Verified |
|---|---|
| Campaign | Five levels with 2/3/4/5/6 banked-recorder unlocks; locked-level guards; no unlock while recorders are only aboard; actual hub revisit and reload; unchanged resource positions/depletion. Exact fresh stocks: 15,192 CR worth of scrap and 496 crystals. All 51 paid upgrade increments through real UI controls cost a total 12,223 CR + 432 crystals. Separate currency guards, maxed states, Hull III 297 CR + 10 crystals, paid ammo without free refills, crash/defeat recovery without duplicated cargo or revived deposits. |
| World and achievements | Five floors at four capsule headings and boosted impact; floor discovery and sonar arrival. Forty seeded maps (eight per level) checked for objective count, above-floor and rock-clear resource positions, and at least 288 CR of scrap plus 12 crystals inside standard hull depth. Actual sonar, kill/reaper, remote magnet and shield counter triggers, clean cargo return, persisted unlock timestamps. Both menu entry points and twenty cards, Escape/modal pause preservation, per-pressure-gate reserve including inaccessible deep deposits, confirmed five-level reset. |
| Migration | Synthetic save made by the actual archived v0.11 production runtime. Credits, XP, upgrades and owned ammo retained. Old seed, layout, depletion, recorders and enemy damage retained in Level 5. New first-four gates not skipped. One-time crystal stock addition and reload idempotence. Malformed primary JSON falls back to the previous snapshot. No real user save was accessed. |
| Responsive hub | Thirteen sizes from 320x568 to 1920x1080; menu version/hub entry, achievement scrolling/close, three-column name-only tiles, pinned departure/purchase controls, dual currencies, expedition cards, modal focus and keyboard tablist; no detected horizontal viewport overflow. |
| Touch and desktop | Eleven touch sizes and five desktop sizes; floating helm ownership/dead zone, circular left actions, simultaneous steering/boost/mine/salvage, button isolation, cancellation/orientation/blur handling, and desktop held-mouse/keyboard piloting. |
| Ship systems | All magnet/shield/disruptor marks: visibility and collision gates, power/ranges, free close pickup, shield damage overflow/recharge delay/boost inhibition/pressure bypass, disruption wave arrival/resistance/range/cooldown and scan-only low-power fallback. |
| Gameplay regression | Pixel-level desktop/mobile darkness, four flashlight cones, rotation/power-off, continuous fade and sonar timing. Twelve warhead/predator-health pairings at the new level multiplier, mine arming/cooldowns/safety. Narrow passages, boosted collision, finite pursuit, Reaper 800 m floor, seven new hull ratings and unavailable-storage warning. |
| Release integrity | JavaScript syntax; actual script/defer wiring; unique DOM IDs; current build markers/save-key references; all nine runtime SHA-256 asset hashes. |
| Version checker, mocked | Correct published hashes, loaded markers and verified controlling worker required for verified status; offline/partial/stale/future release states and active-dive update protection. |
| Worker lifecycle, mocked | Nine-asset shell verification, scoped cache cleanup, cached offline fallback logic and refusal to replace a complete shell with a partial/mismatched one. |

Raw logs, exit codes and commands: `verification/v0.12.0/results.json` and adjacent `.log` files. Historic reports in this archive are not evidence for the current release.

## Additional achievement-accounting check

`tests/v0120_previews.py` uses a synthetic fully outfitted ship and production collection/docking handlers to collect all fixed deposits and all twenty recorders across all five levels. It verifies Clean Sweep, Full Survey, all recorder-completion awards, delivered-resource thresholds and All Systems Go. Together with the world/achievement suite, all twenty award conditions have a positive trigger check. Results are retained in `verification/v0.12.0/achievement-accounting.json`.

This check repositions the vessel and supplies test gear. It establishes counter and award wiring, not survival, fun, realistic completion time or a feasible human-paced run with default gear.

## Visual inspection

Actual production screenshots were captured at 390x844 portrait, 844x390 landscape and 1440x900 desktop: main menu, expedition hub, Hull III purchase pop-up, achievements and the first seabed. The portrait expedition cards, portrait dual-currency purchase, landscape achievement list and portrait seabed were visually inspected. The title menu correctly says local/unverified, not a fabricated sync success. Currency and equipment in previews are synthetic.

The dock layout checks also cover 320x568, 320x740, 360x780, 390x844, 430x932, 568x320, 640x360, 844x390, 915x412, 768x1024, 1024x768, 1440x900 and 1920x1080.

## Blocked or untested

The separate live HTTP/service-worker attempt was blocked during localhost navigation with **`net::ERR_BLOCKED_BY_ADMINISTRATOR`**. It did not install a real worker or complete an offline relaunch. See `verification/v0.12.0/live-pwa.json`. Mocked cache/checker passes are not a substitute for actual hosted/offline-update testing.

Physical Android/iOS hardware, Safari/WebKit/Firefox, actual phone ergonomics, frame-rate/heat/battery profiling, production GitHub Pages deployment and an already-installed PWA upgrading live remain untested. There is no signed Android APK/AAB or Play Store deployment in this release.

The full campaign has not been completed by a human from default equipment. Resource and price totals, starter guarantees, pressure-gate guards and synthetic progression checks are verified; practical difficulty and economy may still need adjustment after playtesting. Generated world sampling covers forty maps, not every possible seed.

Recovery pods preserve resource cargo, not the active ship simulation. Browser storage unavailability/site-data deletion can still lose progress. Primary JSON backup recovery was tested, not every possible malformed-save case or cross-device/cloud sync.

## Reproduction

See `tests/README-v0.12.0.md`. Run `python tests/build_release.py` after runtime edits, `python tests/run_v0120.py` for the current suites, and `python tests/v0120_previews.py` for captures/accounting. The separate live attempt is `python tests/v0120_live_pwa_test.py`.
