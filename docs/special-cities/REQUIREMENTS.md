# Terrain and Special Cities — Requirements

## Goal

Add tactical choices to Dotfield through meaningful routes and contested locations, while retaining short rounds and simple city-to-city dragging. Players should choose between securing a crossing, pursuing production, applying siege pressure, and opening a route behind the enemy.

Status: proposal only. The user requested mountains, bridges, Gatehouses, Artillery cities, Portal pairs, and a river map with two crossings and a contested factory. Exact rules and balance are not yet approved; this document does not authorize implementation.

## Scope

### In Scope

- Mountains that block direct movement and create passes.
- Rivers that can only be crossed at explicitly defined bridges.
- Automatic legal routing, with visible paths and no manual waypoint drawing required.
- Gatehouse cities controlling a bridge or mountain pass.
- Artillery cities attacking stationary hostile city garrisons, distinct from Watchtowers attacking airborne troops.
- Linked Portal cities offering a shortcut when one faction controls both endpoints.
- A map-authored contested Factory that rewards its current owner.
- An initial river scenario with two crossings and a contested factory; separate later scenarios for mountains, Artillery and Portals.
- Shared rules for player orders, all AI factions, forecasts, rendering and saved rounds.

### Out of Scope

- Implementing gameplay as part of this documentation task.
- Defensive-stance controls, fortresses, radar, relays or transport hubs.
- Currency, unlocks, upgrade levels, alliances or multiplayer.
- Destructible terrain, bridge construction, procedural terrain generation or manual path drawing.
- Changing existing maps or the original-beneficiary policy of the existing starting-city Factory upgrade without a separate decision.
- Placing every special-city type on every map.

## Requirements

### 1. Terrain and routes

- R1. Mountains and rivers are gameplay barriers, not merely decoration. A route may not cross a mountain outside a pass or a river outside a bridge.
- R2. Terrain and crossings are authored in logical field coordinates. Phone dimensions, Voronoi regions and pixel density must not change route legality or travel outcomes.
- R3. Dragging source → target previews the actual legal route around barriers and through crossings. Longer paths take longer to travel under the same movement rules.
- R4. An unreachable target is clearly indicated. Releasing an invalid order must not remove the source's existing launch queue or deduct troops.
- R5. Terrain must create alternative approaches, not only a single mandatory corridor. A short exposed crossing and a longer less-exposed crossing are the preferred first example.
- R6. Path bends, crossings and any portal transit must use one authoritative movement model for rendering, per-dot collisions, Slow Zones, Watchtower targeting and AI forecasts. Collisions must not sweep through an obstacle or across a teleport gap.
- R7. Existing cities along a route must not be silently captured or receive troops unless they are an explicit destination. Hostile Gatehouses are an explicit access restriction, described below.
- R8. Existing maps without terrain retain their current direct routes, border launch/impact geometry and dispatch rules.

### 2. Gatehouse

- R9. A Gatehouse is a capturable city linked to a particular bridge or mountain pass. Its marker and controlled crossing must be visibly connected.
- R10. Proposed access rule: a faction may route through the controlled crossing only while it owns the Gatehouse. Neutral and hostile Gatehouses block passage for that faction, but remain attackable from an accessible approach.
- R11. Capturing the Gatehouse opens the crossing to the captor and closes it to other factions for new orders. Ownership and access are determined independently for every faction, not by player/enemy labels.
- R12. The map must allow both sides to attack the Gatehouse without first crossing its locked route. No circular requirement such as “cross the bridge to capture the city that unlocks the bridge” is allowed.
- R13. Gatehouses use ordinary city combat unless a separate defensive bonus is approved. Their tactical value comes from access control, not an assumed armour bonus.
- R14. Behaviour of launched troops and queued batches when a Gatehouse changes ownership must be decided before implementation; no disappearance, duplication or instantaneous relocation is allowed.

Tactical purpose: hold a shorter attack route, deny an enemy flank, or bypass a strong Gatehouse using the second crossing.

