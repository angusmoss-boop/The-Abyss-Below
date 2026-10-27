# The Abyss Below v0.17.2: Delta Helm

A control-layout and analogue-stealth patch over v0.17.1. The accepted triangle concept is implemented with native HTML/CSS/SVG controls, not a flattened picture. The submarine game, economy and three local save slots remain intact.

## Seven mobile actions

The bottom-left controls have exactly seven circular buttons. Weapons form a tight triangle: **railgun at the top, torpedo at bottom left, mine at bottom right**. Thin cyan accents connect the visual grouping; these decorative elements and all gaps are pointer-transparent.

Directly underneath is one left-aligned row: **Boost → Use → Sonar → Repair**. Boost is largest and each successive button is smaller. At 390×844, button diameters are 68, 58, 50 and 44 CSS pixels, with 48-pixel weapons. Small portrait and landscape layouts use their own sizes while retaining a minimum 44-pixel action target.

Controls have transparent dark surfaces, centred enlarged vector icons, subtle inset rims and cyan/amber/rose weapon accents. No names, percentages or LOCKED captions are rendered on the circles. Accessible names, keyboard focus and tooltips remain. Existing charge/cooldown and ammunition rings remain functional. Unfitted equipment is grey; purchased-but-empty magazines are also visibly unavailable. Purchases do not grant free ammunition.

The total circle area is smaller than v0.17.1, but the bottom row is deliberately wider to accommodate four buttons. This is not a claim that every dimension of the bank is smaller. Open space beside the triangle remains usable for the floating helm.

Hold rail to fire repeatedly; tap torpedo or mine once per deployment. Boost and Use remain hold actions. All existing firing intervals, ammunition costs and weapon effects are unchanged. Steering and actions can be used simultaneously. Desktop retains its key-reference strip rather than touch controls.

## Speed-based stealth, no silent or cruise mode

Silent and Cruise controls are removed, rather than hidden. There is no latched cruise direction or Shift-based low-speed mode. Releasing a joystick or mouse press returns throttle to zero; existing momentum decays normally.

Small joystick drags create low throttle and quiet movement. On desktop, holding the cursor near the submarine produces gentle movement; moving it farther away requests full speed. WASD/arrows request normal directional thrust. Mouse, keyboard and touch keep their previous full-throttle speed limits and boost capacities.

Noise follows actual underwater movement speed, including coasting, rather than merely whether a movement key is pressed. The previous fixed noise floor is removed at low speed. At normal full throttle the unboosted signature is retained, while boosting remains loud. Weapon and explosion noise still alert predators and fade over time. Propulsion power use now scales continuously with analogue throttle; full-input propulsion power consumption is unchanged.

The existing **Silent Drive** ship upgrade is retained as **always-on acoustic insulation**. Its credit/crystal prices, fitted marks and passive reduction are unchanged, so past purchases are not lost. Its description now explicitly explains passive operation. A legacy saved `player.quiet` flag is ignored on resume and cannot reactivate the retired mode.

Engine audio also rises smoothly with speed instead of checking a silent-mode flag. Existing menu, dock and chilled pause themes, fade-out behaviour and all audio preferences remain.

## Flashlight still controllable

The seven-button arrangement no longer has a lamp circle. On mobile, tap the **top sliders/telemetry icon**, then use **FLASHLIGHT ON/OFF**. The button shows the fitted mark and handles an empty battery. Switching the lamp while the telemetry dialog has paused the dive does not resume time, fire weapons or take control of steering. Closing the dialog restores the prior paused/running state. The lamp setting is saved with the expedition.

**L** still toggles the flashlight on desktop. Flashlight range, drain, upgrades and the deep-darkness rules are unchanged.

## Save and balance compatibility

All three campaign slots retain their resources, credits, crystals, upgrades, achievements, owned ammunition, survey state and active expedition. Scrap regeneration, automatic scrap collection, manual crystal/recorder pickup and all upgrade and ammunition prices are unchanged. Active dives still restore paused; this patch does not provide cloud saving or native Android packaging.

## Install over v0.17.1

1. Save your campaign. Banking cargo before changing builds is the cautious option.
2. Extract the update ZIP and upload its contents over matching files at the existing repository root. Publish the runtime files and `version.json` together; do not upload just the ZIP or introduce a nested game directory.
3. Keep the same game address, browser profile and site data. Do not start a new campaign to install a patch.
4. After deployment, reopen online and check for **v0.17.2 · Delta Helm**. The menu checks deployed hashes and the controlling worker. A local/unverified/offline badge is not evidence of a successful hosted update.

Use the complete-source ZIP for a new install or full source replacement. Creating these packages does not deploy them to GitHub.

## Verification

See `VERIFICATION-v0.17.2.md` for recorded results and limitations. Test scenes and screenshots use synthetic funds/equipment and production rendering; no actual player save has been accessed. Physical-phone touch comfort, performance and listening remain untested. Browser-level checks are not Android Play Store certification.
