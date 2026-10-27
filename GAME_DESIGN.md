# The Abyss Below: current design

## v0.13.0 / Harbour Rising

Campaign balance tables remain in **CAMPAIGN-v0.12.0.md**; the new harbour, breach physics and tile rules are in **HARBOUR-v0.13.0.md**. Earlier changelog entries describe past versions and do not override the current guide.

### Player loop

Choose an unlocked expedition at the surface hub, inspect the fitted ship, buy upgrades or ammunition, descend, find fixed resources and mission recorders, evade or destroy hunters, then return to bank cargo. Banking all recorders opens the next deeper destination. The five physical floors are 300 / 600 / 1,000 / 1,400 / 1,800 m, with 2 / 3 / 4 / 5 / 6 recorder objectives.

Previous destinations remain available for resource completion and repeat hunts. Every map owns a permanent seed and deposit snapshot. Fixed scrap/crystals never respawn. Predators and supply caches refresh only on genuine dock returns, not tab changes or level reselection. Banked recorders never reappear.

### Economy

Two independent banked wallets: credits from scrap (18 each), and crystal units. All paid ship-upgrade increments consume both. Ammo remains credits-only and is never granted by upgrades, death, launch or docking. The starting flashlight and two-slot mine rack remain fitted but the warhead launcher still needs purchase.

A fresh campaign offers 15,192 CR of fixed scrap and 496 crystal units against 12,223 CR + 432 crystals for all 51 paid upgrades. Predator drops supply renewable credits. Crystal stock is finite, with a margin and per-pressure-gate spending guards. A shop warning protects the next required hull steps from optional spending that would strand access to deeper crystals.

Unbanked fixed resources are journaled and become recovery pods after defeat/quit/reload. This protects the finite crystal economy without pretending the full active expedition has been saved. Pods require physical collection and banking; expendables are not refunded.

### Difficulty and navigation

Each destination increases total and per-depth predator density, obstacle density, predator HP and bite damage. Existing tier behaviours, detection/leashes and speed relationships are retained. Reapers appear and pursue only at/below 800 m, matching Mk IV normal thrust. Mines, boost, sonar disruption, shielding and quiet running offer complementary responses.

Rock collision uses the submarine capsule. Each floor is a solid physical boundary, with sonar-reveal support. Generated recorder approaches and resource positions are kept clear across the automated seed samples. Navigation is not guaranteed difficulty-free across every possible seed; physical-device playtesting remains necessary.

Ambient light fades continuously to zero at 1,000 m. Four flashlight marks expand the beam and consume battery slowly. Sonar reveals timed echoes as its wave passes. The salvage magnet requires visibility and a clear route. The shield cannot negate pressure/oxygen damage. Thruster marks unlock and extend boost; battery upgrades improve efficiency and recharge.

### Surface and harbour

A research platform surrounds an open, non-colliding background berth. A 260-unit protected approach is buffered by a 330-unit predator exclusion radius; entry clears pursuit and all enemy movement/spawns are constrained outside. Damage from oxygen exhaustion, rocks and pressure remains independent of predator protection. Docking arrests momentum before opening the refit modal.

The old top clamp is removed. Upward surface crossings above 100 units/second launch a ballistic arc with gravity 260, mild air drag, no airborne engine/boost thrust and no negative depth display. Entry damps velocity, emits a splash and restores underwater steering without splash damage. Particles are bounded and transient. Underwater walls/floors retain capsule collision and substepping. Recovery journals clamp airborne cargo positions to an accessible underwater location without moving the live ship.

### Interface

Mobile uses a floating transparent joystick on open-water touch and eight circular left-side actions. USE is largest; BOOST second. PC uses held mouse/keyboard piloting with a key-reference strip. Mobile world zoom is 0.70; desktop is 1.00. Instruments stay full-size.

The dock keeps three-column, fitted-tier upgrade tiles with gold maximum borders and textual MAX badges with detailed native purchase pop-ups. Its three tabs are SHIP UPGRADES, AMMUNITION and EXPEDITIONS. Credits and crystals appear together. Expedition cards show unlock state, selected destination, floor, secured recorders, remaining fixed stocks and recovery-pod count.

The achievement sheet opens from both main and pause menus, with 20 progress-tracked goals and unlock notifications. It preserves the previous paused state when closed. Small-landscape sheets scroll within their viewport. Achievements are campaign-specific, reset with confirmed New Game and do not award currency.

### Persistence and deployment boundaries

Campaign schema 3 stores the ship profile, separate currencies, owned ammo, achievement counters/timestamps and independent level fields in `the-abyss-below-campaign-v3`, with a previous-snapshot backup. The old schema 2 trench migrates into the fifth level without replacing old deposits or recorders. Four new levels are still completed in sequence.

A single snapshot couples resource depletion, cargo journal and upgrade spending. Full ship position/combat resume is still absent. This remains a browser/PWA implementation with local site-specific storage; it is not an Android application bundle or cloud-synced campaign.

The existing version checker validates loaded build markers, published runtime hashes and controlling service worker. It reports offline, partial, stale or local-preview states without claiming verified deployment. Run `tests/build_release.py` after runtime changes. Host all matching files together.

### Evidence

Use VERIFICATION-v0.13.0.md and verification/v0.13.0/results.json for this release's acceptance evidence. Automated synthetic checks are not equivalent to a physical phone trial, full balance playthrough or hosted offline update.
