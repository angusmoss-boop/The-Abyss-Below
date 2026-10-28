# Verification: v0.17.4 / Crystal Descent

Build: `0.17.4-crystal-descent-1`
Baseline: actual archived `the-abyss-below-v0.17.3-complete.zip`

## Scope

A branding patch: approved artwork conversion, launcher/website icon wiring, startup handoff and a responsive main menu. No gameplay, economy, storage-schema or audio-logic changes. This is prepared source, not a hosted deployment or installed Android binary.

## Current verification

Eleven targeted suites pass in the final run recorded in `verification/v0.17.4/results-latest.json`. This consists of eight isolated Chromium suites, one static/image/source-comparison suite and two Node suites with mocked network/worker boundaries. The report and packages are only finalized when all eleven final results pass.

| Suite | Coverage |
| --- | --- |
| branding | All 16 published asset hashes; icon PNG/WebP dimensions and opaque modes; ICO resolutions; versioned icon URLs; unchanged app ID, name, scope and start URL; JS syntax; unique element IDs; actual v0.17.3 source comparison. |
| branding_ui | 11 screen sizes, actual approved image decoding, no horizontal menu overflow, all menu controls scroll into view, slots/achievements/hub/launch/pause flows, no startup overlay during gameplay, no page-script errors. |
| launch | Production initialization handoff, failed/stalled image decode, missing-game eight-second watchdog, missing-launch-module fallback, reduced motion, keyboard focus, repeated ready calls cannot change campaign storage. |
| resume | Current production expedition restore, resource cargo, mines, damage, ammunition, simulation state and save protection. |
| slots | Existing actual legacy save migration fixture, independent three-slot UI, save/load/delete safeguards and retained campaigns. |
| combat_touch | Actual multi-finger steering, firing, mine deployment and utility actions through the unchanged controls. |
| stealth | Analogue speed/noise, passive insulation, flashlight controls/persistence and ignoring a legacy quiet flag. The legacy speed measurement is made in clear harbour water, not against random restored terrain. |
| audio_transitions | Existing real-time gradual fades, rapid pause/background changes, stale asynchronous-music suppression, idempotent audio unlock and mobile UI interaction. |
| music | Existing music signals, loop buffers, scene routing, volume persistence and suspension. Not a human listening review. |
| sync, mocked | Actual version module, all 16 freshly checked assets, old/incomplete/offline handling, missing artwork checks, loaded build matching and reload guards. |
| worker, mocked | All 16 shell requests verified before installation, cache completeness, navigation fallback, scoped cleanup and refusing partial releases. |

Sizes: 320x568, 360x640, 390x844, 430x932, 568x320, 640x360, 844x390, 915x412, 768x1024, 1024x768, 1440x900.

## Source comparison and preservation

Compared to the actual v0.17.3 archive, audio.js and campaign-slots.js are identical except release markers. game.js is identical except the release markers and one optional `AbyssLaunch.ready()` notification at the end of initialization. Existing styles are retained, with scoped new branding/menu/startup styles appended. The manifest identity, URL scope and all fields other than icon URLs are unchanged. No real user save was accessed.

## Visual review

Production-screen captures: portrait menu 390x844, landscape menu 844x390, desktop menu 1440x900, and startup 390x844. Actual assets are decoded from data URIs in isolated Chromium because live navigation is blocked. The loading screenshot is captured before the ready signal so its design can be reviewed. It is not evidence that the production game artificially delays for that screenshot. Menus truthfully show LOCAL PREVIEW / NOT VERIFIED.

Square, rounded and circular icon previews are masks of the actual PNG, not installed-device screenshots. Central-ship extremities were checked within the 40%-radius mask-safe circle; peripheral crystals/terrain can be cropped by a launcher shape.

## Blocked and untested

A current real localhost navigation attempt returned `net::ERR_BLOCKED_BY_ADMINISTRATOR`. See `live-pwa-probe.json`. Real service-worker install/update, browser-controlled native splash, offline relaunch, GitHub deployment, Android launcher refresh/approval and physical phone performance remain unverified. Mocked worker tests and isolated UI rendering do not replace these checks. No full campaign playthrough, physical-device audio listening or Play Store packaging is claimed.

## Packaging

`tests/package_v0174.py` validates final test status, release hashes, ZIP CRCs and the actual v0.17.3 archive with the update overlaid. It also assembles the independent icon pack. Result: `verification/v0.17.4/package-integrity.json`.

## Reproduce

Run `python tests/build_release.py` after runtime edits, then `python tests/run_v0174.py`. Use `python tests/v0174_live_pwa_probe.py` separately to test whether the environment permits real HTTP navigation. Pillow is used for asset checks; Chromium, Playwright and Node are required. Historical reports are not evidence for this release.
