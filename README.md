# The Abyss Below

## v0.16.0: Arsenal & Archives

A dependency-free HTML/CSS/Canvas/JavaScript submarine game for mobile and desktop browsers/PWAs. Three independent local campaigns, two upgradeable forward weapons, free dock gun reloads, paid mines, original interface music and visible hull-damage feedback.

## Install or update

For an existing v0.15.0 site, bank cargo and quit the old dive as a precaution, extract the update ZIP, and replace the matching files at the repository root. Publish these files together:

`index.html`, `styles.css`, **`campaign-slots.js`**, `audio.js`, `game.js`, `version-sync.js`, `service-worker.js`, `manifest.webmanifest`, `version.json`.

Keep the existing icons. Do not upload the ZIP itself or create an extra nested directory. Use the complete ZIP for a new installation. The package does not deploy automatically. Reopen the same site online and check for **v0.16.0 / Arsenal & Archives**. CHECK AGAIN compares the deployed checksums, runtime build markers and controlling service worker. Local/offline/unverified status must not be interpreted as a successful hosted upgrade.

Keep the same origin and browser profile. Do not clear site data, uninstall or start a new campaign to update. Existing single-campaign progress is migrated into Slot 1, with the old migration source preserved.

## Campaigns

SAVE / LOAD CAMPAIGNS is in both main and pause menus. Up to three independent, named campaigns retain their own world resources, upgrades, currencies, achievements, magazines and saved dive. NEW CAMPAIGN chooses an empty slot, never silently overwrites. Deletion requires a separate confirmation. Loading saves the departing slot and reloads into the selected campaign's menu; CONTINUE restores an expedition paused.

All storage is local, not cloud-synchronised. SAVE NOW, automatic checkpoints and action saves write the current slot. A previous-checkpoint backup, storage failure warnings and stale-window checks help protect saves but are not external backups. Close duplicate game windows before playing. Native Android storage and portable export/import are not part of this build.

## Weapons and ammunition

| Mark | Pulse Railgun: damage / rounds | Shock Torpedoes: damage / rounds |
|---|---|---|
| I | 35 / 12 | 95 / 3 |
| II | 50 / 18 | 140 / 4 |
| III | 70 / 24 | 200 / 6 |
| IV | 95 / 32 | 280 / 8 |

Hold **Z / RAIL** for rapid direct shots; tap **X / TORP** for a forward explosive round. Both start unfitted and are purchased in the dock. Gun magazines refill FREE at the physical dock, not over time or on reload. Rocks block shots. Friendly torpedo blasts spare your ship, but detonated abandoned mines remain dangerous. Weapons lock inside the protected harbour and above water.

Mines are unchanged: use **F / MINE**, capacity 2 / 4 / 6 / 8, ammunition purchased separately at 12 credits per round. No automatic mine refills.

Mobile has a larger RAIL / TORP / MINE row above smaller utilities, followed by USE and BOOST. Drag open water to anchor the invisible-until-used joystick. Desktop shows a keybind strip; mouse-held piloting and WASD/arrows remain.

## Full controls

| Action | Desktop | Mobile |
|---|---|---|
| Pilot | Hold left mouse; or WASD/arrows | Drag open water |
| Use / collect / dock | E, hold for repeated salvage | USE |
| Boost | Hold Space, requires magnetic thrusters | Hold BOOST |
| Railgun | Hold Z | Hold RAIL |
| Torpedo | X, one round per press | Tap TORP |
| Mine | F | MINE |
| Sonar | Q | SONAR |
| Repair | R | REPAIR |
| Lights | L | LIGHTS |
| Quiet running | Shift | SILENT |
| Map | M | Map icon |
| Pause | Escape | Pause icon |

## Five-level campaign

| Destination | Seabed | Recorders |
|---|---:|---:|
| Sunbreak Shelf | 300 m | 2 |
| Glassbone Rift | 600 m | 3 |
| Drowned Gardens | 1,000 m | 4 |
| Midnight Cathedral | 1,400 m | 5 |
| Calypso Abyss | 1,800 m | 6 |

Bank all recorders in a level to unlock the next. Switch freely between unlocked levels at the hub. Fixed scrap/crystals never respawn; predators and caches refresh after a genuine dive and return to that level's dock. Defeat or explicit Quit leaves recoverable resource cargo. Ordinary closing/reloading restores the saved expedition paused instead.

Scrap becomes 18 credits per unit on docking; crystals bank separately. All paid upgrades require both. Fixed resources total 15,192 credits and 496 crystals per fresh campaign. All 59 increments across 14 systems cost 15,173 credits and 464 crystals. Use renewable predator salvage for mine rounds and repair expenses. These are arithmetic budgets, not a fully playtested balance guarantee.

The compact HUD, survey map, beam upgrades, pressure limits, 20 achievements, three predator tiers, floating controls, breach physics, harbour safety, wildlife, contact mines and thermal vents remain. Damaged hulls now pulse red, including when exceeding safe pressure depth; darkness does not hide this warning.

## Sound

Original menu and dock music loops have a separate MUSIC slider. Music starts after interaction, stops for diving/pause, and all sound suspends when hidden. EFFECTS, AMBIENCE and mute remain independent. Audio is generated locally; no external music files or permissions are required.

## Development and verification

No npm build step. Host the files on HTTPS or use a local development server where the browser permits it. After EVERY runtime edit run:

```sh
python tests/build_release.py
```

The version manifest includes the exact runtime checksums. Inconsistent deployed assets intentionally do not get a green sync status.

Current test runner:

```sh
python tests/run_v0160.py --jobs 3
python tests/v0160_live_pwa_test.py
```

Tests require Python, Playwright, Node and Chromium. Current evidence is in `verification/v0.16.0/`, not historical reports. Some UI tests use synthetic credits/gear or deterministic scene fixtures, never real user saves. The live PWA test is separate and must not be described as passing because mocked worker tests passed.

Read **ARSENAL-ARCHIVES-v0.16.0.md** for full rules and prices, **VERIFICATION-v0.16.0.md** for tested/untested boundaries. Historical guides remain for earlier versions. This is a web/PWA source package, not a signed Android app bundle or Play Store-ready release.
