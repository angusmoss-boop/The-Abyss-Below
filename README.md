# The Abyss Below · v0.26.0 Tactical Depths

Mobile-first underwater exploration game, with two passive ship-tuning slots,
three named configurations, an isolated proving ground and clearer combat feedback.

See [Tactical Depths](TACTICAL-DEPTHS-v0.26.0.md) for exact unlocks, tuning trade-offs,
trial equipment, scores and save behaviour. See [current verification](VERIFICATION-v0.26.0.md)
for test results and limits. Prior reports below describe older releases only.

## Game overview

A mobile-first, side-scrolling submarine exploration game built with HTML, CSS, Canvas and JavaScript. The same game supports desktop mouse/keyboard play and a touch-first installable web-app interface. This archive is the web/PWA source, not a signed native Android release.

**Existing ecology:** curious, feeding and sheltering fish; peaceful Gliders and Driftbacks; an inhabited harbour; a cosmetic twenty-active-minute surface cycle and weather; a ten-entry observation journal; and frozen-view photo mode with PNG export. See [The Living Abyss guide](THE-LIVING-ABYSS-v0.25.0.md). Modular vessels, Sunken Strongholds, Deepwater Rescue and all earlier campaign systems remain intact.

## Install and update

Use the complete ZIP for a fresh repository. Apply the extracted update ZIP over **v0.25.0** at the repository root. Save and export a campaign backup first; banking cargo is a sensible precaution. Upload changed runtime files together. These files do not deploy themselves.

Reopen your existing game address online after deployment and check for **v0.26.0 / Tactical Depths**. Do not clear site data, uninstall or start a new campaign to update. Keep the same browser profile and origin. The menu's version checker distinguishes verified, outdated, incomplete, local and offline states rather than assuming a deployment succeeded.

## Tactical Depths

Shipyard now offers two passive tuning slots and three named configurations. Physical-dock refitting is free once the associated existing equipment grades are owned. Before/after values make trade-offs visible.

Dock > Trials opens three scored, fixed-equipment simulations and an unscored current-build practice pool. Loaned inventory and trial damage never persist into the campaign. Personal bests and cosmetic gold accents are saved when returning to dock; closing the app ends an unfinished exercise.

Telemetry includes optional damage numbers, camera impulse and decoration density. The seven-button mobile layout remains unchanged. Full settings, scoring and limitations are in the current feature guide.

## Controls

- Desktop: hold left mouse and point to pilot, or WASD/arrows. E: USE. Space: boost. Q: sonar. Hold Z: railgun. X: torpedo. F: mine. R: one emergency half-hull repair, serviced at the physical dock. L: lamp. M: survey map. J: field journal. Escape: pause. Mouse wheel: world zoom.
- Mobile: drag open water to create the floating helm. The weapon triangle has rail above torpedo and mine. The bottom row is boost, use, sonar and repair. The top map/telemetry/pause controls remain. Pinch two fingers on open water for 65–200% world view, then lift both before steering again. Telemetry contains the lamp switch and zoom slider/reset. The UI does not scale.
- Salvage collects automatically in the fitted magnet range. Crystals and hull repair packs auto-collect on direct contact, never remotely. Packs instantly heal up to 25% max hull, with no air/power reward. Recorders, ID plates and special objectives use E/USE. Battery cells auto-collect within 6 m with sufficient battery headroom, or can be used manually for a smaller top-up.
- Physical docking banks cargo, services hull/air/power and the emergency repair charge, and opens the expedition hub. Weapon ammunition is bought separately.

## Wildlife and photography

Use the existing Journal (J) and its **WILDLIFE** tab, or the dock Archive / telemetry shortcuts, to read ten optional field notes. Watch a clearly visible species for around two seconds; sonar alone does not unlock an observation. No currency or upgrade rewards.

Open **PHOTO MODE** from pause or telemetry during a dive. It freezes the currently visible canvas without instruments, then offers a 100–220% crop, drag/pinch/wheel framing and PNG download. It cannot reveal new terrain or change your gameplay zoom. Closing returns to the paused dive.

Surface time and weather advance only during active simulation, not at the dock, during pause or while closed. Large animals are peaceful, non-blocking and excluded from combat targeting. Harbour routines are earned by previously rescued drones. New ecology and observation state is saved per campaign and included in portable backups.

