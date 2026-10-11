# Defensive Network mockup

- Goal: show how a connected group could gain combat defense and how the player identifies connected cities and the frontline.
- Revision: 3
- Status: approved for implementation.
- Approval: user approved revision 3: “looks good. implement it”.
- Approved design: shield badges on each connected city; one/two/three shields correspond to network defensive tiers.
- User feedback on revision 1: “no this looks ugly. It should only mark the outer border (does this work?)”
- Approved connected-group visual: preserve normal muted city-region boundaries and draw one stronger outline around the outside perimeter only.
- Revision 3 adds a compact teal shield badge on every connected city. The badge shows one, two, or three small shield symbols according to the group tier. The status panel states shield count, example defense percentage, and connected-city count.
- Illustrative rules only: legal-route chain from the starting city; 1 shield / +10% for 2–3 cities, 2 shields / +20% for 4–6, 3 shields / +30% for 7+ (capped). Values and thresholds are proposals, not approved or tested.
- Map is an SVG schematic with a river and bridge marks; routes are illustrative, not generated-map data. No actual combat, simulation or interaction is implemented.
- Responsive target: phone-width layout matching the existing Dotfield map preview style.
- Implementation handoff: retain the outer connected-group perimeter; show one, two, or three compact shield symbols on each connected city according to the connected-city count. Use the tier values shown in the preview as the initial balance configuration.
