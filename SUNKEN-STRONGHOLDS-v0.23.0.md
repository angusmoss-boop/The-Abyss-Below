# The Abyss Below v0.23.0: Sunken Strongholds

Build: `0.23.0-sunken-strongholds-1`  
Base: v0.22.0 / Deepwater Rescue

## Install

Save and export your campaign before updating. Banking cargo first is a sensible precaution. Extract the update ZIP over the existing v0.22.0 repository, upload all changed files together and keep the same hosted address and browser profile. Do not clear site data or reinstall to update. This package is source for the web/PWA game, not a hosted deployment or a signed native Android app.

After deployment the title menu should show **v0.23.0 / Sunken Strongholds**. The sync checker must verify the published assets and worker before displaying a fully verified status. A local preview is not a verified hosted update.

## Five larger expeditions

The original optional side alcoves are enlarged outward without moving the original canyon rocks or fixed resources. Every wreck uses a three-deck, nine-compartment layout, with themed room names and rear-wall equipment. Major solid boundaries and machinery have physical colliders; recessed wall fittings are visual scenery.

| Wreck | Centre depth | Hull length x height | Defenders | Traps |
|---|---:|---:|---:|---:|
| The Wayfarer | 190 m | 134 x 74 m | 3 | 3 |
| Prospector Nine | 430 m | 148 x 82 m | 4 | 4 |
| The Verdant | 760 m | 166 x 92 m | 5 | 5 |
| Station Halcyon | 1,110 m | 184 x 102 m | 6 | 6 |
| The Atlas | 1,600 m | 200 x 112 m | 8 | 7 |

The physical footprints are approximately 4.7 to 5.1 times those of v0.22.0. One metre corresponds to ten world units. Centre depth is not the deepest part of a hull; inspect your pressure limit before exploring the lower deck. Wrecks remain optional and separate from progression recorders and the Warden's arena.

The Wayfarer has freight holds and ballast machinery. Prospector Nine has ore-transfer and cutter rooms. The Verdant has observation rooms, specimen tanks and kelp. Halcyon has habitat pods and life-support rooms. The Atlas has a vehicle gallery, archive and drive chamber. The basic three-deck security topology is shared; room decoration, scale, guards and hazard placement vary by level.

## Retrieve an identification plate

1. Find the main breach on the side facing the trench. It is always open and will not close behind you.
2. Explore the upper and lower decks. Look for the two isolation relays at the far end of the vessel.
3. Send sonar and let its wave reach a relay. Approach and press **E / USE** to isolate that circuit. Standing at an unscanned relay and pressing USE is not enough.
4. Both relays permanently unlock the identification-vault door. They also shut down the associated trap circuits.
5. Enter the defended vault, recover the plate with **E / USE**, and return safely to the physical harbour. Surviving defenders become alert when the plate is taken, but no new enemies spawn.

A separate sonar-identifiable service panel on the lower entrance-side deck opens a central bulkhead shortcut and lower escape hatch. Taking the plate also opens these exits. There is no deadline, trap door that seals every exit, or ammunition/crystal payment to operate the systems.

The entry breach is 17.6 m wide and interior passages are at least 14.4 m wide. They are designed to fit the submarine rather than requiring pixel-perfect alignment. The vault has solid floors/ceilings and one locked doorway; there is no secret route around the relay requirement.

## Readable traps

Electrical conduits and damaged pressure systems alternate between quiet, warning and active states. A dashed footprint and emitter graphics mark each hazard when illuminated or reached by sonar. Ordinary deep darkness still hides unilluminated scenery.

All traps provide an **amber 1.8-second warning**, followed by **2.2 seconds of activity** and a quiet period. Total cycle periods shorten with the level: **9.5 / 9.05 / 8.6 / 8.15 / 7.7 seconds**. Individual hazards use staggered phases, so they do not all fire together.

Active traps deal **8 / 11 / 14 / 17 / 20 damage per pulse** across Levels 1 to 5, with at least 0.8 seconds between pulses from the same trap. Normal damage cooldown/shield rules still apply. A pressure jet also pushes upwards. Walls block line-of-effect. A quiet or warning hazard does not damage the ship.

