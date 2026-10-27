# The Abyss Below

## v0.8.0: Glass Cockpit

A standalone, dependency-free browser/PWA submarine expedition game. Pilot the NEREID through a 1,800 m trench, bank salvage, upgrade the vessel and recover six lost recorders.

### Update an existing GitHub Pages game

1. Bank your active dive at the surface before refreshing. Only permanent banked progress survives a reload.
2. Extract the v0.8.0 update ZIP. Copy its contents into the existing repository root, replacing files with the same names. Do not upload the ZIP itself or put the files in a nested folder.
3. Commit the changes, let GitHub Pages finish deploying, then reopen the game online. Check **EXPEDITION BUILD v0.8.0** in the console footer. On mobile, use the top expand/collapse icon to leave the immersive cockpit and view the footer.

Keep the same site origin and browser profile to retain local saved credits, upgrades, rank, secured recorders and best depth. Do not clear site storage or select NEW GAME to install an update. The save key remains `the-abyss-below-v01`.

The complete-source ZIP is a full copy. The update ZIP contains changed code, documentation and tests; existing icon assets remain unchanged. This package has not been pushed to your repository automatically.

### Glass cockpit overhaul

A single top-of-screen instrument layout is shared by both platforms, in normal console view and immersive play. The first row shows vessel name, model and current pressure limit, followed by view/pause controls. Depth, hull, oxygen, power and noise sit below, alongside sonar readiness, boost charge and mine ammunition. Sector and current warnings use a slim status line. Wide panels fit eight system cards into one row; narrow panels wrap them without hiding noise or covering the navigation controls.

On touch devices, all gameplay actions are circles at bottom left. USE is largest, BOOST next, and the six secondary actions are smaller. The right side contains only the analogue helm. Boost and sonar have live perimeter progress rings; mines show remaining/max rounds; toggles show their state. Portrait and landscape have different arrangements, with a compact left-hand bank for small landscape phones. Clear space between circles remains transparent to the ocean.

On desktop, touch controls disappear. A bottom reference strip lists mouse/WASD, E, Space, Q, F, R, L, Shift and Esc, including in immersive mode. The top mine display is now read-only; deploy with F instead of clicking that display. Control selection follows the browser's primary pointer capability, not screen width, so a narrow desktop window does not turn into a phone controller. A live pointer-capability change clears held input before switching surfaces.

Toasts and interaction prompts use the measured HUD/control geometry. System values and pressure warnings update from the same game state; decorative controls do not affect submarine handling, weapon damage, predator balance or save data. No extra runtime assets, fonts or third-party packages are required.

### Controls

| Action | PC | Phone / tablet |
|---|---|---|
| Pilot | Hold left click over water, move the cursor; or WASD / arrow keys | Drag right-hand analogue joystick |
| Boost | Hold Space while piloting | Hold left-side BOOST while steering or cruising |
| Deploy sea mine | F | Tap MINE while steering or boosting |
| Sonar | Q | SONAR |
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

### Predators and sea mines

All three predator tiers are faster. Each now has persistent health for the current dive, with tier-coloured health bars. Bars obey the flashlight/darkness mask and can be read in temporary sonar echoes; a hidden enemy does not gain a free floating health marker. Dead predators are removed from movement, attacks, radar and in-flight sonar contacts. They do not respawn during the same dive, including after a visit to the dock; starting a new expedition regenerates the world.

| Tier | Predator | Count per trench | Health | Chase speed (world units/s) | Attack damage | Region |
|---|---|---:|---:|---:|---:|---|
| 1 | Drifter | 46 | 100 | 96 | 13 | Throughout the trench |
| 2 | Abyss stalker | 11 | 200 | 158 | 27 | Spawns below 400 m |
| 3 | Crimson reaper | 5 | 400 | 245.28 | 42 | Below 800 m only |

The reaper's chase speed is calculated from the same constant as **Mk IV magnetic thrusters**: `146 * (1 + 4 * 0.17) = 245.28`. In a settled, straight open-water chase, ordinary Mk IV thrust cannot increase the gap. Boost can, and mines can kill pursuers. The existing finite pursuit leashes and reaper's 800 m boundary still apply; speed equality does not remove those escape rules.

At the surface, press **E / USE** to dock, then buy **SEA MINE WARHEADS Mk I** for **100 credits**. The standard Mk I rack already has two slots. Mines are unlocked only after the warhead purchase. Warhead power and ammo capacity are separate upgrade trees:

| Mark | Mine damage | Warhead purchase price | Ammo capacity | Rack upgrade price |
|---|---:|---:|---:|---:|
| I | 60 | 100 CR | 2 | Standard equipment |
| II | 110 | 180 CR | 4 | 90 CR |
| III | 180 | 320 CR | 6 | 160 CR |
| IV | 240 | 520 CR | 8 | 280 CR |

Prices are incremental purchases, not cumulative totals. Buying one tree does not advance the other. With full health, a reaper takes seven Mk I, four Mk II, three Mk III or two Mk IV direct mine blasts. A Mk IV mine can destroy a full-health drifter or stalker in one hit. One blast can damage multiple predators within range.

Press **F** once or tap the left-side circular **MINE** button to leave one mine behind the sub. It arms after **0.65 seconds**, triggers when a predator comes within **52 world units**, and deals full warhead damage to predators within **108 world units** of the blast. It does not harm your submarine, collect salvage, destroy terrain or set off other mines. The launcher cycles for **1.1 seconds**; holding F does not auto-fire. A clear stern position is required, and rejected shots do not consume ammo. Dock safety prevents deployment in the station's immediate area.

Planted mines stay in place until triggered or the expedition ends. Their damage is fixed when planted, so a subsequent dock upgrade cannot upgrade mines already in the water. Surviving predators keep the damage they have taken; health does not regenerate. Kills do not currently award bonus currency or XP.

**Ammo refills for free only at the surface dock**, including a new vessel's launch from the dock. Time, air caches, repairs, sonar, capacitor recharge and opening/resuming menus never refill it. Dock purchases happen while docked and resupply the rack. A current dive, deployed mines, current ammo and enemy health are not saved across a reload.

On phones, all eight action buttons are circular and stay at the bottom left. USE is the largest; BOOST is second largest. SONAR, MINE, REPAIR, SILENT, LIGHTS and CRUISE form the smaller bank. The analogue joystick stays on the right. Multi-touch steering, boost, mine deployment and salvage remain independent.

### Pressure and progress

Vessel name, class and safe pressure limit now occupy reference cards at the top, for example **NEREID | MK II | PRESSURE LIMIT 530 m**. There is no floating vessel nameplate. The pressure card remains readable in the dark and turns red beyond its rating. MK II is the vessel model, not a replacement for the independently upgraded hull or thrusters.

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
python tests/v080_cockpit_test.py
python tests/v070_mines_test.py
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

See **VERIFICATION-v0.8.0.md** for actual results and limitations. Test-only fixture mutation APIs are available only when explicitly using `?testmode=1` or `window.ABYSS_TEST_MODE = true`.
