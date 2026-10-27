# Arsenal & Archives

The Abyss Below v0.16.0 · Build `0.16.0-arsenal-archives-1` · Base v0.15.0

## Three independent campaigns

SAVE / LOAD CAMPAIGNS is available from both the main menu and pause menu. Each of the three slots has its own campaign identity, five level layouts, depleted resources, map discoveries, secured recorders, achievements, currencies, upgrades, mine stock, gun magazines and resumable expedition. Sound preferences remain shared on the device.

The existing single campaign is copied into Slot 1 on first use. Its original storage is retained as a migration source and is not subsequently imported again when you deliberately delete a slot. The old weapons did not exist; Railgun and Torpedoes start unfitted. Old purchased mines are unchanged.

NEW CAMPAIGN now opens the slots rather than erasing progress. Choose an empty slot and give it a name. When all three slots are occupied, nothing is automatically overwritten. Delete a chosen slot explicitly to make room. A confirmation offers KEEP CAMPAIGN before permanent deletion. Achievements belong to each campaign, not a shared account.

The current card offers SAVE NOW. Loading another campaign first saves the current expedition, selects the destination and reloads the runtime to avoid state leaking between campaigns. Press CONTINUE to restore a saved expedition, paused. Merely loading a slot does not launch into live combat. Automatic checkpoints and critical-action saves still operate in the active slot.

These are local browser/device saves, NOT cloud saves or portable export files. Keep the same site origin and browser profile. Clearing site data, changing origin, private browsing or removing app storage can lose them. There is no account sync in this release. Storage failures are reported, switching is blocked when the departing save cannot be written, and an older open window is prevented from overwriting a newer checkpoint. A usable per-slot previous-checkpoint backup can recover a damaged primary. Unreadable files are preserved until explicitly deleted, and another good slot remains accessible. These protections are not a substitute for native storage or external backups.

## Two forward-firing ship weapons

Both weapons are independent Mk I–IV upgrades in the existing three-column dock catalogue. They require credits AND crystals. Each mark increases both damage and magazine size. A projectile uses the vessel's heading when fired; turning afterwards does not steer it. There is no homing or automatic aiming.

| Mark | Rail damage | Rail capacity | Rail price | Torpedo damage | Torpedo capacity | Torpedo price |
|---|---:|---:|---|---:|---:|---|
| I | 35 HP | 12 | 150 CR + 2 crystals | 95 HP | 3 | 200 CR + 3 crystals |
| II | 50 HP | 18 | 240 CR + 3 crystals | 140 HP | 4 | 320 CR + 4 crystals |
| III | 70 HP | 24 | 360 CR + 4 crystals | 200 HP | 6 | 480 CR + 5 crystals |
| IV | 95 HP | 32 | 520 CR + 5 crystals | 280 HP | 8 | 680 CR + 6 crystals |

PULSE RAILGUN: a fast direct projectile, firing at most once every 0.42 seconds. Hold Z on desktop, or hold RAIL on mobile, to repeat. Maximum travel is 62 m. Hits the first encountered predator; rocks and world boundaries stop it.

SHOCK TORPEDOES: a slower explosive projectile, with a 1.4-second firing interval and maximum travel of 100 m. Tap X or TORP for one shot; holding does not repeatedly fire it. The 10.5 m blast can damage multiple predators, with solid terrain blocking the damage path. Your own torpedo blast does not damage the vessel. Torpedoes do not consume player-laid mines.

Both weapons can detonate abandoned contact mines. Their old environmental blast still damages the submarine, so firing at one at close range is dangerous. Predators killed by either weapon use the existing salvage-drop and achievement paths.

### Free magazines, paid mines

Returning to the physical dock refills BOTH gun magazines for free. Installing/upgrading a weapon at the dock loads it to its new capacity. Opening the hub while already physically docked also reloads it. No credits, crystals, battery or mine stock are charged for these refills.

Gun rounds do NOT regenerate while waiting, exploring, pausing, reloading, restoring a save, dying or launching another expedition. Firing deducts a round immediately and saves the deduction. Cooldowns and projectiles in flight are part of the resumable expedition. Changing campaign does not refill the campaign you left.