The upper relay permanently disables its circuit; the lower relay disables its own. The final central circuit requires both. Trap clocks run only while diving near the wreck, freeze on pause, and preserve their phase/hit timers through a checkpoint. Relays never reactivate because you dock, reload or change levels.

HUD warnings use the existing status line: **TRAP CHARGING**, **LIVE CONDUIT**, **PRESSURE JET**, or relay progress. More important hull, pressure and oxygen warnings still take priority.

## Defenders and persistent progress

Each wreck receives a finite roster of additional predators, including an approach patrol, interior hunters and a vault guard. Deeper wrecks add stronger tiers and additional patrol positions. Reapers remain below their existing 800 m floor.

Defenders use existing predator health, damage and speeds. Stalkers retain telegraphed ambushes and Reapers retain interception. They navigate around real hull bulkheads, obey their territorial leash and cannot bite through a closed door. Ordinary map predators are not replaced or multiplied globally.

**Defender damage and deaths are permanent in that campaign.** Return to the dock, resupply and continue where you left off. Taking the plate alerts surviving defenders instead of conjuring reinforcements. Existing predator-drop and kill-achievement rules apply.

This differs from ordinary map predators, which continue to refresh on the existing dock-return rules. Opened shortcuts, scanned/isolated relays, dead defenders and banked plates all persist with each of the three independent campaigns.

## Rewards, defeat and old campaigns

The identification-plate rewards are unchanged: bank the plate for its existing archive story and cosmetic hull finish. No additional currency, upgrade cost or resource supply is introduced. The Warden Hunter finish is unaffected.

An unbanked plate remains with your other cargo in a persistent lost-vessel recovery site. Plate-only losses are supported. Recovering it does not instantly bank the reward; you must still get home. Previously lost/carried/banked plates remain uniquely owned and do not reappear in a fresh vault.

Old campaigns that already secured a particular plate do not have that finish revoked. Both security relays are considered cleared for that owned plate. Existing service shortcuts remain open. Uncollected plates use the new relay challenge.

When loading an old saved expedition, the update checks for collisions with the enlarged wreck. If necessary it moves the submarine into nearby valid water while preserving its health, systems, cargo and ammunition. Newly conflicting recovery pods, predator salvage and escort-drone positions are likewise reconciled. Recovery positions remain consistent in the canonical save, rendered items, chart contact and waypoint. A short five-second grace protects a migrated active dive from newly added security; it is not a permanent safe zone.

Original rocks, fixed salvage/crystal deposits, ordinary enemies and campaign economics are preserved. The wider wreck chambers expand the survey/checkpoint bounds. Imported backups validate security-state types, finite ranges and defender ownership/health.

## Presentation and controls

Larger cutaway hulls have deck plates, structural ribs, cables, doors, themed equipment and identification vaults. Sonar reveals their colliders and security systems as its wave arrives. No new mobile actions or PC bindings are needed.

The Discoveries journal reports relay progress, opened escape hatch status and cleared defenders. Existing plate/finish actions still work. Security cues reuse the fade-safe mixer and existing volume controls; menu, dock and pause music are unchanged.

The approved mobile triangle and desktop circular key-reference strip remain intact. This update does not change oxygen drain, battery cells, emergency propulsion, paid ammunition, salvage regeneration, finite crystals, upgrade prices or the 10 rail / 3 torpedo / 3 mine death loadout.

## Verification and limits

See `VERIFICATION-v0.23.0.md` for the actual executed suites and `tests/README-v0.23.0.md` for reproduction. Previews use the production renderer with synthetic equipment, positioned submarines and staged hazard phases. The full-hull overview adjusts only the test camera to show the structure; gameplay zoom is unchanged.

This is not a physical-phone performance test or a full human balance playthrough. Difficulty is implemented through routing, hazards and defenders, but its feel needs real playtesting. No deployment to the user's GitHub repository is performed by creating these ZIPs.
