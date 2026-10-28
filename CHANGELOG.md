# v0.21.0: Lifeline

- Increase oxygen consumption from 0.22 to 0.30 units/second before recycler efficiency, with actual remaining/full-tank time estimates.
- Reduce baseline and ordinary-thrust power costs; preserve boost, sonar, flashlight, shield and magnet costs.
- Replace zero-power immobilisation with half-speed reserve thrust scaled by fitted thrusters; boost remains unavailable on empty power.
- Add rare deterministic battery-cell sites, immediate capped recharge, automatic close pickup, persistent eight-minute active-dive recovery and offscreen staggered replenishment.
- Preserve finite crystals, existing resource placement and original-site achievement denominators; support cell state in checkpoints and portable backups.
- Redesign main/pause/dock with consistent command typography, campaign progress, live readiness, clear balances, icon navigation and responsive scroll/departure layout.
- Prefer a closer interaction buoy/package over a nearby resource, preventing crystals from swallowing the first USE at the Warden observation site.
- Preserve all prices, purchased equipment, three slots, compact controls, audio transitions, combat, mission and recovery systems.

# v0.20.0: Fluid Frontiers

- Keep Mk I lighting unchanged; upgraded forward fans now span 70 / 110 / 150 degrees, with existing length/drain and dark rear.
- Apply swept rock/wreck/world collisions to all predators; add bounded local route steering and legacy embedded-position repair.
- Replace magnetic collection beams with compact icon/quantity notices for all pickup categories.
- Replace fixed school slots with individual smoothly varied swimming, front/rear speed adjustment and wider reactive scattering.
- Add a desktop circular keyboard-reference/action bank with weapon stock, cooldowns and live state; preserve mobile controls.
- Keep original 20 achievements; add Warden, discovery, shortcut, contract, recovery, breach and haul objectives for 30 total.
- Increase every paid upgrade's previous credit cost by 25%, rounded up; preserve crystal/ammunition prices and fitted equipment.
- Fix backup importer release compatibility so a current-version export can be reimported.
- Preserve the three campaign slots and active expedition schema.

# v0.19.0: Forgotten Giants

- Added five optional cutaway wreck interiors in side alcoves, without moving original rocks or resources.
- Added four open exits per structure, a sonar-identifiable panel and a permanent bulkhead shortcut.
- Added manual identification-plate recovery, archived stories and five earned cosmetic finishes in Journal / Discoveries.
- Integrated plate-only and mixed losses into persistent wreck recovery, three slots, active snapshots and portable backups.
- Added some Drifter packs, telegraphed Stalker ambushes and observation-limited Reaper interception at unchanged tier speed/health.
- Added visible-only guidance-candidate markers for rail and torpedo, no new input or cost.
- Expanded survey bounds while preserving the original cell origin; stable object IDs protect evolving wreck sonar snapshots.
- Preserved previous currency, finite crystals, salvage regeneration, mission, Warden, ammo and audio rules.

# v0.18.1 / Guided Ordnance

## v0.18.2 / Recovery Protocol

- Persistent lost-vessel manifests include unbanked scrap, crystals and recorder IDs; recorder-only losses are retained.
- Recorders in recovery sites are suppressed at original wrecks until recovered and banked. They never simultaneously occupy two sites.
- Loss beacons are marked and pinned automatically, with a distinctive broken-hull marker and cargo summary on the defeat screen.
- Loss position is retained even beyond hull pressure limits. Surface/berth and rock overlaps move into nearby recoverable water.
- Repeated deaths preserve older sites; re-losing recovered cargo creates one new site rather than duplicating it.
- Each defeat replaces owned stock with exactly 10 rail rounds, 3 torpedoes and 3 mines. Unfitted launchers remain locked; the starter mine rack temporarily accepts its third emergency round.
- Dock purchases keep normal capacities/prices. Zero/negative refill transactions and UI ring overflow are guarded.
- Active checkpoints, per-level persistence, all three slots and portable backups carry the new manifests and rescue stock.
- Ordinary quits keep cargo in a recovery pod without granting rescue ammunition. No economy, homing, controls or audio changes.


- Railgun: limited forward acquisition and predictive course correction; torpedoes: wider acquisition and stronger bounded steering.
- Stable target locks with line-of-sight/range/cone checks, live-target revalidation and safe reacquisition. No automatic fire or new controls.
- Armed player mines slowly seek local predators, remain tethered to a finite patrol radius around their drop position, and stop at terrain or target loss.
- Relative swept mine collisions handle both moving actors and partial-frame arming; solid rock blocks proximity triggering and mine blast damage.
- Preserve all weapon damage, magazines, cooldowns, ranges, prices, paid-ammo rules and campaign resources. Environmental contact mines and harmless fish are not homing targets.
- Persist target IDs, shot heading/velocity and mine anchors; legacy in-flight ordnance remains compatible. Validate new optional fields in campaign imports.
- Updated dock information/help, current release markers and immutable cache manifests. Existing music/audio logic and compact controls unchanged.

