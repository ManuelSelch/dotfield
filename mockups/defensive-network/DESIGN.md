# Defensive Network mockup

- Goal: show how a connected group could gain combat defense and how the player identifies connected cities and the frontline.
- Revision: 2
- Status: in review; no production approval yet.
- User feedback on revision 1: “no this looks ugly. It should only mark the outer border (does this work?)”
- Updated visual: preserve normal muted city-region boundaries; draw one stronger outline around the outside perimeter of the connected group only. Remove the graph-like route lines and frontline labels. A compact status panel reports connected-city count and the proposed defense tier.
- Illustrative rules only: legal-route chain from the starting city; example defense tiers +10% for 2–3 cities, +20% for 4–6, +30% for 7+ (capped). These numbers and tier boundaries are not yet approved or tested.
- Map is an SVG schematic with a river and bridge marks; routes are illustrative, not generated-map data. No actual combat, simulation or interaction is implemented.
- Responsive target: phone-width layout matching the existing Dotfield map preview style.
- Review question: does the single outer perimeter read clearly as the boundary of the connected group, without emphasizing internal borders?
