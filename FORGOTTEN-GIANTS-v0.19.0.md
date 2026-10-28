# Forgotten Giants

Version 0.19.0. Build `0.19.0-forgotten-giants-1`. Update baseline: v0.18.2 / Recovery Protocol.

## Optional wreck expeditions

Five large flooded cutaway structures have been added in connected side alcoves. Original rocks, finite crystals, salvage deposits and progression recorders are not relocated. Each has four generous outer openings, a long always-open route to an identification plate, a sonar-identifiable release panel and an optional permanent bulkhead shortcut. A shortcut is a convenience, not the only route out.

| Destination | Structure | Approximate centre depth | Side | Cosmetic finish |
|---|---|---:|---|---|
| Sunbreak Shelf | The Wayfarer, coastal freighter | 190 m | West | Rescue Orange |
| Glassbone Rift | Prospector Nine, mineral survey ship | 430 m | East | Industrial Graphite |
| Drowned Gardens | The Verdant, biological research vessel | 760 m | West | Garden Green |
| Midnight Cathedral | Station Halcyon, submerged habitat | 1,110 m | East | Halcyon Pearl |
| Calypso Abyss | The Atlas, expedition carrier | 1,600 m | West | Atlas Midnight |

The depths describe the middle of each structure, not its highest or lowest point. Existing pressure, oxygen, power and darkness rules remain active. Upgrade the hull before attempting deeper destinations. Halcyon is separate from the Warden's arena. No essential crystal or original recorder requires a new wreck puzzle.

Use the map and the discovery journal's side/depth clues to find the wreck. Once discovered, its entrance can be pinned. Inside, a sonar wave identifies the working panel when it reaches it. Approach and use E / USE to release the marked bulkhead. There is no ammunition payment, crystal payment or time limit. Opened doors stay open for that campaign across docking, level changes and reloads.

Bright wall slabs, equipment blocks and the closed bulkhead collide with the ship and ordnance. Dim rear plating, cables and exposed decorative fixtures are background cutaway details. Alternate exits remain open. Guidance, salvage-line checks, predator bites and projectiles respect the solid interior walls.

## Identification plates and hull finishes

A plate is a separate discovery collectible. It is not a progression recorder, credit source or extra currency. Approach and use E / USE. The salvage magnet does not collect it automatically. Its story and finish unlock only when the plate is safely delivered to the physical dock.

Open LOST SIGNALS from the main/pause menu or J on PC, then DISCOVERIES. The dock's ARCHIVE tab also offers DISCOVERIES. Each vessel has an archived story, an ownership/status indicator and its finish. Select a banked finish from the HULL FINISH selector. Standard and any earned Warden Hunter finish remain available.

Finishes change painted hull panels, trim and identification stripes only. No health, pressure, stealth, speed or damage bonus is attached. The red damage pulse retains priority over a finish.

Unbanked plates join scrap, crystals and recorders in a persistent recovery wreck on death or deliberate abandonment. Plate-only losses still create a recovery site. Another death never deletes an older site. Recovered plates must still be banked. Their original site stays empty while they are aboard, in recovery or archived, preventing duplicates. Recovery sites in the new side alcoves stay in those alcoves rather than being clamped into the old canyon.

## Predator variants

Only some predators use the new behaviours; familiar ordinary hunters remain. Counts, tier health, damage, salvage rewards and speed caps have not increased.

- A small subset of Drifters forms three-member packs. Freshly generated packs assemble in checked open water, approach from different offsets and can share an alert at short range with clear sight. Restored expeditions do not teleport existing enemies into a new formation.
- Some Stalkers pause for a visible amber, audible wind-up, commit to a short rush, retreat towards home, and recover. They cannot bite during their wind-up, retreat or recovery. Sonic stun freezes the current phase and movement.
- Some Reapers intercept recently observed motion. They extrapolate visible movement briefly; solid terrain blocks observation. After a short memory expires, they return to patrol rather than following hidden live coordinates. Their maximum normal speed still matches Mk IV thrusters.

The normal harbour protection, chase limits, lower depth limits, collision checks and sonar stun remain. Active saves retain variant identity, pack membership, memory and attack phase. Migrating an older active save adds behaviour defaults but preserves existing positions, velocity, health and field state.

## Weapon targeting hints

With a fitted weapon and ammunition, restrained cyan rail brackets and amber torpedo pointers indicate the candidates that the existing homing system would select from the current muzzle and heading. These are hints, not new locks or extra aim assistance.

A marker appears only on an eligible predator currently visible in ambient water, the flashlight beam or a sonar echo, with a clear targeting path. It never reveals wildlife, collectibles or a target behind solid terrain. Empty or unfitted weapons show no marker. Weapon acquisition angles, damage, fire intervals, ammunition costs and mine behaviour remain unchanged.

## Saves, economy and compatibility

There is no reset and no need to start again. Three campaign slots, progression recorders, banked currencies, crystal depletion, salvage regeneration, missions, Warden state, achievements, purchased equipment and current magazines carry forward. Death still replaces ammunition with exactly 10 rail rounds, 3 torpedoes and 3 mines; ordinary docking does not reload them for free.

The new `giants` campaign field stores discovered/scanned/opened sites, banked plates and chosen finish. Cargo and recovery manifests gain a `plates` array. Old manifests migrate with an empty array. Portable backup checks reject duplicate ownership, unearned finishes, malformed shortcut states and invalid predator memory/phase data. Imports remain local files, not cloud saves.

Chart bounds expand for the side alcoves without changing the original survey-grid origin, so previously charted terrain remains aligned. Giant sonar contacts use stable object IDs when a bulkhead or plate disappears during a scan.

## Updating

Save, bank cargo if practical, and EXPORT an external campaign backup. Apply the extracted update ZIP over v0.18.2 at the repository root, preserving directories. Upload all changed runtime files together, including `forgotten-giants.js`, `version.json`, `version-sync.js` and the worker. The complete ZIP is the full source alternative, not an additional required upload.

After hosting deploys, reopen the same game address online and check for **v0.19.0 / Forgotten Giants**. Never clear browser data or uninstall to force an update. These ZIPs are not a deployment to your repository and are not an Android App Bundle.

## Testing and limits

See `VERIFICATION-v0.19.0.md` for this build's final results. The gameplay suites run production code in Chromium using synthetic local storage and controlled scenarios. They are not proof of physical Android performance, human audio listening, full-campaign balance or hosted/PWA update behaviour. The separate live-HTTP probe records any browser policy block explicitly. Screenshots are from the real renderer with synthetic equipment/positions, not concept art or a user's save.
