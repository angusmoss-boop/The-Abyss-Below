# The Abyss Below

## v0.9.0: Beyond the Beam

A standalone, dependency-free browser/PWA submarine expedition game. Pilot the NEREID through a 1,800 m trench, bank salvage, upgrade the vessel and recover six lost recorders.

### Install this update

1. Bank an active dive at the surface before refreshing. Your active vessel position and unbanked cargo are not saved across reloads.
2. Extract the v0.9.0 update ZIP. Copy its contents into the existing repository root, replacing matching files. Do not upload the ZIP itself or place the files in a nested folder.
3. Commit, allow GitHub Pages to deploy, then reopen online. Check **EXPEDITION BUILD v0.9.0** in the console footer. On mobile, collapse expanded play with the top view button to see the footer.

Keep the same site origin and browser profile. Banked credits, upgrades, rank, secured recorders and best depth keep the existing `the-abyss-below-v01` save key. Do not clear site storage or select NEW GAME to update. No repository push or deployment has been performed by this package.

The complete ZIP contains the full game, icons, source, documentation, tests and screenshots. The update ZIP contains changed files only. There are no new runtime libraries or downloaded assets.

### Mobile camera, unchanged controls

Touch devices now use **0.70x world zoom**: about **43% more visible world width and height**, or **2.04x the visible world area**, for the same canvas size. Desktop stays at **1.00x**, including narrow desktop windows. Input mode follows the primary pointer capability, not window width.

Only the ocean/world drawing changes scale. The top reference cards, circular actions, prompts and right-hand joystick retain their full CSS sizes. USE stays largest, BOOST second largest, and all eight actions stay bottom left. Rotation, expanded mode, darkness masking, sonar range and pointer-to-world conversion use the new camera dimensions.

### Flashlight Mk I to IV

Mk I comes fitted, including for older saves. Buy the next mark at the physical surface dock. These are separate purchases from battery, sonar and thruster upgrades.

| Lamp | Maximum reach | Full cone angle | Lamp draw per minute* | Upgrade price |
|---|---:|---:|---:|---:|
| Mk I | 26 m | 33° | 2.4 power | Standard equipment |
| Mk II | 36 m | 44° | 3.3 power | 75 CR |
| Mk III | 48 m | 55° | 4.5 power | 150 CR |
| Mk IV | 62 m | 69° | 6.0 power | 300 CR |

*Lamp-only consumption, before battery efficiency. Base systems, thrust, sonar and boost draw power separately. Prices are incremental, not cumulative. Maximum reach is the end of the soft-faded cone, not a claim of full brightness at that distance. Ten world units equal one metre.

Every upgrade increases both reach and angle, rather than merely changing the art. The same cone governs actual object visibility and the final darkness mask. Larger lamps draw somewhat more power but remain a slow background cost. Battery level b divides lamp draw by `1 + 0.12b`. Turning lights off eliminates their draw; pausing freezes power use; an empty battery extinguishes them. Cached beam textures are generated only on first use of a mark, not every frame.

Ambient light still fades gradually to zero at **1,000 m**. Below that, only the forward flashlight cone or temporary sonar echoes reveal the surroundings. Sonar is not permanent illumination.

### A wider, less loot-heavy trench

The trench is **exactly three times its previous width at every depth**. Depth remains 1,800 m, with six recorders at 75 / 260 / 470 / 725 / 1,100 / 1,500 m. Terrain generation uses three times as many rock candidates, more environmental details and three winding protected navigation lanes. Safe wreck clearances keep objectives accessible.

Predators are spread across three lateral bands rather than stacked into the old central passage:

| Predator | Per refreshed trench | Health | Chase speed | Region |
|---|---:|---:|---:|---|
| Drifter | 138 | 100 | 96 units/s | Throughout the trench |
| Abyss stalker | 33 | 200 | 158 units/s | Spawns below 400 m |
| Crimson reaper | 15 | 400 | 245.28 units/s | Below 800 m only |

Counts are three times the previous totals; tier proportions, damage, detection, pursuit leashes and speeds are unchanged. Reapers still match Mk IV normal magnetic thrusters. Boost increases speed to 1.85x and can open the gap.

Loot is reduced independently of map size. Each refreshed field has **180 scrap, 24 rare crystals and 30 supply caches**, plus unsecured mission recorders. Crystals first appear below 180 m; wrecks no longer guarantee crystal pairs. Eight starter scraps and two scraps beside each recorder wreck help retain early progression. These are total map counts, not a promise all are visible without lights/sonar. Counts and upgrade costs still need full-campaign playtesting.

### Dock-only population reset

