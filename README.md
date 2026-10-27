# The Abyss Below

## v0.10.0: Persistent Depths

A standalone, dependency-free browser/PWA expedition game. Pilot the NEREID through a 1,800 m trench, bank resources, purchase upgrades and recover six recorders. This release makes each campaign's salvage finite, introduces paid ammunition, ties boost to thruster upgrades, and replaces the fixed touch pad with a floating helm.

## Update your existing game

1. Return to the surface, bank cargo, then quit the active dive from the pause menu. Active dives and unbanked cargo still do not survive a page reload.
2. Extract the update ZIP and copy its contents into the existing repository root, replacing matching files. Do not upload the ZIP itself or put the game inside an extra nested folder.
3. Include the two new runtime files, **version-sync.js** and **version.json**. Commit all update files together. Partial uploads are deliberately reported as incomplete and cannot replace the verified offline shell.
4. Allow your existing GitHub Pages deployment to complete. Reopen online at the same address and browser profile. The title menu should show **v0.10.0 / Persistent Depths**. Press CHECK AGAIN if necessary.
5. **UP TO DATE · SYNC VERIFIED** means the running game, loaded HTML/CSS, published release hashes and controlling offline worker all agree. Offline, blocked checks or a worker still installing are reported honestly as unverified. It is not a cloud-save status or a check of unpublished GitHub commits.

No repository push, hosting change or live deployment is performed by this package. No app reinstall is required by the update process. Do not clear site data, change host/browser profile or select NEW GAME merely to update. Saved campaigns are local to this browser and site, not synced between devices.

Existing banked credits, upgrades, secured recorders, best depth and current v0.9 resource placements/depletion migrate automatically. **v0.9 ammo starts empty**: that version's free rounds were not owned persistent stock. Buy rounds under AMMUNITION after updating. Your launcher and capacity upgrades remain fitted.

## Floating mobile controls

Touch open water anywhere and drag to pilot from that starting point. A minimal transparent joystick appears only after the drag passes a small dead zone. A stationary tap shows no pad. Release hides it. The first water finger owns steering until released; extra fingers cannot steal it. Action buttons and menus never start steering.

All eight circular actions remain at bottom left, USE largest and BOOST next. Steering, boost, use and mines can be operated simultaneously with separate fingers. Pause, app switching, pointer cancellation and orientation changes release inputs. CRUISE can retain the last commanded heading after an ordinary release, as before.

Mobile world zoom stays at 0.70x; PC stays at 1.00x. Instruments retain full size. Desktop still uses click-held steering or keyboard movement and the bottom key-reference strip.

| Action | PC | Touch |
|---|---|---|
| Pilot | Hold left click and move cursor; WASD / arrows | Touch and drag open water anywhere |
| Boost | Hold Space while moving, once thrusters are fitted | Hold BOOST while steering / cruising |
| Collect / dock | E | USE |
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

There are **180 scrap deposits and 24 crystal clusters**. Each yields **2 units**, so there is more value without adding more visual clutter. An untouched map is worth **8,640 credits**, compared with **9,354 credits** for the entire upgrade tree. That is about **92%**, before ammunition, field repairs or losses. Existing campaigns that have already collected resources have less remaining. Eight shallow starter bundles and objective-adjacent resources support early progression.

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

Legacy `the-abyss-below-v01` and `the-abyss-below-field-v1` records are read for migration but no longer written. Current v0.9 seed/cycle placements and collected IDs are retained. Do not downgrade to an earlier build after using the new campaign format: earlier releases cannot read it and could show their old progress. New Game requires confirmation and intentionally resets the campaign, seed, resources, upgrades, ammo and banked progress.

This is **not** a full mid-dive save. Vessel position, oxygen, power, active mines and unbanked cargo are not restored after reload. Finite resource depletion and ammunition spending do persist. Bank before updating or closing the game.

## Release verification and development

See `VERIFICATION-v0.10.0.md` for precise test coverage and limitations. Three current Chromium suites cover campaign/economy/migration, touch/desktop controls and gameplay regressions. Two Node suites run production version-checker/service-worker code with mocked browser/network/cache boundaries. These mocks are not live online/offline PWA integration tests.

Runtime is plain HTML/CSS/JavaScript with no build dependency. Serve the root over HTTPS for service workers; localhost is also a secure development context in compatible browsers. Before deploying any edit to a runtime asset, regenerate checksums:

```sh
python tests/build_release.py
```

All three version/build markers and the release manifest must agree. Use a new version/build ID for a new published release. Do not hand-edit a deployed runtime file without regenerating the manifest.

Current commands and harness caveats are in `tests/README-v0.10.0.md`. Historical tests and reports are retained for reference, but old assertions about free ammo, fixed joysticks or resource respawns are superseded by this release. Physical phone performance, a complete campaign playthrough and real hosted update/offline operation remain unverified in this environment.
