# The Abyss Below v0.15.0: Wild Waters

Build `0.15.0-wild-waters-1`. Base: v0.14.0 / Living Depths.

This release adds abandoned contact mines, four schooling fish designs, pulsing vent fields, reactive seabed organisms and additional procedural sound. It preserves the five-level campaign, twelve systems, twenty achievements, finite resources, paid ammunition, mobile zoom and compact controls.

## Abandoned contact mines

Rusty, horned spheres hang from existing rocks or the seabed. Their chains and bodies sway predictably. They are visually distinct from the player's deployed mines.

Hull or predator contact triggers a blast with an approximately 11.8 m radius. Contact is swept across the simulation step, so boosting cannot skip a mine between frames. The explosion harms nearby predators and the submarine. Shields absorb it first; overflow damages the hull. A recent bite's immunity window does not cancel a separate contact-mine impact. The player's own mines remain harmless to the submarine.

| Destination | Target mine count | Hull damage | Predator damage |
|---|---:|---:|---:|
| Sunbreak Shelf | 8 | 24 | 110 |
| Glassbone Rift | 16 | 32 | 140 |
| Drowned Gardens | 28 | 40 | 180 |
| Midnight Cathedral | 42 | 48 | 230 |
| Calypso Abyss | 58 | 56 | 280 |

A healthy starting submarine survives one isolated first-level mine. Lure a pursuer into one to weaken or destroy it. Predator drops still require collection and docking before becoming credits. Nearby environmental kills count toward hunting achievements. Unrelated distant explosions do not grant kills while the player waits in the harbour, or artificially raise the vessel's noise.

Destroyed contact mines stay destroyed for the campaign, including after docking, level changes and reloads. They cannot be purchased or harvested. No extra currency or button is introduced. There are no automatic minefield chain reactions.

Sonar reveals each mine and tether on wave arrival, without detonating it. The chart remembers discovered positions and marks cleared contacts. A visible or scanned mine close to the hull produces a contextual HUD warning. Unseen mines are not magically exposed in total darkness.

Placement avoids the protected harbour, central route, fixed deposits, recorder approaches and recovery pods. New initial predator spawns are moved away from immediate contact with a mine. They may subsequently encounter one while swimming. An independent random stream generates encounters without moving existing rocks, wrecks, salvage or crystals.

## Four schooling fish designs

These are fictional species with distinct palettes, shapes and motion.

| Species | Design | Habitat emphasis |
|---|---|---|
| Silver Dart | Slender silver-blue body, pale flank and forked tail; fastest group. | Shelf and Rift, with some deeper schools. |
| Sunstripe Reeflet | Rounded golden-orange body, dark stripes and fan tail. | The first two levels. |
| Ribbonfin | Turquoise body with violet ribbon-like trailing fins. | Especially the Drowned Gardens. |
| Violet Glassfish | Translucent lilac, diamond-shaped body and delicate fins. | Gardens, Cathedral and Abyss. |

Each school contains 6–14 fish with individual size and animation variation. Target school counts are 12 / 22 / 36 / 48 / 62 across the levels. Habitats have different species mixes; not every species appears in every level.

Fish follow a shared heading and formation, keep separation, avoid solid rocks and drift with currents. They part around the submarine. Nearby boost or predators trigger faster scattered movement. Sonar produces a brief startle when its wave arrives. Fear decays and the group reforms.

Fish cannot be collected, do not damage or block the submarine, have no loot and never consume ammunition. They do not clutter the map with contact dots. Sonar can briefly silhouette them, but they cannot illuminate deep water.

Detailed simulation is limited to nearby groups, with a twelve-active-school cap. A separate rock lookup accelerates fish collision tests. Distant decorative groups are not fully simulated. These measures are not a guarantee of a particular frame rate on a physical phone.

## Pulsing vent fields

Structured chimneys sit on existing rocks or the seabed. Original atmospheric bubbles remain decorative; the new vent chimneys are the gameplay encounters.

A cycle has seven seconds quiet, three seconds warning, three seconds eruption, then settling/rest. Complete periods vary from fourteen to twenty seconds, with staggered phases. Warning bubbles and a low local rumble precede the plume. The cycle uses simulation time and does not advance while paused or closed.

