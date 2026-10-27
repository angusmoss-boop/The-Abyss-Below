# The Abyss Below: implemented design

## Current release: v0.9.0, Beyond the Beam

The core loop is dive, locate salvage and lost recorders, manage oxygen/power/hull, evade predators, return to bank resources and upgrade. Permanent progress is stored locally; active dives are not persisted across a page reload.

## World and progression

The trench extends to 1,800 m, with fixed recorder depths of 75, 260, 470, 725, 1,100 and 1,500 m. Seven sectors change the depth readout. A saved seed fixes terrain across dives. The cross-section is exactly 3x the old width; 1,440 boulder placement candidates, three protected lanes and open wreck clearances retain routes. Dock cycles regenerate populations without changing rocks. Each field has 180 scrap, 24 crystals, 30 caches and unsecured recorders; crystals begin below 180 m. Eight shallow starter scraps and two at each wreck protect early progression. More vents/dust use the full horizontal range. Spatial culling avoids drawing offscreen objects.

Hull begins at 100 HP and a 130 m safe depth. Seven upgrades add 28 HP and 200 m each, ending at 296 HP and a 1,530 m limit. Going deeper than the current rating causes escalating continuous pressure damage. The live rating appears in a top reference card alongside the NEREID name and MK II model. The floating vessel nameplate is removed.

## Steering, boost and collisions

Desktop mouse steering uses a held left-button screen-space target, transformed with the current camera position each simulation frame. A 12-unit neutral zone and 75-unit throttle ramp avoid jitter near the cursor. Mouse aim controls facing directly, while velocity eases towards the target. Mouse and joystick inputs take priority over keyboard movement; keyboard movement takes priority over cruise. Mouse steering cancels latched cruise.

Boost uses a capacitor separate from ship energy. Constants: speed multiplier 1.85, charge 100, drain 25 per second, recharge delay 1.5 seconds, recharge 12.5 per second, extra energy cost 7 per second. Full depletion locks until 100 charge; held input must also be released before restarting. Charge recovery does not produce battery energy. Battery level b gives a power multiplier of 1/(1+0.12b) and a recharge multiplier of 1+0.10b. Boost overrides silent running and has a minimum target noise of 82, even with quiet-drive upgrades.

The existing three-circle capsule and polygon edge solver remain authoritative. Movement is subdivided into steps no greater than approximately seven units before collision resolution, including boosted movement. Decorative thruster effects do not change the collision footprint.

## Darkness and sonar

Ambient lighting is continuous in fractional depth and exactly zero at and below 1,000 m. A cached, soft-edged cone texture controls lamp scatter and the final darkness mask. No per-frame pixel loops are used.

Rendering order: world objects and vessel, darkness mask, temporary sonar echoes, then instrument annotations. Sonar never modifies ambient light or permanently unmasks scenery. Without a powered lamp or a current sonar echo, the world remains black below 1,000 m; top HUD instruments remain visible, but no label follows the submarine through the darkness.

A ping snapshots its origin and initial contacts. Its radius reaches every corner of the current viewport plus margin and upgraded reach. The front advances at 520 world units per second. Contact crossing considers previous and current distances so moving predators cannot be revealed instantly at launch. Each hit receives its own expiration time. Static outlines, coloured salvage glyphs and tier-labelled creature outlines are used instead of illuminating the whole scene. Wall geometry is sampled into finite-lived outline segments. Enemy reveal timers are distinct from awareness timers.

Base ping: 12 battery, 5.5-second cooldown, 4.5-second echo persistence. Sonar upgrades: -2 cost, -0.35 seconds cooldown, +0.45 seconds echo life and +55 units nominal reach per level. Cooldown has a floor of the current wave's travel time plus 0.4 seconds.

## Predator parameters

| Parameter | Drifter | Abyss stalker | Crimson reaper |
|---|---:|---:|---:|
| Tier | 1 | 2 | 3 |
| World count | 138 | 33 | 15 |
| Max health | 100 | 200 | 400 |
| Chase speed | 96 | 158 | 245.28 |
| Patrol speed | 25 | 36 | 46 |
| Detection cap | 245 | 370 | 440 |
| Awareness multiplier | 1 | 1.52 | 1.85 |
| Pursuit leash | 345 | 505 | 610 |
| Attack damage | 13 | 27 | 42 |
| Attack interval, seconds | 1.7 | 1.35 | 1.15 |
| Attack reach | 35 | 43 | 48 |

