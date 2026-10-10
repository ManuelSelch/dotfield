# Terrain and Special Cities — Requirements

## Goal

Add tactical choices to Dotfield through meaningful routes and contested locations, while retaining short rounds and simple city-to-city dragging. Players should choose between securing a crossing, pursuing production, applying siege pressure, and opening a route behind the enemy.

Status: planning only; no gameplay implemented by this document. Confirmed decisions include one Gatehouse-controlled crossing plus one open crossing, current-owner benefits for every Factory, Artillery parameters, and explicit Portal-to-Portal transport. Remaining details are identified under Assumptions and Open Questions. This document does not authorize implementation.

## Scope

### In Scope

- Mountains that block direct movement and create passes.
- Rivers that can only be crossed at explicitly defined bridges.
- Automatic legal routing, with visible paths and no manual waypoint drawing required.
- Gatehouse cities controlling a bridge or mountain pass.
- Artillery cities attacking stationary hostile city garrisons, distinct from Watchtowers attacking airborne troops.
- Linked Portal cities offering explicit army transport when one faction controls both endpoints.
- Map-authored Factories and starting-city Factory upgrades using the same current-owner production benefit and the same Factory name/icon.
- An initial river scenario with two crossings and a contested factory; separate later scenarios for mountains, Artillery and Portals.
- Shared rules for player orders, all AI factions, forecasts, rendering and saved rounds.

### Out of Scope

- Implementing gameplay as part of this documentation task.
- Defensive-stance controls, fortresses, radar, relays or transport hubs.
- Currency, unlocks, upgrade levels, alliances or multiplayer.
- Destructible terrain, bridge construction, procedural terrain generation or manual path drawing.
- Altering existing map layouts; the starting-city Factory upgrade's ownership behaviour is explicitly included in the planned change.
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
- R14. Recommended simple policy, pending confirmation: already-launched troops finish their committed route after Gatehouse capture, without automatic kills. Cancel unlaunched batches whose route becomes unavailable, retaining their troops at the source; new orders use current crossing access. No disappearance, duplication or instantaneous relocation is allowed.

Tactical purpose: hold a shorter attack route, deny an enemy flank, or bypass a strong Gatehouse using the second crossing.

### 3. Artillery city

- R15. An Artillery city automatically attacks eligible hostile city garrisons within a 90-field-unit range, firing once every 2,000 ms. It does not replace the Watchtower's airborne-dot targeting.
- R16. Each shot removes one defender, without splash damage. Artillery alone cannot capture a city; a troop arrival is still required. Never reduce a garrison below zero.
- R17. Target the nearest eligible hostile city with troops. Target ties and simultaneous-event ordering must be deterministic and identical in live play and forecasts.
- R18. Capture transfers Artillery control to the new owner; neutral Artillery does not fire. Friendly and neutral cities are never targets.
- R19. Show coverage and a brief shot/impact indication so losses are explainable. No invisible damage or new manual aiming controls in the first version.
- R20. Mountains block the direct line of fire; rivers do not. A blocked city is ineligible, even if troops could reach it through a mountain pass.

Tactical purpose: pressure a defended crossing and force the opponent to attack, withdraw troops, or lose garrison over time. Avoid a range/damage combination that safely dominates the whole field.

### 4. Portal pair

- R21. Two map-authored Portal cities share a stable pair identity. The map visually communicates their connection without relying only on faction colour.
- R22. A faction may use the Portal link only while it owns both endpoints. Mixed or neutral ownership leaves the link inactive for new transport orders.
- R23. Explicitly drag Portal A → its paired Portal B to transport A's troops to B, leaving one behind. Show a distinct portal-link preview. Ordinary routing must not silently use Portals, and arriving reinforcements at A must not teleport automatically.
- R24. Portal transit skips intervening terrain; troops neither collide nor get shot at in the skipped space. Arrival reinforces B or resolves normal hostile combat according to B's owner at arrival. A subsequent attack from B requires a normal order; non-Portal travel retains normal feature interactions.
- R25. Capture disables new transport orders for the former controller, but troops that have already entered transit finish. Unlaunched-batch handling and transit delay remain open; no committed transit is automatically destroyed by ownership changes.
- R26. Portal use must not duplicate troops, create routing loops, reset stable dot identities, or permit arbitrary teleport destinations.

Tactical purpose: invest in two separated positions to gain mobility, reinforce distant fronts, and threaten an enemy rear. The opponent can break that advantage by capturing either endpoint.

### 5. Contested Factory and first river scenario

- R27. Maps may author a Factory on a neutral city. Every Factory boosts production for whichever non-neutral faction currently owns it; while neutral it produces no troops.
- R28. Use one feature name and icon: Factory. The Factory upgrade makes the selecting faction's spawn city a Factory, while a map may also contain its own Factories. Change the existing upgrade's original-beneficiary behaviour so capture transfers its production benefit to the new owner, including enemies; recapture transfers it back.
- R29. Retain the existing Factory's 2× local production multiplier, stacking with the current owner's Industry rate, subject to the global automatic-production cap of 50. Changing ownership retains the normal fractional-growth reset rule.
- R30. First scenario: a river separates the starting areas, with exactly two crossings. One crossing is a shorter, Gatehouse-controlled approach; the other is an open but longer flank. Both factions can initially approach the neutral Gatehouse.
- R31. Place the neutral Factory near the contested approaches, with comparable initial access costs for both factions. It must not be reachable only by the already-winning side or make one opening obviously mandatory.
- R32. The map must support at least these choices: rush the Factory for production; secure the Gatehouse for access; take the open crossing to flank an opponent committed elsewhere.
- R33. Artillery and Portal pairs are introduced on later maps rather than crowding this first scenario. A mountain-pass map can reuse the route and Gatehouse rules.

