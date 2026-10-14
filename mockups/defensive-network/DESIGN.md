# Defensive Network mockup

- Goal: show how a connected group could gain combat defense and how the player identifies connected cities and the frontline.
- Revision: 4
- Status: approved for implementation.
- Approval: user approved revision 4: “implement it”.
- Revision 3 was approved and implemented; user reported its repeated shield marks overlap. Revision 4 uses one Tabler outline shield with a 1/2/3 tier numeral, which the user approved.
- User feedback on revision 1: “no this looks ugly. It should only mark the outer border (does this work?)”
- Approved connected-group visual: preserve normal muted city-region boundaries and draw one stronger outline around the outside perimeter only.
- Revision 4 replaces the tiny repeated shield marks with a single Tabler outline shield containing the tier numeral on each connected city. The status panel reports the defense tier and percentage.
- Defensive Network behavior updated per user approval: shared-border neighbor chain from the starting city (paired bridge endpoints count as neighbors); tiers 1/2/3 at 4–6/7–12/13+ connected cities set shield capacity per city. Each connected city recharges one batch-blocking shield every 10 seconds, up to capacity. Existing charges above capacity are preserved.
- Map is an SVG schematic with a river and bridge marks; routes are illustrative, not generated-map data. No actual combat, simulation or interaction is implemented.
- Responsive target: phone-width layout matching the existing Dotfield map preview style.
- Approved implementation handoff: use the Tabler shield silhouette with the current tier numeral centered in it on every connected city that has an active defense tier.
