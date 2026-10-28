# v0.18.2: Recovery Protocol

Build: `0.18.2-recovery-protocol-1`  
Base: **v0.18.1 / Guided Ordnance**

## Lost-vessel recovery

When the submarine is destroyed, every unbanked scrap unit, crystal and recorder aboard is transferred to one persistent lost-vessel recovery site. Previously banked currencies, secured recorders, upgrades and achievements are unaffected. Purchased ammunition is not salvageable cargo: it is replaced by the rescue loadout below.

The loss screen lists the site's depth and exact cargo manifest. An amber LOST VESSEL contact appears on that level's survey chart, and the waypoint is automatically pinned to it. The existing direction arrow follows the pin. The object has a small broken-hull silhouette and an orange beacon; it remains subject to the normal flashlight/sonar darkness mask. Its chart/radar beacon does not illuminate surrounding terrain.

Approach the site and press E / USE to recover its complete manifest. Recovery is deliberately manual even with a Salvage Magnet fitted. The contents enter the current submarine's unbanked cargo. Return to the physical dock to bank them. Recovered recorders unlock their journal entries and count towards the next level only after docking, exactly as directly collected recorders do.

Recorders in a lost-vessel manifest do not also appear at their original wrecks. A recorder-only loss still creates a recovery objective. A death with no unbanked cargo creates no empty wreck and leaves all earlier recovery sites intact.

### Repeated deaths

Earlier recovery sites remain until collected, including through later deaths, docking, travelling between levels, closing/reopening the game and switching campaign slots. A new death creates another site for that expedition's cargo; it does not overwrite the previous one.

Recovering a site removes its old manifest. Dying again before banking transfers the recovered cargo into the new loss site, rather than leaving two copies. Collection, pending cargo, recorder ownership and the active checkpoint are written through the existing single-slot save transaction.

### Placement

The actual loss depth is preserved, including pressure deaths beyond the current hull rating. This can make improving the hull useful before attempting a retrieval. Sites are not automatically moved above your hull limit.

A surface breach loss settles into underwater space. A loss inside the docking berth settles just below the berth so E / USE can recover it rather than always opening the dock. Rock or boundary overlaps are moved into nearby clear water, favouring the closest valid location. Existing environmental mines/vents immediately around a recovery approach are sheltered using the existing recovery-safety rules. Predators are not globally disabled around wrecks.

Deliberately quitting a dive also preserves all three cargo types in a recovery pod, but does not grant rescue ammunition. Ordinary save/resume restores the active expedition instead of creating a wreck. If a checkpoint is invalid, its redundant cargo journal can recover scrap, crystals and recorders without duplicating a manifest or granting defeat ammunition.

## Fixed rescue ammunition

A genuine defeat replaces owned stock with:

| Ammunition | Rounds after defeat |
|---|---:|
| Pulse Railgun | 10 |
| Shock Torpedo | 3 |
| Sea Mine | 3 |

This is an exact replacement, not an addition, a refill to capacity or a minimum guarantee. For example, 32 rail rounds become 10; zero rail rounds also become 10. The replacement is committed with the loss so closing the defeat screen, going to the menu, exporting, switching slots or reloading cannot repeatedly add rounds.

Weapons still require their normal installation upgrades. Rescue ammunition for an unfitted launcher is retained as owned reserve stock until that launcher is purchased. Receiving ammunition never grants an upgrade or enables a locked fire button.

The starting mine rack has two ordinary slots. To honour the fixed three-mine rescue loadout, it can temporarily carry one emergency mine beyond its fitted capacity. That third round is usable and persists through saves and equipment purchases. The mine meter is capped visually, and the shop explains the emergency reserve. No extra ammunition can be purchased while at or above the fitted capacity. Once spent, an ordinary full refill still buys only two rounds unless the rack has been upgraded.

Normal paid refill prices remain 6 CR per rail round, 24 CR per torpedo and 18 CR per mine. Docking, upgrading, waiting, quitting, switching levels/campaigns or loading a save does not grant a rescue loadout. Ship upgrade prices, crystal prices, weapon statistics and magazine upgrades are unchanged.

## Campaign compatibility

All three existing slots retain their credits, crystals, equipment, ammunition, achievements, contracts, Warden state, world layouts and resource history. Existing magazines are not reset merely because the game was updated. The new exact ammunition rule applies when a defeat occurs in this build.

Old recovery pods retain their scrap and crystals. They gain an empty recorder manifest because older releases did not store recorder IDs in pods. A recorder already returned to its original wreck by an older build remains there; the update does not invent or duplicate a historical loss. An old active expedition retains the recorders actually aboard, and its next loss uses the new manifest.

Portable campaign exports include the new manifests and reserve ammunition. Import checks reject malformed amounts, invalid/duplicated recorder IDs, conflicting recorder ownership and inconsistent active recovery manifests. New-format saves should not be opened in an older game build.

Crystal deposits remain finite and do not respawn on death. Scrap retains the existing slow, active-dive regeneration rules. Guided rail rounds, homing torpedoes, seeking player mines, compact controls, app artwork and audio transitions are unchanged.

## Installing

Save and export a campaign backup from v0.18.1 first. Apply the extracted update contents over the existing repository at the same site address. Upload all changed files together, including `game.js`, `lost-signals.js`, the interface assets, worker and `version.json`; do not upload just the gameplay script. After hosting finishes, reopen online and check for **v0.18.2 / Recovery Protocol**.

Do not clear browser/site data or start a new campaign to update. These packages do not deploy themselves and do not contain a native Android App Bundle. See `VERIFICATION-v0.18.2.md` for actual tests and unverified device/offline behaviour.
