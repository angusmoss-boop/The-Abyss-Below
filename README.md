# The Abyss Below

## v0.6.0: Silent Echoes

A standalone, dependency-free browser/PWA submarine expedition game. Pilot the NEREID through a 1,800 m trench, bank salvage, upgrade the vessel and recover six lost recorders.

### Update an existing GitHub Pages game

1. Bank your active dive at the surface before refreshing. Only permanent banked progress survives a reload.
2. Extract the v0.6.0 update ZIP. Copy its contents into the existing repository root, replacing files with the same names. Do not upload the ZIP itself or put the files in a nested folder.
3. Commit the changes, let GitHub Pages finish deploying, then reopen the game online. Check **EXPEDITION BUILD v0.6.0** in the console footer. On mobile, use EXIT to leave the expanded cockpit and view the footer.

Keep the same site origin and browser profile to retain local saved credits, upgrades, rank, secured recorders and best depth. Do not clear site storage or select NEW GAME to install an update. The save key remains `the-abyss-below-v01`.

The complete-source ZIP is a full copy. The update ZIP contains changed code, documentation and tests; existing icon assets remain unchanged. This package has not been pushed to your repository automatically.

### Controls

| Action | PC | Phone / tablet |
|---|---|---|
| Pilot | Hold left click over water, move the cursor; or WASD / arrow keys | Drag right-hand analogue joystick |
| Boost | Hold Space while piloting | Hold left-side BOOST while steering or cruising |
| Sonar | Q | PING |
| Salvage / dock | E | Hold USE, including while moving |
| Quiet running | Hold Shift | Toggle SILENT |
| Repair | R | REPAIR |
| Flashlight | L | LIGHTS |
| Pause | Escape or PAUSE | Pause button |
| Keep moving | Hold an input | Enable CRUISE, steer, then release the joystick |

Mouse piloting aims the bow and the lamp towards the held cursor. Thrust reduces near the cursor. Letting go stops thrust; the submarine coasts down rather than snapping to a halt. Mouse piloting cancels mobile cruise, preventing unexpected motion after release.

### Boost and power

Boost increases thrust speed by **1.85x** and uses a separate **100-point charge meter** at **25 points/second**, for up to **4 seconds**. It also consumes **7 battery units/second** before upgrades, in addition to normal engine/lamp draw. Charge begins recovering **1.5 seconds** after the last boosted frame, at **12.5 points/second**. A fully empty meter must return to full, and the held boost input must be released to rearm. Partially used charge can be spent again without waiting for a complete refill.

Each battery upgrade already adds 30 energy capacity and improves efficiency. It now also increases boost recharge speed by 10%. At MK5, extra boost draw is 4.375 energy/second and charge recovery is 18.75 points/second. Charge recovery never refills ship energy and requires remaining battery power. Boost is loud and overrides quiet running. It does not consume charge when you are not steering. Docking refills the capacitor.

### Sonar and darkness

Ambient water light fades smoothly to zero at **1,000 m**. A powered, switched-on flashlight illuminates only its forward cone.

Sonar is a deliberate exception for instrument echoes, not a permanent room light. Its expanding ring covers every corner of the current viewport. Objects appear as coloured outlines only when the wave reaches them, including objects behind the submarine or outside its lamp cone. Echoes normally last **4.5 seconds from contact** and then fade. Salvage, recorders, air caches, predators, rocks, wrecks, vents and trench walls all respond. A scan does not bank, collect or permanently discover an object.

Base sonar costs **12 energy** and has a **5.5-second cooldown**. Each upgrade reduces cost by 2, reduces cooldown by 0.35 seconds, extends echo persistence by 0.45 seconds and expands coverage beyond the visible screen. On exceptionally large displays, cooldown cannot finish before that scan's wave has finished travelling. Reached predators may hear the ping. Their AI alert timer is separate from the finite echo visibility timer.

### Predator tiers

| Tier | Predator | Count per trench | Chase speed (world units/s) | Damage | Region |
|---|---|---:|---:|---:|---|
| 1 | Drifter | 46 | 80 | 13 | Throughout the trench |
| 2 | Abyss stalker | 11 | 134 | 27 | Spawns below 400 m |
| 3 | Crimson reaper | 5 | 196 | 42 | Below 800 m only |

The reaper has a crimson armoured silhouette, paired pale eyes and greater awareness. All tiers have finite pursuit ranges. Boost, engine upgrades, distance and quieter running offer different escape options; campaign balance still needs real playtesting.

### Pressure and progress

The tag over the vessel now includes its current limit, for example **NEREID // MK-II · LIMIT 530m**. It remains readable in the dark and turns red beyond the rating.

Hull starts at 130 m. Seven upgrades add 200 m and 28 hull HP each, to a maximum rating of 1,530 m and 296 HP. Recorders remain at 75, 260, 470, 725, 1,100 and 1,500 m. The bottom of the world is 1,800 m and is deliberately beyond the maximum safe hull rating.

### Menus

- RESUME returns to the current dive.
- MENU suspends a dive only for the current page session. CONTINUE returns to it.
- QUIT asks before discarding unbanked cargo. Banked progression remains.
- NEW GAME asks before clearing permanent saved progression.

### Local development and testing

No game build step or runtime library is required. For local HTTP development, run `python -m http.server 8000` from the game folder and open localhost on port 8000. A service worker requires HTTPS or a supported localhost origin. GitHub Pages supplies HTTPS.

Browser tests require Python, Playwright and Chromium. Install Playwright and its browser separately as appropriate for your development environment. The tests use a system Chromium if available, otherwise Playwright's Chromium.

```sh
node --check game.js
node tests/v060_service_worker_test.mjs
python tests/v060_mechanics_test.py
python tests/v050_depth_lighting_test.py
python tests/v040_menu_visual_test.py
python tests/v030_deep_trench_test.py
python tests/v022_behaviour_test.py
python tests/joystick_pwa_test.py
python tests/smoke_test.py
python tests/mobile_ui_v022_test.py
python tests/v050_pwa_cache_test.py
```

The last command is a real HTTP/offline integration test, updated to the current release version despite its historical filename. It was **blocked by the execution environment** during this release. The Node worker test checks a mocked worker lifecycle, not an installed PWA.

See **VERIFICATION-v0.6.0.md** for actual results and limitations. Test-only fixture mutation APIs are available only when explicitly using `?testmode=1` or `window.ABYSS_TEST_MODE = true`.
