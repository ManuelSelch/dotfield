# Command Relay — revision 3

- Status: IN REVIEW. No production implementation authorized.
- User feedback on revision 1: “the Compact scoreboard looks good” but relay placement on a bridge was not interesting enough. Compact scoreboard is the preferred presentation; overall map design is not approved.
- User feedback on revision 2: all three maps look good; user requested denser examples up to 30 cities. This is continued mockup review, not authorization to implement production gameplay.
- Goal: compare three map compositions at original, 20, 24 and 30 cities using the same compact scoreboard, objective rules and match-state controls. The relay is never a bridge city.

## Layouts

- A / The far basin: relay deep on the far bank behind a central ridge, approached around either flank. Bridge control opens access but does not secure the objective. Factories in the outer northern pockets compete for attention.
- B / The mountain courtyard: relay between two parallel ridges. Two entrances (north/south); side valleys lead to northern factories and a rear approach. Illustrates one faction taking the short southern route while the other takes the northern approach. These choices are available symmetrically, not faction-locked. This is the strongest encirclement study, not a recommendation based on playtesting.
- C / The exposed lowland: relay inland from the river, accessible from both crossings; neutral factories lie beyond a northern mountain. The decision is to hold points or spend troops securing the longer-term economy.
- All layouts: southern left/right faction starts, central southern ridge separating direct home-to-home attacks, horizontal river with two paired crossings, multiple city-to-city approaches. Factory attachments mean extra Production output, not a new mechanic.
- Spatial mirror symmetry gives equal initial access in the drawings; competitive balance, timing and strategic interest are untested. Factions may contest either bridge. Illustrative paths are not exclusive movement lanes or automatic routing; other unobstructed same-bank orders remain possible.

## Presentation and interaction

- Dotfield pale Voronoi regions clipped by bank, teal player, terracotta enemy, gold relay, rounded bridge decks, faceted mountains, compact troop counters and idle city-control strip.
- All three cards use compact scoreboard A from revision 1. No map-inset score panel or large mission card.
- Three desktop columns, two medium-width columns, single-column phone layout. Keyboard controls and relay activation by Enter/Space retained; no required animation.
- States: `?state=countdown`, `?state=holding`, `?state=urgent`. Query restores initial state preset, not edited scores.
- Density: `?cities=base`, `?cities=20`, `?cities=24`, `?cities=30` (default). City-count buttons update all three maps and a count badge per layout. Switching count preserves match scores/control state.
- Fixed 420×620 field, city radius14, existing counters/terrain/relay/Factories/routes and responsive presentation remain unchanged. All extra cities are neutral ordinary Production cities, not new free weapons or factories.
- Mockup-only density helper adds deterministic mirrored pairs in open space (and one centerline city when needed). Dense versions are nested: each higher count retains every lower-count city. Added centres maintain at least48 logical units from existing cities, 26 from mountain bounds and29 from river banks; relay label space is reserved. This is a visual packing study, not a production generator.
- Controls: switch presets; show/hide tactical routes; simulate capture; advance holding score by 10. Both scores are preserved on capture. Preset buttons restore authored scores. Advancement stops at 89; terminal outcome omitted.
- Teal/red dashed routes illustrate separate city-to-city orders for each faction. Fine gold routes show production detours. Urgent state sketches an airlift across terrain.

## Scope and approval

- Proposed scoring unchanged: activate at 60 seconds, first to 90 holding seconds wins, losing ownership pauses accumulated progress. No bonus troops or changing terrain.
- Fake: no running clock, combat, growth, aircraft physics, map generator, city conversion or AI. Territories beyond the bridge are illustrative mid-opening ownership, not the exact initial board. Preset troops/roles are not a playable simulation.
- Geometry source checks verify exact requested counts, deterministic nested placement, minimum spacing, mirrored added cities, label clearance, city/mountain/river separation, unchanged authored routes and paired crossings. This is not visual or balance verification.
- Production bridge/city geometry and generator feasibility have not been implemented or proven. Mockup is a design reference only.
- Review question: do 24–30 cities remain readable at the existing field scale, and which layout best preserves distinct approaches at higher density? More cities also introduce more staging opportunities, so gameplay trade-offs remain untested.
- Approval: pending explicit user review of revision 3. Prior revisions remain in git commits 89a64ee and b2f52c9.
