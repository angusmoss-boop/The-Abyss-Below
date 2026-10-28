# Recovery Protocol verification

After runtime edits run `python tests/build_release.py`, then `python tests/run_v0182.py`. Do not edit runtime files while tests are running. Requirements: Python, Playwright, Chromium, Pillow and Node.

The 26-suite runner includes four new suites:

- `recovery`: actual collection and damage, single manifest, recorders suppressed at original sites, exact transfer/banking, repeated deaths, recorder-only losses, surface/berth/rock/pressure positions, and deliberate quit.
- `rescue_ammo`: exact 10 / 3 / 3 replacement from empty/partial/full stocks, no extra grants from docking/reload, locked launchers, stored unfitted reserves, three usable mines in the base two-slot rack, paid-capacity/funds guards, and export limits. Firing positions are selected using production terrain checks; random obstructed muzzles are not mistaken for an ammunition failure.
- `recovery_migration`: actual v0.18.1 archive when available, with retained synthetic fixture fallback; exact old active save, existing old pods, all three slot UI transitions, export/import manifests, duplicate ownership rejection, and invalid-checkpoint cargo fallback.
- `recovery_levels`: actual collection and rescue of 2/3/4/5/6 recorders, bank-gated unlocks, one retained loss per level, travel/reload/revisit and conservation of all 496 finite crystal units; real pressure-damage death.

Regressions exercise guided ordnance, weapon damage, economy, contracts, placement, Warden, journal, backups, general migrations, save/resume, slots, mobile controls, passive noise, audio transitions, music, branding/startup, sync and worker logic. The existing save/resume regression intentionally expects defeat to reset ammunition and to retain recorders in the manifest. Quit still preserves spent ammunition.

`python tests/preview_v0182.py` captures real interface/game-renderer previews using synthetic equipment and actual resource pickups/pressure damage. It also checks reachable retry controls at five touch/desktop sizes. These are not images of physical phone testing.

`python tests/v0182_live_pwa_probe.py` separately attempts local HTTP. A network-policy block is not a pass. Gameplay harnesses use real production scripts in Chromium with synthetic storage; sync/worker suites use mocked network/worker boundaries. Human listening, physical Android performance, hosted rollout and full-campaign balance are not proven by these tests.

Final logs and runtime hashes are stored in `verification/v0.18.2/`. Historical reports belong to their named releases. `python tests/package_v0182.py` verifies final complete/delta ZIPs against current runtime hashes and reconstructs the v0.18.1 overlay.
