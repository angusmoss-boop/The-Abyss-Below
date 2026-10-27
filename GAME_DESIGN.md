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

## Current play areas

| Zone | Approximate depth | Main purpose |
|---|---:|---|
| The Shallows | 0–95 m | Learn the controls, gather resources, find recorder 1. |
| Midnight Rift | 95–190 m | Predator avoidance and operating-depth decisions. |
| Glassbone Trench | 190–310 m | Increase the pressure on upgraded systems. |
| The Hollow | 310+ m | Recover the final recorder, then escape. |

The rock and salvage layout changes with every new dive. The key story targets retain a predictable depth, which makes them feasible to find and test.

## Current success / failure

**Success:** return to the surface station with all three recorders delivered.

**Failure:** reach zero hull integrity or suffocate. The next submarine inherits the player's banked credits, upgrades, XP and secured recorders, but not the lost cargo.

## Intended next milestones

### v0.2: Discovery
- Signal triangulation, discovered map and fog of war.
- Wreck interiors as short scripted interactions.
- Additional salvage types, journal entries and four distinct creatures.
- More responsive touch UI and accessibility options.

**Acceptance:** maps and signals track discoveries, at least 3 unique wreck event outcomes, no game-stopping softlocks.

### v0.3: Consequences
- Modular damage to power, sonar, lights and propulsion.
- Compartment repair tasks and resource-driven emergency decisions.
- Thermal vents, currents, magnetic anomalies and a pressure-zone system.
- Stealth upgrades and creature counterplay.

**Acceptance:** at least three distinct ways to survive a hostile encounter; upgrades alter survivability in verified tests.

### v0.4: Living abyss
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
