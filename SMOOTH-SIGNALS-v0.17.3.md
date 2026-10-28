# v0.17.3 / Smooth Signals

Audio-only corrective patch for v0.17.2 / Delta Helm.

## What was found

The pause code did schedule a 0.38-second fade, but that did not mean the signal actually faded. In the tested Chromium engine, cancelling a running `setTargetAtTime` envelope and immediately scheduling a linear ramp without a fresh start-value anchor made the engine gain jump straight to zero. This was reproduced with native real-time Web Audio and an offline sample-level envelope test. A quick resume also left the older pause endpoint scheduled, causing an unwanted second drop.

Every global pointer/key gesture had two audio-unlock listeners. The unlock routine reapplied mixer automation even while audio was already running. Generating a new interface theme also performed the entire synthesis on the UI thread. The looping water-noise buffer joined unrelated endpoints.

These are confirmed code/signal problems. They are not proof that every sound heard on a particular phone has the same cause.

## Fixes

- Hold and explicitly anchor the current volume before changing any envelope. Cancel obsolete pause endpoints before restoring engine sound.
- Audio unlock is a no-op when the engine is already running. Removed the duplicate global gesture listener.
- Generate the existing original music in a local Web Worker; retain a small-chunk, yielding fallback when workers are unavailable. No external service, network download, new music file or permission is needed.
- Keep an outgoing interface theme until its replacement is ready. Invalidate asynchronous requests when the player leaves, mutes or backgrounds, so an obsolete theme cannot start over the new scene.
- Overlap the water loop's tail continuation into its head instead of splicing unrelated values.
- Schedule one-shot attacks slightly ahead of playback and let their release envelopes reach zero before stopping sources.
- Wait for the audio clock to reach silence before background suspension. A new gesture cancels stale suspension.

## What stays the same

The menu, dock and pause compositions are unchanged: their generated stereo sample buffers match v0.17.2 exactly in the comparison test. The independent volume sliders remain.

No changes to the seven-button triangle layout, economy, upgrades, damage, salvage, finite crystals, ammunition, save schemas or campaign slots. Exact comparison with v0.17.2 confirms the game script changes are only the build identifier and removal of the duplicate audio-unlock listener. Styles and campaign storage code differ only in the build identifier.

## Installation

Save your current campaign; banking cargo first remains the safest update procedure. Extract the update ZIP into the existing v0.17.2 repository, replacing matching files. Publish the entire patch together, not `audio.js` on its own: the release verification hashes and versioned service-worker cache also change.

Keep the same game address and browser profile. Do not clear site data or delete campaigns. Reopen online after deployment and check for **v0.17.3 / Smooth Signals**. The package has not been deployed to your website by the assistant.

## Verification limits

Eleven targeted suites passed. Tests include native Web Audio signals/envelopes, worker failure fallback, rapid transitions, backgrounding, volume/mute, campaign slots, resume, mobile controls and release integrity. This is not a physical Android listening test or a guarantee that an operating-system/Bluetooth/audio-device glitch cannot occur. Live hosted/offline PWA updating and a complete gameplay playthrough were not tested in this patch.
