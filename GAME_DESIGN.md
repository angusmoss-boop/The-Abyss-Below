# THE ABYSS BELOW: GAME DESIGN

**Design promise:** The player is a lone submarine captain pushing deeper into an increasingly hostile trench. Every useful action should have a cost, every dive should reward preparation, and returning safely to the surface should feel like an achievement.

## Core loop

1. **Prepare at surface:** choose upgrades and review the target signal.
2. **Dive:** navigate the rock trench using pilot controls, lamps, sonar and passive radar.
3. **Make trade-offs:** sonar reveals useful items but consumes battery and can attract predators; moving quietly is slower but safer; dive too deep and the hull takes continuous pressure damage.
4. **Salvage:** recover scrap, crystals, air caches and story recorders.
5. **Survive the ascent:** collected salvage and mission recorders are at risk until delivered.
6. **Bank and improve:** dock to convert salvage to credits and XP, refill systems and purchase upgrades.
7. **Push deeper:** reach the next wreck using better equipment and smarter tactics.

## Current play areas · v0.5.0

| Zone | Depth range (approx) | Milestone |
|---|---:|---|
| The Shallows | 0–179 m | Recorder 1 at 75 m, base hull rating 130 m |
| Midnight Rift | 180–399 m | Recorder 2 at 260 m (hull MK-I, 330 m rating) |
| Glassbone Trench | 400–649 m | Purple abyss stalkers appear; recorder 3 at 470 m (MK-II, 530 m) |
| The Hollow | 650–924 m | Recorder 4 at 725 m (MK-III, 730 m) |
| Drowned Cathedral | 925–1,209 m | Recorder 5 at 1,100 m (MK-V, 1,130 m) |
| The Pale Descent | 1,210–1,509 m | Recorder 6 at 1,500 m (MK-VII, 1,530 m) |
| The Last Dark | 1,510–1,800 m | Optional uncharted trench below the final recorder |

The trench extends to ~1,800 m, while the maximum permanently safe depth is 1,530 m. The lowest region is intentionally high risk. World layout changes on each dive; wreck depths are fixed, salvage positions vary. A lane is preserved by rock placement.

### Predator tiers

| Characteristic | Drifter (common) | Abyss stalker (rare) |
|---|---|---|
| Colour | Slate blue, red eye | Purple/pink glow and fins |
| Chase speed | 80 | 134 |
| Attack damage | 13 | 27 |
| Chase disengagement distance | 345 world units | 505 world units |
| Detection | Normal | 1.52× normal sensitivity; longer detection radius |
| Spawn region | Throughout trench | Strictly below 400 m |

Neither creature is meant to be able to pursue the submarine forever. Noise, lights and sonar still matter in both cases.

### Reinforced hull depth ladder

Each reinforced-hull upgrade adds 200 m to the rating and 28 maximum hull HP. Seven upgrades produce a 1,530 m rating and 296 maximum HP. Pressure damage grows sharply if depth exceeds this rating, preventing an unupgraded run from trivially skipping to the final recorder. Recover salvage, bank credits and return to the surface for upgrades. Existing saved hull levels are preserved and use the new progression formula automatically.

**Success:** recover all six recorders and deliver them to the surface station.

**Failure:** reach zero hull integrity or suffocate. Permanent credits, upgrades, XP and already delivered recorders remain saved; unbanked cargo is lost.

## Intended next milestones

### Future: Discovery
- Signal triangulation, discovered map and fog of war.
- Wreck interiors as short scripted interactions.
- Additional salvage types, journal entries and four distinct creatures.
- More responsive touch UI and accessibility options.

**Acceptance:** maps and signals track discoveries, at least 3 unique wreck event outcomes, no game-stopping softlocks.

### v0.4: Consequences
- Modular damage to power, sonar, lights and propulsion.
- Compartment repair tasks and resource-driven emergency decisions.
- Thermal vents, currents, magnetic anomalies and a pressure-zone system.
- Stealth upgrades and creature counterplay.

**Acceptance:** at least three distinct ways to survive a hostile encounter; upgrades alter survivability in verified tests.

### v0.5: Living abyss
- Region-specific world generation and environmental storytelling.
- Side objectives, signal anomalies, abandoned installations and meaningful missions.
- Unlockable ship hulls with different operating profiles.
- Expanded progression and endgame story.

**Acceptance:** a complete beginning, middle and ending can be finished without external instructions, with saves surviving upgrades.

## Development rules

- Keep the project playable at the end of each version.
- Preserve previous save compatibility when changing data schema, or clearly document a reset when unavoidable.
- Add a reproducible test for every critical mechanic or reported regression.
- Prioritise feel and readability before adding more features.
- No paid dependencies or backend until a clear game feature needs them.

## v0.4.0 · UX navigation rules

- Pause is a blocking overlay. All motion/actions freeze until Resume.
- MENU hides the cockpit and suspends the in-memory run; CONTINUE EXPEDITION restores it. It does not persist across app closure.
- QUIT requires an explicit confirmation. Unbanked inventory is discarded; banked credits, upgrades, recorder progress and rank remain.
- NEW GAME requires explicit confirmation and overwrites local saved progress with fresh defaults, then launches from surface.
- Vessel sprite refit is visual only; engine, world collision capsule and upgrade balance are unchanged.

## v0.5.0 · Depth and visibility

- Fractional depth: `max(0, (player.y - 120) / 10)` metres.
- Ambient fraction: `(1 - clamp(depth / 1000, 0, 1)) ** 1.35`. Representative values: surface 100%, 250 m 67.8%, 500 m 39.2%, 750 m 15.4%, 900 m 4.5%, 1,000 m and below 0%.
- One darkness pass covers all world rendering. The world is fully black with lamps off at 1,000 m or deeper. Instrument overlays remain outside that pass.
- A powered, directional cone starts 30 world units ahead of the vessel centre, reaches 320 world units further, and uses a 0.40-radian half-angle with feathered edges. The beam rotates with the ship's actual facing, not a screen-fixed direction.
- The same pre-baked alpha texture shapes the beam and removes darkness. No omnidirectional proximity light or glowing-item exceptions.
- Sonar still detects contacts and attracts predators. It updates the separate radar, but does not remove the darkness mask or reveal the surrounding world outside the flashlight.
- Lamp selection is retained at zero power, but no light is produced until power is restored. Docking retains its existing full-refill behaviour.
- This is a 2D cone visibility model, not terrain-occluded ray tracing. Real-device performance and deeper-trench difficulty still require playtesting.
