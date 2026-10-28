# v0.21.0: Lifeline

## Oxygen is the expedition clock

Oxygen consumption is now `0.30 / (1 + recyclerMark * 0.20)` units per simulation second, previously `0.22 / (1 + recyclerMark * 0.20)`. Capacity remains `100 + recyclerMark * 30`. This is a 36.36% increase in consumption, or a 26.67% shorter full-tank duration at every mark. No upgrade prices changed.

| Air Recycler | Capacity | Consumption per minute | Full-tank estimate |
|---|---:|---:|---:|
| Standard | 100 | 18.00 | 5:33 |
| Mk I | 130 | 15.00 | 8:40 |
| Mk II | 160 | 12.86 | 12:26 |
| Mk III | 190 | 11.25 | 16:53 |
| Mk IV | 220 | 10.00 | 22:00 |
| Mk V | 250 | 9.00 | 27:46 |

Displayed estimates are floored whole seconds, assume uninterrupted simulation and exclude supply-cache pickups and dock refills. Pausing, inspecting a paused interface or closing the game does not consume oxygen. Oxygen exhaustion still damages the hull, as before. The cockpit gives a LOW OXYGEN warning below 75 seconds of remaining air; pressure and low hull take priority.

The dock shows full-tank air endurance. Upgrade pop-ups compare current and next capacity, consumption and endurance. Pause and telemetry show the remaining estimate for the actual oxygen aboard.

## Battery is primarily an action budget

Base idle draw is 0.006 power/second and full thrust adds 0.018/second, both divided by existing battery-upgrade efficiency. Ordinary travel is far cheaper than boost or sonar. Flashlight, shield recharge, long-range magnetic collection and upgraded sonar disruption keep their previous power costs.

At the standard battery rating with the Mk I lamp on, full ordinary thrust uses approximately 3.84 power per minute. A second of boost adds 7 power before efficiency upgrades; a standard sonar pulse costs 12 power. These are exact implementation settings, not a hardware battery-consumption claim.

### Emergency propulsion

At or below 0.5 stored power, the reserve drive supplies **half of the normal thrust speed for the fitted thruster rating**. At zero power, you are no longer immobilised. The standard drive reaches 7.3 m/s reserve speed and Mk IV reaches approximately 12.26 m/s. Normal acceleration, steering, currents, vent flow and collisions still apply, so this is commanded thrust speed, not an instantaneous cap on momentum or external drift.

Boost is unavailable while in reserve; empty power cannot pay for sonar or other powered systems. The boost capacitor does not create battery energy. A cell or dock refill restores normal propulsion automatically. Your physical dock still restores hull, oxygen and power without charge, but never supplies free ordinary weapon ammunition.

## Rare battery cells

A separate deterministic generator adds 3 / 4 / 5 / 6 / 7 cells to Levels 1 through 5. They are golden battery-shaped pickups with a lightning glyph, not crystals or scrap. Generation avoids solid terrain, the harbour, existing resource locations, contact-mine blast approaches, vent plumes and the Warden territory. One cell per level is generated in shallow water between approximately 68 and 108 m.

Cells restore **up to 25 power directly into the current battery**, capped at the fitted capacity. They do not become cargo, credits, ammunition or an inventory consumable. The small pickup notice displays the amount actually restored.

Approach within 6 m with a clear route to collect automatically when at least 5 power is missing. This prevents wasting a cell on a negligible idle deficit. USE can deliberately collect one to top up a smaller deficit. A full battery leaves it in place. The collection needs no fitted magnet or existing power, and cannot reach through rock. Cells respect the same darkness and sonar reveal layers as other resources.

A collected cell becomes eligible to return after **8 minutes of active diving**. At most one eligible cell returns per 90 seconds in each visited level, and a cell in the current level waits until it is outside the camera margin and away from the submarine. The clock advances for visited levels of the currently played campaign only while actively diving outside the protected harbour. Pauses, dock screens, offline time, airborne motion and inactive campaign slots do not generate cells. Docking or reloading never resets the cell pool.

