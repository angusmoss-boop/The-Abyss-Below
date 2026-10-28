# v0.24.0: NEREID Reforged

Base release: v0.23.0 / Sunken Strongholds. Build: `0.24.0-nereid-reforged-1`.

## Fit the vessel you can see

A shared procedural Canvas renderer now draws the actual submarine and its dock previews. Hull specification adds reinforced seams, ribs, bow protection, layered plates, a keel and a final exoframe across all seven purchased marks. Installed rail coils, torpedo tubes, mine hatch/rack, magnetic propulsion pods, lamps, recovery gear, shield emitters, sensors and support-system details appear on the model. Unpurchased weapon systems are absent. Small subsystems use subtle details rather than enlarging the vessel into an obstacle.

The existing narrow three-circle collision capsule is unchanged. Decorative equipment does not make old passages impassable. Existing weapon damage, projectile origins, guidance and ammunition rules are unchanged.

Hull health already increased by 28 per purchased mark in v0.23.0. This release preserves that balance and clearly exposes both health and pressure benefits. Base health is 100 HP; Mk VII has 296 HP. The upgrade pop-up includes current/next maximum health and the corresponding emergency-repair amount. Dock readiness and expanded telemetry show actual HP.

Boost exhaust changes with thrusters: Mk I cyan, Mk II electric blue, Mk III violet and Mk IV ion-white with violet edges. Successive marks have longer, wider twin plumes. Boost engagement/release interpolates the visual effect. The effect lives on the normal world layer and does not illuminate rear scenery or bypass deep-water darkness.

Missing hull health adds restrained scuffs, intermittent sparks and bubble leaks. Repair removes wear according to the new health fraction. The existing red damage flash and shield impact ripple are retained.

## Shipyard

Select **SHIPYARD** in the dock tabs. The preview shows the fitted vessel and its existing earned finish. Select a system and use **NEXT MARK** to compare its next appearance. **THRUSTER TEST** animates the preview without expending the actual battery, boost charge or ammunition. **INSPECT UPGRADE** opens the normal two-currency purchase pop-up, with fitted/next vessel images.

Previewing is not a purchase. No speculative marks enter the profile or saved expedition. Maximum systems disable next-mark preview. Earned wreck finishes and Warden Hunter appear in the finish selector; unearned schemes do not. Choosing a finish saves that cosmetic choice in the current campaign. The catalogue remains a three-column upgrade grid, with fitted marks and gold completion outlines.

## Supplies and interactions

| Item | Collection | Result |
|---|---|---|
| Scrap and predator salvage | Existing automatic close/magnet pickup | Unbanked scrap; converts to credits at the dock |
| Crystals | Direct submarine contact only | Unbanked crystals; never regenerates |
| Hull repair packs | Direct contact, only below full hull | Instant healing of up to 25% of maximum hull HP |
| Battery cells | Existing close automatic/manual top-up rules | Battery charge only |
| Recorders and identification plates | USE / E | Objective cargo to bring home |
| Recovery wrecks, devices, relays, rescue drones and air stations | Existing USE / hold USE | Existing interaction or recovery |

Crystals cannot be collected remotely by the magnet. Contact collection costs no power and works in darkness. It checks the narrow hull capsule during each movement substep, so boosting across a pickup registers, while a solid intervening wall prevents collection. Full-health submarines leave repair packs in the water. Repair packs do not give oxygen, power, shield or a replacement emergency-repair charge.

Old mixed supply-cache positions and depletion are preserved. The internal `air` type remains for save compatibility but is rendered and described as a hull repair pack. Its old oxygen/power reward is removed. These ordinary packs keep their previous genuine-dock-return refresh rules; crystal positions and finite stocks remain unchanged. Old surveyed cache labels are updated without revealing new locations.

Oxygen remains available from the tank/recycler, dedicated air stations and the dock. Battery cells and dock servicing retain their separate role.

## One emergency repair per sortie

Press **R** or tap the existing wrench. A ready charge instantly heals up to **50% of maximum hull HP**, capped at full. It consumes no scrap, credits, crystals or power. Pressing it at full health preserves the charge. Using it dims the mobile control and changes desktop telemetry to `0 / 1`.

Only physical dock servicing readies the charge again. Waiting, collecting a pack, buying an upgrade, opening a menu, loading a checkpoint or exporting/importing the same expedition does not refill a spent charge. A new/replacement vessel launches from the hub serviced. The charge's boolean state is part of the active dive and validated on portable import.

Existing v0.23 active dives receive one ready charge on first migration because no such state existed previously. After that, ready/spent state persists normally. This is not a recurring load-time grant.

## Pinch to zoom during play

On touchscreens, put two fingers on open water and spread them to zoom in, or pinch them together to zoom out. The camera range is **65% to 200% of the platform's default view**, initially 100%. Mobile's existing 0.70 base zoom and desktop's 1.00 base zoom remain the defaults. UI instruments and action-circle sizes do not scale.

Action-button touches are excluded from the gesture. Starting a pinch releases steering and held action input. After finishing a pinch, lift all water-touch fingers before starting a fresh steering drag; the last finger cannot unexpectedly become a movement command. Normal steering plus an action-button finger continues to work.

Desktop mouse wheel zooms over active water. The top **telemetry/sliders** panel has a view-zoom slider and **RESET**, providing a non-gesture alternative. Survey-chart zoom remains independent. Gameplay continues while changing the live view; zoom is not a pause button.

The view preference is saved locally for this browser/device. It is not a new ship upgrade, campaign statistic or portable-save requirement. Rotation, zoom changes and expanded view preserve the follow anchor rather than teleporting the submarine. Limited zoom-out bounds constrain rendering workload; real-device performance still needs measurement.

## Preserved systems

All three campaign slots, resource coordinates, depleted crystals, recovery cargo, contracts, rescue drones, Warden progress, shipwreck security, earned finishes, achievements and owned ammunition are retained. Upgrade prices, crystal budgets, oxygen use, movement ratings, ammo prices and the fixed death loadout are unchanged. No new action button or currency is added. Music, audio fades and chosen app artwork are unchanged.

## Applying the update

1. Save and export a campaign backup. Banking cargo first is a sensible precaution.
2. Extract the update ZIP over a v0.23.0 repository. Include the new **`ship-systems.js`** along with every changed runtime file and the version manifest. Do not upload only `game.js`.
3. Deploy the files together, reopen the same game address online, and check for **v0.24.0 / NEREID Reforged**. Do not clear site data or reinstall to update.

Use the complete ZIP for a fresh source checkout instead; both downloads are not needed. These packages do not publish to GitHub themselves and are not a signed Android/Play Store build.

See `VERIFICATION-v0.24.0.md` for evidence, limits and reproducible tests. Screenshots use the real renderer with staged positions, synthetic progress and fitted equipment; they are not a full human campaign playthrough.
