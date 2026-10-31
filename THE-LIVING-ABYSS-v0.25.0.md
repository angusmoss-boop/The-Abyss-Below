# The Abyss Below v0.25.0: The Living Abyss

Build: `0.25.0-the-living-abyss-1`. Base: v0.24.0 / NEREID Reforged.

## Purpose

A more inhabited ocean without new currencies, combat buttons, upgrade bills or compulsory objectives. This is an additive update: the five existing levels, rock geometry, resources, wrecks and progression rules remain intact.

## Wildlife routines

The four existing fish species now alternate travelling, feeding and sheltering behaviours. Feeding and sheltering can favour nearby safe rock/wreck margins. The individual steering, speed variation, leader/rear compensation, current effects, obstacle avoidance, fear and regrouping remain.

A stationary or very slowly moving submarine gives nearby fish space to become curious. Close contact still startles them; boosting causes a larger disturbance. Some schools briefly accompany a nearby peaceful giant, then continue within their habitat. Routines and individual fish state survive an active-dive checkpoint.

Idle ordinary predators can rest briefly or investigate nearby schools for a short part of a bounded cycle. Player detection and active pursuit take priority. Wreck defenders and the Warden keep their encounter behaviours. These investigations do not kill wildlife for loot, permanently remove threats, or grant passive income.

## Peaceful giants

**Sailfin Glider:** broad flexible fins, trailing tail and slow banks. One resident in each generated level.

**Driftback:** a larger ridged body, slow tail stroke and a low positional call. One resident in each of Levels 3, 4 and 5, in deeper open water. These are deliberately uncommon encounters, not creatures continually spawned beside the submarine.

Both are separate from the enemy collection, cannot be targeted by guidance, have no loot, do no damage and never block the player. Solid-water checks cover movement and turning; they slow or choose another direction rather than forcing a way through terrain. Distant animals are parked instead of running expensive AI across the entire map. Their positions and elapsed movement are local to each campaign and level. No off-line simulation occurs.

Sonar reveals a temporary sparse outline as the wave reaches an animal. This is not an enemy contact, permanent chart marker, or visual observation. Deep darkness and the existing flashlight mask still apply.

## Harbour activity

Only drones already rescued in that campaign appear in the harbour. Each has a different inspection/shelter route. Machinery, service arms, a moving supply crate, cabin light and a small technician silhouette add activity around the platform.

A genuine dock return can cause a short welcome formation and occasional contextual drone message in the existing event log. It grants no reward, delay or extra service. The normal instant harbour servicing remains.

## Surface time and weather

One complete day/night cycle is **20 minutes of active diving**, starting near dawn. Dawn, daylight, sunset, dusk and night blend smoothly. Calm, light rain, and windier rain states also transition gradually on campaign time. Surface rain streaks, ripples, warm cabin windows and changing sky/water tint are presentation only.

The cycle pauses with the dive, including menus, photo mode, dock services and closing the application. It persists with that campaign, not a wall clock or a real-world schedule. A separate campaign starts its own clock. No offline penalties.

Weather does not alter enemy damage, currents, hull pressure, fuel or oxygen. Shallow water remains navigable at night. At 1,000 metres and below ambient light remains zero; the cosmetic surface tint ends well above those depths.

## Wildlife observation journal

Open **Lost Signals -> WILDLIFE** from the normal journal routes (main menu, pause menu, J on PC, or the dock Archive). Telemetry also has a Wildlife Journal shortcut.

There are **10 optional entries**: the four schooling fish, Sailfin Glider, Driftback, Crown Anemones, Current Fans, Crevice Crabs and Whisper Tubes. Each entry records its first observed level and depth and unlocks a short field note and illustration.

Observe a visible species for roughly two seconds. The game requires ambient/flashlight visibility, screen presence and clear line of sight. A group does not accumulate progress once per fish: observation time counts once per species per tick. Sonar alone does not unlock an entry. Brief interrupted observation decays gradually.

There are no rewards, additional achievements, scanning costs, buttons to hold, specimen captures or progression gates. Existing 30 achievements are unchanged. Entries persist through death, save/load, campaign backups and slot changes; they do not leak between slots.

## Photo mode

Open **Photo mode** from Pause or the telemetry/sliders panel while in a dive. This is a frozen-frame camera, not a free-flight camera:

* The simulation freezes before capturing the actual production world renderer, without action HUD, enemy health labels, target/pickup pointers or depth reference text.
* Drag to frame, pinch or scroll to crop between 100% and 220%, or use the crop slider. Reset restores the original frame. Keyboard plus/minus and arrows also work.
* The camera only crops pixels that were already visible. It does not reveal new rooms, move the simulation camera, change lighting, survey unexplored water or advance oxygen, enemies, projectiles, regeneration, day/night or observation timers.
* **Save Photo** prepares a PNG using the browser's download mechanism. No campaign file or external service is involved. The output has no interface overlay or watermark; maximum output edge is 2048 px.
* Closing always returns to the normal pause screen. Resume is deliberate, so a picture never throws the player straight back into combat.

The mobile combat controls are unchanged. Pinch-to-zoom in actual gameplay remains the existing 65%-200% world view; photo cropping is separate and does not overwrite that preference.

## Sound

The Driftback's call and close Glider passage are positional, range-limited and rate-limited. Surface and underwater rain use different filtered ambience. Harbour details and observation confirmation use the existing sound mixer, voice budget, mute controls and fade-safe envelopes. Menu, dock and pause music are unchanged. Human listening on a physical phone remains a separate verification step.

## Saves, migration and economy

The new campaign `living` section holds elapsed surface time, observations and per-level giant states. Legacy campaigns acquire this section without modifying their older level/resource data. Existing equipped systems, ammo, cargo, health, spent emergency repair state, prices, crystal stocks, salvage regeneration, wreck progress, rescues and achievements carry forward.

Backup export/import includes and validates the new section. Photos are ordinary separate images and are not embedded in campaign files. This update remains a web/PWA build, not a signed native Android application.

## Install

1. Save and export a campaign backup first.
2. Extract the update ZIP and upload its contents over the existing v0.24.0 repository, preserving paths. Include **living-abyss.js** and upload the other runtime/version/cache files together.
3. Reopen online after deployment and check **v0.25.0 / The Living Abyss**. Do not clear site data, uninstall, or start a new campaign to update.

The complete source is an alternative to the update ZIP, not a second required download. Existing save migration is designed for the same hosted address/origin.
