# Verification: The Abyss Below v0.7.0

Release date: 27 October 2026. Built by editing the supplied v0.6.0 complete source, not by replacing it with a new game.

## Outcome

**Nine Chromium browser test suites passed**, plus JavaScript syntax checks and the Node mocked service-worker lifecycle test. The checks use the runtime source shipped in these ZIPs. All checked browser sessions reported no uncaught page errors.

**Blocked, not passed:** the real HTTP/offline service-worker integration test. Navigation to the local test server failed with `net::ERR_BLOCKED_BY_ADMINISTRATOR`. The mocked worker test checks install/activate/cache logic, including cleanup of the preceding v0.6.0 shell; it does not prove actual offline installation or live updating.

**Not tested:** actual Android or iOS hardware, phone GPU/battery performance, long-session endurance and complete-campaign combat/economy balance. Desktop Chromium mobile emulation is not a substitute for physical-device testing. No repository push or public deployment was performed.

## New checks exercised

- Old v0.6.0-style saves migrate with credits, existing upgrades and secured recorders preserved. Missing ordnance values become unfitted warheads and a standard two-slot rack. Invalid new-field values fall back safely. The free starter rack does not falsely mark a brand-new save as progressed.
- Predator health is 100 / 200 / 400; chase speeds are 96 / 158 / 245.28. Reaper speed equals the shared Mk IV normal-engine calculation exactly. A settled straight chase holds its gap under ordinary thrust; boosting opens more than 200 world units in the tested 1.5-second interval. Existing rarity, depth floors, attacks and leashes remain passing.
- Actual dock UI purchases verify independent power/rack levels, all incremental prices, capacities 2 / 4 / 6 / 8, damage 60 / 110 / 180 / 240, free dock resupply, max-level guards and persistence into a new page session.
- Mine deployment rejects unfitted systems, the station's safety zone, an obstructed stern, a cycling launcher and empty ammo without unintended ammo loss. Successful placement is astern and has the correct tier, damage and arming time.
- Mines do not trigger before 0.65 seconds. Tests exercise proximity activation, swept cross-frame contact, every one of the twelve warhead-versus-predator health combinations, single-application damage, multi-target blasts, radius exclusion, no submarine damage and removal of killed hunters.
- Real F key repeat does not auto-fire after cooldown. Pause freezes mine timers; menu suspension/resume retains ammo. Elapsed time, a supply-cache pickup, repair input, sonar and boost do not refill ammo; docking does.
- Dead contacts cannot reappear when an existing sonar wave reaches them. Pixel tests keep damaged-enemy bars, mine lights and explosions hidden by full blackout; sonar reveals health and mine outlines on arrival, then expires back to black.
- True Chromium multi-touch dispatch tests exercise steering, boost, mine deployment and salvage at the same time at 390x844, 844x390 and 320x740. Hit-testing confirms button reachability and separate action/joystick areas. Pointer release does not fire a duplicate mine.

## Intentional regression-test updates

The station smoke test now expects eight upgrade trees rather than six. The landscape layout assertion now expects a wide, double-column USE button, instead of the old double-height button: this intentionally makes room for MINE while keeping USE larger than secondary actions. Existing gameplay assertions were retained. Historical service-worker test filenames remain, but their current-asset expectations now target v0.7.0.

## Executed suite output

### tests/v070_mines_test.py

```text
PASS: old-save migration, existing progression, 100/200/400 HP, faster tiers and exact Mk IV/reaper speed parity
PASS: settled Mk IV normal thrust cannot open the chase gap; boost gains over 200 world units
PASS: dock purchases, distinct damage/capacity upgrades, 2/4/6/8 racks, pricing, resupply and max-level guards
PASS: ordnance upgrades persist, new captains remain new, malformed new upgrade values are safely migrated
PASS: purchase/dock/blocked-stern guards, astern placement, arming delay, cooldown, proximity damage and no friendly fire
PASS: every warhead/predator health pairing, one damage application, kills and removal of dead hunters
PASS: area damage respects blast range and swept proximity catches fast cross-frame contacts
PASS: F repeat/empty guards, pause freezes mines, menu/resume retains ammo, no passive/cache/repair/sonar/boost refills, physical dock refills
PASS: dead sonar contacts stay gone, health bars/mines obey blackout, sonar reveals both on arrival
PASS: 390x844 actual four-touch steer + boost + mine + salvage; no duplicate shot; hit-tested layout
PASS: 844x390 actual four-touch steer + boost + mine + salvage; no duplicate shot; hit-tested layout
PASS: 320x740 actual four-touch steer + boost + mine + salvage; no duplicate shot; hit-tested layout
```

### tests/v060_mechanics_test.py

