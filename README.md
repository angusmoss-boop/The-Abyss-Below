# The Abyss Below

## v0.11.0: Adaptive Systems

A standalone, dependency-free browser/PWA expedition game. Pilot the NEREID through a 1,800 m trench, bank resources, purchase upgrades and recover six recorders. This release rebuilds the dock around a three-column catalogue and detailed purchase pop-ups, then adds three optional systems: the Salvage Magnet, Kinetic Shield and Sonic Disruptor.

## Update your existing game

1. Return to the surface, bank cargo, then quit the active dive from the pause menu. Active dives and unbanked cargo still do not survive a page reload.
2. Extract the update ZIP and copy its contents into the existing repository root, replacing matching files. Do not upload the ZIP itself or put the game inside an extra nested folder.
3. Keep **version-sync.js** present and include the updated **version.json**, game, stylesheet, HTML and worker. Commit all update files together. Partial uploads are deliberately reported as incomplete and cannot replace the verified offline shell.
4. Allow your existing GitHub Pages deployment to complete. Reopen online at the same address and browser profile. The title menu should show **v0.11.0 / Adaptive Systems**. Press CHECK AGAIN if necessary.
5. **UP TO DATE · SYNC VERIFIED** means the running game, loaded HTML/CSS, published release hashes and controlling offline worker all agree. Offline, blocked checks or a worker still installing are reported honestly as unverified. It is not a cloud-save status or a check of unpublished GitHub commits.

No repository push, hosting change or live deployment is performed by this package. No app reinstall is required by the update process. Do not clear site data, change host/browser profile or select NEW GAME merely to update. Saved campaigns are local to this browser and site, not synced between devices.

Existing v0.10 campaigns retain banked credits, all previous upgrades, secured recorders, owned ammunition, exact resource placements and depleted deposits. The three new systems start unfitted at level 0. No reset or new campaign is required. For older v0.9 saves only, free ammo was never persistent owned stock and migrates empty; launcher and rack upgrades remain fitted.

## Dock overhaul: twelve systems, three columns

The SHIP UPGRADES catalogue is a fixed three-column, four-row grid on both platforms. Tiles show only the system name. Tapping a tile opens a separate native modal with a description, installed marks, side-by-side current/next specifications, field notes, available credits and a single paid install/upgrade action. Prices and statistics do not crowd the catalogue. Fully upgraded or unaffordable systems remain inspectable; their purchase buttons explain why buying is unavailable.

The vessel remains paused while reading or buying. Escape, the close button or the backdrop closes the child pop-up and returns focus to the selected tile, without undocking. Keyboard focus stays within the top modal. The dock has a separate AMMUNITION tab, a persistent credits display and an always-reachable UNDOCK button. Small landscape layouts scroll the catalogue independently of the header and departure controls.

The original nine upgrade paths keep their prices and limits. Three optional systems each add four paid marks. No new action circles or keyboard shortcuts are required. The shield meter appears in the existing top system row only once fitted.

## Three new ship systems

### Salvage Magnet

Hold **USE** on mobile or **E** on PC to recover scrap, crystals and predator drops from farther away. Ordinary close collection remains free, even with an empty battery. Remote collection consumes power per pickup, not continuously while the button is held. Deposits are collected at their original positions; the magnet does not move or regenerate the saved map.

| Mark | Recovery reach | Remote pickup cost | Upgrade price |
|---|---:|---:|---:|
| Mk I | 10 m | 1.2 power | 80 CR |
| Mk II | 14 m | 1.0 power | 130 CR |
| Mk III | 18 m | 0.8 power | 200 CR |
| Mk IV | 22 m | 0.6 power | 300 CR |

The standard close-use range is 6 m. Resources must be visible in sufficient ambient light, inside the working flashlight beam, or revealed by an unexpired sonar echo. A clear route is required: the magnet cannot reach through rocks or trench walls. Recorders and supply caches retain their original close-use range. Multiple nearby resources are collected one at a time while USE/E remains held. The interaction prompt displays the remote pickup's power cost.

### Kinetic Shield

An automatic barrier absorbs **predator bites and rock impacts** before hull HP. Damage beyond the available shield spills into the hull. It does **not** absorb pressure damage or oxygen-loss damage, so hull progression and air management remain essential.

| Mark | Shield capacity | Recharge rate | Upgrade price |
|---|---:|---:|---:|
| Mk I | 20 HP | 2 HP/sec | 100 CR |
| Mk II | 35 HP | 3 HP/sec | 180 CR |
| Mk III | 50 HP | 4 HP/sec | 280 CR |
| Mk IV | 70 HP | 5 HP/sec | 420 CR |

