# Changelog

## v0.5.0 · The Lightless Deep (27 October 2026)

- Replaced stepped depth colours with continuous ambient attenuation using fractional metres. Ambient light is exactly zero at and below 1,000 m.
- Added a final world darkness mask, with a finite, forward-facing flashlight cone as its only deep-water visibility source. Soft cone edges and distance falloff share a precomputed texture with the visible beam.
- Masked all scenery, item glows, enemy eyes, vents, sonar rings, submarine details and wake; retained instruments and the objective pointer above the mask. Faded the decorative screen scanlines with ambient light too.
- Extended item/enemy drawing checks to include the full beam footprint, avoiding the old 155-unit salvage cutoff inside the light.
- Made flashlight illumination depend on battery power. Empty batteries show NO POWER and no longer count as lit lamps for predator detection.
- Reused offscreen buffers and copied backing pixels 1:1 to prevent resampling seams at fractional viewport sizes. No runtime dependency or image download added.
- Fixed mobile action button hit-testing in landscape/wider layouts; the old pointer-events rule only applied at a narrower breakpoint.
- Preserved save format/key, six-recorder mission, hull progression, collision mechanics and pause/title/New Game behaviour.
- Bumped runtime asset URLs and offline cache to v0.5.0, correcting the earlier worker's mismatched v0.3.0 asset query strings.
- Added pixel-level lighting regressions and an optional real HTTP/offline integration test. Seven browser suites pass; the local HTTP integration attempt is blocked by the build environment. See VERIFICATION-v0.5.0.md.

## v0.4.0 · NEREID Refit and Navigation (27 October 2026)

- Replaced the basic submarine silhouette with a sleek rendered MK-II: gradient ceramic-titanium hull, curved glass canopy, swept stern fins, twin propellers, navigation lights, metallic ribs and animated bubble wake. Original hull physics retained.
- Added large, accessible pause overlay with RESUME, MENU and QUIT. MENU suspends a dive for tab-lifetime continuation; QUIT explicitly confirms discarding unbanked cargo while preserving permanent banked progress.
- Added prominent NEW GAME option on the initial menu with a second confirmation step that clears saved rank, depth records, credits, upgrades and recorders.
- Main menu now distinguishes BEGIN EXPEDITION from CONTINUE EXPEDITION and displays a saved-progress summary. Main menu exit available after vessel loss.
- Improved pause/dialog state transitions, keyboard Esc behaviour and mobile responsive overlays.
- Raised asset URL versions and service worker cache to v0.4.0 for normal PWA updates without reinstalling.
- Added browser integration tests for pause/resume, suspend/continue, quit cancel/confirm, and saved-game wipe/cancel.


## v0.3.0 · Into the Deep (27 October 2026)

- Six recorders at depths 75, 260, 470, 725, 1,100 and 1,500 m; victory requires delivering all six.
- Procedural ocean expanded to 1,800 m with seven named depth sectors and replenished world content.
- Rare purple abyss stalkers spawn deeper than 400 m, move 134 vs 80 speed, detect better and inflict 27 vs 13 damage. Both predator tiers disengage when the submarine escapes pursuit range.
- Hull tree increased from 5 to 7 tiers: +200 m rated depth and +28 maximum hull HP per level (base 130 m, max 1,530 m). Exceeding the rating now causes increasingly dangerous pressure damage.
- More deep salvage and wreck-adjacent resources to support the longer progression loop.
- Six-pip mission HUD, apex radar colours and warning text; updated mission briefing, story, help and milestone objective labels.
- Preserved historical v0.1 local save key and migrated previously secured IDs 0-2 into new six-recorder mission.
- Version-tagged game/CSS/manifest references and new offline cache v0.3.0 for Github Pages PWA updates.
- Added deep-trench and save compatibility regression test.


## v0.2.2 · Predator disengagement, smoother collisions, multitouch USE

- Predators abandon pursuit beyond a hard leash, forget sonar alerts, and resume patrol; temporary recovery prevents instant reacquisition.
- Rock collisions use polygon outlines matching visible rock art and a narrow three-circle sub hull; substep resolution reduces tunnelling, and sliding retains tangential velocity. World generation preserves a navigable winding route.
- Pickup reach increased and holding USE auto-salvages while passing an item, including while joystick is held with another finger.
- Mobile action buttons moved left, joystick/cruise moved right, and USE button enlarged with a highlighted press state.
- Version-tagged assets and offline shell updated to v0.2.2; existing saved credits/upgrades/secured recorders remain compatible.

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