Positions, depletion and timers persist across reloads, level changes, campaign slots and exported backups. New cell state is optional for old saves and does not change the campaign schema or any prior resource layout. Cell pickups do not change finite-crystal counts or original-site survey achievements.

## Three redesigned command interfaces

### Main menu

- Existing approved crystal-cavern artwork, now in a split editorial layout on desktop and a compact portrait header on phones.
- Active campaign name, slot, selected level, seabed and saved-dive depth.
- Banked transmissions, unlocked achievements, recovered wreck identities and five-stage chapter progress.
- Prominent begin/continue action; icon-labelled routes to hub, three save slots, achievements, journal, new campaign, audio and briefing.
- Current version, release name, local-save status and the actual deployment verifier retained. Local preview is not falsely labelled as synced.

### Pause

- Actual hull, oxygen, power and shield gauges, estimated remaining air and normal/reserve propulsion.
- Unbanked scrap, crystals, recorders and wreck plates.
- Active assignment or the current level's recorder objective.
- Truthful checkpoint status, prominent Resume, secondary navigation, separately presented Abandon action and its recovery-pod consequence.
- No simulation advances while paused. Returning to the main menu saves the suspended dive. Continue resumes an in-memory suspended dive; a restored checkpoint after reopening the game starts paused.

### Dock

- Unified surface-operations header, vessel service confirmation and separated credit/crystal balances.
- Pressure rating, full-tank air estimate, battery capacity and level recorder delivery summary.
- Icon-based service tabs for Upgrades, Ammunition, Expeditions, Contracts and Archive.
- Three-column upgrade grid, current mark and maximum-tier gold treatment retained.
- Scrollable catalogue with a visible departure footer and selected-destination summary.
- Portrait, short-landscape, tablet and desktop layouts; keyboard focus containment and existing dock-tab arrow-key navigation.

The cockpit HUD, seven mobile action buttons, floating helm, desktop instruments, menu/dock/pause music and audio-transition fixes are unchanged.

## Small interaction fix

USE now prefers a closer interaction buoy/package over a more distant loose resource. This fixes a generated-layout case where a nearby crystal swallowed the first USE while the submarine was directly on the Warden observation buoy. The boss still requires explicit confirmation, and no crystals or other deposits are moved.

## Compatibility and unchanged rules

The current v0.20 campaign migrates without changing its stored ship condition, positions, inventory, currency, upgrade marks, finite loot, achievements, world geometry, fish, wounded predators, mines/projectiles, contracts, Warden state, discoveries or surveyed terrain. Existing cell-free saves gain the small new set of cells separately. Inactive slots are not eagerly rewritten. Active, already-started dives immediately use the faster oxygen rate when resumed, without reducing the amount of oxygen already aboard.

Credits/crystals and upgrade/ammunition prices are unchanged. Crystals never respawn. Scrap keeps its existing active-dive regeneration. Death still gives exactly 10 rail rounds / 3 torpedoes / 3 mines and leaves unbanked cargo in a recoverable wreck. All 30 achievements, five levels, three local slots, backup import/export, weapons and flashlight marks remain.

## Apply the update

1. Save the campaign and export a backup. Banking cargo first is the safest precaution before changing releases.
2. Apply the extracted update contents over v0.20.0, replacing matching files. Upload the runtime files together, including the manifest, service worker and version data. There is no new runtime script in this release.
3. After your host has deployed, reopen the same game address online and check for **v0.21.0 / Lifeline**. The game verifier reports the actual hosted situation; supplying this ZIP is not a live deployment.
4. Keep the same origin and browser profile. Do not clear site data or start a new campaign to update.

Read `VERIFICATION-v0.21.0.md` for current evidence and limits. Automated browser testing and arithmetic checks are not a physical-phone test or a full campaign balance playthrough.
