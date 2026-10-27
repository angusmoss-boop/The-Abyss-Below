# v0.5.0 verification

Build date: 27 October 2026. Based on the supplied v0.4.0 complete archive.

## Executed successfully

- JavaScript syntax checks: game.js and service-worker.js (`node --check`).
- `tests/smoke_test.py`: desktop movement, sonar, docking/upgrades, help and mobile actions.
- `tests/joystick_pwa_test.py`: joystick, cruise, coasting, save-key compatibility and icon/manifest assets. This older script does not exercise a real service worker.
- `tests/mobile_ui_v022_test.py`: portrait and landscape layout, expanded play view, controls and normal console.
- `tests/v022_behaviour_test.py`: two-finger steering/collection, predator disengagement and polygon collision cases.
- `tests/v030_deep_trench_test.py`: six objectives, old-save retention, predator tiers, hull upgrade tree and depth pressure.
- `tests/v040_menu_visual_test.py`: start, pause/resume, suspend/continue, briefing, quit, New Game confirmation/cancellation and banked progress.
- `tests/v050_depth_lighting_test.py`: strictly decreasing ambient curve across 1,001 depth samples; fractional-depth continuity; rendered fade; opaque black world pixels at 1,000, 1,500 and 1,800 m with lamps off; six beam headings with no outside-cone pixel leakage; depleted battery; salvage beyond the previous distance cutoff; hidden predator/recorder glows; active sonar does not bypass blackout; retained progress; touchscreen lamp toggle; pause/resume; portrait/landscape resizing. Viewports include 390x844, 844x390, 360x780 and 413x823, with DPR 1, 1.25 and 2.
- Static version/cache audit: HTML asset queries match the v0.5.0 worker shell and all local cache targets exist.
- Actual mobile-layout browser screenshots visually inspected at 500 m and 1,090 m, including flashlight off. Screenshots use test positioning and a fully upgraded hull, not a naturally played campaign.

Pixel-black assertions inspect the world without the separately drawn objective pointer. In normal gameplay the pointer, depth display, controls, prompts and radar remain readable instruments.

## Not verified in this environment

`tests/v050_pwa_cache_test.py` attempted a real HTTP/service-worker/offline run under `/expedition/`. Chromium blocked navigation to the local server with `ERR_BLOCKED_BY_ADMINISTRATOR`, before the game could load. That is not a passed test. The optional test is included for local/deployed verification. No actual Android installation, GitHub Pages deployment or physical-phone performance test was performed.

## Update safety

The localStorage key remains `the-abyss-below-v01`. No migration or reset was added. Existing banked credits, upgrades, XP, records and delivered recorders remain in the same save. As before, bank cargo before refreshing because active dives are not persisted across page reloads. The update was prepared as downloadable files, not pushed to the user's repository.
