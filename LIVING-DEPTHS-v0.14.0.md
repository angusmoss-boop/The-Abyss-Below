# Living Depths | v0.14.0

Build: `0.14.0-living-depths-1`. Baseline: v0.13.0 / Harbour Rising.

## Compact instruments

The large, separate instrument cards have been replaced with a continuous glass-style strip. Its first rail carries NEREID, the vessel class, current hull pressure limit and three controls: expedition chart, detailed telemetry and pause. Depth, hull, oxygen, power and noise retain numeric readings and fine meter tracks. Sonar readiness, boost charge, mine ammunition and the fitted shield remain visible underneath on narrow screens, or beside the other gauges on wider screens. The final thin line carries the level name and the most important current warning. Hull below 35% now explicitly reports LOW HULL rather than NOMINAL. Pressure, oxygen, battery, predator, harbour and save-failure warnings remain visible.

At a 390 x 844 touch viewport with a shield fitted, the production HUD measures 105.75 CSS pixels high, compared with 154.828125 in v0.13: a 31.7% reduction. At 844 x 390, the corresponding measurements are 87.75 versus 97.28125 pixels, a 9.8% reduction. These are measured examples, not a claim that every screen size has the same reduction. Font sizes for the principal numbers have not been reduced by the final spacing pass.

Tap the sliders icon for a paused, readable telemetry panel with twelve detailed readings: pressure, depth, hull HP, oxygen, battery, noise, shield HP, boost capacity, sonar cost/cooldown, ammunition, cargo and recorders. Fullscreen/expanded view, the manual and sound settings live here instead of taking additional HUD positions. Closing an exploration dialog restores its previous pause state. Losing focus while a dialog is open keeps the dive paused when it is closed.

The mobile camera remains 0.70x and desktop remains 1.00x. Circular actions stay bottom left. The floating helm still appears only when dragging open water. No new combat button has been added.

## Five environments

Scenery is generated from a separate deterministic seed derived from the existing level seed. Adding it does not consume the terrain/resource random-number sequence, move rocks, relocate deposits or restore collected resources. Decorative scenery and landmarks are not new collision obstacles or loot rewards.

| Destination | Visual character | Named chart landmarks |
|---|---|---|
| Sunbreak Shelf | Teal water, coral branches, swaying seagrass and small fish schools | Coral Crown, The Old Anchor, Shelf Observatory |
| Glassbone Rift | Blue-grey mineral outcrops and pale fractured formations | Glass Gate, Fracture Spire, White Skeleton |
| Drowned Gardens | Green water, taller kelp and overgrown structures | Root Cathedral, Lost Conservatory, Garden Sentinel |
| Midnight Cathedral | Muted violet stone, columns and architectural arches | The Nave, Silent Belfry, Submerged Archive |
| Calypso Abyss | Dark basalt-like formations and warm mineral fissures | Obsidian Gate, The Fault Line, Calypso Array |

All scenery is drawn before the existing depth-darkness mask. At 1,000 m and below, the world still disappears with the lamp off, except for explicitly timed sonar echoes. A landmark may appear as a sonar silhouette when the wave reaches it. Decorations do not secretly illuminate the deep or add kelp-based predator invisibility.

### Water currents

The levels have 3, 5, 8, 11 and 14 local horizontal current bands respectively. Their strongest possible flows are 1.2, 2.0, 2.8, 3.6 and 4.4 metres/second. They pulse gently, fade at their edges and affect both the submarine and predators. Moving streaks give a visual direction cue; a CURRENT arrow and strength appear in the status line when a higher-priority warning is not active.

The harbour, a protected central lane, the immediate surface/floor approaches and wall edges are sheltered. Flow is reduced near rocks. Even the strongest current is weaker than the standard quiet-running thrust of 6.8 m/s. This is route-planning resistance, not an unavoidable equipment gate. Existing collision, hull pressure, boost, predator speeds, pursuit limits and harbour safety remain in force.

## Persistent expedition chart

Use **M** on PC, the map icon on the HUD, or **SURVEY MAP** in the pause menu. Opening the chart freezes the simulation. Close it with its X or Escape. Opening it while already paused does not silently resume the dive afterwards.

The chart is a side view of the actual level. It starts mostly unknown, apart from the harbour and the immediate observed surroundings. Local visibility and the forward lamp chart nearby water; sonar logs new terrain as the wave arrives, rather than instantly revealing the entire radius. The survey uses 9 m grid cells, so the fog boundary is deliberately an approximate chart, not a pixel-exact visibility stencil.

Charted terrain is permanent for that campaign and level. Rocks and trench edges are drawn only through known grid cells. Discovered resources, wrecks, recorders, recovery pods and named landmarks are retained. Collected targets use a completion checkmark. Unknown crystals are not exposed by opening the map.

Predator dots are **last-known contacts**, not live omniscient tracking. They expire about eight simulation seconds after their most recent observation or echo contact. A visible enemy can refresh its dot; pausing also pauses this timer. The active snapshot preserves the remaining contact time when resuming the same dive.

Drag to pan, pinch or use the mouse wheel to zoom, or use the plus/minus controls. CENTRE ON SUB, OVERVIEW and CLEAR PIN provide quick navigation. Keyboard arrows pan a focused chart; plus/minus zoom and Enter attempts to pin its centre. Tap surveyed, navigable water to place one waypoint per level. Unknown water, rocks and out-of-bounds locations are rejected. The existing in-game direction indicator points towards the pin and the HUD shows its depth and distance. Clear the pin to return to the normal objective pointer.

