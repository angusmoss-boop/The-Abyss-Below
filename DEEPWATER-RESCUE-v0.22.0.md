# The Abyss Below v0.22.0: Deepwater Rescue

Build: `0.22.0-deepwater-rescue-1`  
Base release: v0.21.0 / Lifeline  
Format: HTML/Canvas/JavaScript web game and PWA source, not a signed native Android application.

## Install

Save and export a campaign backup before updating. Banking your current cargo is a sensible precaution. Apply the **contents** of the update archive over the root of the existing v0.21.0 repository, replacing matching files. Include the new `deepwater-rescue.js`, every changed runtime file, and `version.json` together. Use the complete archive instead for a fresh checkout; you do not need both archives.

The pack does not publish itself. After hosting finishes deploying, reopen the same game URL online and check for **v0.22.0 / Deepwater Rescue**. Do not clear site data, delete campaigns, or uninstall to update. Keep the same browser profile and origin. The version checker does not claim successful online verification in a local or offline test.

## Optional research-drone rescues

Each level has one named research drone and one permanent, credit-only rescue reward:

| Level | Drone | Harbour reward |
| --- | --- | ---: |
| Sunbreak Shelf | PIP | 180 CR |
| Glassbone Rift | MICA | 260 CR |
| Drowned Gardens | FERN | 340 CR |
| Midnight Cathedral | ECHO | 420 CR |
| Calypso Abyss | NOVA | 500 CR |

There is at most **one unresolved rescue across the campaign**. A drone is not another contract, does not consume the contract slot, and has no expiry timer. Rescuing it is optional for level progression. It does not award crystals, equipment, ammunition, or a new currency.

A faint transmission becomes eligible after roughly 95 to 130 seconds of active submerged exploration outside the harbour in its level. A safe, open-water search site is chosen within the fitted hull's depth limit. Existing rocks and resource deposits are not moved to make space. Signals do not accumulate while paused, at the harbour, offline, or in another campaign.

Initially the chart shows an approximate search area. Illumination or the arrival of a sonar wave identifies the actual drone. The Rescue Log offers a search-area pin before discovery and a position pin afterwards. These pins are static coordinates, not automatic navigation or live enemy tracking.

Approach within 6.8 metres with a clear line and **hold E / USE for 1.5 seconds** to restart the drone. After releasing the button, tap USE beside it to switch between FOLLOW and WAIT. Holding the restart button does not repeatedly flip its state.

A following drone steers around solid obstacles using the shared collision/navigation system. It keeps up with ordinary fitted thrust and has a modest catch-up allowance when behind. Boost can leave it behind. It never teleports to the submarine and does not take predator or environmental damage. A temporarily blocked route does not fail the rescue; rejoin the drone in open water and guide it out.

Bring a following drone inside the harbour perimeter and **physically dock using E / USE**. The reward is paid only once. A follower left too far outside waits at its location instead of granting a remote completion. Returned drones become cosmetic harbour residents and unlock a short research note in the fleet log.

Death, explicit abandonment, and changing levels leave a deployed follower waiting at its last safe position. Ordinary save/resume preserves its location, status, restart progress and route breadcrumbs. The rescue and its reward belong to the current campaign slot.

## Emergency oxygen stations

There is **one site in Sunbreak Shelf and two in each later level**, placed in clear water. The shallow station is within the stock hull's safe depth. Discover a station by exploring or scanning, then use the persistent chart marker to revisit it.

Hold **E / USE within 6.8 metres** with an unobstructed approach. Each station provides up to **25% of the fitted oxygen capacity**, with the allowance fixed on that station's first transfer of the expedition. A complete reserve transfers over approximately six seconds. Normal oxygen consumption continues during transfer, so the net tank increase is slightly smaller.

Transfer stops on release, moving out of range, losing a clear approach, filling the tank, or exhausting the reserve. Partial transfers preserve what remains. A full tank does not waste the reserve. The station requires no battery power.

