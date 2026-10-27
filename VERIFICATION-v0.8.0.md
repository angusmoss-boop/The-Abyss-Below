# Verification: The Abyss Below v0.8.0

Date: 27 October 2026. Baseline: the supplied v0.7.0 complete-source archive.

## Result

The mobile-control and top-instrument overhaul is implemented and tested in headless Chromium. Ten browser suites passed, including the new cockpit suite run in four bounded groups. JavaScript syntax and mocked service-worker lifecycle checks also passed. These are browser/emulation results, not a claim of testing on an actual phone or of deploying to GitHub.

## New cockpit coverage

`tests/v080_cockpit_test.py` checks:

- Touch viewports: 320x568, 320x740, 360x780, 390x844, 430x932, 568x320, 640x360, 844x390, 915x412, 768x1024 and 1024x768. Tested normal readings and 1,500 m / zero power / locked mines. Every action is circular, at least 44 px, in the left half, in bounds, distinct from adjacent buttons and hit-testable at its centre. USE is larger than BOOST; BOOST is larger than each secondary. The joystick stays right.
- Desktop viewports: 390x844, 800x700, 1024x768, 1440x900 and 1920x1080, in normal and immersive modes. No touch bank is displayed, and the complete bottom keybind strip remains visible.
- A single visible cockpit with unique IDs and no old duplicate stats/system rows. Top identity and pressure values fit; four-digit depth, no-power sonar, pressure alerts and locked mine labels stay within their cards.
- At 1,000 m with lamps off, a fixture with no current sonar returns a completely black world canvas. The top vessel/pressure cards stay visible in the separate DOM. This specifically detects any remaining floating nameplate.
- Hull upgrades update the top pressure limit immediately; exceeding the rating produces a text warning and highlighted pressure/depth cards.
- Live sonar countdown and ring refill, boost ring state, mine ammunition in both places, lamp/silent/cruise toggles, retained SVG icons after toggling, and pause/resume input cleanup.
- Rotation and primary-pointer capability changes without reload; correct desktop/touch controls, reset held input, unchanged banked progression, and working expand/collapse navigation.

The final expanded suite was run with `ABYSS_TEST_GROUP` values `touch-small`, `touch-wide`, `desktop` and `live`. Running without the variable executes all groups together. Initial runs exposed a four-digit depth/unit overflow on a 320-pixel screen; the depth number was made compact, sonar's low-power headline shortened, and the edge-state tests then passed. Some all-in-one verification runs hit this environment's command time limit, so results were collected in the four groups rather than treating a timeout as a pass.

## Regression suites

| Suite | Result | Coverage |
|---|---|---|
| smoke_test.py | PASS | Desktop movement, station, sonar, help, touch toggles |
| joystick_pwa_test.py | PASS | Drag, release, cruise, heading, save key and icon/manifest assets |
| mobile_ui_v022_test.py | PASS | Touch dimensions, immersive/console navigation |
| v022_behaviour_test.py | PASS | Multi-touch salvage, pursuit leash, narrow-gap/rock collisions |
| v030_deep_trench_test.py | PASS | Six recorders, save migration, hull progression, pressure damage |
| v040_menu_visual_test.py | PASS | Pause/resume, menu/continue, quit, confirmed New Game |
| v050_depth_lighting_test.py | PASS | Gradual fade, black pixels, beam direction, zero-power lamp, rotation |
| v060_mechanics_test.py | PASS | Mouse piloting, boost arithmetic, lockout, upgrades, sonar timing, predator tiers |
| v070_mines_test.py | PASS | Predator HP/speed, independent upgrades, all damage tiers, ammo/refill, arming, swept collision, four simultaneous touches |
| v080_cockpit_test.py | PASS | New unified HUD, geometry, state, input surfaces and screen-size matrix |

UI assertions in earlier tests were updated where the specification intentionally changed: circular USE replaces a wide rectangle; lamp buttons use ON/OFF/EMPTY states; the depth value is in the shared top card; sonar's ready caption is READY; mobile smoke tests now emulate touch capability instead of relying on width alone. Gameplay assertions were not weakened to accommodate the redesign.

## Static/cache checks

`node --check game.js` and `node --check service-worker.js` pass. The mocked worker test passes version-matched assets, install/activate, scoped old-cache cleanup, network-first storage, offline fallback and method/origin guards. index.html and the worker both refer to v0.8.0 runtime URLs/cache.

The actual HTTP/offline test was attempted using a local /expedition/ subpath. Chromium rejected navigation with `net::ERR_BLOCKED_BY_ADMINISTRATOR` before the app loaded. Real installation, cache upgrade and offline reload are therefore NOT verified. The mocked worker test is not a substitute for that integration test.

## Preserved behaviour and manual checks

The existing local save key and fields are retained. Banked credits, secured recorders and upgrades survive this update. A live dive still does not survive a page reload. The submarine movement/collision, darkness, boost/sonar mechanics, predator balance and mine upgrade/refill rules are unchanged. Clicking the top mine readout no longer fires a weapon: on desktop use F; on mobile use the left circular MINE control.

Before uploading, bank the active dive. After deployment, reopen online and confirm v0.8.0 in the normal console footer. On an actual phone, check comfortable thumb reach, rotation, notch/home-indicator clearance, pause while holding inputs, and performance. Android/iOS hardware, Safari/Firefox, long-session ergonomics and offline installation have not been tested here.
