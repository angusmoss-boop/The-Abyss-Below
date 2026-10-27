# The Abyss Below

## v0.15.0: Wild Waters

A dependency-free Canvas/JavaScript submarine expedition game for desktop and mobile browsers/PWAs. This release adds persistent abandoned contact mines, four harmless schooling fish designs, pulsing vent fields, reactive seabed organisms and richer procedural audio.

## Install the update

Bank cargo and quit the current dive first. Extract the update ZIP into the existing v0.14.0 repository root, replacing the matching files. Publish `index.html`, `styles.css`, `audio.js`, `game.js`, `version-sync.js`, `service-worker.js`, `manifest.webmanifest` and `version.json` together; keep the icons. Do not upload the ZIP itself or nest the files inside another directory.

Reopen online after deployment and look for **v0.15.0 / Wild Waters**. CHECK AGAIN verifies published hashes, loaded code/styles/audio and the controlling worker. This package does not push to GitHub or deploy automatically. Keep the same host/path and browser profile; do not clear site data, uninstall or start New Game to update.

## Wild Waters

* Rusted contact mines sway on tethers, damage predators and the submarine, and remain destroyed permanently. Sonar and the survey chart reveal discovered hazards. Harbour, resource and recorder approaches are protected.
* Silver Darts, Sunstripe Reeflets, Ribbonfins and Violet Glassfish swim in groups of 6–14. Fish separate around the vessel, scatter from predators/boost/sonar and regroup. They do not collide, offer loot or fill the chart with icons.
* Vent chimneys warn before pulsing. Early bubble seeps are harmless; deeper plumes cause damage and push the submarine and predators upward.
* Anemones, fan corals, crabs and tube colonies respond to light, movement and currents.
* Environmental sound adds local chains, vents, kelp, school movement, wrecks and harbour machinery. Explosions, docking and water transitions have richer effects.

Read **WILD-WATERS-v0.15.0.md** for rules, migration and caveats. The compact HUD, maps, currents, active-dive resume, mobile zoom and existing controls remain. No new currencies, upgrade costs or automatic ammo refills were introduced.

## Five-level campaign

| Level | Destination | Seabed | Recorders |
|---|---|---:|---:|
| 1 | Sunbreak Shelf | 300 m | 2 |
| 2 | Glassbone Rift | 600 m | 3 |
| 3 | Drowned Gardens | 1,000 m | 4 |
| 4 | Midnight Cathedral | 1,400 m | 5 |
| 5 | Calypso Abyss | 1,800 m | 6 |

Bank every recorder in a level to unlock the next. Merely carrying the recorders does not unlock it. At the dock, choose **EXPEDITIONS** to select any unlocked destination at no cost. A main-menu EXPEDITION HUB button also opens the hub when no dive is active; it cannot teleport a submerged vessel.

Each level has a solid, collision-tested seabed, persistent deposits, its own predator population and saved recorder progress. Threat density, rock-field density, predator durability and damage increase through the campaign. Reapers remain below 800 m and still match Mk IV normal-thruster speed. The wider trench and mobile zoom are unchanged.

## Two currencies, finite resources

Scrap deposits and crystal clusters each contain two units. On docking, each scrap unit becomes **18 credits**; each crystal unit becomes **one banked crystal**, never credits. Every paid ship-upgrade increment needs both currencies. Standard fitted Mk I flashlight/rack equipment remains free. Ammunition is still bought separately for **12 credits per round**, without a crystal charge or automatic refill.

The shop keeps a three-column catalogue with fitted-tier badges and gold maximum outlines. Tap a system to see the current/next statistics and both prices. For example, fitting **Hull Mk III costs 297 CR + 10 crystals**. Hull pressure limits are now 130 m standard, then 330 / 630 / 830 / 1,030 / 1,330 / 1,530 / 1,830 m.

A fresh campaign contains **15,192 credits' worth of fixed scrap and 496 crystals**. All 51 paid upgrade steps cost **12,223 credits and 432 crystals**, leaving 64 spare crystals. These are arithmetic totals, not a completed balance playthrough. Ammo, repairs and lost expendables have additional costs. Predator salvage supplies renewable credits.

Fixed scrap/crystal deposits never regenerate on docking, level switching, quitting or reloading. The hub shows remaining stocks for each level. Predators and supply caches refresh only after a genuine dive and return to that level's dock. Switching maps is not a population reset. Secured recorders stay secured.

