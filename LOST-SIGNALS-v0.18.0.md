# Lost Signals

The Abyss Below v0.18.0  
Build: `0.18.0-lost-signals-1`  
Update base: v0.17.4 / Crystal Descent

## What is new

Lost Signals adds a persistent contract board, a twenty-entry recorder story, the optional Cathedral Warden encounter, a cosmetic hull finish, and portable campaign backups. The seven-button mobile controls, existing maps, finite crystals, salvage regeneration, upgrade prices, weapon magazines and paid ammunition rules remain unchanged. Existing music and the click-free audio transition fixes are retained.

This is a web/PWA source release. It is not a signed Android application or an automatically deployed update.

## Installation

Save your campaign in the old build. Banking cargo and quitting the active dive first is the safest update procedure, though migration tests also cover an active expedition. Extract the update ZIP over the v0.17.4 repository root and upload all files together. The new `lost-signals.js` is required alongside the changed game, interfaces, audio cues, campaign manager, worker and version manifest.

Keep the same website address, browser profile and site storage. Do not clear data, uninstall or create a new campaign to update. Open online after your host finishes deploying, and confirm **v0.18.0 / Lost Signals**. The version checker must see a consistent deployment before reporting verification. A local or offline preview cannot prove that your hosted site is current.

Use the complete ZIP for a fresh checkout. The root files, rather than a second nested folder, belong at the existing game root.

## Contracts

At the physical dock, select **CONTRACTS**. There are three persistent offers and one active assignment per campaign. The board offers work suited to your current hull when generated. Accepted targets do not move when you upgrade. Hunting offers are introduced after fitting at least one damaging weapon; an already-generated board stays consistent until completion or explicit abandonment.

| Assignment | Completion | Level 1 reward |
|---|---|---:|
| Lost Cargo | Search the marked area, locate the package and recover it with USE. | 160 CR |
| Survey Expedition | Visit three buoys and ping from within 20 m; the wave must reach each buoy. | 180 CR |
| Predator Control | Destroy the stated number and tier of predators in the assignment's level. Only credited kills count. | 230 CR |
| Silent Recovery | Recover the research package with USE without boosting inside its 25 m quiet zone. | 220 CR |

Add 65 CR per level above Level 1. Rewards are credits only. They do not create or replenish crystals. The board does not charge acceptance fees or impose a countdown.

Payment requires a genuine departure and return to a physical dock. Completing a task, reopening the interface or reloading cannot claim the reward. After a successful payment, the assignment is cleared and that board advances. Repeated visits cannot pay it again.

Open **LOST SIGNALS**, select **ASSIGNMENT**, then **PIN NEXT SEARCH AREA** to use the existing waypoint indicator. The side-view survey chart shows mission search areas; sonar locates targets. The exact quiet-zone boundary is shown for Silent Recovery so the rule is visible rather than a surprise. Ordinary resources retain their discovery rules.

Normal save/resume preserves the assignment. Defeat or explicit Quit Dive invalidates its field progress, including a package not yet banked. Select **RETRY ASSIGNMENT** at the dock for a free retry. Refuelling during an incomplete assignment is allowed. Abandonment is separate, confirmed and unpaid. You can switch levels while holding an assignment, but its objectives remain in their original level.

## The twenty transmissions

Each existing recorder unlocks one story entry after banking. Carrying an unsecured recorder is not sufficient. Already-secured recorders in an older campaign unlock their matching entries without another collection trip.

The archive follows five chapters:

1. The wrong timestamp
2. Something in the walls
3. An ocean that remembers
4. The listening chamber
5. The other end of the call

The story is optional. Reading does not grant an upgrade, currency or campaign gate. It never interrupts a dive. Entries have short written transcripts and radio presentation cues, not recorded voice acting.

Access the journal from the main menu, pause menu, **ARCHIVE** dock tab, or **J** on desktop. The journal pauses gameplay and returns to the interface that opened it. Tabs support arrow-key navigation. On a narrow phone, swipe the dock tab rail to reach additional tabs.

## The Cathedral Warden

