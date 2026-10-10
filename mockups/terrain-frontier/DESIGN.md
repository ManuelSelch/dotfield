# Mountain and river frontier — visual review

## Goal and scope

Explore how a larger battlefield can combine the already-established mountain and bridge rules into two readable tactical approaches.

## Revision

Revision 2 — approved for implementation. The user accepted the combined layout and asked to remove the mountain pass labels.

## Proposed design

- A 14-city field places a broad mountain range across the lower-middle map, leaving a west and an east flank. Each flank has a named pass and several neutral staging cities.
- A separate river crosses the upper third of the field. Two compact bridges connect paired city endpoints, one on each flank.
- The north and south starting cities are separated by both obstacles. The West and East controls highlight a distinct seven-order chain: stage through the chosen mountain pass, then cross at that flank's paired bridge cities, then approach the enemy city.
- Neutral garrisons on both sides are illustrative and mostly symmetric; the design demonstrates route structure, not balance.
- Terrain is layered over the existing subdued city-region language. Bridges remain river-only; the paired bridge cities remain explicit staging/crossing points.
- The mountain has no text labels on its face. Route names remain in the selector above the map. The taller field fits a mobile portrait board; controls switch the highlighted route without moving cities or changing the map.

## Fake/omitted behaviour

- Plain SVG/JavaScript with fixed mock cities. No production imports, combat, AI, growth, map generation or persistence.
- Route lines illustrate a sequence of separate city-to-city orders. Selecting a flank does not dispatch troops or make the route automatic.
- This composition does not establish final city count, terrain generation rules, fairness, balance or small-screen readability on real devices.
- No browser automation, screenshots or agent visual review performed. User review is required.

## Approval

Approved revision 2. Evidence: the user said “looks good. accepted. Implement it but remove the west pass and east pass label from the mountain.” Keep the route controls, but no text labels on the mountain itself.
