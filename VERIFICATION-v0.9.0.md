# Verification: The Abyss Below v0.9.0

Build: **Beyond the Beam**, based on v0.8.0 Glass Cockpit. Date: 27 October 2026.

## Scope

Production HTML, CSS and JavaScript were exercised in headless Chromium through Python Playwright. Test-only fixtures expose deterministic world/position changes; real pointer, touch and keyboard interactions are used for input and UI purchase checks. The app remains a vanilla static browser game with no production build dependency.

### New exploration checks

`tests/v090_exploration_test.py` covers:

- Coarse-pointer camera zoom exactly 0.70, desktop exactly 1.00, and correct world/CSS coordinate conversion at portrait, landscape, small-phone, tablet and narrow/wide desktop sizes. Full-size controls/HUD reuse the earlier geometry and hit-testing assertions.
- Legacy saves receive Mk I flashlight while credits, upgrades and secured recorders remain. Invalid/null/out-of-range lamp values fall back to Mk I. Real dock purchases cost 75 / 150 / 300 credits, advance reach immediately and stop at Mk IV.
- Pixel inspection of four cone marks at four headings in desktop, portrait and landscape. Illuminated area grows at each mark. No lit pixels escape the expected cone boundary beyond a three-world-unit antialiasing allowance. Lamps-off views at 1,100 m are fully opaque RGB(0,0,0).
- Exact lamp-only power consumption over 60 simulated seconds at each mark, with battery levels zero and five. Checks lights-off savings, battery efficiency, empty-battery extinguishing and pause freeze. Other base-system consumption is accounted for separately.
- Nearby walls reveal on sonar-front arrival after widening the map. Existing sonar tests retain complete screen coverage and timed echo expiry.
- Twelve deterministic map seeds: exact 3x cross-section at multiple depths; 942-1,023 accepted rocks in the tested seeds; exactly 138 / 33 / 15 predators, correct depth floors and lateral spread; 180 scrap / 24 crystals / 30 caches plus unsecured recorders. Crystal minimum depth and guaranteed starter salvage are checked. Items are outside conservative boulder collision bounds.
- Collected scrap/crystal/cache IDs, killed enemies and partial damage survive simulated time, menu suspension, relaunch and a reconstructed browser page using the saved storage payload. This is a storage round-trip test, not a claim that active dives now save.
- Physical docking restores ordinary loot and enemy health, increments the cycle once, and retains exactly the same rock geometry. A banked recorder stays removed. Purchases and reopening a dock without departure do not reset the cycle; leaving and returning permits a new one.
- Confirmed New Game resets both banked progression and field depletion. Corrupted field JSON does not crash startup.

### Existing regression coverage

The included suites cover desktop steering, mobile multitouch controls, touch capture and release, movement/collision, finite pursuit, pressure progression, old-save migration, six recorder objectives, menus, flashlight blackout, sonar arrival/expiry, boost maths and lockouts, mine damage/health pairings, swept proximity, friendly-fire immunity, ammunition, docking and responsive cockpit geometry.

The v0.8 cockpit suite still checks **11 touch viewports** and **five desktop sizes**, including orientation and primary-pointer changes. All tested action circles remain bottom-left, the joystick stays right, and the keybind strip replaces them on desktop.

Previous test expectations were updated only for intentional v0.9 contracts: nine dock upgrade categories; 138/33/15 population totals; zoom-aware pixel conversion; versioned shell URLs; and the fact that a wall may now be outside a central scan. Nearby-wall sonar behavior has its own explicit v0.9 assertion. Historical suite filenames are retained.

### Service worker and packaging

JavaScript syntax checks are run on the game and worker. The mocked worker lifecycle verifies version-matched assets, installation, activation, old-cache cleanup scoped to this game, network-first responses, offline cache fallback, and HTTP-method/origin guards.

The real localhost service-worker test attempts an HTTP origin under an `/expedition/` subpath, matching the structure of GitHub Pages deployment. **It is blocked by the execution environment with `net::ERR_BLOCKED_BY_ADMINISTRATOR` before navigation succeeds.** Actual offline reload/installation is therefore not verified by that test. A mocked lifecycle pass is not a substitute for a real device/browser test.

Release metadata records runtime SHA-256 hashes and exact changed files. Packaging checks ensure every runtime script/style/manifest reference exists and the update overlay reproduces the release runtime. No code has been pushed to a live repository automatically.

## Known limitations and manual follow-up

Actual Android/iOS hardware frame rate, memory use, battery use, OS safe-area behavior, prolonged touch ergonomics and installation remain untested. Headless Chromium screenshots and viewport emulation are not hardware validation. The four precomputed lamp textures are cached, and mobile backing buffers do not grow when zooming out, but physical-device performance still needs checking.

Whole-campaign economy and difficulty have not been playtested end-to-end. Loot is intentionally scarcer and predators remain proportionally as dense across the wider map. Starter salvage and protected lanes reduce progression risk, but the new counts/prices are balance choices rather than a guarantee of ideal pacing.

Banked progress uses the existing save key. A separate compact save records population depletion. Active vessel position, unbanked cargo, enemy positions, deployed mines, current ammo and resources still do not survive reload. Damaged surviving enemies return to home positions after relaunch while retaining their health. Mission recorders not banked return to their mission positions after a lost/restarted dive, avoiding campaign softlocks. Blocked/cleared browser storage cannot preserve either save. Dock population reset clears deployed mines and sonar echoes deliberately.

New Game is an explicit exception to dock-only replenishment: it clears both saved progress and the old field after confirmation.

## Execution results

**Eleven Chromium browser suites passed on the final runtime**, plus JavaScript syntax and the mocked service-worker lifecycle. The real HTTP/offline suite is blocked, not passed. The preview-capture script also completed without page errors.

| Suite | Final result |
|---|---|
| smoke_test.py | PASS |
| joystick_pwa_test.py | PASS |
| mobile_ui_v022_test.py | PASS |
| v022_behaviour_test.py | PASS |
| v030_deep_trench_test.py | PASS |
| v040_menu_visual_test.py | PASS |
| v050_depth_lighting_test.py | PASS |
| v060_mechanics_test.py | PASS |
| v070_mines_test.py | PASS |
| v080_cockpit_test.py | PASS |
| v090_exploration_test.py | PASS |
| v060_service_worker_test.mjs | PASS, mocked lifecycle only |
| v050_pwa_cache_test.py | BLOCKED, ERR_BLOCKED_BY_ADMINISTRATOR |

The adjacent `verification/v0.9.0/` directory contains individual test logs and exit codes. Release packaging records the final executed status in RELEASE-v0.9.0.json.
