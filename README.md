# The Abyss Below

## v0.17.2: Delta Helm

A dependency-free HTML/CSS/Canvas/JavaScript submarine game for mobile and desktop browsers/PWAs. This patch implements a left-side weapon triangle above a four-button graduated Boost / Use / Sonar / Repair row. Silent and cruise modes are removed; movement speed controls noise, with existing Silent Drive upgrades working passively. The flashlight switch is in telemetry. All three campaign slots and the v0.17 economy are preserved.

See [DELTA-HELM-v0.17.2.md](DELTA-HELM-v0.17.2.md) and [VERIFICATION-v0.17.2.md](VERIFICATION-v0.17.2.md).

## Install or update

For an existing v0.17.1 site, bank cargo and quit the old dive as a precaution, extract the update ZIP, and replace the matching files at the repository root. Publish these files together:

`index.html`, `styles.css`, **`campaign-slots.js`**, `audio.js`, `game.js`, `version-sync.js`, `service-worker.js`, `manifest.webmanifest`, `version.json`.

Keep the existing icons. Do not upload the ZIP itself or create an extra nested directory. Use the complete ZIP for a new installation. The package does not deploy automatically. Reopen the same site online and check for **v0.17.2 / Delta Helm**. CHECK AGAIN compares the deployed checksums, runtime build markers and controlling service worker. Local/offline/unverified status must not be interpreted as a successful hosted upgrade.

Keep the same origin and browser profile. Do not clear site data, uninstall or start a new campaign to update. Existing slots retain their saves, finite crystal depletion, owned rounds and upgrades. The existing original-scrap recovery timers are preserved.

## Campaigns

SAVE / LOAD CAMPAIGNS is in both main and pause menus. Up to three independent, named campaigns retain their own world resources, upgrades, currencies, achievements, magazines and saved dive. NEW CAMPAIGN chooses an empty slot, never silently overwrites. Deletion requires a separate confirmation. Loading saves the departing slot and reloads into the selected campaign's menu; CONTINUE restores an expedition paused.

All storage is local, not cloud-synchronised. SAVE NOW, automatic checkpoints and action saves write the current slot. A previous-checkpoint backup, storage failure warnings and stale-window checks help protect saves but are not external backups. Close duplicate game windows before playing. Native Android storage and portable export/import are not part of this build.

## Automatic salvage

The standard recovery radius is 6 m. Magnet Mk I-IV extends it to 10 / 14 / 18 / 22 m, with a power cost and visibility requirement for remote pickups. Scrap and predator salvage collect automatically; crystals and recorders still require USE. Rocks block recovery. Clean Sweep and Full Survey count each original site once, so respawning scrap does not undo achievements.

## Weapons and ammunition

| Mark | Pulse Railgun: damage / rounds | Shock Torpedoes: damage / rounds |
|---|---|---|
| I | 35 / 12 | 95 / 3 |
| II | 50 / 18 | 140 / 4 |
| III | 70 / 24 | 200 / 6 |
| IV | 95 / 32 | 280 / 8 |

Hold **Z / RAIL** for rapid direct shots; tap **X / TORP** for a forward explosive round. Both start unfitted and are purchased in the dock. Buy rail rounds for 6 CR or torpedoes for 24 CR in the dock Ammunition tab. No free refill on docking, upgrades, death or reload. Rocks block shots. Friendly torpedo blasts spare your ship, but detonated abandoned mines remain dangerous. Weapons lock inside the protected harbour and above water.

Mines: use **F / MINE**, capacity 2 / 4 / 6 / 8, ammunition purchased separately at 18 credits per round. No automatic mine refills.

Mobile has an icon-only weapon triangle (railgun above torpedo and mine). A single row below is Boost, Use, Sonar and Repair, decreasing in size. Unfitted equipment is grey; thin rings preserve charge/cooldown/ammunition feedback. Exact stocks and the flashlight switch are in telemetry. Drag open water to anchor the floating joystick; light drags move quietly, and release stops thrust. Desktop shows a keybind strip; mouse-held piloting and WASD/arrows remain. Silent Drive insulation is passive, with no manual silent mode or cruise latch.

## Full controls

| Action | Desktop | Mobile |
|---|---|---|
| Pilot | Hold left mouse; or WASD/arrows | Drag open water |
| Crystals / recorders / supplies / dock | E | Large collection icon |
| Scrap recovery | Automatic within magnet range | Automatic within magnet range |
| Boost | Hold Space, requires magnetic thrusters | Hold chevrons |
| Railgun | Hold Z | Hold upper weapon icon |
| Torpedo | X, one round per press | Tap lower-left weapon icon |
| Mine | F | Lower-right weapon icon |
| Sonar | Q | Sonar icon |
| Repair | R | Wrench icon |
| Lights | L | Sliders / telemetry → FLASHLIGHT |
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

Bank all recorders in a level to unlock the next. Switch freely between unlocked levels at the hub. Crystals never respawn. Collected scrap sites become eligible after 5 active dive minutes, then restore at most one deposit per 45 seconds per visited level and only out of view. Pauses, harbour waiting, inactive campaigns and offline time do not advance these timers. Predators and caches refresh after a genuine dive and return to that level's dock. Defeat or explicit Quit leaves recoverable resource cargo. Ordinary closing/reloading restores the saved expedition paused instead.

Scrap becomes 18 credits per unit on docking; crystals bank separately. All paid upgrades require both. Initial resources total 15,192 credits and 496 finite crystals per fresh campaign. All 59 paid increments across 14 systems cost 22,765 credits and 464 crystals. Credit upgrade prices are 50% higher, rounded up, and crystal prices are unchanged. Use recovered scrap and predator salvage for additional upgrades and all weapon ammunition. These are arithmetic budgets, not a fully playtested balance guarantee.

The compact HUD, survey map, beam upgrades, pressure limits, 20 achievements, three predator tiers, floating controls, breach physics, harbour safety, wildlife, contact mines and thermal vents remain. Damaged hulls now pulse red, including when exceeding safe pressure depth; darkness does not hide this warning.

## Sound

Original menu, dock and chilled pause music loops share a separate MUSIC slider. Music starts after interaction. Pausing fades game effects and ambience into the pause theme; resuming fades back to the dive. Background audio fades to zero before suspension, with cancellation-safe rapid resume. EFFECTS, AMBIENCE and mute remain independent. Audio is generated locally; no external music files or permissions are required.

## Development and verification

No npm build step. Host the files on HTTPS or use a local development server where the browser permits it. After EVERY runtime edit run:

```sh
python tests/build_release.py
```

The version manifest includes the exact runtime checksums. Inconsistent deployed assets intentionally do not get a green sync status.

Current test runner:

```sh
python tests/run_v0172.py --jobs 3
python tests/v0172_live_pwa_test.py
```

Tests require Python, Playwright, Node and Chromium. Current evidence is in `verification/v0.17.2/`, not historical reports. Some UI tests use synthetic credits/gear or deterministic scene fixtures, never real user saves. The live PWA test is separate and must not be described as passing because mocked worker tests passed.

Read **SALVAGE-SUPPLY-v0.17.0.md** for full rules and prices, **VERIFICATION-v0.17.2.md** for current tested/untested boundaries. Historical guides remain for earlier versions. This is a web/PWA source package, not a signed Android app bundle or Play Store-ready release.
