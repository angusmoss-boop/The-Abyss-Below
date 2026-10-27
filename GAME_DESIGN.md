# The Abyss Below: Current Game Design

## v0.10.0: Persistent Depths

This document describes the current build. Historical changelog entries describe old behaviour, not additional active rules.

### Expedition loop

Pilot, listen, illuminate, salvage and return. The permanent campaign is about choosing which equipment earns the next safe depth band. Docking banks cargo, restores hull/oxygen/power, opens upgrades and the paid ammunition shop, and refreshes threats and supply caches only after a genuine departure/return. Permanent resources never refresh. A surface visit without docking does not bank cargo or reset populations.

### Geography and progression

One playable campaign level, Calypso Trench, has a saved terrain seed and immutable resource snapshot. The world is 1,800 m deep and three times the original lateral width, with three winding navigation lanes, obstacles, wrecks and six recorder objectives at 75, 260, 470, 725, 1,100 and 1,500 m. Seven hull upgrades add 200 m safe depth and 28 hull HP each; the maximum safe pressure depth is 1,530 m. Securing all six recorders is the campaign objective.

The original banked profile, rank progression, repair cost, flashlight, sonar, silent running and upgrade purchase prices are retained. Mobile shows more world at 0.70x; desktop remains 1.00x. A lightless world begins at 1,000 m; instruments remain readable.

### Finite resources, renewable enemies

There are 180 scrap deposits and 24 crystal clusters, each yielding two units, plus 30 resupply caches. Scrap banks at 18 credits per unit, crystals at 45. The map's untouched deposit economy is 8,640 credits. The complete upgrade tree costs 9,354 credits. This deliberately funds most equipment without requiring more map clutter, while renewable kill drops cover remaining costs and consumables. These are arithmetic balance checks, not a claim of a completed campaign playtest.

Resource IDs, coordinates, quantities and collected flags are stored per level and persist between docks/reloads. Existing v0.9 current-cycle positions are migrated without reshuffling. The eight shallow starter bundles support first upgrades. Existing collected resources do not return after the update. Unbanked resources consumed by repairs or lost on death/quit/reload are lost; their deposits remain depleted.

Enemies refresh only after departing the dock radius and returning to dock. Reopening services does not regenerate anything. Supply caches use the same refresh event. Each kill awards one physical scrap drop: 2 for Drifter, 4 for Stalker, 8 for Reaper. Uncollected drops persist, even when enemies refresh. Collection plus successful docking is required for credit. The same kill cannot be rewarded twice.

### Threats and ordnance

The refreshed field contains 138 Drifters, 33 Stalkers and 15 Reapers, maintaining lower density for higher tiers. Health is 100/200/400, contact damage 13/27/42 and chase speeds 96/158/245.28 world units per second. Stalkers spawn below 400 m; Reapers do not enter the upper 800 m. Finite perception and pursuit leashes remain. Reaper chase speed exactly equals Mk IV normal thrust.

Mine warheads Mk I-IV deal 60/110/180/240 damage. Independent racks hold 2/4/6/8 rounds. Paid ammunition costs 12 credits per round, regardless of warhead mark. Unlocking a launcher or a larger rack supplies no rounds. A round uses current fitted warhead power when deployed. Mines arm after 0.65 seconds, have a 1.1-second deployment cooldown, damage multiple nearby predators and cannot damage the submarine. Deployed mines are cleared at population refresh and are not restored across reloads.

A new Ammunition dock tab offers one round or all missing affordable rounds. Every purchase atomically deducts credits and adds owned stock. Every deployment persists the spent round. Docking, rescue, launch, upgrades and caches never create ammunition. Unspent purchased rounds survive death/reload.

### Thruster-based boost

Standard drive speed is 146 world units/s and has no boost. Each engine mark adds 17% of the standard normal speed. Boost multipliers Mk I-IV are 1.45/1.60/1.75/1.85. Boost capacities are 75/100/125/150, spent at 25 per second, yielding 3/4/5/6 seconds. Recharge begins after 1.5 seconds, at base 12.5 per second. Full exhaustion requires full recharge and releasing the boost command. Battery upgrades retain cheaper power cost and faster recharge. Boost produces noise and overrides quiet running.

### Control and display contract

Touch steering starts at the first open-water finger, anywhere not occupied by a control or modal. It remains hidden until a drag clears the dead zone. A simple transparent base/thumb then tracks the held gesture. Release hides the helm. First pointer ownership prevents a second finger from stealing steering. Action fingers can independently hold/use/boost/mine. Pause, cancel, orientation change and app blur clear input. All eight circular actions remain bottom left, USE largest and BOOST second. CRUISE retains its existing explicit-heading mode.

Desktop shows a bottom keyboard reference, not mobile controls. Hold left click for cursor steering or use WASD/arrows. Space boosts only with a fitted engine. Both platforms show top ship/mark/pressure cards and health/oxygen/power/noise/sonar/boost/ammo instruments. The vessel has no overhead nameplate.

### Save and deployment boundaries

The atomic campaign record contains a profile and a per-level field object. It tracks banked progress, purchased ammunition, immutable resource records, depletion, enemy damage/death and drops, plus the legitimate dock-return flag. A previous valid record is retained for recovery. Only one level is currently playable. This format supports future level keys without pretending a level selector exists now.

Active vessel state and cargo are not saved. Finite resource collection and ammunition spend are persistent, so reloading during a dive can lose unbanked value. NEW GAME is an explicit confirmed reset. Local campaign saves are not cloud sync.

The menu's sync check fetches the hosted release manifest and six runtime assets without caches, compares SHA-256 checksums, checks loaded HTML/CSS/game build markers and asks the controlling worker whether its complete verified shell is present. Green means agreement with the current deployed build, not unpublished repository commits. Offline or inconclusive checks never show latest verified. An incomplete upload cannot install the new worker shell. Manual loading is blocked while an expedition remains active. No update check clears saved campaign data.

### Validation priorities

Current tests cover true mobile pointer input, layout, purchase flows, deterministic migration, permanent depletion, kill rewards, all engine marks, all warhead/predator combinations, collisions and canvas-level lighting. Network/worker boundaries are mocked separately. Physical hardware, a hosted update/offline round trip and full-campaign tuning still require playtesting. See the verification report for the actual evidence and limitations.