Collected scrap, crystals and caches remain depleted. Damaged predators retain health, and killed predators stay dead. There is **no timed respawn**. Pausing, opening menus, resuming, abandoning a dive, launching a rescue vessel or reloading the page does not replenish them.

**Physically docking with E / USE** banks cargo, refills the vessel/ammo and starts a new population cycle. Enemies return at full health and ordinary loot is replenished. Rock layout and wreck positions stay fixed. Banked recorders never respawn. Unbanked mission recorders return to their mission locations after a lost/restarted dive, so they cannot become permanently unavailable.

A dock visit resets the field once. Buying upgrades or reopening the dock without departing does not repeatedly reroll it. Depart at least 145 world units from the station, then return and dock to begin another cycle. Dock resets clear planted mines, active blasts and sonar echoes, preventing old mines from immediately farming new contacts. Just reaching the surface without docking does not reset the field.

Population depletion uses a separate small local save, `the-abyss-below-field-v1`: a terrain seed, dock-cycle number, collected loot IDs and damaged/dead predator health. This does **not** save your active dive, enemy positions, mines, ammo, oxygen or unbanked cargo. If browser storage is blocked or cleared, depletion cannot survive reloads. NEW GAME resets both permanent progress and the field after confirmation.

### Controls

| Action | PC | Phone / tablet |
|---|---|---|
| Pilot | Hold left click and move cursor; or WASD / arrows | Drag right-hand joystick |
| Boost | Hold Space while piloting | Hold BOOST while steering/cruising |
| Deploy mine | F | Tap MINE |
| Sonar | Q | SONAR |
| Salvage / dock | E | Hold USE, including while moving |
| Quiet running | Hold Shift | Toggle SILENT |
| Repair | R | REPAIR |
| Flashlight | L | LIGHTS |
| Pause | Escape / PAUSE | Top pause button |
| Keep moving | Hold an input | Enable CRUISE, steer, release joystick |

On desktop, the bottom keybind strip replaces mobile controls. NEREID, MK II and the current pressure rating stay in top reference cards, alongside depth, hull, oxygen, power, noise, sonar, boost and mine readouts. The vessel model MK II is not your engine/hull/lamp upgrade level.

### Existing systems

**Boost:** 100 charge, 25 charge/second, up to four seconds, 1.5-second recharge delay, base recharge 12.5/second and extra draw 7 power/second before battery efficiency. Empty charge locks boost until full; release to rearm. Battery upgrades add capacity, reduce draw and improve recharge. Charge recovery never restores ship energy. Boost overrides quiet running.

**Sonar:** a 520-unit/second wave covers the current world viewport, including the enlarged mobile view. Contacts reveal only when the front arrives, with 4.5-second base echoes. Base cost 12 power and cooldown 5.5 seconds. Upgrades reduce cost/cooldown and extend echoes/range. Cooldown cannot end before the current wave completes. Nearby reached hunters may hear it.

**Mines:** warheads start unfitted; buy Mk I for 100 CR. Marks I-IV deal 60 / 110 / 180 / 240 damage, with incremental prices 100 / 180 / 320 / 520 CR. Independent ammo racks hold 2 / 4 / 6 / 8; Mk I rack comes fitted, later prices are 90 / 160 / 280 CR. Mines drop astern, arm after 0.65 seconds, trigger at 52 units and damage predators within 108 units. Launcher cooldown 1.1 seconds. No submarine friendly fire. Ammo only refills at the dock or a fresh vessel's surface launch, not via time, menus or supply caches.

**Hull:** 100 HP / 130 m safe depth initially. Seven upgrades each add 28 HP / 200 m, reaching 296 HP / 1,530 m. Exceeding the limit causes escalating pressure damage. The top pressure card turns red.

**Pause/menu:** Resume continues the current dive; Menu suspends it in this session; Quit abandons unbanked cargo, retaining permanent progress. New Game requires confirmation. Refreshing still loses an active dive, so bank before installing.

### Development and verification

Serve the repository root over HTTP, for example `python -m http.server 8000`. HTTPS or localhost is required for the installable/offline PWA path. Tests use Python Playwright plus Chromium; production has no build/install step.

See **VERIFICATION-v0.9.0.md** for executed tests and limitations. Core v0.9.0 checks are in `tests/v090_exploration_test.py`; earlier regression tests remain included. Debug-only mutators require `?testmode=1` or the explicit test flag. Normal production exposes only a read-only diagnostics snapshot.

Real Android/iOS hardware performance, prolonged touch ergonomics, browser storage eviction, and complete campaign economy/difficulty require manual playtesting. The generated update is not an automatic deployment.