## Recovery pods and crystal safeguards

Collected resources are journaled together with deposit depletion. Defeat or intentionally quitting a dive leaves unbanked scrap/crystals in a persistent recovery pod instead of deleting finite resources. Recover the pod and dock to bank it. Pods are placed no deeper than the current safe hull range and are visible to sonar and the objective indicator. Undelivered recorders return to their wrecks. Spent ammunition and repair scrap are not refunded.

Ordinary reloads now restore a valid active-dive snapshot, paused. Ship position, resources, cargo, ammunition, mines and enemies are resumed without advancing time while closed. A recovery pod is still used for intentional abandonment/defeat or a recoverable invalid snapshot. Sudden termination can lose time since the last checkpoint, and browser storage failure or clearing site data can still lose progress. A visible warning reports failed writes.

The shop checks the crystal budget at every remaining hull pressure gate. Optional purchases are refused only when they would leave too few crystals obtainable before a required hull step. Crystals below that pressure limit do not count as available funds. Fit the indicated hull upgrade first.

## Achievements

Open **ACHIEVEMENTS** from the main menu or pause menu. Twenty objectives cover recorder completion, all seabeds, resource surveys, predator hunting, sonar, magnet use, shielding, a damage-free return and fully upgrading the ship. Each has a progress indicator and an unlock notification. Counters and unlocks persist through reloads and level changes, and reset only with a confirmed New Game. They are in-game, campaign-specific achievements, not Google Play Games integration.

See **CAMPAIGN-v0.12.0.md** for the full achievement list, level stocks, all upgrade costs and migration details.

## Existing campaigns

**Updating from v0.13 or v0.12:** all campaign progress, unlocked levels, selected destination, layouts/depletion, banked currencies/recorders, stats/achievements, upgrades, ammo and stored predator health carry over. No New Game is required. The campaign schema and key remain version 3, with an optional versioned active-dive snapshot and per-level charts. Existing maps start partially unsurveyed; their resources are not regenerated.

**Updating from v0.11 or earlier:** Existing credits, XP, best depth, fitted upgrades and purchased ammunition are retained. The old trench is preserved as **Level 5, Calypso Abyss**, including its original resource locations/depletion and secured recorders. You start the expanded campaign at Level 1 and must clear the four new levels to revisit that old trench. Old secured recorders remain stored while access is locked.

Imported Level 5 receives a one-time addition of missing crystal deposits to reach the new generated-stock target. Previously sold/collected crystals are not refunded or respawned. Existing purchased upgrades do not incur a retrospective crystal bill. New crystal balances begin at zero because old crystals were sold for credits. Fresh-campaign stock totals do not describe every migrated save.

## Controls

| Action | PC | Mobile |
|---|---|---|
| Pilot | Hold left mouse button and move pointer; WASD/arrows | Touch and drag open water anywhere |
| Boost | Hold Space while piloting, after fitting thrusters | Hold BOOST while steering/cruising |
| Collect / dock | E; hold E for repeated collection | USE; hold for repeated collection |
| Mine | F | MINE |
| Sonar / disruptor | Q | SONAR |
| Repair | R | REPAIR |
| Flashlight | L | LIGHTS |
| Quiet running | Hold Shift | SILENT toggle |
| Pause | Esc | Top pause control |
| Survey map | M; Esc to close | Top map icon / pause menu |
| Detailed telemetry | Top sliders icon | Top sliders icon |
| Sound | Main/pause menu or telemetry | Main/pause menu or telemetry |

All existing flashlight, boost, shield, magnet, disruption and paid ammunition systems remain. Eight circular mobile actions stay bottom left; the floating steering pad appears where you touch open water. PC retains its keybind reference strip.

## Development and verification

Serve the folder over HTTP for local development, for example `python -m http.server 8000`. Normal local-preview version status is not a verified hosted release.

After editing any runtime asset, run `python tests/build_release.py` before publishing. Run the current suite with `python tests/run_v0150.py --jobs 1`; see **tests/README-v0.15.0.md** for dependencies and limitations. Historical tests/reports describe earlier rules and are not current acceptance evidence.

**VERIFICATION-v0.15.0.md** records the actual test outcomes. Physical Android hardware, real hosted/offline updating and a full human campaign playthrough are not verified. This remains a browser/PWA source release, not a signed Android app bundle.