### 3. Artillery city

- R15. An Artillery city automatically attacks eligible hostile city garrisons within a fixed logical-field range, at a configured firing cadence. It does not replace the Watchtower's airborne-dot targeting.
- R16. Proposed first version: each shot removes a configured number of defending troops, without splash damage. Artillery alone cannot capture a city; a troop arrival is still required.
- R17. Target choice and simultaneous-event ordering must be deterministic and identical in live play and forecasts. Range, cadence, damage and targeting priority remain unconfirmed.
- R18. Proposed ownership rule: capture transfers Artillery control to the new owner; neutral Artillery does not fire. Whether neutral cities are eligible targets remains open.
- R19. Show coverage and a brief shot/impact indication so losses are explainable. No invisible damage or new manual aiming controls in the first version.
- R20. Whether rivers and mountains block Artillery fire must be explicit; movement barriers do not automatically define firing rules.

Tactical purpose: pressure a defended crossing and force the opponent to attack, withdraw troops, or lose garrison over time. Avoid a range/damage combination that safely dominates the whole field.

### 4. Portal pair

- R21. Two map-authored Portal cities share a stable pair identity. The map visually communicates their connection without relying only on faction colour.
- R22. Proposed activation rule: a faction gains the shortcut only while it owns both endpoints. Mixed or neutral ownership leaves the link inactive.
- R23. An active link provides a route between the endpoints without traversing the intervening terrain. Troops may not collide with or be shot at in the skipped space.
- R24. Ordinary route sections before entry and after exit retain normal collision and feature interactions. Portal entry, transit and exit behaviour must be defined before simulation work.
- R25. Capturing either endpoint disables the shortcut for future orders by its former controller. Treatment of committed troops remains an open decision.
- R26. Portal use must not duplicate troops, create routing loops, reset stable dot identities, or permit arbitrary teleport destinations.

Tactical purpose: invest in two separated positions to gain mobility, reinforce distant fronts, and threaten an enemy rear. The opponent can break that advantage by capturing either endpoint.

### 5. Contested Factory and first river scenario

- R27. The contested Factory is authored on a neutral city rather than automatically attached to a faction's start. Proposed policy: it boosts production for whichever non-neutral faction currently owns it; while neutral it produces no troops.
- R28. Distinguish this current-owner Factory from the implemented starting-city Factory upgrade, which remains tied to its original beneficiary. Do not silently change that existing upgrade's capture policy.
- R29. Proposed initial balance: use the existing Factory's 2× local production multiplier, stacking with the owner's Industry rate, subject to the global automatic-production cap of 50. This is a playtest assumption, not an approved tuning value.
- R30. First scenario: a river separates the starting areas, with exactly two crossings. One crossing is a shorter, Gatehouse-controlled approach; the other is an open but longer flank. Both factions can initially approach the neutral Gatehouse.
- R31. Place the neutral Factory near the contested approaches, with comparable initial access costs for both factions. It must not be reachable only by the already-winning side or make one opening obviously mandatory.
- R32. The map must support at least these choices: rush the Factory for production; secure the Gatehouse for access; take the open crossing to flank an opponent committed elsewhere.
- R33. Artillery and Portal pairs are introduced on later maps rather than crowding this first scenario. A mountain-pass map can reuse the route and Gatehouse rules.

### 6. Integration and verification

- R34. AI must issue only legal routes, account for actual travel time, and recognise Gatehouse access, Factory production, Artillery pressure and active Portal links. It receives no hidden bonuses or knowledge of future player orders.
- R35. Preserve terrain definitions, route/progress state, special-city ownership, pair identities and feature timers through pause, backgrounding, Restart, Play again and mid-round save/restore. Closed time grants no growth or shots.
- R36. Map previews, route previews, board markers and accessible descriptions must communicate barriers, crossing access, special-city function and Portal activation. Keep existing whole-region touch targets and readable counters.
- R37. Add pure-simulation tests for route legality, ownership changes, bent-path collisions, feature interactions, deterministic forecasts and persistence. Browser tests must cover actual drag routing and readability at small phone sizes.
- R38. Human playtesting must check alternative openings, stalemate risk, AI competence and round duration. Symmetry and automated tests alone do not prove enjoyable balance.

