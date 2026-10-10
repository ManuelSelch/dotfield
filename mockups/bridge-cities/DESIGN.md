# Bridge cities — simplified terrain review

## Goal and revision

Revision 1 — in review, not approved. The user requested trying a simpler alternative to polygonal river pathfinding. This is an isolated proposal, not approval to replace the production plan.

## Proposed design and interaction

- Two separate banks retain the existing polygonal city-region style. Regions are generated independently within each bank and terminate at a straight blue-grey river gap.
- Two broad, flat bridge decks connect aligned pairs of cities, with small bridge symbols beside those four cities. Each deck is 64 field units wide so a displayed five-dot formation fits.
- Within a bank, any normal city-to-city order remains a straight route.
- Across banks, only explicit orders between the two endpoints of the same bridge are legal. The source must be player-owned; the destination may be friendly, neutral or hostile and receives normal reinforcement/attack.
- A dashed ring identifies a selected bridge city's counterpart. Invalid cross-bank targets show a red dashed guide and an explanatory hint; no automatic detour or order forwarding occurs.
- Suggested review flow: send from the southern starting city to the green western bridge city; after arrival, send across to its northern counterpart; after capture, send onward from that city.
- Review states: `/bridge-cities/?state=opening` and `?state=staged` (already owns a northern bridge city). Links/Reset are review controls, not production additions.
- Whole-region pointer drag or click source then destination; keyboard Enter/Space and Escape cancellation; Pause freezes the fake demonstration. Reduced motion omits moving dots while still allowing the staging interaction.

## Fake/omitted behaviour

- Plain SVG/JavaScript, fake cities and local state. No production modules, backend, saving, growth, AI, real collisions, queued launches or round outcome.
- A successful order deducts all but one immediately and displays up to five illustrative dots; the entire order resolves together on arrival. This is deliberately simpler than production staggered five-unit batches and is not a proposed change to those rules.
- Fake arrivals update counts/ownership so manual staging can be tried. No automatic next leg is issued.
- Mountains, Gatehouses, Factory changes, Artillery and Portals are not part of this preview.
- Unlike the earlier automatic-detour proposal, this design requires staging orders and bank/pair connectivity checks. If approved, revise the production requirements before implementation; do not silently retain automatic cross-bank routing.
- Production still needs correct map validation, save/restore, AI staging and shared render/collision geometry. This preview does not establish those as solved.
- No browser automation, screenshots or agent visual verification. Syntax and serving checks only; user performs review.

## Approval and references

Not approved. User said “try it”, authorizing this mockup rather than production work. Ask for explicit approval or further revisions.

Polygonal comparison is preserved at `/terrain-routes/?state=river`. Both previews reuse the same project mockups Vite workspace/server. Preserve both designs; after final approval, verify and stop the owned server before production changes.