Mines remain separate: capacity 2 / 4 / 6 / 8, rounds cost 12 credits each at the ammunition shop, and docking never refills them automatically. The AMMUNITION tab shows both free gun-magazine readouts above the existing paid mine shop.

Weapons are safety-locked inside the protected harbour and while airborne or too close to the surface. A blocked muzzle will not spend a round. Shots make noise and alert nearby predators. The new weapons make renewable credit hunting easier, but final campaign balance has not been established by a human playthrough.

## Controls and interface

Mobile's left action bank now begins with three equally prominent combat circles: RAIL, TORP and MINE. They are larger than the utility circles. Utility actions sit below, followed by the largest USE button and second-largest BOOST button. Portrait and compact landscape use different arrangements. Minimum checked action hit targets are 44 CSS pixels. The floating joystick still appears only when dragging free water; no fixed joystick was reintroduced.

Rail and torpedo circles show ammunition, unfitted status and cooldown rings. The compact top HUD stays compact; expanded telemetry adds the two magazines. Desktop keeps the keybind strip and shows Z RAIL / X TORP with ammunition, rather than touch controls. Existing E Use, Space Boost, Q Sonar, F Mine, R Repair, L Lights, Shift Silent, M Map and Escape Pause remain.

Actual multi-touch tests cover steering plus held rail, torpedo and mine, including release/cancellation. Actual phone ergonomics are still untested.

## Original interface music

The main menu and dock have two separate original eight-bar instrumental loops. The menu is 80 BPM (24 seconds); the dock is 88 BPM (approximately 21.8 seconds). They use rounded keys, soft bass and sustained pads, generated locally as stereo Web Audio buffers. Release tails wrap through the loop boundary, and scene transitions fade rather than stacking new loops indefinitely.

Music starts after a user interaction. It stops during dives and ordinary pause, and all audio suspends while hidden. Sound-settings previews remain usable. MUSIC has its own persistent volume slider, independent of EFFECTS and AMBIENCE; global mute still applies. Audio settings are device-wide, not per campaign. No external tracks, microphone access or audio downloads are used.

Signal and lifecycle tests are automated. They do not establish subjective musical quality, a phone-speaker mix, hearing comfort or battery performance.

## Visible damage feedback

Actual damage triggers a red overlay on the submarine. This includes bites, impacts, environmental damage, oxygen loss and continuous pressure damage beyond the safe hull limit. Shield impacts also give a red warning pulse alongside the shield effect. The hull outline is drawn after the darkness mask, making the warning visible even with the flashlight off without lighting the surrounding scenery.

Each pulse lasts 0.48 seconds and repeated pulses are gated to at most one onset per 0.85 seconds. This is a bounded, slow hull pulse, not rapid invulnerability flicker or a full-screen strobe. Existing pressure and low-hull HUD warnings remain. Exceeding safe depth is still dangerous; the flash is not a damage shield.

## Progression budget

The 8 new paid increments cost 2,950 credits and 32 crystals in total. The complete 14-system catalogue now has 59 paid increments costing 15,173 credits and 464 crystals. An untouched five-level campaign still contains 15,192 credits' worth of fixed scrap and 496 crystals, leaving 32 crystals beyond the entire upgrade tree. No finite deposits were moved or replenished for this release.

The 19-credit fixed-scrap margin does NOT cover mine ammunition or repair costs. Renewable predator salvage funds those expenses, and free-refilling guns provide an alternative to spending mine rounds to earn credits. The existing hull crystal-reserve safeguard remains active. Existing All Systems Go awards are retained; newly earning it now requires all 14 systems.

## Updating from v0.15

For a cautious update, bank cargo and quit the old dive first. Migration of an actual v0.15 active-dive fixture was also tested, including finite depletion and wildlife state. Do not clear site data or use New Campaign as an update procedure.

Upload the extracted update files to the same repository root, replacing matches. Include the NEW `campaign-slots.js` and the matching `version.json`; publish all runtime files together. The package does not push to GitHub for you. Reopen online after deployment, check for v0.16.0 / Arsenal & Archives and use CHECK AGAIN to verify the deployed release. A local test preview correctly remains unverified.

See VERIFICATION-v0.16.0.md for the current, limited scope of testing. A browser/PWA build is supplied, not a signed Android application bundle.
