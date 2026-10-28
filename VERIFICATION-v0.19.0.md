# Verification: v0.19.0 / Forgotten Giants

Build: `0.19.0-forgotten-giants-1`  
Base: v0.18.2 / Recovery Protocol  
Final suite collection (UTC): 2026-10-28T08:38:27.280398+00:00

## Result

**All 32 automated suites passed on the final, unchanged runtime files.** Six new production-code Chromium suites cover wreck interactions and recovery, routes, predator variants, target hints, actual v0.18.2 migration and all-five discovery persistence. Twenty-six regression suites cover the existing game, interfaces, audio and mocked update/worker boundaries.

These are tested browser-harness and source-package results. They are not a hosted deployment, a physical Android install, human listening or a complete human balance playthrough.

## New coverage

| Suite | Evidence |
|---|---|
| Giants | Actual sonar-wave arrival, manual panel USE, permanently opened shortcut, no currency charge, manual plate collection, plate-only loss, repeated death/recovery, source suppression, bank-once story/finish, finish selection and exact backup round-trip. |
| Navigation | All five structures over six seeds each: 30 conservative route checks. A 28-world-unit radius encloses the rotating submarine; all four exits, panel and plate connect. Actual keyboard entry and boosted collision checks for each structure. No overlap with original rocks or movement of resource deposits. |
| Behaviours | Drifter approach offsets with unchanged capped speed; Stalker wind-up, rush, non-biting retreat/recovery and stun freezing; Reaper visible-velocity prediction, blocked observation and unchanged maximum speed. |
| Targeting | Target hints match the actual guided projectile candidates. Separate weapon cones, no contacts in total darkness until sonar, no through-wall targeting, no wildlife targets and no marker for an empty magazine. |
| Current migration | Boots the real v0.18.2 production ZIP and creates an actual mixed cargo wreck plus a damaged-enemy/in-flight-ordnance saved dive. Every pre-existing player field, original resource coordinate/depletion, old recovery contents, enemy position/health, magazine, price and mission state is preserved. Inactive slots initially remain byte-for-byte unchanged; new discoveries stay isolated when switching through the real slot UI. |
| Discovery safety | Every level's plate-only loss, recovery in its side alcove, opened door, banked finish and exact export round-trip. Duplicate plate ownership, unearned finishes, malformed state and bad AI memory are rejected. Negative survey columns and stable sonar contact IDs survive reload. |

The first recovery test exposed an actual placement problem: generating the old canyon could clamp new side-alcove recoveries into its former bounds. The production placement wrapper now establishes the relevant alcove before locating a pod. Plate recovery and repeated deaths were rerun after that change.

## Existing mechanics

The other suites are recovery, rescue ammunition, recovery migration, recovery across levels, guidance, seeking mines, guided-save migration, weapons, economy, 40 contract-placement cases, contracts, portable backups, Warden, journal, signals layout, older migration, active resumption, slots, combat touch, stealth, audio transitions, music, branding/UI, launch, sync and worker.

They cover all 20 bank-gated progression recorders and conservation of the 496 finite crystal units, exact 10 / 3 / 3 defeat ammunition, unchanged upgrade and round prices, salvage regeneration, weapon homing/impacts, contracts, old Warden state, pause-resume, three independent slots, simultaneous mobile input, passive noise, audio fades and startup artwork.

Migration comparisons intentionally permit only new fields: an empty `plates` array in old cargo/recovery manifests and added behaviour metadata on old enemies. Every old serialized field remains checked. Isolated legacy combat fixtures are ordinary predators unless a test explicitly enables the variants.

## Interface and visual review

The interface suite passed 13 sizes: 320x568, 360x640, 390x844, 430x932, 568x320, 640x360, 844x390, 915x412, 768x1024, 1024x768, 1280x720, 1440x900 and 1920x1080. It opens all journal sections including Discoveries, checks five cards, scrolls to the finish selector, verifies a usable unoccluded hit target, and exercises return/close/departure controls. No horizontal overflow or JavaScript page errors occurred.

Two harness assertions were corrected without changing runtime: test-only freezing is not the real pause overlay, so the slot test now explicitly enters pause; landscape journal content is intentionally scrollable, so the selector test scrolls before asserting on-screen hitability. The corrected suites were rerun on the same runtime.

Actual renderer screenshots show the Wayfarer, all five optional sites, the discovery journal, earned finish selection and target indicators at portrait, landscape and desktop sizes. Desktop wreck rendering, the portrait journal, mobile target hints and a deep sonar view were visually inspected. The scene previews use synthetic gear, positions or isolated targets. They are not concept images or pictures of a physical phone.

## Release and package verification

SHA-256 hashes cover **18 runtime assets**, including the new `forgotten-giants.js`. The version checker verifies that module's loaded build marker and file checksum; the mocked worker verifies the enlarged offline shell. A partial upload is rejected rather than shown as synced.

Packaging checks final runtime hashes, ZIP CRCs and reconstruction of the update over the real v0.18.2 complete archive. See `RELEASE-v0.19.0.json` and `verification/v0.19.0/package-integrity.json`. These are build artifacts, not a GitHub deployment or an Android App Bundle.

Do not open a new v0.19 campaign in an older build, which does not understand discovery plates, new side-alcove positions or additional predator state. Export an external backup before updating. No personal campaign was accessed; all tests used synthetic saves.

## Blocked and untested

A fresh real local-HTTP probe in Chromium returned **net::ERR_BLOCKED_BY_ADMINISTRATOR**. Real service-worker installation, hosted upgrade behaviour, offline relaunch and updating an already-installed phone PWA therefore remain **unverified**. Mocked lifecycle tests do not replace those checks.

Physical Android/iOS performance, touch ergonomics on hardware, new warning-sound listening, full campaign balance and a human traversal of every wreck remain untested. Automated route analysis is conservative but not a substitute for a human playthrough. Local storage still must succeed for persistence; external export files remain the backup mechanism.

## Reproduce

Read `tests/README-v0.19.0.md`. Run `python tests/build_release.py`, then `python tests/run_v0190.py`. Current evidence is in `verification/v0.19.0/results-all.json` and the per-suite logs. `tests/v0190_live_pwa_probe.py` records live HTTP separately. `tests/preview_v0190.py` and `tests/preview_v0190_encounters.py` capture the previews. After passing suites, `tests/package_v0190.py` verifies and writes both ZIPs.

Historical reports in the archive apply only to their named builds.
