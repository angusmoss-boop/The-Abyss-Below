# Verification: v0.14.0 / Living Depths

Build: `0.14.0-living-depths-1`. Baseline: v0.13.0 / Harbour Rising.

## Result and evidence boundary

**Fourteen current automated suites passed:** eleven production-code Chromium suites, one static release-integrity suite and two Node suites with mocked network/worker boundaries. The final successful logs and packaged-runtime hashes are indexed in `verification/v0.14.0/results.json`. Production screenshots also completed without JavaScript page errors.

These checks were completed in successful individual/grouped runs. An initial large parallel orchestration exceeded environment time limits; it is **not** counted as a completed all-suites run. The affected checks were rerun successfully. The runner defaults to serial execution for reproducibility.

Browser suites load the real production HTML, CSS and JavaScript into Chromium, with an in-memory localStorage boundary and test-only fixtures. They verify the production serialization/migration and simulation logic, not operating-system storage durability. Input checks use real pointer/keyboard events, including CDP multi-touch. Web Audio lifecycle checks create a real AudioContext but are not an auditory listening test.

No hosted deployment, physical Android test, signed Android build or complete human campaign playthrough is claimed.

## Passed suites

| Suite | Coverage |
|---|---|
| Gameplay regression | Desktop/mobile blackout, four flashlight marks, depth fade, sonar arrival/expiry, twelve warhead/predator combinations, mine safety guards, narrow passages, boosted collision, pursuit limits, reaper depth floor, seven hull marks, pressure and storage warning. |
| Adaptive systems | Four magnet marks and line/visibility restrictions; all shield capacities, recharge delays, power and damage bypass; all twelve disruptor/predator-tier combinations and low-power scan fallback. |
| Active resume | Production collection of real fixed scrap, crystals and a recorder; mine deployment, enemy wounds and sonar; exact ship resources, velocity, cargo, timers, mines, predators and simulation clock across reload. Paused Continue; menu operations preserve a retained dive; no duplicate banking; no ammo refund; Quit/defeat recovery; invalid-snapshot fallback; airborne restoration; background save/pause. |
| Survey/environments | Unknown objects hidden in blackout; wave-arrival discovery; persistent terrain; expiring enemy contacts; forward-lamp discovery rather than a full-radius reveal; waypoint validity and persistence; M/Escape/zoom/overview/centre; five deterministic environments, three landmarks each, unchanged resources/rocks; bounded currents and sheltered central route/harbour. |
| Harbour | All predator tiers kept outside protected water, pursuit cancellation and no boundary bites; slow/normal/upgraded/boosted surface approaches, gravity, no airborne boost drain, safe splashdown, dock momentum; fitted tier labels and gold maximum tiles. |
| Geometry | Five capsule-safe floors at four headings; boosted floor contact and floor echoes; forty generated maps with correct recorder counts, deposits above the floor/outside rock bounds and starter resources within the base hull limit. |
| Achievements/economy guards | Real sonar, kill/reaper, remote-magnet and shield counters; safe cargo return; persisted awards/stats; both achievement entry points; crystal hull-reserve guards including inaccessible deep deposits; confirmed New Game reset. |
| Save migration | Synthetic save created with actual archived v0.13 runtime; currencies, all fitted marks, owned ammunition, campaign/level identity, seed, fixed deposits/depletion, secured recorders and enemy wounds preserved. Old pending cargo becomes one recovery; charts are added without respawning resources. A retained fixture supports repeat runs without the old ZIP. |
| Dock/menu UI | Thirteen sizes from 320 x 568 to 1920 x 1080; menu version, twenty achievements, three-column tier-labelled shop, pinned dock controls, dual-currency detail modals, keyboard tablist/focus and no horizontal overflow. |
| Touch/desktop | Eleven touch and five desktop sizes; unchanged zoom and circular action hierarchy; hidden idle joystick; actual simultaneous steering/boost/mine/collection; pointer ownership/cancellation; pause/orientation/blur cleanup; desktop mouse steering and Space boost. |
| New explorer UI/audio | Eleven HUD/dialog sizes, readable warning state, twelve detailed telemetry readings, visible chart instructions, map/sound controls. Actual chart pinch and drag do not steer/fire underwater. Focus loss while a chart is open stays paused after closing. Gesture-only sound initialization; preview voices; independent sliders/mute persistence; pause/blur suspend and Resume restarts AudioContext; absent Web Audio does not break gameplay. |
| Release integrity | Ten current SHA-256 assets, three deferred script entry points, build markers, unique DOM IDs, versioned shell URLs, JavaScript syntax and retained campaign storage/migration boundary. |
| Version checker (mocked) | Network-only manifest and seven core file hashes; loaded HTML/CSS/game/audio agreement plus verified worker required for green status; offline invalidation; partial/stale/missing assets; numeric version ordering; both active and saved-dive update guards. |
| Worker lifecycle (mocked) | Ten verified cached shell entries, scoped cleanup and worker handshake; offline fallback logic, cache-missing detection and refusal to install partial/mismatched releases. |

## Visual inspection and HUD measurement

Production screenshots were captured in portrait 390 x 844, landscape 844 x 390 and desktop 1440 x 900, plus five 844 x 500 environmental views. The portrait HUD, landscape HUD and survey chart were visually inspected. The mobile HUD and actions retain their existing screen-scale relationship; the world remains at 0.70x mobile zoom.

The old/new HUD comparison was measured by booting the archived v0.13 production interface and the new interface at identical viewport sizes with a shield fitted:

| Viewport | v0.13 HUD height | v0.14 HUD height | Reduction |
|---|---:|---:|---:|
| 390 x 844 touch | 154.828125 px | 105.75 px | 31.7% |
| 844 x 390 touch | 97.28125 px | 87.75 px | 9.8% |

The photographs/screenshots supplied by the user were used as design context, not as fabricated evidence of the new build. Packaged screenshots come from the actual game and use synthetic gear/positions to demonstrate it. The map preview was produced by moving/scanning a route through production discovery logic, not marking the entire level explored. The main-menu preview truthfully remains a local unverified preview.

## Blocked and untested

The real HTTP/service-worker check attempted localhost navigation without mocked networking. Chromium returned **`net::ERR_BLOCKED_BY_ADMINISTRATOR`**. Therefore actual worker installation, cached offline relaunch, live website update and upgrading an already-installed PWA were **not verified**. Mocked worker/version tests do not replace those checks. The raw blocked result is `verification/v0.14.0/live-pwa.json`.

Physical Android/iOS devices, Safari/WebKit/Firefox, touchscreen comfort on hardware, frame-rate/heat/battery profiling, audio listening/latency, real browser eviction/force-kill durability, GitHub Pages deployment and full human-paced campaign balance remain untested. No Android wrapper or Play Store bundle is included.

## Reproduction

See `tests/README-v0.14.0.md`. Use `python tests/run_v0140.py --jobs 1`, or run the individual scripts listed in the evidence index. `python tests/build_release.py` must be run after a runtime edit; stale hashes intentionally prevent a verified-sync badge.
