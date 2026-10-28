# Sunken Strongholds verification

Requirements: Python 3, Playwright Python, Chromium, and Node.js. The production-file harness loads the actual HTML entry points and scripts into Chromium with isolated synthetic localStorage. It does not access a user's real campaign.

```sh
python tests/build_release.py
python tests/run_v0230.py
python tests/v0230_stronghold_routes_test.py
python tests/v0230_live_pwa_probe.py
python tests/v0230_previews.py
```

The default runner has 45 current suites. It includes the new five-vessel interaction/security loop, trap lifecycle/visibility/save tests, and actual v0.22.0 migration. Previous tests with assumptions replaced by locked vaults are not counted as current coverage. Their original source is retained as history. Current adapted achievement/guidance fixtures account for the relay requirement and newly seeded guards.

The separate navigation suite checks 15 generated cases (five levels at three seeds) with the real collider, conservative submarine radius and swept edges. It verifies pre-unlock relay/service access, a sealed vault, post-unlock plate/exit routes, solid gates, valid guard positions and preservation of original rock/resource layout. The overview preview changes the test camera only.

Migration boots the actual archived v0.22.0 code. Put `the-abyss-below-v0.22.0-complete.zip` beside this extracted directory. It creates an old valid submarine/recovery position that the new layout would obstruct, migrates all three slots, and verifies safe positions, original contents and previously earned finishes. Some inherited regression suites use other historical archives when available or their retained synthetic fixtures; read their source for prerequisites.

Results are in `verification/v0.23.0/`. `results-latest.json` records suite status and runtime checksums. `stronghold-routes.json` records each geometry case. `live-pwa-probe.json` records a real HTTP attempt separately, never converting an administrative network block into a pass. Node worker/sync tests use mocked boundaries and do not establish live offline operation.

After runtime edits regenerate all nineteen asset checksums and rerun tests before packaging. The current release verification report distinguishes observed automated evidence from untested hardware, ergonomics, listening and whole-campaign balance.