# v0.18.0 / Lost Signals

- Persistent contract board: three offers, one active assignment, four mission types, accessible targets, bank-only credit rewards and free retries.
- Twenty optional written recorder transmissions in five chapters; only banked recordings decrypt. Journal from main, pause, dock or J.
- Optional, explicitly activated Cathedral Warden with listening, telegraphed charge and recovery phases, territorial retreat, persistent wounds and checkpoint state.
- One-time 1,200 CR dock bounty and selectable cosmetic gold-and-teal Warden Hunter hull finish.
- Export each campaign to a portable .abyss.json file; preview-and-confirm imports with validation, corruption checks, overwrite warnings and stale-slot/write-failure guards.
- New radio, assignment and resident-encounter cues retain prior music and click-free transition envelopes.
- No new currencies, upgrade costs, combat buttons, compulsory missions or crystal replenishment. Existing finite resources and all previous campaign systems are retained.

# v0.17.4 / Crystal Descent

- Approved crystal-cavern art replaces launcher, Apple touch, favicon and title-menu branding.
- Versioned ordinary and maskable icons, with unchanged application identity and campaign storage.
- Lightweight startup screen with actual initialization/decode handoff and bounded failure fallbacks.
- Responsive artwork-led title menu retaining all existing actions and deployment status.
- Additional icon/artwork checks in deployment verification and the offline shell.
- No changes to gameplay, economy, control layouts, campaign schema or audio logic.

# v0.17.3 / Smooth Signals

- Fixed reproduced pause envelope snapping to zero by explicitly anchoring current gain before ramping.
- Cancelled stale fade endpoints on quick resume; wait for audio-clock silence before background suspension.
- Removed duplicate global audio unlock listener; already-running unlock calls no longer restart output/mixer fades.
- Moved unchanged original music synthesis off the UI thread with a yielding fallback and stale-scene request protection.
- Repaired the looping water texture join; added attack scheduling headroom and zero-ended one-shot releases.
- No changes to saves, economy, controls or musical scores. Eleven targeted automated suites passed; physical-device listening and live deployment remain untested.

# v0.17.2 / Delta Helm

- Tight mobile weapon triangle: railgun above torpedo and mine. Cyan linkage is decorative and pointer-transparent.
- One four-button bottom row in descending size: Boost, Use, Sonar, Repair. Enlarged centred icons; no visible captions; minimum 44px targets.
- Removed silent and cruise toggles, latched cruise behaviour and Shift slowdown. Actual underwater speed controls noise and gentle analogue input reduces propulsion use.
- Retained Silent Drive as passive insulation with unchanged prices and fitted levels. Legacy saved quiet flags are cleared when restoring.
- Moved the mobile flashlight toggle into telemetry; safe to change while paused and persistent across reload. Desktop L remains.
- Existing pause fade/music, three slots, weapon economy, regeneration and crystal scarcity preserved. No new resource or upgrade costs.

# v0.17.1 / Quiet Command

- Compact icon-only bottom-left controls; vertical railgun/torpedo/mine stack, larger SVG icons, retained charge/cooldown/ammunition rings and accessible labels.
- Grey unfitted weapons and boost with no LOCKED captions; purchased equipment updates immediately. Use remains largest, then Boost. Floating steering and PC references unchanged.
- Separate gameplay and preview audio buses; 0.38-second pause release instead of abrupt voice stop/context suspension.
- Original 40-second, 48 BPM pause theme, independent MUSIC volume, warm pads and sparse melody. Existing menu/dock themes retained.
- Background output reaches zero before suspension; rapid input cancels stale suspension. Delayed voices initialise silently for safe cancelled attacks.
- No changes to campaign schema, currencies, resources, prices, weapons or ammunition economy.

# v0.17.0 / Salvage & Supply

- Original scrap sites recover after five active dive minutes, paced to one deposit every 45 seconds per visited level, never in view; queues persist independently in each campaign.
- No wall-clock, offline, paused, inactive-slot or harbour recovery. Crystal placements, depletion and all crystal upgrade prices unchanged.
- Automatic range-aware salvage and predator-drop collection; crystals/recorders stay manual. Power/visibility/collision gates and base free close collection preserved.
- First-harvest ledgers preserve Clean Sweep / Full Survey progress despite replenishing scrap.
- All upgrade credit prices increased 50%, rounded up: 22,765 CR + unchanged 464 crystals for the whole tree.
- Paid dock rail/torpedo/mine ammunition: 6 / 24 / 18 CR per round. Three responsive supply cards, single and affordable bulk purchases.
- No free ammo from docking, weapon installation, any upgrade, death, loading, relaunch or slot changes. Existing owned stock retained.
- Physical dock repairs, air and power remain free. Existing combat, map, wildlife, music, 3 slots and active-dive resume preserved.

