# v0.17.1: Quiet Command

Patch for v0.17.0 / Salvage & Supply. This is a controls and audio polish patch, not an economy or campaign expansion.

## Compact icon controls

All ten mobile action buttons remain at the bottom left. Railgun, torpedo and mine now form a vertical column on the left edge. The five utilities sit to their right, with Use and Boost below. Use is still the largest control, then Boost. The floating steering pad and desktop key references are unchanged.

Action names, charge percentages, ammunition numbers and LOCKED captions are no longer drawn inside the circles. Larger SVG icons replace the label stack. Accessible button names and dynamic ammunition descriptions remain. Unfitted guns, mines and boost are desaturated grey, without coloured rings. They regain their appropriate colours when their unlocking upgrade is bought.

Thin outer rings retain sonar, boost and gun cooldown feedback. The inner weapon rings indicate ammunition; exact railgun and torpedo counts remain in telemetry (the sliders icon) and desktop references. Mine stock is also in the existing upper HUD. Active toggles retain their tint and a small indicator dot.

At the measured 390 x 844 touch viewport the action bank changes from 182 x 252 pixels to 202 x 168 pixels. It is one third shorter, and its bounding rectangle is 26% smaller. The island is slightly wider because the weapon stack sits beside the utility bank rather than above it. On a 320-pixel-wide phone it occupies 194 x 160 pixels, with at least 118 pixels of clear water to its right. Every action hit target remains at least 44 x 44 CSS pixels. Gaps between buttons remain usable for floating steering. No full-width invisible touch panel was added.

## Softer pause transition

Game audio now has its own gain stage, separate from interface music and explicit sound previews. Opening pause ramps underwater effects and engine ambience to zero over 0.38 seconds. Existing event voices release smoothly and are stopped after the fade, not on the pause click. Not-yet-started delayed voices begin with zero gain so a cancelled sonar attack cannot become a loud delayed click.

The AudioContext remains running for the pause theme. Resume fades the theme out and restores underwater audio without changing the effects, ambience or music preferences. Music scene changes are idempotent: repeated render frames do not stack additional loops.

Backgrounding or leaving the app still silences it. The output ramps to zero over 0.22 seconds, then the context is suspended. A new interaction invalidates a pending suspension, preventing a stale timer from muting a rapidly resumed game. Browsers or operating systems that freeze execution immediately can interrupt this sequence; physical-device listening still needs verification.

## Pause theme

A third original, procedural stereo theme accompanies the pause interface: a 40-second loop at 48 beats per minute with slow sustained chords, rounded keys, sparse melody and no percussion. It uses the existing MUSIC volume control and mute, with a 1.1-second fade-in. The existing main-menu and dock themes remain. Map and telemetry views that pause an active expedition share the restful pause scene; settings opened from the menu or dock retain that interface's theme. The explicit sonar preview remains audible through its own effects-volume path even when game audio is faded.

Audio still needs a user interaction to start. Music is not included in saved campaigns; persistent audio preferences remain device-wide as before.

## Save compatibility and unchanged rules

All three local campaign slots retain their progress. There is no new campaign schema or data migration in this patch. Upgrade prices, crystal scarcity, ammunition purchases, salvage regeneration and automatic scrap recovery are unchanged. No free ammunition or resources are awarded. Active expeditions continue to restore paused.

## Updating

1. Save your current campaign. Banking cargo before changing releases is the cautious option.
2. Extract the update ZIP and copy its contents over the existing v0.17.0 repository files at the root. Upload the files, not the ZIP, and avoid an extra nested folder.
3. Keep the same site address and browser profile. Do not clear site data or start a new campaign to install a patch.
4. After hosting finishes deploying, reopen online and look for v0.17.1 / Quiet Command. Check Again validates the deployed files and controlling worker. Offline/local/unverified status is not proof of a successful hosted update.

The complete ZIP can be used for a new installation or a complete replacement. Downloading a ZIP does not deploy it to GitHub.

## Evidence and limits

See VERIFICATION-v0.17.1.md for the checks actually run. Preview images use production rendering with synthetic funds/equipment and staged camera positions. No real player save was accessed. Browser audio measurements do not substitute for listening on the user's actual phone or headphones.
