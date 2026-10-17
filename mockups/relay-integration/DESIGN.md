# Relay controls and HUD integration — revision 1

- Status: IN REVIEW. Implements the mockup deliverable of relay plan slice 1, not its approval gate. Production gameplay is unchanged; explicit visual approval is still required.
- Confirmed rules: Relay is an On the field option across all four layouts; scoring activates at 120 active seconds; first to 180 cumulative holding seconds wins; capture pauses rather than resets accumulated scores. Ordinary city roles remain legal on the relay. Existing conquest check takes precedence over simultaneous relay completion; capture alone cannot undo already-earned progress.
- Home: existing four-layout picker, city/enemy controls, Factory and Slow Zone plus independent Relay Off/On. Relay defaults Off as the compatibility recommendation. Preview marks the courtyard city on Courtyard, or a central neutral city on other layouts. No separate mode picker or automatic Courtyard activation. Compact helper: “Activates at 2:00 · hold for 3:00 total”.
- Match: preferred compact scoreboard above the field, showing activation countdown or current holder's remaining holding time and each participating faction's cumulative score out of180. Two factions use two columns; three–five use three columns/up to two rows. The100px HUD reservation is constant across states and participant counts for this study, preventing countdown/capture/pause changes from resizing the field. Review whether its spare room with two factions is worth keeping the same geometry.
- Objective: restrained gold dashed ring and RELAY label on an ordinary city, independent of owner and city role. Factory and converted-role badges remain separate. No extra objective resources, troop production or role. Neutral/owned/urgent states differ through readable text, scores and normal faction colors, not animation alone.
- Controls: preserve a66px, five-icon city strip plus12px field gap. Selecting your city exposes mock role conversion/costs; Airfield exposes fake Fly/Cancel targeting. Escape clears selection/targeting; role changes preserve objective identity and scores. Paused/result states keep the strip space and overlay the field, not move it. Overlay shows relay result reason and Play again/Home.
- Responsive: Home is settings-left/preview-right on desktop and stacked on narrow windows. Match remains a bounded playing shell with a360×480 logical SVG centered within remaining field space. HTML action buttons have44px minimum targets. Keyboard-accessible city controls and full-region pointer selection are illustrative; scaled city-region touch usability still needs human review. No animation or remote assets. Browser review is user-led; no automated browser interactions/screenshots were performed.

## Review links and interactions

- `/relay-integration/`: Home with Relay Off.
- `?state=countdown`: 0:48 until activation, zero scores.
- `?state=neutral`: active relay held by nobody.
- `?state=holding`: player-owned relay and accumulated scores.
- `?state=urgent`: enemy15seconds from victory.
- `?state=paused`: frozen holding scoreboard and overlay.
- `?state=result`: player relay victory while other cities remain.
- `?state=urgent&layout=open&enemies=4`: five-faction HUD. Other layout parameters: `river`, `mountains`, `courtyard` (Courtyard forces one enemy).
- `cities=20|24|30`, `relay=on|off`, `factory=on|off`, `slow=on|off` restore setup choices. State query restores a preset, not edited fake scores/role changes.
- Review toolbar switches presets, cycles neutral/player/enemy ownership without resetting scores, advances the holder by15seconds up to a terminal result, or selects the player's relay for conversion. Selection and role conversion are not persisted.
- Play opens the fake countdown with the current setup. Play again resets scores/countdown. Home preserves current field toggles; preset selection itself resets fake match data. Reroll rotates Courtyard expansion pairs only; other mock geometries stay fixed and report that limitation.

## Fake or omitted behavior

- No live clock, combat, real growth, AI, actual aircraft, storage, upgrades or production generator. Simulate capture is a review action, not a proposed gameplay button. Advanced Home sections are placeholders.
- Courtyard copies strategic anchors and bounded pair options at the production logical scale, without production seeded scaling. Other layouts are deterministic packing illustrations, not real generated seeds; their central-city choice does not establish legal-route fairness. Only dense20/24/30city presets are shown; production regular limits6–30 remain unchanged by this design.
- Factory/Slow Zone marks are illustrative. Multiple-faction scores and holdings are fabricated for readability review; no tactical balance claims. Exact activation/capture/conquest tie ordering requires production tests, not this mockup.
- The review toolbar/header/footer are outside the app and scroll away; Play scrolls to the app. This is not an installed-app viewport or actual-iPhone verification.

## Approval

- Pending user review of revision1. Review questions: does Relay belong naturally alongside Factory/Slow Zone; is the compact HUD readable with two and five factions; and do its fixed space and relay/role badges feel right on narrow/short screens?
- Approve this revision for implementation, or continue iterating?