# v0.16.0 / Arsenal & Archives

- Three independent local campaign slots, one-time migration into Slot 1, explicit named creation and confirmed deletion; active expeditions resume paused.
- Guarded per-slot saves, previous-checkpoint recovery, storage failure and stale-window protection. Original legacy data retained.
- Pulse Railgun and Shock Torpedoes, four paid marks each, damage/capacity increases, physical-dock free magazines. Paid mine supply unchanged.
- Swept projectile collisions, terrain obstruction, torpedo area damage, abandoned-mine interaction, saved ammunition/cooldowns/in-flight shots.
- RAIL / TORP / MINE combat row, circular left utility controls, Z/X desktop binds and magazine references.
- Original menu/dock stereo loops with independent music volume and scene/visibility lifecycle handling.
- Bounded red submarine damage pulse including pressure and oxygen loss, visible through deep darkness without revealing scenery.
- Upgrade catalogue now 14 systems / 59 paid steps: 15,173 credits + 464 crystals. Existing fixed stocks and earned achievements retained.

# v0.15.0 / Wild Waters

- Added deterministic persistent contact-mine layouts and swept hull/predator triggers. Mine clears survive dock cycles, level switching and reload. Protected approaches and old-save arrival safeguards.
- Added four fish designs, schooling/separation, obstacle avoidance, current influence, sonar/boost/predator startle and viewport-limited simulation.
- Added structured pulsing vents with visible warning, upward flow, harmless first-level seeps, deeper thermal damage and chart/sonar integration.
- Added retracting anemones/tube colonies, current-sensitive fan corals and retreating crabs on existing terrain.
- Expanded procedural sound with distinct abandoned blasts, chains, vents, schools, kelp, harbour machinery, wrecks and docking clamps. Independent audio buses, distance, limits and mute retained.
- Extended active snapshots with wildlife and validated per-level encounter data without changing resource placements, economy or canonical save key.
- Prevented unrelated remote environmental kills/noise from rewarding dock camping; avoided initial predator spawns on mines.
- Maintained compact controls, all prior mechanics and version/checksum/worker wiring.

Previous releases below are historical.

# Changelog

## v0.14.0 | Living Depths

- Compact glass-strip HUD, twelve-reading telemetry dialog, on-demand fullscreen/manual controls and explicit low-hull warning.
- Full active-expedition snapshots, five-second checkpoints and critical-action saves; paused restoration, no offline simulation, safe backgrounding and atomic end-of-step commits.
- Persistent per-level survey cells, discovered contacts, temporary predator contacts, paused map, touch/keyboard zoom/pan and one waypoint per level.
- Five deterministic scenery palettes, fifteen landmarks and bounded horizontal currents with sheltered harbour/central route, without changing fixed terrain/resource RNG.
- Original procedural Web Audio effects and ambience; independent levels, mute, sound preview and safe pause/background lifecycle.
- Ten-asset release manifest, audio build verification, saved-expedition reload protection and actual v0.13 compatibility fixture.
- Preserved upgrade costs, finite stocks, paid ammunition, achievements, harbour safety and momentum breaches.

Current acceptance evidence: VERIFICATION-v0.14.0.md. Historical entries below describe their own release rules.


## v0.13.0 · Harbour Rising (27 October 2026)

- Remodelled the in-world station as twin pontoons around an open berth, with a lit operations cabin, communications mast/dish, crane, service equipment, mooring pylons, downlights and a marked protected approach. Added a separate sky, distant headlands and foreground waterline.
- Added a 260-unit predator-safe dock approach with a larger 330-unit exclusion buffer. Spawn/patrol/movement enforcement applies across predator tiers; pursuit stops on arrival and bites are guarded separately. Normal combat resumes outside. Oxygen/rock/pressure hazards remain; protection does not bank cargo automatically.
- Replaced the dead-stop top boundary with speed-triggered ballistic breaches, gravity, mild air drag, splash/ripple effects and damped re-entry. Normal speed can leap; upgrades/boost increase height. No underwater thrust or boost is applied in air; depth remains non-negative and splashdown itself is harmless.
- Docking now anchors the sub and clears velocity. Airborne docking is blocked. Pause freezes the leap. Cargo journals and emergency pods use valid underwater positions when a dive is interrupted above the surface, protecting finite crystals against reload/quit/defeat loss.
- Added fitted-mark and current/maximum badges to all twelve three-column dock tiles, with BASE / UNFITTED states and gold borders plus MAX text when fully upgraded. Detailed pop-ups and purchases remain available, including for completed systems.
- Preserved campaign schema 3, five level layouts/stocks, saved progress, dual currencies, achievements, upgrade prices and paid-ammunition rules. Added a compatibility fixture generated by the actual archived v0.12 code, new surface/safety/tier tests and current release checks. See VERIFICATION-v0.13.0.md for executed outcomes and limits.

