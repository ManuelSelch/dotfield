# Random-map match setup

## Goal and scope
Replace named-map browsing with match preferences and a fresh generated layout. Isolated HTML/CSS/JS prototype; no production changes.

## Revision
3 — in review. No implementation approval yet.

## Layout and interactions
- Preserve Dotfield's warm light field, teal player, muted faction colours, and rounded controls.
- Desktop: settings left, always-visible map preview right. Mobile: settings and Play first, preview below.
- Total cities: 6–24, slider and steppers. Enemies: 1–4 opposing factions. One starting city per faction; remaining cities neutral.
- Industry and river/bridges: Off / On only. Selected features are fixed; layouts still change with every generation.
- Always at least six cities, so every supported enemy count fits. Wider generation ranges and unavailable combinations are deferred to production design.
- Preview responds to settings; Reroll is available. No Hide/Show button or helper captions below the preview or Play button.
- Play new map generates a new layout, not the shown preview.
- Simulated match screen offers Restart same map, New map with unchanged settings, and return to settings.
- Restart retains generated layout; New map changes it.
- Keyboard controls and visible focus states; no animation or external assets.

## Fake or omitted behaviour
- Seeded jittered layouts and clipped territory polygons are illustrative only. They do not prove fair starts, valid bridge staging, route clearance, connectivity, or production generation constraints.
- Industry creates one or more neutral factories. River creates two illustrative crossings where possible. Exact counts are not configurable in this revision.
- No combat, difficulty, faction upgrades, session saving, or persistent preferences. Returning to settings keeps local state for this open page only.
- Map seeds exist internally for repeatable restart but are not exposed in the UI.

## Review questions
- Is settings-first mobile ordering useful, with the preview below?
- Is generating a fresh layout on Play preferable to playing the inspected preview?

## Approval
Pending user review of revision 3.
