# The Abyss Below v0.26.0: Tactical Depths

Build: `0.26.0-tactical-depths-1`. Update base: v0.25.0, The Living Abyss.

## Ship tuning

Physical dock > Shipyard > Ship Tuning. Two distinct passive modifications can be fitted. Slots may be left empty. Existing upgrades unlock them; fitting and removal cost nothing. There is no new currency, crystal charge, upgrade tree or action button.

| Modification | Unlock | Benefit | Trade-off |
|---|---|---|---|
| Pursuit Drive | Magnetic Thrusters Mk II | Boost charge recovers 25% faster | Active boost draws 20% more power |
| Quiet Propulsion | Silent Drive Mk II | Cruising noise multiplied by 0.75 | Normal cruise speed multiplied by 0.92 |
| Reinforced Frame | Reinforced Hull Mk III | Maximum hull HP multiplied by 1.15, rounded | Acceleration and braking response multiplied by 0.80 |
| Survey Processor | Sonar Array Mk II | Sonar echo duration multiplied by 1.35 | Actual scan cooldown multiplied by 1.25 |
| Recovery Rig | Salvage Magnet Mk II | Scrap pickup reach multiplied by 1.20 | Remote pickup power cost multiplied by 1.30 |

Quiet Propulsion does not suppress weapon transients, quiet boost or reduce full boost speed. Noise still follows actual motion. Reinforced Frame changes maximum HP, so percentage-based repair packs and the one emergency repair scale with it. Refitting preserves the current health fraction rather than giving free healing. Pressure limits and the ship collision shape do not change.

Survey Processor applies to the whole cooldown, including any longer screen-coverage wave duration. The comparison table shows the minimum cooldown and explains this screen-size distinction. Recovery Rig affects scrap, not crystals or contact-only repair packs. Close salvage remains free.

The Shipyard compares fitted and preview values. Inspecting options does not equip them; use FIT CONFIGURATION. Refitting only works while physically docked. Some modifications add small visual hardware details.

### Three named configurations

Each stores the two fitted modifications, owned hull finish and earned accent. SAVE FITTED stores the applied configuration, not an unconfirmed preview. Names allow 28 characters. LOAD is dock-only and cannot grant ammo, repair charges, currencies, upgrades or additional campaign slots. Configurations belong to the active campaign and survive save/export/import. Unavailable/duplicate equipment choices are rejected or safely normalised on loading.

## Combat presentation

Installed rail mounts recoil visually and flash at firing. Torpedo launch ports animate, and torpedoes retain a short curved bubble trail. Mine hatches animate on deployment. Impacts produce small sparks; the Warden's reduced armoured hits have a separate metallic sound. Predator recoil is visual, not a movement stun. Existing disruption retains its purpose.

Nearby explosions can produce a small camera impulse. Directional arcs briefly indicate the direction of a predator bite, not the attacker's exact hidden position. Empty weapon attempts have a soft dry-fire cue. Firing does not move the vessel or enlarge its collision body. Weapon damage, range, guidance, prices and cooldowns are unchanged.

Top telemetry/sliders > Combat Presentation offers:

- Optional damage numbers, off by default. Numbers do not reveal otherwise unobserved contacts.
- Camera impulse from 0 to 100%, default 35%, or 0 when reduced motion is requested.
- Full, Balanced or Low decorative effects. Lower settings reduce cosmetic particles and distant small wildlife detail; targets, hazards, pickups and essential sonar information remain.

These presentation preferences belong to the browser/device, not the campaign. Settings apply immediately and report if storage fails. Existing audio fades, music and volume controls remain. New dry-fire, armour-hit, gate and completion sounds use the existing fade-safe audio synthesis.

## The Proving Ground

Physical dock > TRIALS. This is an isolated simulation pool, not a new campaign level. Three scored exercises and one unscored practice mode use the real movement, collision, boost, shield, sonar, guidance and weapon systems.

| Exercise | Objective | Time limit | Gold reward |
|---|---|---|---|
| Precision Run | Pass eight gates in order around fixed barriers and a sweeping obstacle | 180 seconds | Verdigris accent |
| Weapons Trial | Destroy nine moving mechanical targets | 120 seconds | Solar Amber accent |
| Survival Drill | Stay operational through three waves, 12 mechanical hunters total | 90 seconds | Ion Lilac accent |
| Free Practice | Try your current installed equipment and tuning; targets regenerate | None | None |

Ranked exercises use the same loan vessel for everyone: Hull IV; Thrusters III; Air Recycler IV; Battery IV; Sonar II; Silent Drive II; Flashlight III; Railgun III; Torpedo III; Mine Warheads III; Rack III; Shield II; Disruptor I. No tuning. Loan magazines contain 24 rail rounds, 6 torpedoes and 6 mines. One emergency repair. Oxygen does not deplete, while power, boost and cooldowns still function.

Free Practice uses your existing upgrades and tuning, with temporary full magazines for fitted launchers. USE at its cyan service pad restores the simulated vessel, charge and magazines. It does not unlock equipment you do not own. Cleared practice targets return after a short delay.

### Scoring

Only completing the objective earns a result. Scores are rounded and clamped between 0 and 1,000.

- Precision: `1000 - 7 * (seconds + 5 * impacts)`.
- Weapons: `1000 - 4 * seconds - 6 * rounds fired`.
- Survival: `350 + 400 * hull_fraction + 20 * targets_destroyed - 60 * repair_uses`.

Bronze starts at 250, silver at 500, gold at 750. A lower completed score still records completion. The campaign stores personal bests, completed-run count and the best run's time. Lower scores do not replace better records. Cosmetic accents have no statistical effect, and gold is not required for campaign progression.

### Isolation and exiting

A valid campaign checkpoint is required before a drill starts. Trial state, loaned inventory and test-world objects are never written over that checkpoint. Successful results and earned cosmetic access are committed when returning to the dock; Retry also returns the completed result before launching the next run.

Pause remains available. Return to Dock restores the exact campaign vessel, resources and world. An unfinished run or a simulated defeat produces no campaign loss, rescue loadout, loot, achievement farming, contract payment or recovery wreck. Opening campaign management, journal, map and photo mode is disabled inside the simulator. Telemetry and audio settings remain available.

Reloading or closing the app ends an unfinished exercise and restores the real saved campaign at the dock. Mid-trial resume is deliberately not supported. Exit a completed result through RETURN TO DOCK to save its record before closing the app.

## Compatibility

All three campaigns retain existing balances, upgrades, ammunition, repair charge, finite crystals, regenerating scrap, world layouts, wildlife, wrecks, contracts and progress. New tuning slots begin empty. No retrospective costs, story additions or changes to normal respawn ammunition (10 rail / 3 torpedo / 3 mine). Mobile keeps its seven action buttons and desktop keeps its circular key-reference strip. Pinch and wheel zoom remain.

## Install

Save and export a campaign backup. Extract the v0.26.0 update archive into the repository root over v0.25.0, replacing matching files. Upload the files, not the ZIP. Include the new `tactical-depths.js` and all accompanying build, manifest and service-worker files. Check the title screen for v0.26.0 / Tactical Depths after deployment. Do not clear site storage or change the game address. The update pack and complete source are alternatives; only one is needed.

Tests, real-device limits and package checks are documented separately in `VERIFICATION-v0.26.0.md`. Automated course completion is not a human difficulty or mobile-performance certification.