## v0.12.0 · Fivefold Descent (27 October 2026)

- Added five selectable campaign destinations, physical seabeds at 300/600/1000/1400/1800 m, and 2/3/4/5/6 banked-recorder gates. Unlocked maps remain freely revisitable from a new EXPEDITIONS hub tab; switching never rerolls finite resources or refreshes enemies.
- Increased obstacle density, predator density, health and damage by level without breaking the Mk IV/Reaper speed relationship or the 800 m Reaper restriction. Seabed collision covers rotated and boosted submarine capsules; sonar reveals floor contours.
- Added exactly 20 persistent, progress-tracked achievements in the main/pause menus, with unlock notices and campaign reset semantics. Objectives cover exploration, recorders, surveys, hunting, sonar, magnet use, shields, safe return and equipment completion.
- Split crystals from credits. Scrap still banks at 18 CR/unit; crystals bank as crystals. All 51 paid upgrade increments require both. Hull III costs 297 CR + 10 crystals; safe depths now end at 1,830 m. Fresh stock is 15,192 CR + 496 crystals; full upgrade cost is 12,223 CR + 432 crystals. Ammo remains 12 CR per round and never auto-refills.
- Added per-pressure-gate crystal-reserve purchase checks. Inaccessible deep crystals cannot justify spending the last shallow crystals needed for hull progression.
- Added persistent recovery pods for unbanked scrap/crystals on defeat, quit or reload. Atomic cargo/depletion journaling avoids destroying irreplaceable crystal stock or minting duplicate currency. Active vessel position and combat state still do not resume after reload; unbanked recorders return to wrecks.
- Migrated to campaign schema 3. Existing credits, upgrades, ammo and old finite trench progress are retained in Level 5; the four new levels must still be unlocked in order. Imported old recorders retain their locations, and missing crystal stock is added once without respawning collected old deposits.
- Updated hub/popup currency displays, campaign objectives, floor status, notifications, help and deployment markers. Kept existing floating controls, mobile/desktop zoom, flashlight, boost, ordnance and adaptive systems.
- Added current campaign, achievement/world, migration, responsive interface, touch, systems, gameplay, integrity and mocked update/worker checks. Actual acceptance outcomes and limitations are in VERIFICATION-v0.12.0.md.

## v0.11.0 · Adaptive Systems (27 October 2026)

- Replaced the long dock list with twelve name-only tiles in a fixed three-column grid. Added separate native upgrade pop-ups with current/next stats, mark progression, field notes, exact price, credit balance, maximum-tier and affordability states. Buying stays in the pop-up; closing returns to the catalogue without unpausing. Preserved the paid Ammunition tab.
- Redesigned the station with compact vessel/credits summaries, segmented service tabs, restrained glass panels, accessible focus treatment, scrollable catalogue/content and a pinned undock/purchase footer. Reduced header height in short landscape layouts. Added nested-modal keyboard isolation and focus restoration.
- Added Salvage Magnet Mk I-IV: 10/14/18/22 m range, 1.2/1.0/0.8/0.6 power per remote pickup, 80/130/200/300 CR. USE and held E recover visible resource deposits and kill drops across clear water. Rocks/walls block the link; unlit/unrevealed deep resources cannot be pulled. Close pickups stay free. Recorders and supply caches keep their old range. The immutable resource map is not moved.
- Added Kinetic Shield Mk I-IV: 20/35/50/70 HP, recharge 2/3/4/5 HP/sec after 8 sec without impact, cost 0.35 power per restored point, prices 100/180/280/420 CR. Absorbs bites and impacts, spills excess damage into hull and does not bypass pressure/oxygen damage. Recharge pauses during boost or near-empty power. Added a fitted-only top SHIELD instrument without new touch actions.
- Added Sonic Disruptor Mk I-IV: 18/22/26/30 m radius, 1.2/1.6/2.0/2.4 sec Drifter stun, 3/4/5/6 extra sonar power, 90/160/250/380 CR. Stuns arrive with the sonar wave, stop movement/bites and expire. Stalkers/Reapers get 80%/60% duration. Normal sonar remains available when extra disruption power is unaffordable. Existing cooldown and echo visibility apply.
- Kept old upgrade prices, map layout, finite loot, predator refresh rules, paid ammo and thruster progression. Existing v0.10 campaigns migrate unchanged except three new unfitted module fields. Full upgrade-tree cost becomes 11,924 CR; fixed map value remains 8,640 CR. No active-dive save was added.
- Added systems/dock tests, adapted the retained campaign/input/gameplay suites to the real pop-up purchase flow, captured real UI screenshots and verified actual archived v0.10 save migration. Real HTTP/offline testing remains environment-blocked, not reported as passed. See VERIFICATION-v0.11.0.md.

## v0.10.0: Persistent Depths (2026-10-27)

