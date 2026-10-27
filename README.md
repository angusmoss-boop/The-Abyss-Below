# THE ABYSS BELOW
### Deepwater Expedition · v0.2.2

A single-player submarine survival game built with vanilla HTML, CSS and JavaScript. The v0.2 update adds analogue touchscreen steering and installable fullscreen/offline Progressive Web App (PWA) support.

## Play and controls

After publishing to HTTPS GitHub Pages, open the site in your mobile browser.

| Action | PC | Phone |
|---|---|---|
| Pilot | WASD / arrow keys | Drag the circular **joystick**; slight tilt = slow, edge = fast |
| Hands-free travel | n/a | Enable **CRUISE**, drag the stick to set a course, release it; adjust by dragging again; tap CRUISE to stop |
| Sonar | Q | SONAR |
| Salvage / dock | E | USE |
| Quiet propulsion | Hold Shift | SILENT toggle |
| Repair (2 scrap) | R | REPAIR |
| Lamps | L | LIGHTS ON/OFF |
| Pause | Esc | PAUSE |

Joystick releases to neutral. Your submarine slows rather than snapping to a stop because it has momentum. Cruise mode holds your **last steering vector**, not collision avoidance. It turns off automatically if you pause, switch apps, open a dialog or start a new dive. Watch your oxygen, battery and rocks!

## Install on Android (fullscreen, no address bar)

1. Upload the game's root files to your **existing** GitHub repository. Keep `index.html`, `game.js`, `styles.css`, `manifest.webmanifest`, `service-worker.js`, and the three `.png` icon files at the repository root. Upload other docs/tests if wanted. **Don't upload the ZIP itself.**
2. Wait for GitHub Pages to redeploy, then open the **same Pages URL** in **Chrome** (HTTPS). If the old layout remains, refresh or close/reopen the page.
3. Chrome's **⋮ menu** should offer **Install app** or **Add to Home screen**. Use **Install app** when offered. Alternatively, use the game's *INSTALL ON PHONE* button if Chrome displays it.
4. Launch **The Abyss Below** from its new home-screen icon, rather than reopening the GitHub Pages tab. The app requests **fullscreen** display to hide browser toolbars. Android may retain system navigation gestures or override fullscreen settings.

The new service worker caches core files for offline play after installation and the initial online load. The game uses the same browser storage key as v0.1, so credits/upgrades already saved on the same device and GitHub Pages origin should remain available. **Saves are local to that browser/origin; there is no cloud sync or transfer between devices.** Unbanked cargo and an in-progress dive are not saved. Avoid clearing site data/uninstalling before securing anything important.

## Publish or update on GitHub Pages

**First publish:** create a public repo, upload root files, go to **Settings → Pages**, choose **Deploy from a branch**, `main`, `/ (root)` and Save.

**Updating v0.1:** replace the three existing root game files, add `manifest.webmanifest`, `service-worker.js`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` to the same root, and commit. If using Android's GitHub web interface, enable Desktop site when GitHub hides the upload controls. You do not need to create another repository. GitHub may take a short while to refresh the site after committing. Open your published site and check the footer says **v0.2.2**.

## Mission and gameplay

Locate three gold/orange flight recorders at increasing depths and **return to the surface station to deliver them**. Salvage scrap/crystals for credits, then upgrade hull, oxygen, battery, engine, sonar and stealth. Noise and sonar attract predators. Depth pressure can damage the hull. Dock to bank progress and restore your systems.

**Permanent progress:** saved credits, upgrades, XP, best depth and delivered recorders. The original localStorage key `the-abyss-below-v01` is deliberately retained to protect v0.1 saves.

## Developer notes

No runtime libraries or external assets required. The entire app is static, compatible with GitHub Pages subdirectories because PWA paths are relative. Game code is `game.js`, mobile controls in `index.html`/`styles.css`, install config in `manifest.webmanifest`, and offline caching in `service-worker.js`.

Optional tests: `pip install playwright pillow`, `python -m playwright install chromium`, `python tests/smoke_test.py` and `python tests/joystick_pwa_test.py`. The second checks movement and manifest icons in an in-memory browser. It does not prove installed Android fullscreen or actual offline behaviour; test that on Chrome after deployment. A read-only `window.AbyssDiagnostics.state()` hook is available for inspecting game state.

## What comes next

More creatures, salvage variety, navigation tools, and distinct depth biomes. No updates to the mission/progression rules were made in this release.


## Mobile v0.2.2: fullscreen cockpit

On a phone, **BEGIN EXPEDITION** enters the expanded play view automatically. Use the
**EXIT** button at the top right to return to the complete mission/radar/upgrade
console. **FULLSCREEN** inside the canvas lets you switch back. The browser will
also attempt its native Fullscreen API when you press this button; in browsers
that disallow it, immersive view still fills the available webpage area. Install
via Chrome's **Install app** for a display without the usual address bar.

A high-contrast joystick is at the bottom right, and compact sonar/use/silent/
repair/lights controls are at the bottom left. USE is enlarged and can be held while moving. Toggle **CRUISE** for hands-free
thrust after steering. CSS and JS carry versioned URLs so new uploads do not
accidentally reuse old files from browser caches; offline app caching also uses
a new release key.

When updating GitHub Pages from a phone, upload the files **inside** the update
ZIP to the repository root, replacing the old versions; do not upload the ZIP
itself. Confirm the version in the regular console footer is v0.2.2. If your
installed home-screen app is showing an old layout, close/reopen it after the
Pages deployment completes and clear the site's cache if necessary.

## v0.2.2 gameplay and mobile layout

- **Actions are on the left; joystick and cruise are on the right.** The **USE** button is now large and at the top of the left-hand action cluster.
- **Hold USE while steering** with another finger. Salvage is checked every 120 ms, so you can coast into range and automatically pick up items. You can also tap USE to pick up an item immediately. Docking still opens the upgrade panel and stops the dive as before. Pickup distance is now 60 world units.
- **Predator disengagement:** chasing predators break pursuit when you are over 345 world units from them, lose their sonar alert, and won't immediately reacquire while returning to patrol. Quiet running still helps avoid detection; staying close or pinging sonar still attracts enemies.
- **Rocks use their actual rendered polygon outlines** with a submarine capsule hitbox, multiple small movement steps, tangential sliding, and a generated traversable corridor. Tight gaps that visually fit the vessel are more reliable. Collisions at higher speed can still damage the hull.
- The old save key, mission objectives, app icon, installation and full-screen mode are unchanged. Update files in the existing GitHub repository; the versioned asset URLs and new PWA cache name help phones fetch the new version without reinstalling.
