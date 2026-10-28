# The Abyss Below v0.20.0: Fluid Frontiers

Build: `0.20.0-fluid-frontiers-1`  
Update base: **v0.19.0 / Forgotten Giants**.

## Install and save safety

Save your campaign and export a backup first. Extract the update archive into the same repository root, replacing matching files, and publish the whole update together. Keep the same game address. Do not clear site data, uninstall the app, or start a new game to install this update.

Check for **v0.20.0 · Fluid Frontiers** on the main menu after deployment. The included release manifest and worker hashes belong to the complete runtime, not just `game.js`. Re-run `python tests/build_release.py` after any runtime edit before publishing. This archive is not a claim that your hosted site has already been updated.

The three campaign slots, local save keys and campaign schema are unchanged. Balances, purchased gear, ammunition, finite crystals, recorder ownership, salvage regeneration, recoverable wrecks, contract state, Warden state, discovery plates, maps and active expeditions carry forward. Loading a saved dive still restores it paused. Old embedded predators are moved only to nearby valid water on their first simulation step; their identity and damage are retained.

## Flashlight coverage

| Fitted lamp | Full forward angle | Maximum length | Base power per minute |
|---|---:|---:|---:|
| Mk I | 33.23 degrees, unchanged | 26 m | 2.4 |
| Mk II | 70 degrees | 36 m | 3.3 |
| Mk III | 110 degrees | 48 m | 4.5 |
| Mk IV | 150 degrees | 62 m | 6.0 |

Mk I uses the original beam texture and detection geometry. The three upgraded lamps use a soft-edged radial fan, giving more useful peripheral vision without creating a long, stretched triangle at the widest setting. Mk IV covers 75 degrees to either side of the vessel's forward heading. The remaining 210 degrees are not illuminated by the lamp.

Lamp lengths, battery drain and battery-upgrade efficiency are unchanged. The existing gradual ambient fade still reaches zero at 1,000 m. Shallower ambient water and temporary sonar echoes are independent of the flashlight: a wider lamp does not make the rear intrinsically brighter, and it does not prevent sonar revealing the rear temporarily. Turning the light off or exhausting the battery still removes the beam. No new input is needed.

## Solid predators and obstacle-aware pursuit

All ordinary predator species and their pack, ambush and interception variants now collide with normal rock polygons as well as wreck walls, closed bulkheads, trench boundaries and the seabed. Local route search steers around blocked passages instead of aiming through them. Movement is checked in small swept steps, with separately tested tangential sliding and no diagonal corner cutting.

The Warden also has solid movement and obstacle-aware patrol steering; its committed charge and recovery remain readable. Ambush rushes do not magically change direction to follow a dodging submarine. An impossible route makes an enemy wait or seek another direction, not phase through the obstacle. Predators retain their existing speed, health, damage, depth floors, harbour exclusion and finite pursuit limits. Reapers still match Mk IV normal thrust.

Routing is local and bounded for performance, rather than a promise that an enemy can solve every arbitrary maze. Walkable-cell and edge checks are cached, route planning is limited per simulation step, and distant patrols use cheaper local steering. Navigation caches do not enlarge save files.

## Compact pickup feedback

Every collection category now produces a small icon and quantity beside the submarine, rising and fading in about 1.65 seconds: scrap, crystals, recorders, identification plates, contract packages, supply-cache replenishment and each cargo category recovered from a lost vessel. Very rapid matching collections merge, and the transient queue is bounded.

The old line connecting the submarine to a remotely collected resource is no longer drawn. Collection distances, rock occlusion and power costs remain unchanged. Scrap and predator salvage are automatic in range; crystals, recorders, plates, recovery cargo and packages still need USE / E. Notices remain legible in dark water without illuminating the surrounding world.

## Loose, individual fish schooling

The four existing species retain their appearance. Fish no longer seek index-based rows. Every fish has its own smoothly changing pace and heading variation, with neighbour alignment, separation and a gentle pull towards the group. Lagging fish accelerate to catch up; fish leading the group ease off.

Schools respond to the submarine, boost, predators and sonar with wider individual flight paths. Once the threat leaves, they loosely regroup. Current, rock avoidance and swept movement still apply. The wildlife remains harmless, has no loot and does not add map clutter. Individual pace, random state, position, velocity and school state are preserved by save/resume; reload does not reset them into a formation.

