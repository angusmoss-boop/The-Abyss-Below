# Verification: The Abyss Below v0.6.0

Release date: 27 October 2026. Built from the supplied v0.5.0 complete package.

## Outcome

**Eight Chromium browser suites passed**, plus JavaScript syntax checks and a Node mocked service-worker lifecycle test. These results cover the final v0.6.0 runtime files in the accompanying ZIPs.

**Not verified:** real Android device installation, phone GPU performance, long-session ergonomics and complete-campaign balance. The real HTTP/offline integration test could not load its local server because the execution environment returned `net::ERR_BLOCKED_BY_ADMINISTRATOR`. This is recorded as blocked, not passed. The mocked worker test is not equivalent to a real offline PWA test.

No repository push or public deployment was performed. The update ZIP must still be applied to the existing repository.

## New mechanics exercised

- Real mouse press/drag, directional bow aim, release outside canvas, pause and blur cleanup; UI and touch events do not accidentally engage desktop steering.
- Fixed-timestep boost speed ratio and exact energy/charge use; delay and recovery, full depletion lockout, release-to-rearm, low-power and idle protection, noise override and battery upgrade effects.
- Existing polygon collision solver at maximum engine upgrade plus boost, confirming a solid boulder cannot be crossed by tunnelling in the tested scenario.
- Real Chromium multi-touch in 390x844, 844x390 and 320x740 layouts: independent joystick, boost and USE pointers; simultaneous salvage, hit-testing and release cleanup.
- Sonar non-instant wave arrival, ordered contacts, viewport-corner coverage through 2560px desktop width, finite echo lifetimes, all supported object categories, energy/cooldown enforcement and upgrade effects.
- Pixel-level checks showing echoes above full darkness and a return to opaque black after expiration with lamps off. Flashlight-only leakage, fractional-depth fade and battery-off lighting checks also remain passing.
- Exact 46/11/5 predator counts, tier-3 spawn region, faster/stronger tier ordering, 42-damage hits, finite chase leash and 800m boundary.
- Existing saves, six-recorder progression, seven hull tiers, live pressure-label values and pause/title/quit/New Game flows.

## Intentional test change

The historical v0.5.0 lighting suite required sonar to remain hidden behind the darkness mask. The user's v0.6.0 request explicitly changes that behaviour. That assertion now requires visible sonar echoes, and the new suite additionally verifies that expired echoes leave the lights-off world black again. Ordinary glowing objects and enemy eyes still cannot bypass the mask.

The historical real-HTTP PWA test filename is retained, but its asset/version assertions now refer to v0.6.0.

## Executed suite output

### tests/smoke_test.py

```text
PASS: desktop controls, station, sonar, movement, help, and mobile touch controls
```

### tests/joystick_pwa_test.py

```text
PASS: joystick drag, coast-to-stop, cruise, heading change, save key compatibility, icon assets and zero page errors
```

### tests/mobile_ui_v022_test.py

```text
OK (360, 780) joystick 112 button 90 58 expanded 780
OK (390, 844) joystick 122 button 99 62 expanded 844
OK (412, 915) joystick 122 button 99 62 expanded 915
OK (844, 390) joystick 100 button 45 90 expanded 390
```

### tests/v022_behaviour_test.py

```text
PASS mobile layout 360 780 USE 90 58 JOYSTICK 112
PASS: simultaneous 2-finger steering and salvage, predator leash, narrow gap, solid rock
PASS mobile layout 390 844 USE 99 62 JOYSTICK 122
PASS mobile layout 844 390 USE 45 90 JOYSTICK 100
```

### tests/v030_deep_trench_test.py

```text
PASS: save migration 3/6, six recorder depths, rare-tier spawn floor and rarity
PASS: seven hull levels 130m to 1,530m; rated hull withstands 1,500m
PASS: unupgraded hull cannot ignore crushing depth pressure
PASS: apex attacks for 27 versus common 13 damage
PASS: six-recorders mission and mobile controls render correctly
```

### tests/v040_menu_visual_test.py

```text
PASS: mobile title, pause/resume, menu suspend/continue, briefing, quit and discard
PASS: New Game cancel preserves banked progress; confirm clears save and launches new run
```

### tests/v050_depth_lighting_test.py

```text
PASS: smooth fractional-depth fade; lamps-off world is opaque RGB(0,0,0) at 1,000-1,800 m
Rendered mean brightness: [(0, 38.705), (250, 19.221), (500, 9.99), (750, 3.364), (950, 0.02), (1000, 0), (1500, 0), (1800, 0)]
PASS: forward cone rotates in every direction; no pixels leak outside its footprint
PASS: depleted battery extinguishes the flashlight and updates its label
PASS: distant illuminated salvage renders; predator/recorder glow stays masked; intentional sonar echoes render; save retained
PASS: 390x844 DPR 2, lamp toggle, pause/resume and rotation resize
PASS: 844x390 DPR 2, lamp toggle, pause/resume and rotation resize
PASS: 360x780 DPR 1, lamp toggle, pause/resume and rotation resize
PASS: 413x823 DPR 1.25, lamp toggle, pause/resume and rotation resize
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

### tests/v060_service_worker_test.mjs

```text
PASS: version-matched shell files, install/activate, scoped cache cleanup, network-first caching, offline fallback, method/origin guards (mocked worker lifecycle)
```

## Runtime fingerprints

SHA-256 of shipped runtime files:

```text
080fb99703e26579c1c9718521237a6cc23e4a04c372d0df37968cdf792f5a97  game.js
14b09adfc3a3b83df7e870433aa671ac3627f05096381dd6e8fd1e6d5af5fdf6  index.html
c2d40b119d24a97e5e11d7c81d8291496ce80fe9df9400dd6d3506d08cbf35a4  styles.css
4f529ffaabb8e3ed444ad74ce535a0d4b3bb696e4c155080d42ed7068b1e28dd  service-worker.js
02ae4faeec5656f3d0067f32396e1fb87058c75ad7cfe4fc5982964d236083e4  manifest.webmanifest
```

## Screenshot provenance

The v0.6.0 previews are actual Chromium screenshots of controlled in-game test fixtures, not concept art. They deliberately place representative contacts close together to show sonar outlines and threat-tier differentiation. They do not establish the frequency of those encounters in a normal random dive.
