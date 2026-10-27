# v0.11.0 verification

Run from the extracted source root. Requirements: Python 3, the Python Playwright package, a Chromium executable on PATH, and Node.js. The production runtime itself has no package/build dependency.

```sh
python tests/build_release.py
python tests/run_v0110.py
python tests/v0110_previews.py
```

The runner writes individual logs and a machine-readable results file under `verification/v0.11.0/`. The current suites are:

| Suite | Method and coverage |
|---|---|
| `v0110_dock_test.py` | Production DOM/CSS in Chromium. 13 viewport sizes, three columns, name-only tiles, native child dialogs, focus/Escape, all 51 paid purchase levels, exact credits, max/affordability states, no ammo grants, persistence and v0.10 migration. |
| `v0110_systems_test.py` | Production game functions in Chromium with gated deterministic fixtures. Every new module mark, range and power checks, rock/darkness restrictions, shield impacts/recharge/pressure bypass, sonar arrival, stun resistance and expiry. |
| `v0110_campaign_test.py` | Production shop buttons and game state. Boost marks, paid ammunition, finite deposits, dock-only predator/cache refresh, kill drops, migration/backup/new-game handling. |
| `v0110_touch_test.py` | Chromium touch emulation and real CDP multi-touch injection. 11 touch / 5 desktop sizes, four-slot fitted-shield HUD stress case, floating helm, action isolation, steering/boost/mine/use concurrency. |
| `v0110_regression_test.py` | Production renderer with pixel assertions, all lamp marks, darkness, sonar echoes, mine damage/health combinations, collisions, pressure, seeds/objectives and storage warnings. |
| `v0110_release_test.py` | Static HTML entry points, deferred script order, duplicate IDs, build markers, versioned local asset links and all nine SHA-256 release entries. |
| `v0110_sync_test.mjs` | Actual version-checker code with mocked DOM/network/worker boundaries. Green-status requirements, offline invalidation, mismatches, incomplete deployment, update ordering and active-dive reload guard. |
| `v0110_worker_test.mjs` | Actual service-worker source in a mocked cache/network lifecycle. Verified shell installation, scoped cleanup, offline fallback, cache omissions and partial upload rejection. |

The harness loads actual production HTML/CSS/scripts into an in-memory page and enables `ABYSS_TEST_MODE` before loading `game.js`. This gives the tests controlled state without changing normal production execution. Browser storage is simulated so test fixtures never alter a real user's campaign. This method tests game and DOM behaviour, not hosted navigation or a real installed PWA.

`tests/fixtures/v0100_campaign.json` is a synthetic save created by the actual archived v0.10 runtime. The dock migration test regenerates it when `the-abyss-below-v0.10.0-complete.zip` is alongside the source directory; otherwise it uses the retained fixture. It includes synthetic profile data, actual generated node placements, collected resources and purchased ammo. No user campaign was accessed or modified. The optional historical v0.9 byte-to-byte comparison similarly uses the v0.9 ZIP when available and reports SKIP when absent.

## Optional real local-origin test

```sh
python tests/v0110_live_pwa_test.py
```

This starts a localhost server and attempts real navigation, worker installation and an offline reload without mocking the network. In the current execution environment, navigation is blocked by `net::ERR_BLOCKED_BY_ADMINISTRATOR`; this test is **not counted as passed**. Its output is recorded separately in `verification/v0.11.0/live-pwa.json`.

No claim is made about GitHub Pages deployment, an already-installed app updating, physical Android/iOS performance, Safari/WebKit/Firefox behaviour, or a completed full-campaign playthrough. Archived tests with earlier version numbers describe their historical releases and are not the current runner.