## Campaign

Five persistent levels range from 300 m to 1,800 m, with 2/3/4/5/6 recorders. Bank all recorders in one to unlock the next, then freely return to unlocked levels. Each has its own finite crystal deposits, regenerating salvage, wildlife, hazards, survey chart and optional explorable wreck. Credits from scrap and separate banked crystals fund ship upgrades.

The 30 achievements, dock contracts, twenty archived transmissions, optional Cathedral Warden and five identification-plate hull finishes add other objectives. Progress belongs to one of three local campaign slots.

Continue restores a saved expedition paused after reopening. Export/import portable `.abyss.json` backups through the campaign menu. Local saves are not cloud saves. Death leaves unbanked resources, recorders and identification plates in a persistent recovery wreck and sets replacement ammunition to exactly 10 rail / 3 torpedoes / 3 mines. Normal ammunition purchases still respect fitted capacity; rescue mine stock can temporarily exceed the starter rack by one.

## Existing Lifeline resource settings

Standard air lasts approximately 5:33 uninterrupted active minutes; Air Recycler Mk I extends this to 8:40, with further marks providing more capacity and lower consumption. Pause and dock now show useful endurance estimates.

Normal travel has much lower power draw than boost or sonar. At empty power, reserve thrust is half the fitted normal movement rating and boost cannot run. New rare golden battery cells restore up to 25 power and become eligible to return after eight active dive minutes, with a 90-second per-level stagger and no visible respawning. No offline, pause or dock-screen farming. Crystals still never regenerate.

Existing upgrade prices, mine/gun ammunition costs, salvage regeneration, combat stats, flashlight marks, controls and music are unchanged in v0.26.0. Optional tuning applies its explicitly listed trade-offs to the equipped vessel.

## Deepwater Rescue

Explore to detect an optional distress signal, use sonar to locate it, then hold USE to restart the drone. Tap USE after release to switch FOLLOW / WAIT. Escort it to the harbour and physically dock for a one-time credit reward. One unique drone lives in each level. Unresolved rescues survive death and reloads.

Hold USE at an air station for up to 25% of fitted oxygen capacity per station, replenished only after physically returning to that destination's harbour. Stations do not bank cargo, repair hull or protect against predators. No battery is required.

The main and pause menus include a Rescue Log. The dock upgrade view starts with a compact recent-expedition summary and a View Report button. No automatic report modal interrupts arrival.

## Sunken Strongholds

Each optional wreck is now approximately five times its previous interior footprint, with three decks and nine named compartments. The entry breach never locks. Find both isolation relays on the upper and lower decks, scan each with sonar, then use it to disable its circuit. Both circuits must be isolated before the identification vault opens. A separate service panel opens a permanent shortcut and lower escape hatch; recovering the plate opens it too.

Wrecks contain 3/4/5/6/8 additional territorial defenders and 3/4/5/6/7 electrical/pressure traps. Traps warn for 1.8 seconds before 2.2 seconds of activity, with a quiet interval. Defenders use existing tier statistics and solid collision/navigation. Wounds, kills, isolated circuits, scan status and shortcuts persist per campaign, so returning to dock does not undo your progress. Carry the plate home to earn the existing cosmetic finish. Existing banked/carried/lost plates are grandfathered without duplication.

## Development

No npm build step is required. Serve the repository over HTTPS for the hosted game, or use a permitted local HTTP server for development:

```sh
python -m http.server 8000
```

After **every runtime edit**, rebuild release checksums:

```sh
python tests/build_release.py
```

The offline worker and deployment verifier intentionally reject an incomplete or checksum-mismatched release. `version.json` covers 22 runtime assets. Do not update only one script and expect the verifier to show a consistent release.

## Verification

Current runner:

```sh
python tests/run_v0260.py
```

See [current verification](VERIFICATION-v0.26.0.md), `verification/v0.26.0/` and [test reproduction](tests/README-v0.26.0.md). Earlier reports in the archive are historical, not evidence for this build. Browser tests use actual production code with isolated synthetic storage, never the user's live saves.

## Archive

`CHANGELOG.md` and prior feature guides retain the development history. The current code and Tactical Depths guide take precedence over older feature descriptions, especially older free-ammunition, salvage and save rules.
