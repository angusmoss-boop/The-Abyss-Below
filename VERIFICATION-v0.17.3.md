# Verification: v0.17.3 / Smooth Signals

Build: `0.17.3-smooth-signals-1`
Baseline: actual archived `the-abyss-below-v0.17.2-complete.zip`

## Result

**Eleven targeted suites passed:** eight Chromium browser suites, one static/syntax release suite and two Node suites using mocked network/service-worker boundaries. No human listening or physical-phone result is claimed.

Authoritative run summary: `verification/v0.17.3/results-all.json`.

## Reproduced defect and before/after evidence

The baseline's `fade()` scheduled a linear release after `cancelAndHoldAtTime()` without explicitly anchoring the current value. When an engine gain was following `setTargetAtTime()`, native Chromium rendered an immediate zero instead of the intended release. This is an actual signal-level failure, not merely an assumption from reading the code. The previous patch's scheduling assertions did not establish continuity of the rendered envelope.

A test uses production `audio.js` with native OfflineAudioContext, feeding a constant signal through the engine gain to measure its envelope independently of the oscillator. It pauses during engine sound and resumes after 50 ms.

| Measurement | v0.17.2 | v0.17.3 |
| --- | ---: | ---: |
| Largest adjacent-sample envelope jump around pause | 0.0554009 | 0.00000467524 |
| Minimum engine gain 0.8–1.1 s after test start, with resume at 0.55 s | 0 | 0.0573332 |
| Automation operations from 100 already-running unlock calls | 700 | 0 |
| Seeded water-buffer join discontinuity | 0.294520 | 0.0230634 |
| Largest ordinary interior water-buffer step | 0.070397 | 0.069823 |

The fixed water join is within the normal texture's sample variation. These are unscaled buffer/control-envelope measurements, not speaker loudness or perceptual click ratings.

Real-time AudioContext sampling separately verifies the fixed pause gain decreases gradually over approximately 0.38 s, reaches zero, and does not suspend the context during normal pause. Rapid hide/show cancels stale suspension; genuine background suspension is observed only with output gain zero.

In the latest comparative run, first-use menu/dock/pause scene handlers took approximately 187/167/282 ms in the baseline and 1.4/0.1/0.1 ms in the patch. The patch schedules synthesis asynchronously: these figures measure UI-handler blocking, **not time until the new music is audible**. They are container measurements, not Android performance estimates.

The three theme durations and per-channel hashes match the baseline exactly. The melodies have not been replaced or rebalanced.

Raw evidence: `comparison.json`, `transitions.json`, `audio-signal.json` and `music-signal.json` in `verification/v0.17.3/`.

## Passed suites

| Suite | Coverage |
| --- | --- |
| audio_comparison | Actual baseline vs current audio; native offline envelope, rapid resume, duplicate automation, loop join, worker path and identical music samples. |
| audio_transitions | Native live pause fade; rapid lifecycle changes; zero-gain suspension; blocked-worker yielding fallback; stale async scene suppression; mute/unmute; actual mobile pause/settings/resume; one global unlock callback per gesture. |
| audio | Real AudioContext output for ambience/effects, voice cap, cue throttling, suspension, mute and persisted mixer settings. |
| music | Real music output, original loop durations, scene routing, no duplicate source on repeated scene refresh, independent music slider and background suspension. |
| resume | Active expedition/state restoration and save protections using production code. |
| slots | Actual legacy save migration and three-slot UI behaviour, save/load/delete guards and independent progress. |
| combat_touch | Actual touch input for simultaneous helm, firing, mines and utility actions. |
| stealth | Analogue movement/noise, passive insulation and existing flashlight behaviour. |
| release | Eleven runtime checksums, HTML/script wiring, version markers and JavaScript syntax. |
| sync, mocked | Fresh deployment verification, incomplete/stale/offline handling and active-dive reload guard. |
| worker, mocked | Verified shell/cache lifecycle, fallback logic and rejection of a partial release. |

An exact v0.17.2 source comparison additionally establishes that gameplay/economy/storage code and styles are unchanged apart from build identifiers and removing one duplicate audio listener.

## Not tested

- Physical Android/iOS devices, speaker/headphone/Bluetooth listening and browser/device-specific audio interruptions.
- Live hosted deployment, a real installed PWA updating offline, or Play Store packaging.
- Full campaign balance/playthrough, which this audio patch does not change.

There was no new live-PWA attempt in this patch. Historical reports of a blocked environment are not counted as current tests.

## Reproduction

Install Python Playwright and Chromium. Keep the v0.17.2 complete ZIP beside the extracted source directory for the before/after comparison. Run `python tests/run_v0173.py`. The runner writes per-suite logs/results and a summary. The full music test waits for asynchronous readiness rather than assuming synthesis occurs inside a button callback.

Run `python tests/build_release.py` after any runtime change. Package validation verifies both the complete archive and the update overlaid on the actual v0.17.2 archive.
