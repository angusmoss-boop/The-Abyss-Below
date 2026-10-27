# THE ABYSS BELOW
### Deepwater Expedition · v0.1.0

A single-player, browser-based submarine survival/exploration game. Built with plain HTML, CSS and JavaScript. No build tools, accounts, payments or servers required.

## Play

Open `index.html` locally in a modern browser, or publish the three game files on **GitHub Pages** (see below). Progress is saved on the current browser/device using localStorage.

### Controls

| Action | Keyboard | Phone/tablet |
|---|---|---|
| Pilot | WASD or arrow keys | Direction pad |
| Sonar pulse | Q | SONAR |
| Pick up item / dock | E | USE |
| Quiet propulsion | Hold Shift | SILENT toggle |
| Field repair (cost: 2 scrap) | R | REPAIR |
| External lights | L | Keyboard only (lights stay on by default on touch) |
| Pause | Esc | Pause button at top |

## Your mission

Locate 3 orange/gold flight recorders at increasing depths and **return to the surface station to deliver them**. Pick up scrap and crystals to earn credits. Upgrade the hull, air recycler, battery, thrusters, sonar and silent drive. Sonar consumes power and attracts predators; noisy propulsion gives away your location. Exceeding your depth rating damages the hull. Oxygen caches replenish air, while a dock visit restores all systems.

**Progress rule:** Credits, XP, upgrades, best dive depth and **delivered** recorders are saved. Cargo and any unbanked recorders are lost if your vessel is destroyed or the page is refreshed. Each fresh dive generates a new rock and salvage layout; the three mission wrecks stay at consistent depth milestones.

## Publish to GitHub Pages

1. Create a new public GitHub repository named `the-abyss-below` (or another name).
2. Upload the contents of this folder to the **root** of the repository: `index.html`, `styles.css`, `game.js`, `README.md`, `GAME_DESIGN.md`, `CHANGELOG.md` (the `tests/` folder is optional).
3. On GitHub, open **Settings → Pages**. Choose **Deploy from a branch**; choose `main` and `/ (root)`; save.
4. Your game will be available at `https://YOUR-USERNAME.github.io/the-abyss-below/` after GitHub publishes it.
5. To update the game, replace the files on the same branch and commit the changes. Existing save progress stays on the same GitHub Pages URL and device.

## Roadmap

- **v0.1.0 (current)**: playable trench exploration, physical movement/collisions, procedural rock fields, sonar reveal, collectable resources, three recorder mission, predator patrol/chase behaviour, hull/oxygen/energy/noise systems, depth pressure, repairs, dock upgrades, XP ranks, mobile controls and persistent banked progress.
- **v0.2 idea**: captain's log, world map, additional wreck encounters, biomes and sonar signal triangulation, improved accessibility and touch controls.
- **v0.3 idea**: modular damage, repair tasks, underwater currents, active stealth tactics, predator variety and deeper ship upgrade decisions.
- **v0.4 idea**: branching story missions, unlockable submarines, rival expedition traces, environmental storytelling and a proper ending.

## Developer notes

No runtime dependencies. Gameplay logic lives in `game.js`, UI layout in `index.html`, styling in `styles.css`. To run the optional automated desktop/mobile smoke tests: `pip install playwright`, `python -m playwright install chromium`, then `python tests/smoke_test.py`. A read-only `window.AbyssDiagnostics.state()` is available from the browser console to inspect basic live state during testing. GitHub Pages is static hosting, so saves are per-browser and do not sync across devices. No backend/cloud save yet.

For iteration, report the build number, browser/device, the steps to reproduce any issue, and what you expected vs what happened. We'll add versioned updates without silently breaking saves.