Stalkers spawn below 400 m. Reapers spawn at homes beginning around 810 m, with 15 spread through deeper water and three lateral bands. Reaper movement is restricted to at least 800 m so chasing cannot pull them into the upper trench. Every tier loses interest beyond a finite leash. Lights, noise and sonar affect awareness.

## Mine ordnance and health

The reaper chase speed and Mk IV engine speed share `normalSpeedAt(THRUST.maxMark)`, avoiding independent balance values drifting apart. Damage/awareness, spawn counts, pursuit leashes and depth restrictions are otherwise unchanged. Health is initialised from tier data for every generated predator. Surviving enemies retain damage until physical docking resets the population; dead enemies are removed before attack resolution and are marked dead for any existing sonar contact references.

Warhead marks I-IV deal 60/110/180/240 damage and cost 100/180/320/520 incremental credits. Ammo rack marks I-IV hold 2/4/6/8 mines; the Mk I rack is standard equipment, with later marks costing 90/160/280 credits. Warheads start unfitted. Buying Mk I unlocks the weapon and fills the standard rack at the dock. Capacity and power are independent persistent upgrade fields.

Deployment is a single F press or mobile MINE pointerdown. The top ammo display is read-only. Repeated keydown and the synthetic pointer click do not fire additional rounds. Running, unpaused play; fitted warheads; ammo; cooldown; station exclusion; and an unobstructed stern are all required. Placement checks the actual rock polygons and trench bounds, trying 54, 46 and 38 units astern before refusing without consuming ammo. Mine markers have a fixed position and retain the warhead tier/damage at deployment.

Arming takes 0.65 seconds; launcher cooldown is 1.1 seconds. Proximity is swept across the armed portion of each predator's simulation frame, with a 52-unit trigger radius. Blast damage is applied once to each live predator within 108 units at the detected contact time. Submarine, items, rocks and other mines are unaffected. A surviving damaged hunter becomes alerted; a killed one cannot bite later in the same frame. Mines have no time-based expiry and persist during the current expedition until a dock population reset clears them. Blast graphics expire after 0.65 seconds.

Health bars, physical mine art and blast particles are drawn beneath the darkness mask. Sonar scans include mines, render their temporary outlines, and show health bars with revealed predators. Dead contacts and detonated mine references cannot render again. Deployed mines appear on the instrument radar, but they do not illuminate the ocean.

Resupply only occurs on a fresh surface launch, docking, or a purchase while physically docked. Time, menus, ordinary supply caches, repairs and other power systems have no ammo-refill path. Pause freezes all simulation timers. Mines are deliberately finite trip resources, not a regenerating attack.

## Glass cockpit / input surfaces

The DOM HUD is the sole source of vessel identity and systems. The first row contains NEREID, MK II and the dynamic hull pressure limit plus navigation controls. The next rows expose depth, hull, oxygen, power, noise, sonar cooldown/readiness, boost charge and mine rounds/mark. Sector and hazard state remain visible in a slim contextual row. Card alerts include colour plus numeric/text state; there is no reliance on colour alone. The MK II vessel model does not represent an upgrade tier.

Mobile actions use eight circular hit areas. Portrait diameters are USE 86 px, BOOST 70 px, secondaries 50 px; narrow phones use 80 / 64 / 46 px. Low landscape uses 72 / 60 / 44 px. Six secondaries are SONAR, MINE, REPAIR, SILENT, LIGHTS and CRUISE. All remain in the left half at tested sizes; the right contains only a 104-120 px analogue joystick (108 px in low landscape). The primary and secondary rows never overlap. Independent pointer capture for use, boost and helm remains unchanged.

The browser primary `(pointer: coarse)` media query selects the touch surface. Mouse-first desktops show only a non-interactive bottom keybind legend, regardless of window width; touch-first tablets retain controls even above 850 px. Switching primary pointer capability clears old held inputs before layout changes. The same instrument DOM is retained across normal/focus modes, avoiding duplicate IDs and stale hidden readings.

Boost and sonar buttons carry SVG progress rings. Sonar uses the actual wave cooldown duration, including large screens, rather than an assumed constant. Pressed, active, cooling, unavailable and context-available states are visible. Pause and expand remain accessible above the HUD; briefing is also available through the existing menu/console. Safe-area insets protect edge controls, reduced-motion preferences remove ornamental transitions, and keyboard focus remains visible.

