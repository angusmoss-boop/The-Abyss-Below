# The Abyss Below

## v0.18.1: Guided Ordnance

A dependency-free HTML/CSS/Canvas/JavaScript submarine game for mobile and desktop browsers/PWAs. This combat-assistance patch adds gentle predictive railgun correction, strong forward-cone torpedo homing and slow-seeking planted mines. Existing campaign resources, prices, paid ammunition, contracts, artwork, seven-button controls and audio fixes are preserved.

Read [GUIDED-ORDNANCE-v0.18.1.md](GUIDED-ORDNANCE-v0.18.1.md) for mechanics and [VERIFICATION-v0.18.1.md](VERIFICATION-v0.18.1.md) for current evidence and limits. The previous content update is documented in [LOST-SIGNALS-v0.18.0.md](LOST-SIGNALS-v0.18.0.md).

## Install or update

Apply the update ZIP over v0.18.0 at the repository root. Save and export a campaign backup first; banking cargo is a sensible precaution. Upload the extracted contents together, including all changed runtime files, the worker and `version.json`. Use the complete ZIP for a fresh checkout. These files do not deploy themselves.

Reopen the same site online and check for **v0.18.1 / Guided Ordnance**. Keep the same origin and browser profile. Do not clear site data, uninstall or create a new campaign to update. Local/offline/unverified menu status is not proof of a hosted update.

## Automatic guidance

Rail rounds gently steer and lead predators within 32 degrees either side of their firing direction; torpedoes use a wider 65-degree cone and much stronger curvature. Targets must have a clear path through terrain. Shots never turn back, keep their existing speed/range/damage and consume ammunition only once. With no valid target they continue on their current course.

Armed player mines slowly seek predators within 20 m at up to 3.2 m/s, staying within 24 m of their original drop point. Rocks block targeting, movement and mine explosions. Mine arming and own-ship safety are retained; abandoned contact mines remain stationary tethered hazards. Guidance works at every fitted mark without an additional purchase or control.

## Lost Signals

At the physical dock, CONTRACTS offers three assignments with one active at a time. Cargo recovery, three-point surveys, predator control and quiet recovery pay credits only after a real return. Offers and progress persist. No countdown or crystal reward. ARCHIVE contains twenty short recorder transcripts, unlocked only by banking, and the optional Warden dossier. Journal: main/pause menus or J on desktop.

The Cathedral Warden sleeps near 1,170 m in Level 4 until you explicitly activate its observation buoy. Listen, evade its telegraphed charge, and attack during recovery. It stays in its territory and retains damage across returns. Its one-time dock bounty is 1,200 credits plus a cosmetic hull finish. It does not gate the story or required resources.

## Campaigns

SAVE / LOAD CAMPAIGNS is in both main and pause menus. Up to three independent, named campaigns retain their own world resources, upgrades, currencies, achievements, magazines and saved dive. NEW CAMPAIGN chooses an empty slot, never silently overwrites. Deletion requires a separate confirmation. Loading saves the departing slot and reloads into the selected campaign's menu; CONTINUE restores an expedition paused.

All storage is local, not cloud-synchronised. SAVE NOW, automatic checkpoints and action saves write the current slot. A previous-checkpoint backup, storage failure warnings and stale-window checks help protect saves but are not external backups. Close duplicate game windows before playing. EXPORT creates a portable .abyss.json campaign backup. Import shows a preview and requires confirmation before replacing the selected slot; imported copies progress independently. Native Android storage and cloud saves are not part of this build.

## Automatic salvage

The standard recovery radius is 6 m. Magnet Mk I-IV extends it to 10 / 14 / 18 / 22 m, with a power cost and visibility requirement for remote pickups. Scrap and predator salvage collect automatically; crystals and recorders still require USE. Rocks block recovery. Clean Sweep and Full Survey count each original site once, so respawning scrap does not undo achievements.

## Weapons and ammunition

| Mark | Pulse Railgun: damage / rounds | Shock Torpedoes: damage / rounds |
|---|---|---|
| I | 35 / 12 | 95 / 3 |
| II | 50 / 18 | 140 / 4 |
| III | 70 / 24 | 200 / 6 |
| IV | 95 / 32 | 280 / 8 |

Hold **Z / RAIL** for lightly guided rapid shots; tap **X / TORP** for a strongly homing explosive round. Both start unfitted and are purchased in the dock. Buy rail rounds for 6 CR or torpedoes for 24 CR in the dock Ammunition tab. No free refill on docking, upgrades, death or reload. Rocks block shots. Friendly torpedo blasts spare your ship, but detonated abandoned mines remain dangerous. Weapons lock inside the protected harbour and above water.

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
| Journal | J | Main/pause menu or dock Archive |
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

Current targeted test runner:

```sh
python tests/run_v0180.py
```

Tests require Python, Pillow, Playwright, Node and Chromium. Current evidence is in `verification/v0.18.0/`. The UI tests render production files in isolated documents with synthetic storage and the actual image bytes. They are not a real Android install or a hosted/offline integration result. Historical test runners remain in the archive for reference and may assert old release markers.

This remains a web/PWA source package, not a signed Android app bundle or Play Store release. Read **VERIFICATION-v0.18.0.md** for current tested/untested boundaries and **SALVAGE-SUPPLY-v0.17.0.md** for economy details.
