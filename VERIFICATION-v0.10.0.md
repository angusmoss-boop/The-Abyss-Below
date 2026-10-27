# Verification: v0.10.0 Persistent Depths

**Build:** `0.10.0-persistent-depths-1`  
**Verified:** 27 October 2026  
**Baseline:** v0.9.0 complete source ZIP  
**Result:** All six current suite commands exited 0. Three use Chromium; two use mocked Node boundaries; one checks static release wiring and hashes. This is not six hosted browser integration suites.

## What actually ran

| Suite | Method | Result |
|---|---|---|
| `v0100_release_test.py` | Static HTML/asset/hash inspection | PASS |
| `v0100_campaign_test.py` | Production game in Chromium with deterministic storage/game fixtures | PASS |
| `v0100_touch_test.py` | Chromium DOM/layout and real keyboard, mouse and CDP touch events | PASS |
| `v0100_regression_test.py` | Production canvas/simulation and pixel assertions in Chromium | PASS |
| `v0100_sync_test.mjs` | Production version module in Node VM; mocked DOM/network/worker; real SHA-256 | PASS |
| `v0100_worker_test.mjs` | Production worker in Node VM; mocked cache/fetch/install/message lifecycle | PASS |

The runner writes exact commands, completion timestamp and exit codes in `verification/v0.10.0/results.json`; individual logs accompany it. JavaScript syntax checks also passed for game.js, version-sync.js and service-worker.js. Production-renderer screenshots were captured and visually inspected in portrait and landscape.

## Package and deployment-state checks

The final wiring check confirms both deferred script tags load in order, current-version query strings on CSS/game/manifest/version module, all local assets exist, no duplicate HTML IDs, and every published asset SHA-256 matches the release manifest. It caught a stale v0.9 asset reference and missing module tag before packaging; these were corrected and the whole current suite rerun.

The version-module tests require agreement between a fresh no-store manifest, six fresh runtime hashes, loaded HTML/CSS/code markers and the controlling worker's verified-shell reply before showing green. Tests cover stale HTML/styles, old worker, missing cache, no worker, missing game code, partial uploads, malformed/missing manifest, failed requests, offline transitions, reconnection and numeric 0.10 versus 0.9 version ordering. Active dives block a requested update reload. These are mocked state-machine results, not a live-server result.

The worker tests verify all nine cached shell entries before install/activation, reject incomplete/mismatching uploads without replacing a prior good cache, clean only its cache namespace, report build/cache presence, bypass caches for latest-version checks, and exercise offline navigation fallback. They do not prove browser registration, install prompts or real offline navigation.

## Campaign, migration and economy checks

- Standard drive cannot boost. All four engine marks have increasing normal and boosted speed and exactly 3/4/5/6 seconds at the base charge drain; full exhaustion/rearm, recharge and battery efficiency checks pass. Reaper speed still equals top normal thruster speed.
- Actual dock buttons exercise launcher unlock, single/bulk ammo purchase, affordability, full racks and independent warhead/capacity upgrades. Neither docking, relaunch, reload nor upgrades grant rounds. New slots stay empty. Spent purchased stock persists immediately.
- All 234 resource/cache placements survive reload; resource coordinates and permanent collected IDs stay unchanged on dock refresh. The 204 permanent deposit records total 8,640 credits on a fresh map, about 92.37% of the 9,354-credit upgrade tree. Arithmetic excludes ammo, repairs and lost cargo.
- Dock-return guards refresh predators/caches only once after departure. Kill rewards are 2/4/8 scrap, cannot duplicate for the same kill, persist until collected and must be banked for credits. Survivor damage and death state persist until legitimate population refresh.
- The test executed the original v0.9 JavaScript from the mounted historical ZIP, then compared exact resource IDs, coordinates, seed/cycle and depletion after migration. It also checked retained banked upgrades, intentionally empty migrated ammo, corrupt-primary backup recovery and cancel/confirm New Game behaviour.
- A simulated storage write failure produces a visible warning instead of silently assuming campaign persistence. The fixture validates serialization logic, not real device quota/eviction behaviour.

## Controls and layout checks

Touch dimensions tested: 320x568, 320x740, 360x780, 390x844, 430x932, 568x320, 640x360, 844x390, 915x412, 768x1024 and 1024x768.

Desktop dimensions tested: 390x844, 800x700, 1024x768, 1440x900 and 1920x1080, including console and expanded views.

Actual touch events confirm left/right/upper open-water origins, no visible pad on a stationary tap, appearance while dragging, first-finger ownership, hiding/reset on release, and cancellation. Four simultaneous fingers can steer, boost, drop a mine and collect. Action touches never acquire steering. Extra open-water fingers cannot steal it. Pause, blur, orientation and input-mode changes clear held states. The locked boost control gives feedback before Mk I. Desktop click-held steering and Space boost still function; narrow PC windows do not show touch controls.

## Gameplay regressions checked

Pixel assertions cover gradual darkness, mobile/desktop transforms, all four flashlight cones, rotation, empty battery, zero leakage outside the beam at blackout depth, sonar arrival time, cooldown and echo expiry. The twelve warhead/predator-health combinations pass, along with mine arming/cooldown, no friendly fire, station and blocked-stern restrictions. Narrow-gap traversal and boosted rock collision pass. Predator leashes and the 800 m Reaper floor remain. Seven hull purchases update safe depth, and eight generated seeds retain reachable placements, 186 predators and all six recorders.

## Important limitations

**Live HTTP navigation was blocked in the authoring browser with `net::ERR_BLOCKED_BY_ADMINISTRATOR`.** Browser tests therefore use actual production files via an in-memory HTML document and localStorage fixture. They are real renderer/input tests but not hosted navigation or live service-worker integration. No attempt was made to bypass the browser restriction.

Real Android/iOS hardware, mobile WebView/browser differences, a hosted old-to-new update, install/offline reopening, CDN timing, multi-tab operation and browser storage eviction remain untested. A complete campaign has not been played end-to-end. Economy totals are verified arithmetic, not proof that every route, threat density or ammunition choice is perfectly balanced.

Screenshot scenes use controlled gameplay fixtures. The title screenshot truthfully says **LOCAL PREVIEW · NOT VERIFIED**; it is not a fabricated green sync demonstration.

## Release use

Bank cargo and quit the active dive before updating. Upload all update contents, including version-sync.js and version.json, at the existing site address. Do not clear local storage. Current active dives still cannot survive reloads. Banked upgrades and permanent field records migrate; old free v0.9 ammo does not. The shipped files are ready to upload, but no user repository or live deployment was changed by this work.