- Title menu now shows running version, release name and a truthful deployment/cache verification state. Added no-store release manifest fetches, runtime checksums, build markers, offline/unverified/partial-update states, manual checks and guarded update loading.
- Added `version-sync.js` and `version.json`. Service-worker installation verifies a complete shell before activation; failed partial deployments keep the earlier shell. Verification requests never use cached latest-version data.
- Replaced the permanent touch pad with a low-contrast floating joystick anchored at the first open-water touch, visible only during a drag. Action buttons keep independent multi-touch handling. PC controls and camera scales unchanged.
- Standard drive no longer boosts. Thruster Mk I-IV unlock and improve boost with 3/4/5/6 seconds of charge and 1.45/1.60/1.75/1.85 speed multipliers. Battery efficiency/recharge upgrades retained.
- Added atomic, level-keyed campaign storage and previous-record backup. Migrates v0.9 exact resource coordinates, depletion and banked upgrades without creating new resources on return to dock.
- Scrap/crystal positions and depletion are permanent within the campaign. Existing 180 scrap deposits and 24 crystal clusters yield two units each, worth 8,640 credits on an untouched map versus 9,354 for all upgrades.
- Destroyed Drifters/Stalkers/Reapers drop 2/4/8 recoverable scrap; drops persist until collected. Only docking banks their value. Enemies and supply caches remain dock-refreshed, providing renewable salvage income.
- Added separate dock Ammunition tab: 12-credit rounds, single purchase or affordable refill. No free ammunition on launch, docking, rescue, reload or any upgrade. Capacity remains 2/4/6/8; extra slots are empty. Migrated v0.9 rounds begin empty because they were not persistent owned inventory.
- Added current browser tests, real-renderer previews, mocked deployment/worker boundary tests and an explicit verification report. Live hosted PWA behaviour and physical devices remain untested.

## v0.9.0 · Beyond the Beam (27 October 2026)

- Set touch-only world zoom to 0.70, exposing about 43% more distance on each axis and 2.04x the area. Kept PC zoom at 1.00 and preserved the CSS sizes/layout of HUD, joystick and circular actions. Updated world/screen transformations, darkness coverage, rotation/focus anchors and sonar viewport range.
- Added the EXPLORATION FLASHLIGHT dock tree. Mk I comes fitted; Mk II/III/IV cost 75/150/300 CR. Beam lengths are 26/36/48/62 m, full angles about 33/44/55/69 degrees. Real visibility and the darkness mask use each upgraded cone. Lamp draw is a slow 2.4/3.3/4.5/6.0 power/minute before battery efficiency.
- Tripled trench width at every depth, rock placement candidates and predator populations. Three protected lateral routes and safe wreck clearances remain. Counts are now 138 drifters, 33 stalkers and 15 reapers; speed, health, damage and depth floors are unchanged.
- Reduced ordinary loot to 180 scrap and 24 crystals, plus 30 caches. Crystals appear below 180 m and no longer occur as guaranteed wreck pairs. Eight early scraps and two at each wreck support initial progression.
- Moved population replenishment to physical docking, once per dock visit. Terrain stays fixed; banking recorders keeps them removed. Damaged/dead predators and depleted ordinary loot persist through time, menus, relaunch and reload using a separate compact local save. Active vessel/cargo/mines are still not reload-persistent. Dock cycles clear deployed mines and sonar echoes.
- Added safe migration for the lamp mark, field-save validation, new-game dual-save reset, new exploration regression tests and updated previous tests for the intentional changed counts/camera. Updated versioned shell/cache URLs to v0.9.0.
- Test results and hardware/economy limitations are documented in VERIFICATION-v0.9.0.md.

## v0.8.0 · Glass Cockpit (27 October 2026)

- Rebuilt all eight mobile gameplay actions as circular controls: largest USE, next-largest BOOST and six smaller action buttons. Kept all actions bottom left; moved CRUISE from the joystick to the left-hand bank. Only the redesigned analogue helm remains on the right.
- Added inline vector icons, layered translucent navy surfaces, restrained cyan/amber accents, live boost/sonar perimeter rings, ammo counts, toggle states and visible active/cooling/unavailable feedback. USE highlights when an interaction is available.
- Added responsive portrait, landscape and small-landscape arrangements. Secondary targets are at least 44 CSS pixels in tested viewports, while primary controls remain larger. Preserved independent pointer capture and simultaneous steering, boost, mine deployment and salvage.
- Replaced duplicated console/mobile metrics with one top cockpit: vessel name, MK II model, live pressure limit, depth, hull, oxygen, power, noise, sonar, boost, mine ammo, sector and warning status. Wide panels put eight system tabs in a row; narrower panels wrap them. Removed the floating vessel nameplate from the world canvas. Pressure alerts now highlight the top reference/depth cards.
- Replaced desktop touch pads with a bottom mouse/keyboard reference strip, in normal and immersive views. Selected controls by primary pointer capability, not a width breakpoint. Top HUD values are read-only, including the former clickable mine display; F remains the desktop deployment key.
- Kept safe-area spacing, visible focus outlines, state labels and reduced-motion support. Geometry-driven toast/prompt offsets avoid the HUD and control banks. Corrected deep numeric and low-power label fit on 320-pixel screens.
- Updated help, design documentation, regression UI expectations, asset URLs and the service-worker cache to v0.8.0. No save-key, progression or gameplay-balance change.
- Ten Chromium browser suites pass (the expanded cockpit suite was executed in four groups), plus syntax and mocked service-worker lifecycle checks. Real HTTP/offline integration remains blocked by ERR_BLOCKED_BY_ADMINISTRATOR. Real-device touch ergonomics, Android/iOS performance and installation remain unverified. See VERIFICATION-v0.8.0.md.