## Assumptions

- The proposals benefit any current controlling faction equally, including multiple independent enemies; they are map objectives rather than player-only pre-game bonuses.
- Automatic routing chooses the shortest legal travel-time route, with stable tie-breaking. Players choose a different approach through staging-city orders rather than a route-selection UI.
- Gatehouses restrict access but do not gain extra defence in the initial design.
- Artillery is automatic, single-target and unable to capture by itself; neutral-owned Artillery is inactive.
- Portal links activate through shared ownership of both endpoints; no extra resource or unlock is required.
- The contested Factory uses a separate ownership policy from existing starting-city Factories, initially with the same multiplier and cap.
- The first implementation should use fixed authored terrain and limited scenarios, not a general map editor.
- Current implementation has direct straight-line routes and Factory, Watchtower and Slow Zone features, but no terrain, Gatehouse, Artillery or Portal feature. Route bends require simulation changes, not just a visual overlay.

## Implementation Plan

### 1. Terrain and legal routes

Description: Define authored barriers/crossings and deterministic legal-route queries, including unreachable targets and compatibility with terrain-free maps. Verify bridge-only river traversal, mountain detours, path lengths, stable ties and invalid-order queue preservation with unit tests. No Gatehouse ownership restrictions yet.

### 2. Routed movement and presentation

Description: Following slice 1, integrate route progress and path bends into shared movement, dot geometry, collision sweeps, Slow Zones, Watchtowers, AI travel estimates and persistence. Draw terrain and real drag previews. Verify live/forecast agreement, no obstacle-crossing sweeps, saved-route restoration and phone input in browser tests before adding special access rules.

### 3. Gatehouse control

Description: Following slice 2 and a decision on in-flight access changes, attach cities to crossings and make routing faction-aware. Keep Gatehouses attackable from both approaches; expose access in previews and accessibility. Verify neutral locks, capture/recapture, multiple factions, queue handling and AI legal orders.

### 4. River map and contested Factory

Description: Following slice 3, introduce a current-owner Factory policy without changing original-beneficiary Factories. Add the river scenario with two crossings, one Gatehouse and one neutral Factory. Verify capture bonuses, Industry/cap interactions, replay/save behaviour and several viable openings through human playtesting.

### 5. Artillery city

Description: Following slice 4 and confirmed firing parameters, implement deterministic garrison-targeting shots in the shared world step, feature timers, shot feedback, persistence and AI forecasts. Add a focused siege scenario, preferably a mountain pass. Verify no artillery-only capture, pause behaviour, ownership changes, target rules and counterplay.

### 6. Portal pair

Description: Following slice 4 and confirmed transit/capture rules, add paired endpoints, activation and portal-aware routes to live simulation, forecasts, previews and saves. Add a dedicated flanking scenario; verify no skipped-space collisions, no duplication/loops, mixed-owner inactivity, captured endpoints and AI shortcut use. Artillery is not a prerequisite.

## Open Questions

1. Should the first map use one Gatehouse-controlled crossing and one always-open crossing, as proposed?
2. When a Gatehouse changes owner, should already-launched troops finish their route, stop at the gate, or reroute; and what should happen to unlaunched batches?
3. Should the contested Factory grant the current owner 2× local production, stacking with Industry under the existing 50-troop production cap?
4. What Artillery range, firing interval, damage and target priority should be used; may it attack neutral cities, and do mountains or rivers block its shots?
5. Should Portals be used automatically by routing or only by explicitly sending troops to an endpoint; what is the transit delay, and what happens if an endpoint is captured during transit?