The chart does not charge extra resources. Sonar still uses its normal battery cost and cooldown. Revisiting a level restores that level's chart and waypoint. Existing campaigns gain a new partial chart without regenerating their resources.

## Procedural audio

`audio.js` synthesizes the soundscape locally using Web Audio. It contains original oscillator/noise-based sounds, not external music or downloaded recordings. Audio begins only after a user gesture. It is not a soundtrack or a replacement for visible danger warnings.

Continuous layers include a restrained engine tone, a stronger magnetic boost tone and filtered water ambience that changes with depth, harbour proximity and breaching. Events cover sonar and echoes, pickups, recorders, mine deployment/explosions, hull/shield impacts, docking, lights, launch spray and splashdown. Nearby aggressive predators can produce directional warning cues; pressure creaks begin before reaching the safe-depth limit. Cues are rate-limited and simultaneous transient voices are capped.

Open SOUND from the main or pause menu, or from telemetry. Effects and ambience have separate volume sliders, with mute and a test-sonar button. Settings persist independently of the campaign, including across New Game. Normal pause, hidden-page and focus-loss paths suspend audio and stop pending transient voices. The settings dialog allows an explicit preview while paused. Browsers without working audio keep the game playable and report the limitation.

The AudioContext lifecycle, sliders and mute were exercised in headless Chromium. This is not a physical-listening assessment of balance, speaker output, latency or headphone comfort. Those need device testing.

## Active-dive save and resume

The canonical campaign key remains `the-abyss-below-campaign-v3`. An optional `activeDive` object with its own versioned schema is stored in the same JSON transaction as the campaign profile, level depletion, owned ammunition and pending-cargo journal.

A resumable snapshot includes the vessel's position, velocity, facing, airborne state, hull, oxygen, power, shield, boost, cargo, recorder payload, owned ammunition, action cooldowns and trip counters. It also includes actual predator positions/health/AI timers, deployed mines and arming times, blast effects, sonar wave progress, terrain echoes and temporary chart contacts. Static terrain and scenery are deterministically regenerated from the unchanged seed, then active state is restored.

Continue opens the saved dive **paused**, with EXPEDITION RESTORED. Nothing advances while the game is closed. Resume must be chosen before movement, resource drain or attacks continue. Held input, boost activation and cruise are cleared to prevent a stuck input from being replayed. Quiet running and the relevant stored system state are retained. The camera recentres on the vessel rather than preserving a transient screen offset.

Snapshots are written after important actions, when pausing/opening exploration dialogs or leaving the page, and at approximately five-second simulation intervals. Saves requested inside a physics update are committed after the complete update, avoiding a mine hit being saved halfway through applying damage to several predators. Deposit depletion and collected cargo travel together in the canonical snapshot, rather than separate uncoordinated save slots.

A sudden operating-system kill without a visibility/page-exit callback can still lose progress since the last successful checkpoint. Browser storage is local, not cloud backup; clearing site data, storage exhaustion, corruption or changing the host/profile can still lose progress. Failed writes produce a visible SAVE FAILED warning. A previous valid campaign snapshot is retained as a local backup. This is not a guarantee against every device/storage failure.

### Continue versus Quit

Closing/reloading the app now resumes the active dive instead of routinely creating a recovery pod. **QUIT DIVE remains an intentional abandonment**, not a Save and Exit button: it leaves unbanked scrap/crystals in a persistent recovery pod and returns undelivered recorders to their wrecks. Defeat has the same recovery behaviour. Spent ammunition and repair materials are never refunded. A malformed active snapshot falls back to the existing cargo journal where possible instead of silently destroying finite cargo.

An airborne snapshot resumes actual flight, paused. Explicitly abandoning an airborne dive still places its recovery underwater. Banked cargo is deposited once; reopening a saved berth does not award it again. Population cycles are not advanced merely by reloading.

### Updating an older campaign

Bank cargo and quit the old v0.13 dive before installing. v0.13 cannot supply a complete active snapshot, so its old pending cargo retains the recovery-pod behaviour. The new resume behaviour begins with v0.14 saves. The compatibility test used actual archived v0.13 code to create a synthetic profile and verified currencies, equipment, ammunition, level identity, seed, fixed resources/depletion, recorders and predator damage in v0.14. No real user save was read.

Do not choose New Game or clear site data to install this release. Earlier v0.11/v0.12 campaign migrations remain in the source. No upgrade costs, mine refill rules, crystal stocks, achievements or recorder gates change in Living Depths.

## Publication and scope

Publish all update files together, especially the new `audio.js`, and retain the icon assets. Runtime integrity now covers ten assets. The menu version is **v0.14.0 / Living Depths**. The sync checker also requires the loaded audio build to match and blocks its own reload button while a live or saved expedition is active. It checks a deployed website, not unpublished repository commits or cloud-save synchronisation.

This is a browser/PWA source release. It does not push GitHub, publish a website, create an Android wrapper or produce a signed Play Store bundle. Physical-phone performance, browser eviction behaviour, real hosted updating and full human-paced campaign balance still require testing. See `VERIFICATION-v0.14.0.md` for measured results and limitations.
