# Forgotten Giants verification

Run `python tests/build_release.py` after runtime edits, then `python tests/run_v0190.py`. Requirements are Python, Playwright, Chromium, Pillow and Node. The runner uses two workers and writes logs and runtime hashes to `verification/v0.19.0/`. Do not change runtime files during the final run.

Six new suites join 26 adapted regression suites:

- `giants`: actual sonar/USE panel operation, manual plate pickup, permanent shortcut, plate-only/repeated deaths, exact recovery, dock-only reward, cosmetic selection and backup round-trip.
- `navigation`: 30 level/seed cases, conservative 28-world-unit circular clearance, reachable panel/plate and all four exits; actual keyboard entry and boosted wall collisions in each structure. A conservative circle encloses the rotating ship's capsule. This is route analysis and controlled driving, not a human playthrough.
- `behaviours`: pack offsets and capped speed; Stalker phases, non-biting recovery, stun; Reaper visible-velocity interception, occlusion and no speed increase.
- `targeting`: actual projectile target parity, separate weapon cones, no markers in total darkness, sonar visibility, no wall or wildlife targets, no marker without ammunition.
- `current_migration`: boots the real v0.18.2 ZIP, creates a mixed-cargo recovery and active expedition, then loads v0.19.0. Preserves all pre-existing player fields, resource coordinates/depletion, old wreck contents, enemy positions/wounds, old magazines and prices; verifies slot isolation.
- `discovery_safety`: every plate/door/finish, recoverable side-alcove loss, earned archive persistence, backup corruption guards and negative survey columns. Stable sonar contacts persist through object removal.

The 26 other suites cover recovery, rescue ammunition, older migrations, all five progression levels, guidance, mine seeking, weapon damage, economy, 40 mission-placement cases, contracts, backups, Warden, journal, 13-screen interface layout, active resumption, three slots, multitouch controls, passive noise, audio transitions, music, branding/startup, version verification and worker lifecycle. Expected old cargo records are compared with only an added empty `plates` array; all pre-existing fields remain asserted. Older predators are compared by every old field, with only new behaviour defaults allowed. Isolated simulation fixtures stay ordinary unless the test explicitly enables new AI.

Gameplay uses real production scripts and DOM from the shipped index, with controlled storage and diagnostics. Version and service-worker suites use mocked network boundaries. `python tests/v0190_live_pwa_probe.py` separately attempts real local HTTP; a block must be reported as blocked, not a pass.

`python tests/preview_v0190.py` and `python tests/preview_v0190_encounters.py` create actual renderer/interface previews with synthetic state. They are not physical-device screenshots. `python tests/package_v0190.py` verifies complete ZIP bytes and a real v0.18.2 + update overlay against the final manifest.

Physical Android/iOS performance, human audio review, full-campaign balance and hosted/installed update behaviour require additional testing. Historical verification reports in the complete source apply only to their named builds.
