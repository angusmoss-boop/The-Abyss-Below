# v0.17.3 audio patch tests

Run `python tests/run_v0173.py` from the source root. Python Playwright and a Chromium executable are required; Node is required for release syntax and the two mocked lifecycle suites. Put the actual v0.17.2 complete ZIP in the parent directory for comparative tests. No personal game save is used.

Selected suites can be run by name, for example `python tests/run_v0173.py audio_comparison audio_transitions`.

The runner executes 11 targeted suites, not the entire historical campaign suite. Two mock-based suites explicitly do not establish live offline/PWA behaviour. Native audio envelope/signal tests do not establish perceptual quality on a phone.

Rebuild release hashes with `python tests/build_release.py` after editing runtime code; then rerun tests before packaging.
