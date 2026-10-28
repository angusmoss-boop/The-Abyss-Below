# Verification: v0.18.2 / Recovery Protocol

Build: `0.18.2-recovery-protocol-1`  
Base: v0.18.1 / Guided Ordnance  
Final suite completion: 2026-10-28T05:23:53.260825+00:00

## Result

**All 26 current automated suites passed** on the final runtime files. Four new production-code Chromium suites cover lost-vessel recovery, exact rescue ammunition, current-release migration/slot isolation, and the five-level recovery lifecycle. The other 22 suites exercise gameplay/interface/audio regressions or mocked version-checker/worker boundaries.

This is evidence for the tested browser harness and packaged source, not a physical Android install, production deployment, human listening session or complete human balance playthrough.

## New behaviour exercised

| Suite | Evidence |
|---|---|
| Recovery | Actual fixed-map scrap/crystal/recorder collection, actual lethal damage, exact loss manifest, automatic map beacon and waypoint, manual E / USE recovery, repeated collection rejection, paused reload, banking once, older wreck retention, re-loss without duplication, recorder-only and empty losses. Surface, above-berth, in-berth, rock and over-pressure positions. Explicit quit preserves all cargo without rescue stock. |
| Rescue ammunition | Empty, partially spent and full upgraded magazines all become exactly 10 rail rounds / 3 torpedoes / 3 mines. Firing spends rounds; docking and reload do not grant more. Unfitted weapons stay locked while reserves persist through fitting. All three mines can be deployed with the base two-slot rack. Normal fills stop at fitted capacity. No negative-price transactions or progress-ring overflow. Legal emergency stock exports; excessive stock is rejected. |
| Recovery migration | Boots the actual v0.18.1 source archive, then upgrades its synthetic saved expedition. Balances, equipment, cargo, enemies, survey and maps remain. All three slots are loaded through the real slot UI and keep independent wrecks/ammo. Old already-created pods gain empty recorder lists without invented historical cargo. Portable export/import retains manifests; invalid IDs, duplicate ownership, bad amounts and inconsistent active manifests are rejected. Invalid-checkpoint fallback journals a recorder once without minting defeat stock. |
| Recovery across levels | Collects and rescues all 2 / 3 / 4 / 5 / 6 recorders through real pickup/death/recovery/docking paths. Each level unlocks only after banking. Leaves one extra resource wreck per completed level, travels, reloads and revisits. All five maps' original resource layouts stay unchanged; banked crystals plus remaining deposits plus wreck contents sum to all 496 finite crystal units. A real pressure-damage simulation step creates one wreck and one fixed rescue loadout. |

## Regression suites

Guidance; seeking mines; guidance save/migration; weapons; economy; placement; contracts; portable backups; Warden; recorder journal; signals/interface layout; migration; active-dive resume; campaign slots; multi-touch combat; passive stealth; audio transitions; music; branding/interface; startup; version sync; worker lifecycle.

These include weapon homing and impacts, unchanged prices and regeneration, paid dock transactions, save/resume of in-flight ordnance, contracts and story gates, input isolation, audio fades, startup artwork, release markers and checksum/worker behaviour. Sync and worker tests use mocked network/worker boundaries and are not live offline evidence.

The existing resume regression was deliberately updated for the requested rule: defeat now sets mines to three and leaves recorders in a recovery manifest; quitting keeps spent ammo. Firing tests choose a terrain-checked open-water position, rather than assuming a random generated map cannot obstruct the muzzle. No production failure was hidden by changing a gameplay expectation outside this requested update.

## UI and screenshots

`tests/preview_v0182.py` captured the actual production renderer and interface with synthetic equipment, real generated-map pickups and real pressure defeat. The loss manifest, lost-vessel marker, recovery map and emergency-ammunition explanation were rendered from the final runtime. Portrait loss, in-world wreck and survey screenshots were visually inspected.

The preview runner also passed reachable retry-button and no-horizontal-overflow checks at 320x568, 390x844, 844x390, 640x360 and 1440x900. The retry action actually launches with 10 / 3 / 3 stock at each size. These are emulated viewports, not physical-phone tests.

## Packages and release consistency

The final suite report includes SHA-256 hashes for all 17 runtime assets. Packaging verifies those hashes again, ZIP CRC integrity, and reconstruction of the update over the actual v0.18.1 complete archive. Package results are in `verification/v0.18.2/package-integrity.json` and `RELEASE-v0.18.2.json`.

No campaign storage keys were renamed. The campaign/field schemas remain additive-compatible for migration into this build. New saves should not be opened in older versions, which do not understand recorder ownership in recovery manifests or emergency reserves.

## Blocked and untested

A fresh local HTTP probe was attempted in Chromium. Navigation was blocked with `net::ERR_BLOCKED_BY_ADMINISTRATOR`. Real worker installation, live hosted updates, offline relaunch and an already-installed phone app moving to this version are therefore **not verified**. Mocked worker tests do not substitute for these checks.

Physical Android performance, phone touch ergonomics, launcher behaviour, human audio listening and full-campaign balance remain untested. The requested free defeat loadout changes the cost of failure; it is intentionally granted even after repeated genuine deaths. No extra anti-farming penalty was added.

Persistent recovery requires successful local storage. Clearing site data, deleting a campaign or losing device/browser data can still remove local saves. Exported campaign files remain the external backup mechanism. No personal/user save was read or modified; tests used synthetic campaigns.

## Reproduction

Run `python tests/build_release.py`, then `python tests/run_v0182.py`. Do not edit runtime during a test run. Run `python tests/preview_v0182.py` for screenshots/layout checks and `python tests/v0182_live_pwa_probe.py` for the separate live-navigation probe. After all suites pass, `python tests/package_v0182.py` checks and builds the complete/update ZIPs. Details: `tests/README-v0.18.2.md`.

Historical reports in the complete archive apply only to their named builds. Current evidence is under `verification/v0.18.2/`.
