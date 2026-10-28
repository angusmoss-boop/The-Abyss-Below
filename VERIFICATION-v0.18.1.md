# Verification: v0.18.1 / Guided Ordnance

Build: `0.18.1-guided-ordnance-1`  
Baseline: actual archived **v0.18.0 / Lost Signals**  
Final current results assembled (UTC): 2026-10-28T03:01:17.914275+00:00

## Result

**22 current automated suites passed on the packaged runtime.** Twenty use production JavaScript/HTML/CSS in Chromium with synthetic storage and fixtures; two use production code in Node with mocked version/network/service-worker boundaries. JavaScript syntax checks, immutable-runtime comparison and ZIP overlay checks are additional checks, not counted as gameplay suites.

The recorded runtime SHA-256 values in `verification/v0.18.1/results-all.json` match `version.json` and the packaged files. Results from older releases in this archive do not establish current coverage.

## New combat coverage

| Area | Verified |
|---|---|
| Off-axis hits | Six formerly missed stationary offsets now connect; rail correction is narrower/weaker and torpedoes capture much wider targets. Both sides of the bow tested. |
| Acquisition | Exact 32° rail and 65° torpedo boundaries, behind/side rejection, central-aim preference, stable lock, dead-target reacquisition, straight flight without a valid contact. |
| Moving targets | Four independently moving crossing contacts plus normal live predator-AI cases using the actual simulation. Predictive steering reaches targets without exact initial alignment. |
| Turning and range | Per-step turn caps, stronger torpedo curvature, no speed gain, no U-turn target acquisition and finite original travel budgets. |
| Terrain and other entities | Rocks block acquisition and physical shots; a blocked central contact does not prevent a visible alternative. Harmless schools, loot and abandoned mines are not seeker targets. Environmental mines still respond to direct hits. |
| Seeking mines | No movement before arming, partial-frame arm time, 3.2 m/s cap, 20 m local range, finite original-drop leash, stop on contact loss and omnidirectional acquisition. |
| Mine collision | Relative swept mine/predator contact, fast crossing contacts, no retroactive hit while unarmed, rock-blocked proximity triggers and blast damage, multi-target damage, correct kill credit/salvage and no own-ship damage. |
| Warden | Guidance reaches an awakened Warden; its armour and recovery vulnerability remain effective. Existing full optional-boss activation, checkpoint, territory and bounty suite also passes. |
| Save migration | Actual v0.18.0 code produces an active campaign containing two projectiles and a planted mine. Current code restores it paused, retains stock/cooldowns and lazily adds guidance state. Resource layouts/depletion, regeneration, survey, wild state, signals and economy are preserved; two inactive slots remain byte-for-byte unchanged. |
| New checkpoints | Exact locked IDs, launch heading, turned velocities, mine anchors, arming state and ammunition restore. Target references are resolved against the restored scene and released if terrain blocks them. Portable backups accept correct new fields and reject malformed guidance data. |

## Regression coverage

All 24 direct weapon/mark/predator impact combinations, every paid weapon purchase, ammo guards and paid refills pass. Existing price checks confirm 22,765 total upgrade credits, 464 required crystals, unchanged ammo prices and unchanged salvage/manual-crystal behaviour.

The suites also cover contract persistence and bank-only rewards, 40 generated level/seed placements, portable backup validation/conflicts/failures, all 20 journal entries, responsive contract/journal interfaces, three slots, general active-dive restore, simultaneous steering/rail/torpedo/mine touch input at three phone sizes, passive noise control, existing audio fades/music, branding and startup fallbacks. Earlier v0.17.4 migration coverage is retained alongside the new v0.18.0 migration.

The version checker and worker require matching current build IDs and all published asset checksums; their mocked tests do not establish real hosted/offline behaviour.

## Source and artifact checks

Audio, slot management, startup and stylesheet logic are byte-identical to the v0.18.0 baseline after normalising release markers. The approved artwork/icons are unchanged. Dock help/stat copy and the startup version name are updated. All JavaScript files pass syntax checks.

Both ZIPs are CRC-checked and checked against the complete current release manifest. Applying the update ZIP over the actual v0.18.0 complete ZIP must reconstruct every current runtime asset exactly. Package results are recorded in `verification/v0.18.1/package-integrity.json` and `RELEASE-v0.18.1.json`.

## Test-fixture correction

The initial save test expected its synthetic, obstacle-free arena to stay obstacle-free after restore. The game correctly regenerated the campaign's real seeded rocks and released an occluded lock, causing that assertion to fail. The assertion was corrected to require identical saved references and enforce current line of sight after restoration. The final guidance-save suite passes; runtime source did not need changing for that fixture issue. Guidance coverage was also expanded to test actual Warden armour interactions and rerun. The full main run and final focused run have identical runtime hashes.

## Preview

`tests/preview_v0181.py` captured the mobile torpedo animation from the production renderer and simulation at normal simulated speed. The target is deliberately placed off-axis and held still; scenery and equipment are synthetic test fixtures. The inspected frame shows the torpedo curving away from the bow towards the predator. It is not an image-generated mock-up or a naturally encountered balance playthrough.

## Blocked and untested

A real local HTTP navigation was attempted by `tests/v0181_live_pwa_probe.py` and blocked with **net::ERR_BLOCKED_BY_ADMINISTRATOR**. Real service-worker installation, hosted update delivery and offline relaunch remain **unverified**. This build has not been deployed to the user's repository or host.

Physical Android/iOS performance, phone ergonomics, listening on actual audio hardware, Safari/Firefox, native Android packaging and a complete human campaign/balance playthrough are untested. Homing is intentionally limited and cannot guarantee hits, pathfind around rocks or compensate for every close-range evasive manoeuvre.

## Reproduce

Run `python tests/build_release.py`, then `python tests/run_v0181.py`. See `tests/README-v0.18.1.md`. Do not change runtime files during testing. The previous full ZIP is used for the migration when available; a synthetic baseline fixture is included for standalone reproduction. No personal save was accessed.
