# Random-map match setup

## Goal and scope
Replace named-map browsing with match preferences and a fresh generated layout. Isolated HTML/CSS/JS prototype; no production changes.

## Revision
7 — approved for implementation. Revision 4 was approved and implemented; revision 5 added Artillery and compact controls; revision 6 removed Home intro copy and moved Reroll beside Play; revision 7 removes the remaining preview footer helper.

## Layout and interactions
- Preserve Dotfield's warm light field, teal player, muted faction colours, and rounded controls, but reduce selector height: 28–32px segmented choices, 30px steppers, tighter vertical spacing and compact one-line field features.
- Desktop: settings left, always-visible map preview right. Mobile: compact settings and collapsible upgrades first, preview below; Play fixed at the bottom with safe-area padding. Content scrolls, but Play stays accessible. Bottom spacing keeps the final preview controls clear of Play.
- Remove the introductory “A fresh field. Every time.” heading and “Choose your match. We’ll make the map.” subtitle to make room for settings and the preview.
- Total cities: 6–24, slider and compact steppers. Enemies: 1–4 opposing factions using a short segmented control. One starting city per faction; remaining cities neutral.
- Industry, river/bridges and Artillery: Off / On only. Artillery defaults Off; On adds one contested neutral 14-garrison Artillery city, 90-unit dashed coverage and a small mountain marker to the generated preview. Layouts still change with every generation. Feature labels and compact toggles share a row at every viewport.
- Your upgrades: collapsed initially, summary shows enabled count; Industry, Factory, Slow Zone, and Watchtower checkboxes mirror existing upgrade names and descriptions.
- Enemy settings: collapsed initially, summary shows active enemy count and upgrade count or behavior status. Each selected enemy has independent upgrades and Balanced / Aggressive / Defensive behavior.
- Reducing enemy count hides extra factions, retaining their local selections if re-added. Match summaries include active factions only.
- Upgrade controls are independent of the map's Industry setting: map Industry adds neutral factories; faction Industry boosts production. A faction Factory applies to its starting city, independently of neutral factories.
- Always at least six cities, so every supported enemy count fits. Wider generation ranges and unavailable combinations are deferred to production design.
- Preview responds to settings; Reroll is available. No Hide/Show button or helper captions below the preview or Play button.
- Put **Reroll** directly beside the primary **Play** action (including the fixed mobile footer); remove Reroll and all helper text from the preview. Rename **Play new map** to **Play**.
- Play generates a new layout, not the shown preview.
- Simulated match screen offers Restart same map, New map with unchanged settings, and return to settings.
- Restart retains generated layout; New map changes it.
- Keyboard controls and visible focus states; no animation or external assets.

## Fake or omitted behaviour
- Seeded jittered layouts and clipped territory polygons are illustrative only. They do not prove fair starts, valid bridge staging, route clearance, connectivity, or production generation constraints.
- Industry creates one or more neutral factories. River creates two illustrative crossings where possible. Exact counts are not configurable in this revision.
- No combat, difficulty, session saving, or persistent preferences. Upgrade and behavior selections are interactive local state, captured in a text summary on the simulated match screen; their gameplay effects and map markers are not simulated. Returning to settings keeps local state for this open page only.
- Map seeds exist internally for repeatable restart but are not exposed in the UI.

## Review questions
- Are the smaller setting controls still easy to tap/read on phone?
- Does Artillery On clearly communicate a separate neutral siege city and mountain terrain in the preview?
- Does placing Reroll beside Play work on narrow phones without making either button too small?
- The user prefers the rounded warm deck and inset parallel rails in the map mockup over the current production bridge appearance. Production should adopt this visual treatment while keeping its validated 64×38 gameplay/deck footprint and river/bank overlap unchanged.

## Approval
Revision 4 was explicitly approved and implemented. Revision 7 approval: user said “remove Play starts a fresh generated field label. all other is good. approved. implement it”. Approved scope includes Artillery generation selection, compact controls, no intro or preview-helper text, Reroll beside Play, **Play** label, and matching the mockup's rounded warm bridge styling in production while preserving validated geometry.
