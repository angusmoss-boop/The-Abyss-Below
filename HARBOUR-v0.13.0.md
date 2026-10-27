# Harbour Rising: v0.13.0

## Surface station

The in-world dock is now a two-pontoon research station with an operations cabin, illuminated windows, antenna and communications dish, starboard equipment deck and crane, submerged support pylons, service cables, downlights and an open central berth. A dotted perimeter and acoustic buoys show the protected approach. Above the water is a separate sky, distant coastline and waterline rather than the underwater background continuing upwards.

Station architecture remains a background landmark, not a new solid collision obstacle. The central berth is navigable. The remodel does not relocate finite resources, change terrain seeds, or add new salvage.

## Predator-free harbour

The protected circle is centred on the docking position `(600, 160)` with radius 260 world units. Predators are kept beyond radius 330, providing a buffer greater than the longest bite reach. This applies to all tiers, including stunned or already-aggressive hunters, and to spawn positions, patrol homes and movement. Health, identity and existing kills are not reset by the boundary.

Entering the marked region clears pursuit. Hunters return towards their patrol grounds rather than waiting inside the dock. Sonar does not allow enemies to bite through this safety rule. The HUD shows **DOCK SAFE ZONE**, except when a higher-priority low-supply/pressure warning needs attention or the submarine is airborne. Combat remains normal outside the protected approach. This protection only concerns predators: it does not stop low-oxygen damage, grant battery, make rocks harmless, or bank cargo automatically.

Use **E / USE** in normal docking range while submerged. Docking settles the submarine into the central berth and stops its motion, preventing residual velocity from carrying it away when you undock. Existing hull/oxygen/battery restoration, banked currency and predator-refresh rules remain. Mine ammunition is still purchased; there is no free reload.

## Momentum breaches

The surface is at world Y = 70. Ascend with at least 100 world units/second of upward velocity at the crossing to leap clear of the water. Build speed while submerged; normal thrust is enough after a short approach, and better thrusters or boost produce higher leaps. Slow or quiet approaches meet the waterline without launching. The surface physics applies throughout all five levels, on desktop and mobile, with no additional button.

Above water the submarine is ballistic: gravity is 260 world units/second squared, horizontal motion has mild drag, and neither steering thrust nor boost accelerates the ship. Holding upward movement cannot make it hover or fly. The hull rotates towards its travel direction. Boost can recharge according to its existing rules, but airborne thrust does not consume boost charge or boost power. Normal background/flashlight consumption still applies. Depth never reads negative.

Crossing back into the sea creates a splash, damps entry velocity and restores normal underwater handling. A 0.35-second re-entry guard prevents immediate repeat-launch chatter. Splashdown itself does not damage hull or shield; ordinary rock impacts still can. Both launch and entry produce bounded, short-lived spray and expanding ripples. The pause menu freezes the arc and effects.

Docking is disabled while airborne. Airborne actions do not teleport the vessel into the shop. A reload still does not resume the active submarine; unbanked resource cargo remains recoverable instead.

## Upgrade catalogue

The existing three-column grid remains. Each tile now shows the system name, fitted **MK** and a `current / maximum` counter. On compact phones the badge wraps beneath the name; wider tiles put it alongside. Standard unupgraded systems show **BASE**; optional modules not yet purchased show **UNFITTED**. Standard fitted flashlight and ammo rack show Mk I.

Maximum-tier tiles have a gold outline and a textual **MAX** badge. The state is not conveyed through colour alone: the accessible label also says fully upgraded. Tiles remain selectable after completion so specifications can still be inspected. The current mark and maximum styling update immediately after a purchase. Prices, crystal reserves, 51 paid steps, all 12 upgrade paths and all 20 achievements are unchanged.

## Save compatibility

No schema or storage-key change. v0.12 campaigns keep their five level fields, selected unlocked destination, permanent resource locations/depletion, banked recorders, credits, crystal balance, stats/achievements, fitted upgrades, purchased ammunition, recovery pods and stored predator health. Prior v0.11 migration remains supported.

Because airborne Y can be negative, the cargo journal and emergency recovery placement now clamp the recovery depth to at least Y = 300, safely underwater. The ship is not moved by this journal clamp. Reloading, quitting or losing a dive mid-leap therefore cannot invalidate its finite crystals or create an inaccessible aerial pod. Recover the pod and dock to bank it; the original deposits remain collected.

## Update and evidence

Bank cargo in the old build before replacing the files. Apply the update ZIP contents to the v0.12 repository root, retaining the same host path/browser profile. Do not clear data or select New Game. Publish matching runtime files and `version.json` together. Menu identity: **v0.13.0 / Harbour Rising**.

The code, screenshots and tests are part of this source release, not an automatic repository push or hosted deployment. See `VERIFICATION-v0.13.0.md` and `verification/v0.13.0/results.json` for actual current test outcomes. Preview images use synthetic equipment/credits to demonstrate the interface; they are not the user's save. Physical phone performance and a complete human-paced campaign still require testing. No Android wrapper or signed Play Store bundle is included.
