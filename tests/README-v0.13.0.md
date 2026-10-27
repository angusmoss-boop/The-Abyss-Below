# v0.13.0 verification

Run from the repository root with Python 3, Node.js, Playwright for Python and Chromium installed. The harness uses `/usr/bin/chromium` when present, otherwise Playwright's installation.

```sh
python tests/build_release.py
python tests/run_v0130.py
python tests/v0130_surface_previews.py
python tests/v0130_live_pwa_test.py
```

The main runner executes twelve current suites, at most two concurrently, and records exit codes/timings/stdout/stderr in `verification/v0.13.0`. The live HTTP/worker attempt is separate and must not be silently counted as passed. The preview script renders real production scenes with synthetic equipment and currency.

## New checks

`v0130_harbour_test.py` exercises the centre and edges of the protected area, all predator tiers, stunned/invalid patrol positions, preserved health, pursuit reset, sonar provocation, active outside combat, slow/quiet surface approaches, normal/Mk IV/boosted launches, held-airborne-input gravity, no airborne boost drain, harmless splashdowns, pause/airborne-USE isolation, dock velocity reset, all twelve tile labels and purchase transitions, gold maximum borders and textual/accessible MAX. Numerical launch traces are retained in `breach-traces.json`.

`v0130_save_test.py` loads a synthetic campaign created by the actual archived v0.12 production runtime. It checks all five fields and profile progress without changing resources, stock, currencies or upgrades. Existing optional defaults are normalised by the existing validator. It also collects real finite resources, interrupts an airborne dive through reload/quit/defeat, recovers the resulting underwater pod and banks it exactly once.

To regenerate the compatibility fixture, use `python tests/generate_v0120_fixture.py /path/to/the-abyss-below-v0.12.0-complete.zip`. Routine acceptance uses the bundled fixture and does not require the old archive. No personal save is included.

## Retained current regression coverage

- Campaign: physical levels, banked recorder gates, persistent layouts/depletion, fixed credit/crystal totals, all 51 paid purchases, independent currency guards, paid ammunition and recovery accounting.
- World/achievements: 40 generated seed/level combinations, seabeds/capsule headings/boost, floor sonar, progression crystal guards and achievement counters.
- Legacy migration: actual archived v0.11 fixture, retained profile/old trench and crystal top-up, unlock order, idempotent reload and corrupted-primary backup recovery.
- Responsive hub: thirteen portrait/landscape/tablet/desktop sizes, three columns, fitted-tier/name geometry without overlap, no horizontal overflow, pinned controls, dual-currency pop-ups, achievements and keyboard focus/tablist operation.
- Controls: eleven touch and five desktop sizes, floating joystick ownership, simultaneous steering/boost/mine/use, cancellation, orientation/blur reset and mouse/keyboard navigation.
- Systems: magnet, shield and disruptor upgrades/interactions.
- Gameplay: pixel darkness, flashlight marks, sonar, mines, health/damage, boosted collision, pursuit, Reaper depth floor and hull pressure.
- Release integrity: syntax, DOM IDs, script order, versioned URLs, build markers and nine SHA-256 runtime entries.
- Node version checker and worker lifecycle: mocked network/cache/controller boundaries, verified-current conditions, offline invalidation, partial-update rejection, active-dive reload guard and update ordering.

## Scope

The main browser harness injects the actual HTML/CSS/JS into Chromium with controlled localStorage. Most tests stop the animation loop and use an explicit test-only diagnostics flag to place synthetic scenes and advance the real update function. These are not physical-phone measurements or human-paced campaign playthroughs. The optional real-network run has no mocked HTTP and reports its own blocked/failed/passed outcome. Historical test files/reports retain their old assumptions; do not run a wildcard over all historical suites for current acceptance.