A genuine physical return to the harbour replenishes stations in that destination. Reopening the dock screen, switching levels, pausing or reloading does not restock them. The chart distinguishes available and depleted sites.

Stations do **not** repair hull, charge the battery, reload weapons, bank cargo, or create a predator-free bubble. The main harbour remains the service and delivery point. Air upgrades remain useful because they increase both expedition endurance and the available refill.

## Occasional encounters

A level's first event becomes eligible after roughly 175 to 240 active exploration seconds, followed by intervals of about 200 to 330 seconds. Encounters are short, lightweight and saved with their age and location. They do not generate salvage, crystals or enemies.

- **Migration:** a loose group of small fish crosses nearby water and avoids rendering inside solid terrain. These are harmless visual visitors, not collectible contacts.
- **Silt lift:** a light, temporary sediment cloud adds movement and some local visual interference. It causes no damage and is excluded from Sunbreak Shelf. Sonar remains available.
- **Distant silhouette:** a large background creature passes beyond the action with a low, restrained call. It cannot be targeted, collide, bite, or drop loot.
- **Intermittent beacon:** an approximate chart area highlights an unknown, safely accessible landmark or wreck feature. It does not unlock that discovery automatically. When there is no suitable undiscovered target, a migration can appear instead.

An active event is cancelled on harbour entry or when a nearby live Warden encounter would compete with it. All scenery remains subject to depth darkness and the existing illumination mask. A decorative silhouette is not another boss.

## Expedition report and Rescue Log

The upgrades view now begins with a compact return summary. It does not force a modal on arrival, block trading, or delay departure. **VIEW REPORT** opens the detail. The same Rescue Log is available in the main and pause menus.

The report is calculated from the actual pre-dock cargo and the payments made on that return:

- Scrap banked and its existing 18-CR-per-unit conversion.
- Crystals, recorders and wreck plates delivered.
- Rescue and contract credits, kept separate from cargo credits.
- Newly recorded chart contacts, deepest point and active exploration time.
- Oxygen transferred from emergency stations.
- Selected existing achievement progress and campaign personal bests.

Personal-best labels include largest haul, longest successful dive, deepest successful return, and the first clean return from a destination. These labels do not pay currency bonuses. No multipliers have been introduced. A recent report is stored per level; the fleet collection is campaign-wide.

Opening the report pauses an active dive and closes back to its prior interface. Buttons remain reachable in portrait and landscape; the report body scrolls independently from its close controls.

## Audio

New procedural cues cover distress calls, drone restarts, located signals, air transfer, successful rescue, distant calls and silt movement. They use the existing effects/ambience volume controls, bounded voice counts, soft envelopes and pause/background fading. Existing menu, dock and pause scores have not been replaced.

Offline audio-output tests exercise the cues; they do not replace listening on a physical phone. A visual status message accompanies significant signals and interactions for muted play.

## Persistence and compatibility

The existing three slots, checkpoint system, export/import format and campaign identifiers are retained. Each visited level receives an additive `rescue` state containing its station reserves, optional drone, encounter clock, report and exploration data.

Older campaigns gain support sites without regenerating their old resources. Their credits, crystals, purchases, ammo, enemies, projectiles, recorded discoveries, Warden progress and active expedition are preserved. Missing new state is generated from that level's seed. Inactive save slots are not migrated until opened.

Portable backup validation checks the new state. A backup with malformed drone coordinates, reserve quantities, encounter data or report values is rejected rather than silently overwriting a slot. Old backups with no rescue state remain supported.

## What has not changed

Crystal stocks and prices, ship-upgrade prices, scrap regeneration, oxygen drain, battery costs, weapon behaviour, ammo prices, the fixed death loadout, the thirty achievements and the approved seven mobile combat buttons are unchanged.

No native Android build, Play Store submission or production deployment is included. Consult `VERIFICATION-v0.22.0.md` for the actual tests and remaining limitations.