## v0.7.0 · Teeth & Traps (27 October 2026)

- Increased chase/patrol speeds across all three tiers. Drifters chase at 96, stalkers at 158 and reapers at 245.28 world units per second. Reaper chase speed now shares the Mk IV normal-thruster calculation; normal top-tier thrust cannot pull away in a settled straight chase, while boost can.
- Added 100 / 200 / 400 predator health. Hits persist within a dive. Dead enemies are removed before attack resolution and excluded from radar and pending sonar echoes. Tier-coloured health bars obey normal lighting and timed sonar visibility.
- Added stationary proximity sea mines: F, clickable MINES HUD, and an independent mobile MINE button. Mines drop astern, arm after 0.65 seconds, trigger at 52 units and damage predators within 108 units. Swept checks prevent fast cross-frame contacts being missed. A mine damages each target once and does not harm the submarine.
- Added independent dock warhead and ammo-rack upgrades. Warheads Mk I-IV: 60 / 110 / 180 / 240 damage, costing 100 / 180 / 320 / 520 credits. Racks Mk I-IV: 2 / 4 / 6 / 8 ammo; the standard two-slot rack is fitted, later upgrades cost 90 / 160 / 280 credits. Buy Mk I warheads to unlock firing.
- Ammo refills only while docked or launching a fresh vessel at the surface. No timer, supply cache, field repair, sonar, boost or menu/resume refill. Planted mines keep their original warhead damage and persist until triggered or the dive ends.
- Added 1.1-second launcher cycling, held-key repeat protection, station safety, blocked-stern rejection without ammo loss, area-hit feedback, blast effects and sonar-visible mine markers.
- Compacted mobile controls into a three-column left cluster: large USE with MINE beside it, steering remaining on the right. Tested actual simultaneous steering, boost, mine deployment and salvage in narrow portrait and landscape layouts.
- Preserved existing banked progress and added safe defaults for missing/invalid ordnance fields. No change to the six-recorder campaign, pressure progression, darkness or menu flow.
- Bumped runtime URL/cache version to v0.7.0. Nine Chromium browser suites, JS syntax and the mocked service-worker lifecycle pass. Actual HTTP/offline testing remains blocked by the environment; Android hardware/performance and full-campaign balance are not verified. See VERIFICATION-v0.7.0.md.

## v0.6.0 · Silent Echoes (27 October 2026)

- Added desktop hold-left-click/drag piloting. Screen-space mouse targets follow the camera correctly, turn the bow and flashlight, and ease thrust near the cursor. Releasing outside the canvas, cancelling, pausing, opening a dialog or losing focus clears held input. Keyboard and mobile joystick/cruise remain available.
- Added Space / mobile hold-BOOST propulsion at 1.85x speed. A 100-point capacitor lasts four seconds at full use. Boost additionally draws 7 battery units per second before upgrades, waits 1.5 seconds before recharge, then restores 12.5 charge per second. Empty capacitors lock until full, with release-to-rearm protection. No energy is created by charge recovery.
- Battery upgrades now reduce boost draw by the existing efficiency multiplier and increase boost recharge speed by 10% per level. Boost is noisy and overrides quiet running. Docking or purchasing an upgrade refills the capacitor.
- Added compact boost meter, recharge status and a hold button in the left-hand mobile action cluster; sonar buttons now display a cooldown countdown.
- Replaced instant sonar reveal with an expanding wavefront. The scan reaches all current screen corners, including large desktop views, with additional upgraded range. Contacts reveal on arrival, rather than at launch. Echo outlines include salvage, recorders, supply caches, predators, rocks, wrecks, vents and trench walls.
- Sonar echoes and the travelling ring are now intentionally drawn above the depth-darkness mask, then fade out. This supersedes the v0.5.0 rule that masked sonar entirely. The world returns to black after echoes expire when lamps are off at 1,000 m or deeper.
- Separated enemy sonar visibility from its AI alert timer. Sonar still consumes power, can alert reached predators and cannot be spammed during cooldown. Sonar upgrades reduce costs/cooldown and extend echo persistence.
- Added the crimson tier-3 CRIMSON REAPER: 196 chase speed, 42 damage, 1.15-second attack interval, greater awareness and a finite 610-unit pursuit leash. Only five spawn per trench, versus 11 stalkers and 46 drifters. They spawn deeper than 800 m and cannot enter the upper 800 m, even in pursuit.
- Moved the submarine nameplate into the instrument layer and added the current hull rating: NEREID // MK-II · LIMIT 1,530m. It remains visible in darkness and turns red when current depth exceeds the rating.
- Preserved the existing save key, upgrades, six-recorders campaign, depth lighting, pause/menu/New Game flow and polygon collision solver. Added boosted-speed collision, real pointer capture, multi-touch, sonar pixel and tier-3 regression checks.
- Updated runtime asset URLs and service-worker cache to v0.6.0. Browser gameplay checks and mocked worker lifecycle checks passed. Real offline integration was blocked by the environment, and actual Android installation/performance remains untested.

