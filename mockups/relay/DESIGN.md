# Command Relay — revision 1

- Status: IN REVIEW. No production implementation authorized.
- Goal: compare three visual treatments of the same fixed-city relay on a river, two-bridge and mountain field.
- A: compact persistent scoreboard. B: explicit mission card. C: map beacon with owner-coloured progress ring and inset scoreboard.
- Preserve Dotfield's pale territory regions, teal player, terracotta enemy, rounded bridge decks, faceted ridge, compact city counters and reserved city-control strip.
- Gold identifies the objective independently of faction ownership. Ring/beacon is separate from the troop counter.
- Desktop: three alternatives side by side; medium: two columns; phone: stacked full-width alternatives. Native controls, visible keyboard focus, no required motion.
- Deterministic states: `?state=countdown`, `?state=holding`, `?state=urgent`. Query specifies the initial preset, not edits to scores.
- Review controls: switch presets, hide/show tactical-route illustrations, simulate capture by button or keyboard/click on relay, advance holding score by 10. Capture preserves both scores. Preset selection resets to its authored snapshot. Score advancement stops at 89; terminal victory is omitted.
- Map: northern enemy and southern player, river at y178–216 with crossings x65/x355, relay at western south-bank endpoint, central mountain below river. Ground sketches are separate city-to-city legs. Urgent state adds a curved illustrative airlift route over the mountain; aircraft have no simulated physics.
- Rules illustrated: activate at 60 seconds, first faction to accumulate 90 holding seconds wins, ownership loss pauses progress. Numbers are design proposals, not approved balance.
- Fake/omitted: no real clock, capture combat, growth, movement, map generation, city conversion or AI. Map composition is illustrative, not proven fair. This relay is relatively accessible to the southern faction, while the northern faction can cross directly through its paired bridge; equal opportunity must be evaluated in playable maps.
- The three alternatives differ in presentation, not scoring or relay placement. No moving objective, economic bonus or terrain changes are introduced.
- Open review: preferred HUD; relay visibility; acceptable map occlusion in C; whether a bridge-end relay is too defensible. Production strip shown as an idle placeholder, not a proposed redesign.
- Approval: pending explicit user review of revision 1.
