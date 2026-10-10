# Random-map match setup

## Goal and scope
Replace named-map browsing with match preferences and a fresh generated layout. Isolated HTML/CSS/JS prototype; no production changes.

## Revision
4 — approved for implementation.

## Layout and interactions
- Preserve Dotfield's warm light field, teal player, muted faction colours, and rounded controls.
- Desktop: settings left, always-visible map preview right. Mobile: compact settings and collapsible upgrades first, preview below; Play fixed at the bottom with safe-area padding. Content scrolls, but Play stays accessible. Bottom spacing keeps the final preview controls clear of Play.
- Total cities: 6–24, slider and steppers. Enemies: 1–4 opposing factions. One starting city per faction; remaining cities neutral.
- Industry and river/bridges: Off / On only. Selected features are fixed; layouts still change with every generation. On mobile, labels and toggles share a row.
- Your upgrades: collapsed initially, summary shows enabled count; Industry, Factory, Slow Zone, and Watchtower checkboxes mirror existing upgrade names and descriptions.
- Enemy settings: collapsed initially, summary shows active enemy count and upgrade count or behavior status. Each selected enemy has independent upgrades and Balanced / Aggressive / Defensive behavior.
- Reducing enemy count hides extra factions, retaining their local selections if re-added. Match summaries include active factions only.
- Upgrade controls are independent of the map's Industry setting: map Industry adds neutral factories; faction Industry boosts production. A faction Factory applies to its starting city, independently of neutral factories.
- Always at least six cities, so every supported enemy count fits. Wider generation ranges and unavailable combinations are deferred to production design.
- Preview responds to settings; Reroll is available. No Hide/Show button or helper captions below the preview or Play button.
- Play new map generates a new layout, not the shown preview.
- Simulated match screen offers Restart same map, New map with unchanged settings, and return to settings.
- Restart retains generated layout; New map changes it.
- Keyboard controls and visible focus states; no animation or external assets.

## Fake or omitted behaviour
- Seeded jittered layouts and clipped territory polygons are illustrative only. They do not prove fair starts, valid bridge staging, route clearance, connectivity, or production generation constraints.
- Industry creates one or more neutral factories. River creates two illustrative crossings where possible. Exact counts are not configurable in this revision.
- No combat, difficulty, session saving, or persistent preferences. Upgrade and behavior selections are interactive local state, captured in a text summary on the simulated match screen; their gameplay effects and map markers are not simulated. Returning to settings keeps local state for this open page only.
- Map seeds exist internally for repeatable restart but are not exposed in the UI.

## Review questions
- Are compact mobile controls, collapsed upgrades, and fixed Play convenient with the preview below?
- Is generating a fresh layout on Play preferable to playing the inspected preview?

## Approval
User explicitly approved revision 4: “looks good. implement it”. Preserve the approved layout and interactions; replace illustrative generation and upgrade state with validated game integration.