## v0.5.0 · The Lightless Deep (27 October 2026)

- Replaced stepped depth colours with continuous ambient attenuation using fractional metres. Ambient light is exactly zero at and below 1,000 m.
- Added a final world darkness mask, with a finite, forward-facing flashlight cone as its only deep-water visibility source. Soft cone edges and distance falloff share a precomputed texture with the visible beam.
- Masked all scenery, item glows, enemy eyes, vents, sonar rings, submarine details and wake; retained instruments and the objective pointer above the mask. Faded the decorative screen scanlines with ambient light too.
- Extended item/enemy drawing checks to include the full beam footprint, avoiding the old 155-unit salvage cutoff inside the light.
- Made flashlight illumination depend on battery power. Empty batteries show NO POWER and no longer count as lit lamps for predator detection.
- Reused offscreen buffers and copied backing pixels 1:1 to prevent resampling seams at fractional viewport sizes. No runtime dependency or image download added.
- Fixed mobile action button hit-testing in landscape/wider layouts; the old pointer-events rule only applied at a narrower breakpoint.
- Preserved save format/key, six-recorder mission, hull progression, collision mechanics and pause/title/New Game behaviour.
- Bumped runtime asset URLs and offline cache to v0.5.0, correcting the earlier worker's mismatched v0.3.0 asset query strings.
- Added pixel-level lighting regressions and an optional real HTTP/offline integration test. Seven browser suites pass; the local HTTP integration attempt is blocked by the build environment. See VERIFICATION-v0.5.0.md.

## v0.4.0 · NEREID Refit and Navigation (27 October 2026)

- Replaced the basic submarine silhouette with a sleek rendered MK-II: gradient ceramic-titanium hull, curved glass canopy, swept stern fins, twin propellers, navigation lights, metallic ribs and animated bubble wake. Original hull physics retained.
- Added large, accessible pause overlay with RESUME, MENU and QUIT. MENU suspends a dive for tab-lifetime continuation; QUIT explicitly confirms discarding unbanked cargo while preserving permanent banked progress.
- Added prominent NEW GAME option on the initial menu with a second confirmation step that clears saved rank, depth records, credits, upgrades and recorders.
- Main menu now distinguishes BEGIN EXPEDITION from CONTINUE EXPEDITION and displays a saved-progress summary. Main menu exit available after vessel loss.
- Improved pause/dialog state transitions, keyboard Esc behaviour and mobile responsive overlays.
- Raised asset URL versions and service worker cache to v0.4.0 for normal PWA updates without reinstalling.
- Added browser integration tests for pause/resume, suspend/continue, quit cancel/confirm, and saved-game wipe/cancel.


## v0.3.0 · Into the Deep (27 October 2026)

- Six recorders at depths 75, 260, 470, 725, 1,100 and 1,500 m; victory requires delivering all six.
- Procedural ocean expanded to 1,800 m with seven named depth sectors and replenished world content.
- Rare purple abyss stalkers spawn deeper than 400 m, move 134 vs 80 speed, detect better and inflict 27 vs 13 damage. Both predator tiers disengage when the submarine escapes pursuit range.
- Hull tree increased from 5 to 7 tiers: +200 m rated depth and +28 maximum hull HP per level (base 130 m, max 1,530 m). Exceeding the rating now causes increasingly dangerous pressure damage.
- More deep salvage and wreck-adjacent resources to support the longer progression loop.
- Six-pip mission HUD, apex radar colours and warning text; updated mission briefing, story, help and milestone objective labels.
- Preserved historical v0.1 local save key and migrated previously secured IDs 0-2 into new six-recorder mission.
- Version-tagged game/CSS/manifest references and new offline cache v0.3.0 for Github Pages PWA updates.
- Added deep-trench and save compatibility regression test.


## v0.2.2 · Predator disengagement, smoother collisions, multitouch USE

