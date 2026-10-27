# The Abyss Below — Changelog

## v0.2.1 — 27 October 2026 · Mobile cockpit polish
- New immersive cockpit mode: expanded viewport fills the available phone screen, with optional browser fullscreen request. Small HUD displays depth, hull, oxygen, power and noise; buttons to pause, open instructions or exit expanded mode.
- Starting an expedition on phones automatically enters expanded cockpit mode; exit button restores the full operations console.
- Increased normal-view game viewport to 76dvh on small screens.
- Rebuilt high-contrast analogue joystick with explicit thumb and touch target; compacted action buttons to a translucent right-hand cluster.
- Cache-busted linked CSS, JS and manifest, and incremented offline service-worker cache so updated GitHub Pages assets don't mix with v0.2.0.
- Preserved save key and game balance.

# Changelog

## v0.2.0 · Mobile helm & fullscreen installation

- Replaced mobile direction buttons with a draggable 360-degree virtual joystick and analogue movement speed.
- Added hands-free CRUISE option: latch and re-aim the current travel direction until disabled.
- Automatically cancels the helm/cruise when a new dive begins, game pauses, or the app loses focus.
- Added installable PWA manifest, three Android icon assets, optional in-game install button, and static offline shell caching.
- Fullscreen app display preference and mobile layout tweaks for more ocean viewport space.
- Retained the exact v0.1 save key to preserve banked progress on the same GitHub Pages origin.
- Added joystick regression tests and icon/manifest checks.

**Caveat:** Actual Android installation/fullscreen needs real Chrome testing; mobile browser emulation cannot verify the system-level installed experience.


## v0.1.0 · First playable expedition

- Complete dark nautical cockpit UI, separate HUD panels and mobile directional controls.
- Navigation through a procedural rock-filled trench with collision handling.
- Four depth zones with individual names and pressure constraints.
- Battery, oxygen, hull integrity, motor noise and lamps.
- Active sonar pulse and temporary radar reveal, including battery and noise costs.
- Enemy patrol, investigation and chase behaviour.
- Scrap, crystals, emergency caches and three story recorders.
- Surface station banking, six upgrade trees and expedition XP ranks.
- Death/retry flow; permanent progress saved in local browser storage.
- Repeatable desktop/mobile browser smoke tests.

### Known limitations

- A dive in progress does not survive a browser refresh. Only banked progress is persistent.
- Dedicated visual settings and landscape-first HUD are future improvements.
- The prototype has one campaign objective and no music or sound effects yet.
- The radar currently displays a local area and is not a persistent explored-world map.