A ResizeObserver updates CSS offsets only when HUD/control geometry changes, placing notifications below the HUD and prompts above controls. Very narrow landscape phones place the prompt in the clear central bottom area. The world renderer no longer draws the vessel label after the darkness mask. Controls, collision footprint, thruster/boost arithmetic, weapons and predator AI speeds remain unchanged. Lamp draw and terrain/population counts change as specified for v0.9.0.

## Save and interface contracts

Keep the `the-abyss-below-v01` save key. Current fields remain credits, XP, best depth, secured recorder IDs and upgrade levels. The new `minePower` (0-4, default 0) and `mineCapacity` (1-4, default 1) fields migrate independently without replacing banked progress. Invalid new-field values fall back safely. The free starter rack does not count as earned progress on the title screen. The new flashlight mark (1-4, default 1) migrates independently. Population depletion is separate from active-dive data: `the-abyss-below-field-v1` stores schema 1, terrain seed, dock cycle, collected ordinary-loot IDs and damaged/dead predator health. Enemy positions, boost, sonar, planted mines, ammo and cargo remain runtime-only. Relaunch restores surviving hunters at their homes, retaining health; mission recorders lost before banking return to their fixed positions. Secured recorder IDs remain authoritative. New Game resets both saves.

Pause, modal dialogs, title-menu suspension, focus loss and visibility loss clear held helm/boost/use input. While paused, boost charge, cooldowns and other simulation timers do not advance. Resume never synthesises a still-held action. New Game is explicitly confirmed; Quit preserves banked progress but abandons current cargo.

## Uncommitted future ideas

Discovered maps, wreck interiors, currents, modular system damage, environmental storytelling and additional mission types remain ideas, not implemented features or promised version numbers.

## v0.9 camera, lamp and field contracts

The primary coarse pointer selects a 0.70 world zoom. `viewport.w/h` are visible world extents; `screenW/screenH` are CSS pixels. Backing buffers remain CSS dimensions multiplied by device-pixel ratio, with a `dpr * zoom` drawing transform. This increases world coverage without scaling HTML controls or allocating enlarged canvas buffers. Mouse conversion and sonar coverage use the world extents. The objective arrow is drawn separately in fixed CSS coordinates. Resize preserves the follow anchor; darkness uses the same world transform and copies backing pixels 1:1.

Lamp arrays use marks I-IV: length 260/360/480/620 units, half angles 0.29/0.38/0.48/0.60 radians, and power draw 0.04/0.055/0.075/0.10 per second. Incremental dock prices are 75/150/300 for II/III/IV; I is standard. One cached feathered texture per used mark drives light scatter and darkness subtraction. Visibility intersection uses the same mark dimensions. No per-frame pixel generation. Battery efficiency divides lamp consumption by `1 + 0.12 * batteryLevel`. Off/empty lamps and paused simulation do not consume lamp energy.

Terrain PRNG uses the saved seed. Population PRNG uses seed XOR a mixed dock-cycle number, with stable loot/enemy IDs independent of secured-recorders count. Collected loot and mine damage synchronously write small depletion snapshots, including zero health for deaths. A physical dock checks proximity and running/unpaused state before banking. One reset per visit is latched until departure beyond 145 units. Purchases and reopened dock dialogs do not reset it. On reset, ordinary populations, sonar contacts, blasts and planted mines are replaced; terrain and banked mission progress remain. Invalid/absent local storage falls back safely, but persistence across reloads cannot be promised with blocked/cleared storage.

## Acceptance and remaining uncertainty

See VERIFICATION-v0.9.0.md for the executed checks, exact limitations and regression results. New checks cover world-only zoom and input geometry; Mk I migration and real dock purchases; all lamp cones at multiple headings and screen sizes; full blackout; exact power draw and battery efficiency; many seeded wider worlds, spawn/depth/loot constraints and item clearance; death, partial damage and collected-loot persistence across menus/relaunch/reconstructed reload; dock-only replenishment; stable terrain; mission recorder handling; and new-game reset. Existing mouse, multitouch, collision, mines, sonar, menu and layout regressions remain in the package. Physical Android/iOS performance and full-campaign economy remain unverified.