Target field counts are 5 / 9 / 15 / 21 / 28. Sunbreak Shelf seeps lift the vessel but do not hurt it. Exposure ticks on levels 2–5 cause 3.5 / 5 / 6.5 / 8 damage, at most approximately once per 0.85 seconds; shields can absorb this. The upward plume affects predators too. Maximum lift remains weaker than standard quiet-running thrust.

Wait for a quiet phase, steer around, or deliberately use the upward current. Discovered vents stay on the chart, but the chart does not track a distant vent's current phase. Visible or scanned local warnings use the existing status row, below critical hull/oxygen warnings in priority.

## Reactive seabed life

Anemones retract, fan corals bend, small crabs retreat, and tube colonies withdraw then extend. Light, proximity, boost and currents affect their reactions. These organisms are decorative: no new collision, pickup grind, currency or upgrade requirement. They are placed on existing rocks and the seabed and remain subject to the normal darkness mask.

## Sound pass

Sound remains original procedural Web Audio, without remote assets, third-party recordings or microphone access.

The ambience channel gains chain creaks, vent warnings and eruptions, kelp movement, restrained school-scatter sounds, wreck groans and harbour machinery. The effects channel gains a heavier abandoned-mine blast and docking clamp, with refinements to player explosions, impacts, breaches and splashdowns. Slight pitch variation reduces identical repetitions.

Environmental cues are spatially panned, distance-attenuated and rate-limited. One-shot voices are capped at 28. Effects and ambience volume remain independent; mute/settings persist. Audio begins only after user interaction. Pausing/backgrounding stops scheduled cues and suspends the audio context. All visual hazard cues work while muted.

Automated Chromium analyser tests check actual non-silent audio against a quiet baseline. This is not human listening, speaker/headphone testing or a perceptual balance review.

## Persistence and migration

The canonical key stays `the-abyss-below-campaign-v3`. Campaign schema 3 gains a validated optional `wild` field per level: generated hazard layouts, cleared mines, safety-retired mines and sheltered vents. Resource data is not rewritten. Existing banked currencies, system tiers, owned ammo, recorders, achievements, charts and depleted deposits remain.

Active-dive snapshot schema 1 gains optional wildlife state. Current saves retain school/member positions, fear, sonar reactions and benthic withdrawal, alongside ship, cargo, combat, ammunition and timers. Sway and vent phases derive from the saved simulation clock. Continue restores paused, with no offline time advance.

Actual v0.14 snapshots migrate with their ship and cargo intact. On first addition, new hazards too close to the saved submarine are retired or made dormant. Recovery pods receive similar protection. Current-version reloads do not repeatedly clear mines around the player; this is an arrival/migration safeguard, not an exploit to erase minefields.

New Game resets campaign encounter state. A sudden process kill can still lose progress since the last successful checkpoint. Clearing browser storage or a storage failure can lose local progress. This remains a browser/PWA build, not a signed Android bundle or native-storage migration.

## Installation

Bank cargo and quit the old active dive before replacing files. Extract the update ZIP into the same repository root, replacing files rather than uploading the ZIP or adding a parent folder.

Deploy these eight files together: `index.html`, `styles.css`, `audio.js`, `game.js`, `version-sync.js`, `service-worker.js`, `manifest.webmanifest`, `version.json`. Keep the existing icons. Reopen online after hosting completes and check for **v0.15.0 / Wild Waters**. CHECK AGAIN verifies a deployment; it does not publish one. Keep the same origin/browser profile and do not clear site data, uninstall or select New Game to update.

After runtime edits, run `python tests/build_release.py` to regenerate checksums. An old manifest must produce an incomplete-release warning. Current test instructions and limitations are in `tests/README-v0.15.0.md` and `VERIFICATION-v0.15.0.md`.

## Preview provenance

Mine, vent and natural-wildlife previews use generated terrain with synthetic equipment/positions. The four-species screenshot and animation deliberately stage all four groups together using test-only fixtures. They use the actual production renderer and simulation, not concept art or a user's save.
