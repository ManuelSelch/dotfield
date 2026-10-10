# Terrain routes — mountain pass visual review

## Goal and scope

Show how a mountain range can shape two tactically distinct approaches between the south and north sides of the battlefield, while preserving Dotfield's understated map style and explicit city-to-city orders.

## Revision

Revision 4 — superseded by the approved combined terrain mockup in `mockups/terrain-frontier/`. Removes text labels from the mountain; the route selectors still distinguish the two manually staged flanks.

## Proposed design

- A muted, angular mountain massif occupies the center of the field. Layered facets and snow-cap accents make it read as a continuous ridge without realistic textures or visual noise.
- The massif leaves visible west and east passages without text labels on the mountain. Matching controls select either route.
- Selecting a passage highlights a chain of direct city-to-city orders that skirts the ridge. Each city is a staging point; the user must issue each order separately. Routes do not bend around the mountains automatically.
- A direct order whose line intersects the ridge is shown as invalid. In this illustration, cities on the far side are reachable by moving through the passage cities.
- The two sample flanks have comparable lengths and neutral staging cities, so the mockup focuses on the geography and route choice rather than a balance claim.
- The compact portrait board, faction colors, city counters, scenario links and reset behavior are retained. Route selectors and scenario links are mockup-only controls.

## Fake/omitted behaviour

- Plain SVG/JavaScript with deterministic fake cities and local state. No production imports, combat, AI, capture, save data or actual route planning.
- Highlighted passages are illustrative sequences of straight orders, not an automatic pathfinding system. Troops do not traverse the entire highlighted sequence from one command.
- Mountain collision uses sampled line points for visual feedback only; it is not authoritative game geometry or a production validation approach.
- The mountain palette and shape are proposals. This preview does not establish final balance, map generation constraints, mobile readability or gameplay duration.
- No browser automation, screenshots or agent visual review performed. The user should review the served preview.

## Approval

Superseded and not approved for standalone implementation. The combined river-and-mountain revision is approved in `mockups/terrain-frontier/DESIGN.md`.