Only the nearby, capped number of schools are fully simulated. Actual Android frame-rate, heat and battery use still require physical-device testing.

## Desktop combat instruments

The desktop bottom keybind strip is now a compact circular instrument bank, visually matching the mobile controls. It shows railgun, torpedoes, mines, boost, use, sonar, repair, lights, chart, journal and pause, with key badges and appropriate ammo, charge, state or cooldown information.

| Action | PC binding | Readout |
|---|---|---|
| Railgun | Hold Z | Rounds / capacity; firing cooldown |
| Torpedo | X | Rounds / capacity; firing cooldown |
| Mine | F | Rounds / rack capacity; launch cooldown |
| Boost | Hold Space | Charge percentage and recharge/lock status |
| Use | E | Contextual availability |
| Sonar | Q | Ready or cooldown countdown |
| Repair | R | Carried scrap or repair cooldown |
| Lights | L | On / off |
| Map | M | Survey chart reference |
| Journal | J | Archive reference |
| Pause | Escape | Menu reference |

The desktop bank is a read-only keyboard reference. Mouse clicks pass through to the existing click-and-hold helm; the circles are not new fire-on-click buttons. Unfitted equipment is dimmed. Narrow desktop windows wrap the bank rather than switching to mobile input. Mobile keeps its approved seven-button triangle/utility layout and floating joystick.

## Thirty campaign achievements

The original twenty achievement IDs and earned timestamps remain. Ten new goals appear with progress in both the main-menu and pause-menu achievement panels:

| New achievement | Requirement |
|---|---|
| Warden Breaker | Defeat the Cathedral Warden. |
| Wreck Diver | Bank a first wreck identification plate. |
| Forgotten Fleet | Explore all five wrecks and bank all five plates. |
| Open Sesame | Open all five permanent service shortcuts. |
| First Commission | Complete and claim one contract. |
| Trusted Contractor | Complete and claim ten contracts. |
| Versatile Operator | Complete one cargo, survey, hunt and silent-recovery contract. |
| Recovery Specialist | Recover cargo from five destroyed submarines. |
| Dolphin Pilot | Breach the surface ten times. |
| Heavy Haul | Bank at least forty scrap in a single return. |

These do not award extra credits or crystals. Existing saves can prove past Warden victory, banked plates, opened shortcuts and total completed contracts, so those goals are recognised automatically. Earlier versions did not retain distinct contract-type counts, breach totals, wreck-recovery totals or the largest single haul. Those four counters start tracking in this version; no unsupported historical progress is invented. All goals remain campaign-local, with no effect on other save slots.

## Credit economy

Every paid ship-upgrade credit price is now **125% of its v0.19.0 price, rounded up per purchase**. Crystal prices are unchanged. No retrospective bill is charged for fitted equipment. Standard fitted Mk I flashlight and the two-slot mine rack remain free.

Example: Reinforced Hull Mk III changes from **446 CR + 10 crystals** to **558 CR + 10 crystals**.

The full paid upgrade tree totals **28,475 CR and 464 crystals**. A fresh campaign still has **496 fixed crystals**, a 32-crystal margin. The initial fixed scrap remains worth **15,192 CR** before regeneration, contracts and predator salvage. These are arithmetic stock checks, not a promise that a player can buy everything without return trips, losses or optional earnings.

Ammunition is unchanged: rail rounds **6 CR**, torpedoes **24 CR**, mines **18 CR**. Docking does not refill them for free. The existing defeat loadout remains exactly **10 rail / 3 torpedo / 3 mine**, including the emergency third mine for the basic rack. Repair, oxygen and power servicing at the dock remain free.

## Verification and limits

See `VERIFICATION-v0.20.0.md` and `verification/v0.20.0/results-all.json` for the current final run. Historical reports bundled for provenance are not current-build evidence. Screenshots are captured from production rendering with synthetic gear and staged positions, not concept artwork or a user's real save.

No claim is made of physical-phone performance, human listening, a full balance playthrough or a published update. The real local HTTP/offline probe is recorded separately; mocked worker tests cannot stand in for an installed Android PWA test.