- Predators abandon pursuit beyond a hard leash, forget sonar alerts, and resume patrol; temporary recovery prevents instant reacquisition.
- Rock collisions use polygon outlines matching visible rock art and a narrow three-circle sub hull; substep resolution reduces tunnelling, and sliding retains tangential velocity. World generation preserves a navigable winding route.
- Pickup reach increased and holding USE auto-salvages while passing an item, including while joystick is held with another finger.
- Mobile action buttons moved left, joystick/cruise moved right, and USE button enlarged with a highlighted press state.
- Version-tagged assets and offline shell updated to v0.2.2; existing saved credits/upgrades/secured recorders remain compatible.

# The Abyss Below — Changelog

## v0.2.1 — 27 October 2026 · Mobile cockpit polish
- New immersive cockpit mode: expanded viewport fills the available phone screen, with optional browser fullscreen request. Small HUD displays depth, hull, oxygen, power and noise; buttons to pause, open instructions or exit expanded mode.
- Starting an expedition on phones automatically enters expanded cockpit mode; exit button restores the full operations console.
- Increased normal-view game viewport to 76dvh on small screens.
- Rebuilt high-contrast analogue joystick with explicit thumb and touch target; compacted action buttons to a translucent right-hand cluster.
- Cache-busted linked CSS, JS and manifest, and incremented offline service-worker cache so updated GitHub Pages assets don't mix with v0.2.0.
- Preserved save key and game balance.

# Changelog

## v0.9.0 · Beyond the Beam (27 October 2026)

- Set touch-only world zoom to 0.70, exposing about 43% more distance on each axis and 2.04x the area. Kept PC zoom at 1.00 and preserved the CSS sizes/layout of HUD, joystick and circular actions. Updated world/screen transformations, darkness coverage, rotation/focus anchors and sonar viewport range.
- Added the EXPLORATION FLASHLIGHT dock tree. Mk I comes fitted; Mk II/III/IV cost 75/150/300 CR. Beam lengths are 26/36/48/62 m, full angles about 33/44/55/69 degrees. Real visibility and the darkness mask use each upgraded cone. Lamp draw is a slow 2.4/3.3/4.5/6.0 power/minute before battery efficiency.
- Tripled trench width at every depth, rock placement candidates and predator populations. Three protected lateral routes and safe wreck clearances remain. Counts are now 138 drifters, 33 stalkers and 15 reapers; speed, health, damage and depth floors are unchanged.
- Reduced ordinary loot to 180 scrap and 24 crystals, plus 30 caches. Crystals appear below 180 m and no longer occur as guaranteed wreck pairs. Eight early scraps and two at each wreck support initial progression.
- Moved population replenishment to physical docking, once per dock visit. Terrain stays fixed; banking recorders keeps them removed. Damaged/dead predators and depleted ordinary loot persist through time, menus, relaunch and reload using a separate compact local save. Active vessel/cargo/mines are still not reload-persistent. Dock cycles clear deployed mines and sonar echoes.
- Added safe migration for the lamp mark, field-save validation, new-game dual-save reset, new exploration regression tests and updated previous tests for the intentional changed counts/camera. Updated versioned shell/cache URLs to v0.9.0.
- Test results and hardware/economy limitations are documented in VERIFICATION-v0.9.0.md.

## v0.2.0 · Mobile helm & fullscreen installation

- Replaced mobile direction buttons with a draggable 360-degree virtual joystick and analogue movement speed.
- Added hands-free CRUISE option: latch and re-aim the current travel direction until disabled.
- Automatically cancels the helm/cruise when a new dive begins, game pauses, or the app loses focus.
- Added installable PWA manifest, three Android icon assets, optional in-game install button, and static offline shell caching.
- Fullscreen app display preference and mobile layout tweaks for more ocean viewport space.
- Retained the exact v0.1 save key to preserve banked progress on the same GitHub Pages origin.
- Added joystick regression tests and icon/manifest checks.

**Caveat:** Actual Android installation/fullscreen needs real Chrome testing; mobile browser emulation cannot verify the system-level installed experience.


## v0.1.0 · First playable expedition

- Complete dark nautical cockpit UI, separate HUD panels and mobile directional controls.
- Navigation through a procedural rock-filled trench with collision handling.
- Four depth zones with individual names and pressure constraints.
- Battery, oxygen, hull integrity, motor noise and lamps.
- Active sonar pulse and temporary radar reveal, including battery and noise costs.
- Enemy patrol, investigation and chase behaviour.
- Scrap, crystals, emergency caches and three story recorders.
- Surface station banking, six upgrade trees and expedition XP ranks.
- Death/retry flow; permanent progress saved in local browser storage.
- Repeatable desktop/mobile browser smoke tests.

### Known limitations

- A dive in progress does not survive a browser refresh. Only banked progress is persistent.
- Dedicated visual settings and landscape-first HUD are future improvements.
- The prototype has one campaign objective and no music or sound effects yet.
- The radar currently displays a local area and is not a persistent explored-world map.