This optional resident lives in Midnight Cathedral, around 1,160-1,200 m. Its observation buoy can be pinned from **ARCHIVE > WARDEN DOSSIER**. Approaching does not wake it. Use the buoy and explicitly confirm **ACTIVATE OBSERVATION SIGNAL** to begin.

A 1,330 m or better hull, upgraded weapons and purchased ammunition are recommended. No recorder or necessary crystal stock is locked behind the encounter. Leaving the resident's territory ends its pursuit; it does not follow you across the level or into the harbour.

### Attack cycle

- **Listen:** slow local patrol. Noise, nearby sonar or close approach draws its attention. Quiet movement gives room to reposition.
- **Wind-up:** a 1.5-second amber warning commits the attack direction. Move across its path rather than backing straight away.
- **Charge:** a short fast lunge. Substantial terrain can stop it.
- **Recovery:** approximately 3.4 seconds, longer after a terrain impact. Its fins open and it takes full damage. Otherwise the forward armour is strongest, with weaker flanks.

The Warden has 1,200 HP. Its health persists across dock returns, and active checkpoints preserve the exact phase, pose and timers. It cannot damage you during the warning or recovery phase. Sonar disruption has reduced effectiveness. Existing weapons and mines work; ammunition remains paid and finite per magazine.

Defeating it unlocks a **one-time 1,200 CR bounty**, paid on a real return to the dock, and the **Warden Hunter** gold-and-teal hull finish. There is no crystal reward. The finish changes appearance only. Switch between it and the standard hull in the Warden dossier. A defeated Warden does not respawn in that campaign.

This is a first playable encounter, not a claim of completed human balance testing.

## Export and import campaign backups

Open **SAVE / LOAD CAMPAIGNS** in the main or pause menu.

### Export

Each occupied slot has **EXPORT**. Exporting the active slot first checkpoints the current expedition. The downloaded `.abyss.json` file includes the campaign's levels, resource depletion and regeneration, profile, achievements, survey data, owned ammunition, active dive, assignment and Warden state. It does not export your other slots or global sound settings.

Keep this file outside the browser, such as in your own backup folder. Saving in the game is still local storage, not cloud synchronisation.

### Import

Choose a destination slot and a backup file. The preview displays the campaign name, recorder progress, balances, saved-dive state and whether a campaign will be replaced. Nothing changes at preview time. Confirm **IMPORT INTO SLOT** or **REPLACE SLOT**, or cancel.

Importing into an inactive slot does not switch your current game. Loading it afterwards opens that campaign's menu. A saved dive resumes paused. Replacing the active slot reloads into the imported campaign only after a successful write.

Export a slot before replacing it to retain an external copy. The three-slot limit is unchanged. Import copies a campaign; the two slots then progress independently.

The importer validates the format, size, numeric data, progression and checkpoint shape and checks an integrity checksum. Invalid files, stale destination changes and write failures produce an error rather than knowingly overwriting a slot. The 12 MB cap avoids unexpectedly large inputs. The checksum detects accidental corruption; it is not encryption, authentication or a guarantee against intentional save editing. Do not use files from untrusted sources.

## Preserved systems

All existing upgrade prices, crystal costs, salvage value, regeneration clocks, purchased rounds and dock supply rules are retained. The map generator's resource RNG is untouched. Mission placements use a separate deterministic stream. Only optional hazards at the new observation approach may be retired for safety; rocks and finite resource layouts are not moved.

Your current campaign and inactive slots stay separate. New story/contract/Warden metadata is added when a campaign is used. The current icon, launch artwork, menu/dock/pause themes and compact mobile combat cluster are retained. New radio, mission and Warden sounds use the existing volume and fade system.

## Testing and known boundaries

See `VERIFICATION-v0.18.0.md` and `verification/v0.18.0/`. Automated tests use the actual production scripts with synthetic saves. Previews use synthetic gear/progress and, for the Warden image, an isolated saved encounter with nearby ordinary predators removed from that fixture.

Physical Android devices, browser-managed file download/import ergonomics on a handset, live installed-PWA updating, real offline integration, human sound listening and a full human campaign/boss balance run remain unverified. Browser integration was explicitly probed and blocked in this environment. Do not equate mocked worker checks with a real installed application test.