Recharge begins after **8 seconds without an impact**. Each recovered shield point costs **0.35 battery power**. Recharge pauses during boost and at very low battery; the delay still counts down during boost. Docking restores the fitted barrier. A top SHIELD meter shows charge and recharge status. The brief impact outline is painted into the world before the darkness mask, so it does not reveal unlit scenery.

### Sonic Disruptor

Press the existing **SONAR / Q** action. When sufficient power is available, the scan carries a short-range disruption pulse that stops predators from moving or biting when the expanding wave reaches them. It does not deal damage or replace mines. The scan itself still reveals the full current screen; disruption has its own smaller radius.

| Mark | Disruption radius | Drifter stun | Extra power per scan | Upgrade price |
|---|---:|---:|---:|---:|
| Mk I | 18 m | 1.2 sec | 3 | 90 CR |
| Mk II | 22 m | 1.6 sec | 4 | 160 CR |
| Mk III | 26 m | 2.0 sec | 5 | 250 CR |
| Mk IV | 30 m | 2.4 sec | 6 | 380 CR |

Stalkers receive **80%** of the listed duration; Reapers receive **60%**. Thus Mk IV briefly stops a Reaper for **1.44 seconds**, not 2.4. Existing sonar cooldowns prevent repeated immediate pulses. The extra power is charged in addition to the fitted sonar's base scan cost. If only the normal scan is affordable, it still fires without a stun and the field log explains the fallback. An unaffordable ordinary scan cannot fire. Sonar outlines identify stunned targets while their echo remains visible.

These systems work together: reveal salvage with sonar, recover it using the magnet, or stun a pursuing predator to buy time to boost or plant mines. The shield is an impact buffer, not a licence to descend beyond your hull rating.

## Floating mobile controls

Touch open water anywhere and drag to pilot from that starting point. A minimal transparent joystick appears only after the drag passes a small dead zone. A stationary tap shows no pad. Release hides it. The first water finger owns steering until released; extra fingers cannot steal it. Action buttons and menus never start steering.

All eight circular actions remain at bottom left, USE largest and BOOST next. Steering, boost, use and mines can be operated simultaneously with separate fingers. Pause, app switching, pointer cancellation and orientation changes release inputs. CRUISE can retain the last commanded heading after an ordinary release, as before.

Mobile world zoom stays at 0.70x; PC stays at 1.00x. Instruments retain full size. Desktop still uses click-held steering or keyboard movement and the bottom key-reference strip.

| Action | PC | Touch |
|---|---|---|
| Pilot | Hold left click and move cursor; WASD / arrows | Touch and drag open water anywhere |
| Boost | Hold Space while moving, once thrusters are fitted | Hold BOOST while steering / cruising |
| Collect / dock | E, or hold E to collect repeatedly | USE / hold USE |
| Mine | F | MINE |
| Sonar | Q | SONAR |
| Repair | R | REPAIR |
| Lights | L | LIGHTS |
| Quiet running | Hold Shift | SILENT toggle |
| Pause | Esc | Top pause button |

## Magnetic thrusters and boost

The standard drive has **no boost**. Buy Mk I Magnetic Thrusters at the dock to unlock it. Each subsequent mark increases ordinary speed, boosted speed and full-charge duration.

| Thrusters | Normal speed | Boost multiplier | Boosted speed | Full charge |
|---|---:|---:|---:|---:|
| Standard | 14.60 m/s | Unavailable | Unavailable | 0 s |
| Mk I | 17.08 m/s | 1.45x | 24.77 m/s | 3 s |
| Mk II | 19.56 m/s | 1.60x | 31.30 m/s | 4 s |
| Mk III | 22.05 m/s | 1.75x | 38.58 m/s | 5 s |
| Mk IV | 24.53 m/s | 1.85x | 45.38 m/s | 6 s |

Speeds rounded from internal world units (10 units = 1 m). Battery upgrades still reduce boost energy cost and accelerate recharge. Recovery begins after 1.5 seconds without boosting. Complete exhaustion locks boost until full and requires releasing the input before reuse. Boost overrides quiet running. The Crimson Reaper still matches Mk IV **normal** speed, not boosted speed.

## Permanent resources and predator salvage

Each campaign stores a fixed resource snapshot for its selected level. The current game contains one playable level, Calypso Trench; this update does not introduce a new level selector. A new campaign generates its resource layout once. Docking, quitting, rescue, menu navigation and reloading do not move or replenish scrap/crystals.

There are **180 scrap deposits and 24 crystal clusters**. Each yields **2 units**, so there is more value without adding more visual clutter. An untouched map is worth **8,640 credits**, compared with **11,924 credits** for the entire upgrade tree. That is about **72%**, before ammunition, field repairs or losses. Existing campaigns that have already collected resources have less remaining. Eight shallow starter bundles and objective-adjacent resources support early progression.

