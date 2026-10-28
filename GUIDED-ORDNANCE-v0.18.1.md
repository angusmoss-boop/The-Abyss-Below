# v0.18.1: Guided Ordnance

Build: `0.18.1-guided-ordnance-1`  
Apply over: **v0.18.0 / Lost Signals**

## Intent

Firing should reward pointing the submarine roughly towards an enemy, not pixel-perfect alignment on a touchscreen. Guidance is automatic for already-fitted weapons at every mark. There is no new upgrade, targeting mode or action button. The existing seven-button triangle/bottom-row layout and desktop bindings are retained.

## Pulse Railgun

Hold the upper weapon circle on mobile or **Z** on desktop. Rail rounds begin along the bow and gently steer toward an unobstructed predator within **32 degrees on either side** of their initial direction. They lead moving targets rather than steering only at their old position. If several targets qualify, the contact closest to the firing direction is preferred, with distance as a secondary factor. A valid lock is retained rather than switching continuously between adjacent enemies.

Rail bolts still travel at 760 world units/second (76 displayed metres/second) and have a total 620-unit/62 m flight budget. Steering is capped at 120 degrees/second and 55 degrees of total heading deviation from launch. Their high speed and narrow acquisition cone make correction weaker than the torpedo's. Very close, wide-angle or evasive contacts can still be missed; this is assistance, not guaranteed hits.

## Shock Torpedoes

Tap the lower-left weapon circle or **X**. A torpedo acquires predators within **65 degrees on either side** and turns more strongly. Its predictive guidance is capped at 180 degrees/second, with an 85-degree heading limit relative to launch. It cannot turn around and hunt an enemy behind the shot.

Speed remains 300 world units/second (30 m/s) and the total flight budget remains 1,000 units/100 m. Area damage and the ship-safe friendly blast are unchanged. A collision with an abandoned contact mine can still detonate that dangerous environmental hazard.

Both gun types can reacquire another valid forward target if their original contact dies, leaves range/cone or moves behind solid terrain. With no eligible target, they continue along their current course until impact or their existing range expires. Their own limited sensors can track in darkness, but guidance does not illuminate terrain or reveal enemies on the map. Normal flashlight/sonar visibility rules still apply to rendering.

## Seeking player mines

Deploy with the lower-right weapon circle or **F**. A planted mine retains its **0.65-second arming delay**. Once armed, it senses predators in any direction within **20 m** and slowly approaches at up to **3.2 m/s**. It stays within **24 m of its original drop point**, stops if its contact is lost and can acquire another nearby threat. It is much slower than a pursuing predator: placement and timing still matter.

Mines do not move through solid terrain, enter the protected harbour or pursue across an entire level. Movement is not pathfinding around obstacles. Rocks now also block player-mine proximity triggering and blast damage, preventing an enemy on the other side of a wall from prematurely setting one off.

The existing trigger/blast radii, upgrade damage, arming delay, launcher cooldown and ship-safe behaviour remain. Relative swept collisions account for movement of both mine and predator so fast contacts cannot simply pass through between frames. Only the armed part of a frame counts. A newly purchased mine does not require another upgrade to use guidance.

**Abandoned rusted contact mines are unchanged.** They remain tethered hazards; they do not chase the submarine. Homing weapons target predators, not harmless schools, salvage, crystals, wrecks or abandoned mines. Directly firing at an environmental mine can still hit and trigger it.

## Balance and progression

No changes to any ship-upgrade price, crystal price, resource quantity, salvage regeneration rule, damage tier, magazine capacity or firing cooldown.

| Ammunition | Credit cost per round |
|---|---:|
| Railgun | 6 |
| Torpedo | 24 |
| Mine | 18 |

No free refills. A round is charged once on firing/deployment, not again when it acquires or changes a target. Predator kills retain their existing salvage and contract/achievement credit. Guidance does not bypass the Cathedral Warden's armour or recovery-phase vulnerability, and it does not awaken the optional boss.

## Saves and migration

All three campaign slots retain their credits, crystals, fitted systems, owned ammunition, finite resource depletion, salvage timers, recorders, maps, contracts, achievements and Warden progress. The campaign format and storage keys are unchanged.

An active v0.18.0 expedition can resume paused with its old projectiles and mines. Old in-flight rounds use their saved heading as their initial guidance reference; old stationary mines anchor at their saved position when they become active. New saved shots and mines retain their target IDs, velocity, launch heading, arming timer and mine anchor. Targets are revalidated against live contacts and terrain rather than blindly trusting saved locks.

Portable exports accept the additional optional scalar fields. Invalid new lock/heading/anchor data is rejected during import validation. No real user save was used during testing; migration fixtures are synthetic.

## Install

1. Save your current expedition and export a campaign backup from SAVE / LOAD CAMPAIGNS. Banking cargo first is a sensible precaution, not a requirement to reset a save.
2. Extract the update ZIP over your v0.18.0 repository, replacing matching files. Upload the files together, not only `game.js`. The worker, version markers and published checksums must agree.
3. After your host has deployed, reopen the same game address online. The menu should show **v0.18.1 / Guided Ordnance**. Only the actual online version checker can confirm the hosted files are synchronised.

Do not clear site data, uninstall, change the game origin or start a new campaign to update. The ZIP is a build package, not an automatic deployment.

## Evidence and limits

See `VERIFICATION-v0.18.1.md` and current logs under `verification/v0.18.1/`. The homing animation uses staged targets with the real renderer, actual projectiles and normal simulation time. It is not a naturally encountered scene or evidence of phone performance.

Physical Android/iOS testing, real hosted PWA updates, full offline integration and a human campaign/balance playthrough remain separate checks. Guidance is deliberately bounded: it does not guarantee a hit, route around walls or return spent ammunition.
