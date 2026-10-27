# The Abyss Below: implemented design

## Current release: v0.6.0, Silent Echoes

The core loop is dive, locate salvage and lost recorders, manage oxygen/power/hull, evade predators, return to bank resources and upgrade. Permanent progress is stored locally; active dives are not persisted across a page reload.

## World and progression

The trench extends to 1,800 m, with fixed recorder depths of 75, 260, 470, 725, 1,100 and 1,500 m. Seven sectors change the depth readout. Rocks and salvage vary per dive; protected routes and open wreck lanes reduce blocked-objective risk.

Hull begins at 100 HP and a 130 m safe depth. Seven upgrades add 28 HP and 200 m each, ending at 296 HP and a 1,530 m limit. Going deeper than the current rating causes escalating continuous pressure damage. The live rating appears alongside the NEREID name above the submarine.

## Steering, boost and collisions

Desktop mouse steering uses a held left-button screen-space target, transformed with the current camera position each simulation frame. A 12-unit neutral zone and 75-unit throttle ramp avoid jitter near the cursor. Mouse aim controls facing directly, while velocity eases towards the target. Mouse and joystick inputs take priority over keyboard movement; keyboard movement takes priority over cruise. Mouse steering cancels latched cruise.

Boost uses a capacitor separate from ship energy. Constants: speed multiplier 1.85, charge 100, drain 25 per second, recharge delay 1.5 seconds, recharge 12.5 per second, extra energy cost 7 per second. Full depletion locks until 100 charge; held input must also be released before restarting. Charge recovery does not produce battery energy. Battery level b gives a power multiplier of 1/(1+0.12b) and a recharge multiplier of 1+0.10b. Boost overrides silent running and has a minimum target noise of 82, even with quiet-drive upgrades.

The existing three-circle capsule and polygon edge solver remain authoritative. Movement is subdivided into steps no greater than approximately seven units before collision resolution, including boosted movement. Decorative thruster effects do not change the collision footprint.

## Darkness and sonar

Ambient lighting is continuous in fractional depth and exactly zero at and below 1,000 m. A cached, soft-edged cone texture controls lamp scatter and the final darkness mask. No per-frame pixel loops are used.

Rendering order: world objects and vessel, darkness mask, temporary sonar echoes, then instrument annotations. Sonar never modifies ambient light or permanently unmasks scenery. Without a powered lamp or a current sonar echo, the world remains black below 1,000 m; HUD instruments and the ship nameplate remain visible.

A ping snapshots its origin and initial contacts. Its radius reaches every corner of the current viewport plus margin and upgraded reach. The front advances at 520 world units per second. Contact crossing considers previous and current distances so moving predators cannot be revealed instantly at launch. Each hit receives its own expiration time. Static outlines, coloured salvage glyphs and tier-labelled creature outlines are used instead of illuminating the whole scene. Wall geometry is sampled into finite-lived outline segments. Enemy reveal timers are distinct from awareness timers.

Base ping: 12 battery, 5.5-second cooldown, 4.5-second echo persistence. Sonar upgrades: -2 cost, -0.35 seconds cooldown, +0.45 seconds echo life and +55 units nominal reach per level. Cooldown has a floor of the current wave's travel time plus 0.4 seconds.

## Predator parameters

| Parameter | Drifter | Abyss stalker | Crimson reaper |
|---|---:|---:|---:|
| Tier | 1 | 2 | 3 |
| World count | 46 | 11 | 5 |
| Chase speed | 80 | 134 | 196 |
| Patrol speed | 21 | 31 | 39 |
| Detection cap | 245 | 370 | 440 |
| Awareness multiplier | 1 | 1.52 | 1.85 |
| Pursuit leash | 345 | 505 | 610 |
| Attack damage | 13 | 27 | 42 |
| Attack interval, seconds | 1.7 | 1.35 | 1.15 |
| Attack reach | 35 | 43 | 48 |

Stalkers spawn below 400 m. Reapers spawn at homes beginning around 810 m, with only five spread through deeper water. Reaper movement is restricted to at least 800 m so chasing cannot pull them into the upper trench. Every tier loses interest beyond a finite leash. Lights, noise and sonar affect awareness.

## Save and interface contracts

Keep the `the-abyss-below-v01` save key. Current fields remain credits, XP, best depth, secured recorder IDs and upgrade levels. Boost, active sonar, enemy positions and current cargo are runtime-only, just like the existing active dive.

Pause, modal dialogs, title-menu suspension, focus loss and visibility loss clear held helm/boost/use input. While paused, boost charge, cooldowns and other simulation timers do not advance. Resume never synthesises a still-held action. New Game is explicitly confirmed; Quit preserves banked progress but abandons current cargo.

## Uncommitted future ideas

Discovered maps, wreck interiors, currents, modular system damage, environmental storytelling and additional mission types remain ideas, not implemented features or promised version numbers.

## Acceptance and remaining uncertainty

Automated tests exercise mouse capture, touch input, boost arithmetic and lockout, collision at boosted speed, sonar arrival/expiry and rendered darkness, save compatibility, menu flows, upgrade progression and creature parameters. Real-device Android installation/performance, mobile ergonomics over a long session and whole-campaign economy/difficulty remain manual playtest work. The local real-HTTP offline integration test is blocked in this execution environment; a mocked worker-lifecycle test covers cache logic separately.