| Destroyed predator | Recoverable scrap | Bank value |
|---|---:|---:|
| Drifter | 2 | 36 credits |
| Abyss Stalker | 4 | 72 credits |
| Crimson Reaper | 8 | 144 credits |

Kill rewards appear as salvage at the kill location, with a safe nearby placement if necessary. They are **not instant credits**: collect them, return safely and dock to bank them. Uncollected drops persist across reloads and dock visits. A single kill cannot award twice. Collected cargo can still be lost by death, abandoning a dive or reloading before banking; the original finite deposit does not reappear.

**Predators and the 30 supply caches still refresh only on a genuine return to the dock after departure.** Reopening the dock or buying upgrades without departing does not reset them. Rock layout, resource positions and depleted resource IDs remain unchanged. Secured recorders stay secured. Unbanked recorders remain recoverable after a lost dive. Refresh removes old deployed mines/sonar echoes, but does not delete uncollected kill salvage.

## Paid mine ammunition

The dock now has separate **UPGRADES** and **AMMUNITION** tabs. Buy Mk I Sea Mine Warheads to fit the launcher, then buy rounds for **12 credits each**. BUY 1 and FILL RACK are available. With insufficient credits for a full refill, the bulk button buys only the affordable number and displays the exact price.

Warhead power remains 60 / 110 / 180 / 240 damage. Independent capacity upgrades remain **2 / 4 / 6 / 8 slots**. Extra slots arrive empty. Rounds use the current warhead mark, so there is no separate incompatible ammo type per mark.

Spent rounds are saved immediately. Loaded rounds persist across docking, relaunch, death and reload, but none of these events grants free rounds. Unlocking warheads, upgrading capacity, buying another upgrade, collecting caches or waiting cannot replenish ammunition. Only a successful paid purchase increases owned stock.

## Existing exploration features retained

The expanded trench remains three times the original width and 1,800 m deep, with six recorders at 75 / 260 / 470 / 725 / 1,100 / 1,500 m. Each fresh predator cycle has 138 Drifters, 33 Stalkers and 15 Reapers. Health remains 100 / 200 / 400. Tier 2 begins below 400 m and Tier 3 below 800 m.

Ambient light fades continuously to complete darkness at 1,000 m. Mk I-IV flashlight reach remains 26 / 36 / 48 / 62 m with progressively wider cones and slow power draw. Sonar reveals objects as the expanding wave reaches them, then fades; it has a cooldown. Mines, pursuit leashes, swept collision handling and simultaneous mobile actions are retained. The top cards show ship name, mark and current pressure rating instead of a nameplate over the vessel.

## Saving and recovery

The canonical localStorage record is `the-abyss-below-campaign-v2`. It holds the banked profile, owned ammunition, campaign ID and per-level field records together. A previous valid record is kept at the same key with `.backup`. If the primary record is unreadable, the backup can recover it and the menu shows a warning. A storage failure is reported, not disguised as a saved campaign.

Legacy `the-abyss-below-v01` and `the-abyss-below-field-v1` records are read for migration but no longer written. Current v0.9/v0.10 seed/cycle placements and collected IDs are retained. The v0.11 modules are additive profile fields, not a new campaign schema. Do not downgrade to an earlier build after using the new campaign format: earlier releases cannot read it and could show their old progress. New Game requires confirmation and intentionally resets the campaign, seed, resources, upgrades, ammo and banked progress.

This is **not** a full mid-dive save. Vessel position, oxygen, power, active mines and unbanked cargo are not restored after reload. Finite resource depletion and ammunition spending do persist. Bank before updating or closing the game.

## Release verification and development

See `VERIFICATION-v0.11.0.md` for precise test coverage and limitations. Five current Chromium suites cover the three new systems, dock/purchase/layout/migration, campaign economy, touch/desktop controls and gameplay regressions. An additional static release suite checks HTML wiring and checksums. Two Node suites run production version-checker/service-worker code with mocked browser/network/cache boundaries. These mocks are not live online/offline PWA integration tests.

Runtime is plain HTML/CSS/JavaScript with no build dependency. Serve the root over HTTPS for service workers; localhost is also a secure development context in compatible browsers. Before deploying any edit to a runtime asset, regenerate checksums:

```sh
python tests/build_release.py
```

The runtime build markers and the release manifest must agree. Use a new version/build ID for a new published release. Do not hand-edit a deployed runtime file without regenerating the manifest.

Current commands and harness caveats are in `tests/README-v0.11.0.md`. Historical tests and reports are retained for reference, but old assertions about inline purchases, free ammo, fixed joysticks or resource respawns are superseded by this release. Physical phone performance, a complete campaign playthrough and real hosted update/offline operation remain unverified in this environment.