```text
PASS: 46/11/5 spawn rarity; reapers below 800m; speed/damage ordering; banked save and rated nameplate
PASS: 1.85x boost, 7 power/s, 4s charge, 1.5s delay, full recharge lock, release-to-rearm and powerless/idle guards
PASS: power upgrades reduce boost draw and accelerate recharge; boost cannot be silent
PASS: boosted maximum-engine submarine does not tunnel through a boulder
PASS: pause freezes charge and power and resume cannot leave boost held
PASS: real click-drag steering, bow aim, release outside canvas, pause, blur and HUD/touch separation
PASS: sonar reveals on arrival (not at cast), covers corners, reaches every object class, expires into black and enforces power/cooldown
PASS: sonar upgrades and 2560px desktop viewport coverage
PASS: reaper 42-damage hit, finite leash, 800m boundary and dynamic hull label
PASS: 390x844 three-finger joystick + boost + salvage, release cleanup and deep sonar rendering
PASS: 844x390 three-finger joystick + boost + salvage, release cleanup and deep sonar rendering
PASS: 320x740 three-finger joystick + boost + salvage, release cleanup and deep sonar rendering
```

### tests/v050_depth_lighting_test.py

```text
PASS: smooth fractional-depth fade; lamps-off world is opaque RGB(0,0,0) at 1,000-1,800 m
Rendered mean brightness: [(0, 38.708), (250, 19.221), (500, 9.99), (750, 3.364), (950, 0.02), (1000, 0), (1500, 0), (1800, 0)]
PASS: forward cone rotates in every direction; no pixels leak outside its footprint
PASS: depleted battery extinguishes the flashlight and updates its label
PASS: distant illuminated salvage renders; predator/recorder glow stays masked; intentional sonar echoes render; save retained
PASS: 390x844 DPR 2, lamp toggle, pause/resume and rotation resize
PASS: 844x390 DPR 2, lamp toggle, pause/resume and rotation resize
PASS: 360x780 DPR 1, lamp toggle, pause/resume and rotation resize
PASS: 413x823 DPR 1.25, lamp toggle, pause/resume and rotation resize
```

### tests/v040_menu_visual_test.py

```text
PASS: mobile title, pause/resume, menu suspend/continue, briefing, quit and discard
PASS: New Game cancel preserves banked progress; confirm clears save and launches new run
```

### tests/v030_deep_trench_test.py

```text
PASS: save migration 3/6, six recorder depths, rare-tier spawn floor and rarity
PASS: seven hull levels 130m to 1,530m; rated hull withstands 1,500m
PASS: unupgraded hull cannot ignore crushing depth pressure
PASS: apex attacks for 27 versus common 13 damage
PASS: six-recorders mission and mobile controls render correctly
```

### tests/v022_behaviour_test.py

```text
PASS mobile layout 360 780 USE 90 58 JOYSTICK 112
PASS: simultaneous 2-finger steering and salvage, predator leash, narrow gap, solid rock
PASS mobile layout 390 844 USE 99 62 JOYSTICK 122
PASS mobile layout 844 390 USE 90 44 JOYSTICK 100
```

### tests/joystick_pwa_test.py

```text
PASS: joystick drag, coast-to-stop, cruise, heading change, save key compatibility, icon assets and zero page errors
```

### tests/smoke_test.py

```text
PASS: desktop controls, station, sonar, movement, help, and mobile touch controls
```

### tests/mobile_ui_v022_test.py

```text
OK (360, 780) joystick 112 button 90 58 expanded 780
OK (390, 844) joystick 122 button 99 62 expanded 844
OK (412, 915) joystick 122 button 99 62 expanded 915
OK (844, 390) joystick 100 button 90 44 expanded 390
```

### tests/v060_service_worker_test.mjs

```text
PASS: version-matched shell files, install/activate, scoped cache cleanup, network-first caching, offline fallback, method/origin guards (mocked worker lifecycle)
```

## Runtime fingerprints

SHA-256 of the shipped runtime files:

```text
fdfc56b2694c66856a9b89ab05e0031d12794c6ffc2bec2aedc1b7aaf8e90128  game.js
02eac7e1e4198634163dc303853a24a5a33f64cab4ccee281e37653505ae12d8  index.html
18bdee8ee1552049b705a790a9e550b536eb3d1aef94a0948e88a82e6c9651aa  styles.css
349ab4ab1b36fa4a704dcb5d90b9a948b5d62ac56f40b01940e0bec90fe145c0  service-worker.js
02ae4faeec5656f3d0067f32396e1fb87058c75ad7cfe4fc5982964d236083e4  manifest.webmanifest
```

## Screenshot provenance

The screenshots under `screenshots/v0.7.0/` are actual Chromium captures of controlled in-game test fixtures. Contacts are deliberately placed nearby to demonstrate mine markers, predator health and sonar visibility. They are not concept images and do not imply that normally rare predators spawn at that frequency. Historical v0.5.0 and v0.6.0 screenshots are retained unchanged from the supplied source package.
