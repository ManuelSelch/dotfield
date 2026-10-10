# Slice 1 — Terrain and legal routes

Implemented foundation for [the special-city plan](REQUIREMENTS.md), not playable terrain maps yet.

## Available APIs

- `src/game/terrain/types.ts`: logical-field bounds, rectangular mountain/river barriers, authored bridge/pass links and planned routes.
- `createTerrain(input)` in `terrain.ts`: validates and freezes a copied terrain definition. IDs are unique across barriers/crossings. Bridges reference rivers; passes reference mountains. Each crossing joins boundary points through its own barrier only.
- `planTerrainRoute(source, target, terrain?, rules?)` in `routes.ts`: returns a border-to-border polyline, total distance, base-speed duration and ordered crossing IDs; returns `null` for unreachable/invalid endpoints. Existing terrain-free routes preserve exact legacy endpoints and timing.
- `dispatchUnits(state, sourceId, targetId, faction?, terrain?)`: an optional terrain guard runs before queue replacement, unit deduction or ID allocation. Invalid orders retain the exact original state. Existing callers omit terrain and remain unchanged.

## Routing rules

- Shortest-distance visibility graph through obstacle corners and crossing endpoints, using the issuing faction's constant base speed. Coordinate ordering and stable crossing IDs resolve equal paths independently of definition-array order.
- Barrier interiors cannot be crossed by ordinary edges. Bridges and passes are explicit bidirectional edges through their referenced barrier.
- Barriers touching the logical field edge cannot be bypassed through a zero-width boundary gap or outside the field.
- Paths may follow an obstacle boundary. City launch/impact points intersect the actual city circles (now radius 14; originally 21), including when a bend lies inside a city circle.
- No ownership restrictions or Portal shortcuts are applied in this slice.

## Deliberate boundaries

- Initial authored geometry uses **disjoint axis-aligned rectangles**. Overlapping/touching barriers are rejected rather than allowing ambiguous seams. Arbitrary polygon terrain and curved rivers are not supported by this foundation.
- Queries plan **formation centerlines**, not the swept width of a troop formation. Formation clearance at banks, corners and narrow crossings must be addressed with routed movement in slice 2 before a terrain map becomes playable.
- Base route lengths do not predict future Slow Zone effects; path-aware zone trajectories and forecasts remain slice 2 work.
- Dispatch currently accepts only plans identical to a legacy straight route without crossing edges. Reachable detours and bridge/pass routes are deliberately rejected until slice 2 can simulate the full path, instead of silently launching troops through obstacles.
- No existing map contains terrain; no new map picker entries, terrain drawing, route previews, save fields or session forwarding have been added.
- Factory ownership changes, Gatehouses, Artillery and Portals remain their planned later slices. Existing Factory gameplay is unchanged.

## Verification

- 30 new unit tests cover frozen/validated authoring, rivers and bridges, mountains and passes, field-edge and thin-barrier rejection, multiple barriers, shortest paths, stable ties, faction speed, border trimming and terrain-aware invalid-order queue preservation for player and AI factions.
- Full unit suite: 347 tests across 42 files passed.
- TypeScript and production build passed.
- All 5 existing Chrome browser dispatch tests passed at `PLAYWRIGHT_PORT=5187`. They are regression checks only; they do not exercise playable terrain, which is not integrated yet. The full browser suite was not rerun.
