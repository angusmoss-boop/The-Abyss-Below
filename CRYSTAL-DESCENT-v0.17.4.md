# v0.17.4 / Crystal Descent

A branding patch over v0.17.3 / Smooth Signals. Built from the approved enlarged-submarine crystal-cavern artwork. This package is prepared for deployment, not already hosted.

## App icon

The approved image is cropped by 128 pixels on every side to remove the baked-in rounded display frame. No new design was generated. The central vessel is retained, with an opaque ocean background. The platform supplies the final circle/rounded-square launcher shape.

Included: 192 and 512 px standard PNG icons, 512 px maskable PNG, 180 px Apple touch PNG, 32 px PNG favicon and multi-size 16/32/48 ICO. A 1024 px PNG master and a self-contained SVG raster wrapper are also included. The SVG is not a vector tracing. The maskable icon uses the same approved crop; the ship stays within its central safe area. Decorative outer rocks and crystals may be cropped by a launcher mask.

All referenced icon URLs have a new version query. The manifest's app ID, name, start URL, scope, fullscreen mode and theme/background colours stay unchanged.

## Loading and title screens

The in-game startup screen displays the new artwork and title on the existing deep-ocean background. It hands over after the game initializes and the image decodes, with a short fade rather than a forced-duration cinematic. The line is an indeterminate loading indicator, not a claimed percentage. Image loading has a 1.5-second fallback; missing game initialization has an eight-second escape to the menu. Missing launch.js leaves the overlay hidden by default. Reduced-motion settings remove the loading animation and transition.

The main menu has the approved artwork beside the title on portrait phones, and a larger artwork panel on desktop/wider layouts. Continue/Begin, hub, campaigns, achievements, New Game, sound, briefing, install and the real version-check status remain accessible. Small screens scroll within the card. The campaign selection button reads CAMPAIGN SLOTS; its functionality is unchanged.

This is an HTML startup screen. The first operating-system splash of an installed PWA remains browser-controlled and can use the manifest icon; the game cannot force Android to show a custom full-screen scene before its web view starts.

## Save and gameplay safety

No save keys, schemas, campaign balances, resource locations, upgrade prices, ammunition, control layouts or sound synthesis were changed. Exact archived-source comparison verifies unchanged campaign-slots.js and audio.js except their release identifiers. game.js adds only the build identifiers and the optional launch-ready notification. Original gameplay CSS is retained; new rules are scoped to startup/menu/branding elements.

## Update

Save first; banking and quitting the expedition is the safest update point. Extract the UPDATE ZIP and copy its contents into the existing repository root over v0.17.3. Do not upload the ZIP itself, nest it in another folder, clear site data or uninstall the existing app.

Upload the changed runtime files together, including **launch.js**, **launch-art.webp**, all icons, manifest, worker and version.json. A partial upload intentionally fails verification. Use the COMPLETE ZIP for a fresh source checkout. Keep the same website origin and browser profile for local saves.

After deployment, reopen online and check the main menu for **v0.17.4 / Crystal Descent**. This does not itself prove that the Android launcher has refreshed its cached icon. Chrome may ask you to review/accept the app identity update separately. Accept the icon change when offered; do not clear storage or uninstall just to force it. Exact launcher behaviour depends on browser/Android version and has not been tested on a physical phone.

Technical references:
- https://developer.chrome.com/blog/improvements-to-web-app-updates
- https://web.dev/articles/maskable-icon

## Rebuild and test

`python tests/build_branding.py` regenerates the technical image sizes from `branding/approved-crystal-descent.png`. `python tests/build_release.py` updates the checksums. `python tests/run_v0174.py` runs the current targeted verification. See VERIFICATION-v0.17.4.md for tested boundaries.
