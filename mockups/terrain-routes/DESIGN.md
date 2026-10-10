# Terrain routes — visual review

## Goal and scope

Review the slice 2 appearance of rivers, bridges, mountain barriers and real-looking routed drag guides before production implementation. Preserve Dotfield's understated single-screen mobile board and whole-region input.

## Revision

Revision 1 — in review, not approved.

## Proposed design

- Muted blue-grey river band with light bridge decks and thin rails. Troop paths visibly bend through the nearer bridge rather than crossing water directly.
- Muted stone-coloured mountain footprint with a small angular mountain glyph. The footprint represents the rectangular authored barrier; routes skirt its boundary.
- Existing pale faction regions and radius-21 city counters remain visible and touchable. Terrain overlays region fills, below guides, troops and city counters.
- Teal dashed route with destination arrow; source and target regions are highlighted. Unreachable destinations use a muted red dashed guide without an arrow and the hint “No crossing · choose another destination”.
- Existing viewport lock, portrait field, pause icon, quiet footer and palette are retained. Review-only scenario links and Reset are not production UI additions.
- Review scenarios: `?state=river` (two bridges), `?state=mountain` (detour), `?state=blocked` (river without crossings). Each reload restores its scenario.
- Whole-region pointer drag, source/destination keyboard selection with Enter/Space, and Escape cancellation. Pause toggles preview motion.

## Fake/omitted behaviour

- Plain SVG/JavaScript with deterministic fake cities and simplified local route selection. No production modules, real movement, combat, capture, growth, AI, persistence, Gatehouses, Factory policy changes, Artillery or Portals.
- Releasing a valid route illustrates one five-dot batch in single-file motion. Counts do not change. This illustration is not a decision to change real formation rules; production clearance, bends and collision rules require simulation tests.
- Route trimming and geometry are illustrative, not the authoritative slice 1 planner. Logical field margins are not fully simulated. Production must retain one consistent physics/rendering geometry.
- With reduced motion, route previews remain but troop animation is disabled.
- No browser automation, screenshots or agent visual review performed. User review is required; a serving check does not establish visual correctness.

## Approval

Not approved. Review revision 1 at `/terrain-routes/`, then explicitly approve or request changes. Before production visual work, stop the agent-owned preview process using its verified identity and preserve these files.