### 6. Integration and verification

- R34. AI must issue only legal routes, account for actual travel time, and recognise Gatehouse access, Factory production, Artillery pressure and active Portal links. It receives no hidden bonuses or knowledge of future player orders.
- R35. Pause, backgrounding and mid-round save/restore preserve terrain, route/progress state, ownership, pair identities and feature timers. Restart and Play again restore the original compiled map/setup and reset the round, not current ownership or progress. Closed time grants no growth or shots.
- R36. Map previews, route previews, board markers and accessible descriptions must communicate barriers, crossing access, special-city function and Portal activation. Keep existing whole-region touch targets and readable counters.
- R37. Add pure-simulation tests for route legality, ownership changes, bent-path collisions, feature interactions, deterministic forecasts and persistence. Browser tests must cover actual drag routing and readability at small phone sizes.
- R38. Human playtesting must check alternative openings, stalemate risk, AI competence and round duration. Symmetry and automated tests alone do not prove enjoyable balance.

## Assumptions

- Automatic non-Portal routing chooses the shortest legal travel-time route, with stable tie-breaking. Players choose a different approach through staging-city orders rather than a route-selection UI.
- Gatehouses restrict access but do not gain extra defence in the initial design. The finish-launched/cancel-blocked-queue policy in R14 is recommended but not explicitly confirmed.
- Artillery range is measured between city centres. Idle shots are not banked; nearest-target ties use stable city IDs. These timing/geometry details require confirmation before implementation.
- Portal links require no resource or unlock beyond owning both endpoints. Existing group size and launch cadence are retained for explicit transport, with transit delay still open.
- A city receives at most one Factory multiplier even if its authored Factory and a selected spawn Factory upgrade coincide; no duplicate bonus or badge.
- The first implementation should use fixed authored terrain and limited scenarios, not a general map editor.
- Current implementation has direct straight-line routes and Factory, Watchtower and Slow Zone features, but no terrain, Gatehouse, Artillery or Portal feature. Route bends require simulation changes, not just a visual overlay.

## Implementation Plan

### 1. Terrain and legal routes

Description: Define authored barriers/crossings and deterministic legal-route queries, including unreachable targets and compatibility with terrain-free maps. Verify bridge-only river traversal, mountain detours, path lengths, stable ties and invalid-order queue preservation with unit tests. No Gatehouse ownership restrictions yet.

### 2. Routed movement and presentation

Description: Following slice 1, integrate route progress and path bends into shared movement, dot geometry, collision sweeps, Slow Zones, Watchtowers, AI travel estimates and persistence. Draw terrain and real drag previews. Verify live/forecast agreement, no obstacle-crossing sweeps, saved-route restoration and phone input in browser tests before adding special access rules.

### 3. Gatehouse control

Description: Following slice 2 and confirmation of the launched/queued access-change policy, attach cities to crossings and make routing faction-aware. Keep Gatehouses attackable from both approaches; expose access in previews and accessibility. Verify neutral locks, capture/recapture, multiple factions, queue handling and AI legal orders.

### 4. River map and contested Factory

Description: Following slice 3, change all Factories, including existing starting-city upgrades, to benefit their current owner. Use one Factory name/icon, prevent duplicate attachment bonuses and account for old saved Factory definitions. Add the river scenario with two crossings, one Gatehouse and one neutral Factory. Verify capture bonuses, Industry/cap interactions, replay/save behaviour and several viable openings through human playtesting.

### 5. Artillery city

Description: Following slice 4, implement nearest-hostile-garrison targeting at range 90, one defender per 2,000 ms, excluding neutral targets and mountain-blocked shots. Include shared world stepping, feature timers, shot feedback, persistence and AI forecasts; confirm remaining timing/geometry assumptions first. Add a focused siege scenario, preferably a mountain pass. Verify no artillery-only capture, pause behaviour, ownership changes, target rules and counterplay.

### 6. Portal pair

Description: Following slice 4 and confirmed transit delay/queue rules, add paired endpoints and explicit A → B transport to live simulation, forecasts, previews and saves. Add a dedicated flanking scenario; verify no automatic forwarding or route shortcutting, no skipped-space collisions, no duplication/loops, mixed-owner inactivity and committed arrivals at captured endpoints. AI must explicitly order Portal transfers. Artillery is not a prerequisite.

## Open Questions

1. Confirm the Gatehouse recommendation: launched troops finish their route, while blocked unlaunched batches are cancelled and remain at their source?
2. What Portal transit delay should be used, and should loss of endpoint ownership cancel unlaunched Portal batches while allowing entered troops to finish?
