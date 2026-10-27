# The Abyss Below

## v0.12.0: Fivefold Descent

A dependency-free browser/PWA submarine expedition game. This release turns the original single trench into a five-level campaign with physical seabeds, a revisitable expedition hub, 20 achievements and separate credit/crystal upgrade costs.

## Install the update

1. **On the old build, dock and bank your cargo before updating.** Then quit the active dive. The v0.11 build cannot recover unbanked cargo across a reload.
2. Extract the update ZIP. Copy its contents into the existing repository root, replacing matching files. Do not upload the ZIP itself or add an extra enclosing directory.
3. Publish the runtime files together, including `game.js`, `index.html`, `styles.css`, `service-worker.js`, `version-sync.js` and `version.json`. Keep the manifest and icons in place. The version checker rejects partial or mismatched deployments.
4. After your normal hosting deployment completes, reopen online at the same site and browser profile. The menu should show **v0.12.0 / Fivefold Descent**. Use CHECK AGAIN to check the published files.
5. **UP TO DATE · SYNC VERIFIED** requires matching loaded build markers, published asset hashes and the controlling worker. It checks your deployed website, not unpublished repository changes or cloud saves. A local preview correctly remains unverified.

This package does not push a repository or deploy a website. No reinstallation is required by the update process. Do not clear site data or choose New Game to update. Saves remain local to this site and browser profile.

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

The shop keeps the three-column name-only catalogue. Tap a system to see the current/next statistics and both prices. For example, fitting **Hull Mk III costs 297 CR + 10 crystals**. Hull pressure limits are now 130 m standard, then 330 / 630 / 830 / 1,030 / 1,330 / 1,530 / 1,830 m.

A fresh campaign contains **15,192 credits' worth of fixed scrap and 496 crystals**. All 51 paid upgrade steps cost **12,223 credits and 432 crystals**, leaving 64 spare crystals. These are arithmetic totals, not a completed balance playthrough. Ammo, repairs and lost expendables have additional costs. Predator salvage supplies renewable credits.

Fixed scrap/crystal deposits never regenerate on docking, level switching, quitting or reloading. The hub shows remaining stocks for each level. Predators and supply caches refresh only after a genuine dive and return to that level's dock. Switching maps is not a population reset. Secured recorders stay secured.

## Recovery pods and crystal safeguards

Collected resources are journaled together with deposit depletion. Defeat, quitting a dive or reloading leaves unbanked scrap/crystals in a persistent recovery pod instead of deleting finite resources. Recover the pod and dock to bank it. Pods are placed no deeper than the current safe hull range and are visible to sonar and the objective indicator. Undelivered recorders return to their wrecks. Spent ammunition and repair scrap are not refunded.

The ship's active position, oxygen, combat simulation and planted mines are **not** resumed after a reload. A recovery pod is not an active-dive save. Browser storage failure or clearing site data can still lose progress; the game displays a warning if saving fails.

The shop checks the crystal budget at every remaining hull pressure gate. Optional purchases are refused only when they would leave too few crystals obtainable before a required hull step. Crystals below that pressure limit do not count as available funds. Fit the indicated hull upgrade first.

## Achievements

Open **ACHIEVEMENTS** from the main menu or pause menu. Twenty objectives cover recorder completion, all seabeds, resource surveys, predator hunting, sonar, magnet use, shielding, a damage-free return and fully upgrading the ship. Each has a progress indicator and an unlock notification. Counters and unlocks persist through reloads and level changes, and reset only with a confirmed New Game. They are in-game, campaign-specific achievements, not Google Play Games integration.

See **CAMPAIGN-v0.12.0.md** for the full achievement list, level stocks, all upgrade costs and migration details.

## Existing campaigns

Existing credits, XP, best depth, fitted upgrades and purchased ammunition are retained. The old trench is preserved as **Level 5, Calypso Abyss**, including its original resource locations/depletion and secured recorders. You start the expanded campaign at Level 1 and must clear the four new levels to revisit that old trench. Old secured recorders remain stored while access is locked.

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

All existing flashlight, boost, shield, magnet, disruption and paid ammunition systems remain. Eight circular mobile actions stay bottom left; the floating steering pad appears where you touch open water. PC retains its keybind reference strip.

## Development and verification

Serve the folder over HTTP for local development, for example `python -m http.server 8000`. Normal local-preview version status is not a verified hosted release.

After editing any runtime asset, run `python tests/build_release.py` before publishing. Run the current suite with `python tests/run_v0120.py`; see **tests/README-v0.12.0.md** for dependencies and limitations. Historical tests/reports describe earlier rules and are not current acceptance evidence.

**VERIFICATION-v0.12.0.md** records the actual test outcomes. Physical Android hardware, real hosted/offline updating and a full human campaign playthrough are not verified. This remains a browser/PWA source release, not a signed Android app bundle.
