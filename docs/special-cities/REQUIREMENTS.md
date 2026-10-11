# Terrain and Special Cities — Requirements

## Goal

Add tactical choices to Dotfield through meaningful routes and contested locations, while retaining short rounds and simple city-to-city dragging. Players should choose between securing a crossing, pursuing production, applying siege pressure, and opening a route behind the enemy.

Status: slices 1, 2, 4 and 5 are implemented, and generated matches can combine an optional central mountain ridge with optional river bridges. The user skipped Gatehouse (slice 3) for now and explicitly waived a Factory mockup. Slice 4 adds current-owner Factory benefits and a separate two-open-bridge contested Factory map; existing authored layouts remain unchanged. Slice 5 implements approved Artillery revision 1, ownership-aware cadence, mountain shot/order blocking and a separate Siege map. Portal (slice 6) is next.

## Scope

### In Scope

- Mountains that block direct movement and create passes.
- Rivers that can only be crossed at explicitly defined bridges.
- Straight same-bank orders and explicit cross-bank orders only between paired bridge cities. Players stage troops manually; no automatic river detours or onward forwarding.
- Gatehouse cities controlling a bridge or mountain pass.
- Artillery cities attacking stationary hostile city garrisons, distinct from Watchtowers attacking airborne troops.
- Linked Portal cities offering explicit army transport when one faction controls both endpoints.
- Map-authored Factories and starting-city Factory upgrades using the same current-owner production benefit and the same Factory name/icon.
- An initial river scenario with two crossings and a contested factory; separate later scenarios for mountains, Artillery and Portals.
- Shared rules for player orders, all AI factions, forecasts, rendering and saved rounds.

### Out of Scope

- Gatehouse, Factory, Artillery and Portal implementation in the bridge-only increment.
- Defensive-stance controls, fortresses, radar, relays or transport hubs.
- Currency, unlocks, upgrade levels, alliances or multiplayer.
- Destructible terrain, bridge construction, arbitrary procedural terrain shapes or manual path drawing.
- Altering existing map layouts; the starting-city Factory upgrade's ownership behaviour is explicitly included in the planned change.
- Placing every special-city type on every map.

## Requirements

### 1. Terrain and routes

- R1. Mountains and rivers are gameplay barriers, not merely decoration. A route may not cross a mountain outside a pass or a river outside a bridge.
- R2. Terrain and crossings are authored in logical field coordinates. Phone dimensions, Voronoi regions and pixel density must not change route legality or travel outcomes.
- R3. River maps use straight same-bank travel and cross-bank travel only between the two endpoint cities of a bridge. Preview that straight route; mark other cross-bank orders invalid. Troops arriving at an endpoint stay there until a new explicit order. Preserve staggered five-unit batches, cadence and border geometry.
- R4. An unreachable target is clearly indicated. Releasing an invalid order must not remove the source's existing launch queue or deduct troops.
- R5. The bridge increment adds a separate two-crossing river map matching the approved mockup; existing authored maps remain unchanged. Its two open paired crossings provide alternative staging approaches. Generated fields can enable a fixed central mountain ridge independently of optional river crossings. The later Gatehouse scenario remains a separate increment.
- R6. Path bends, crossings and any portal transit must use one authoritative movement model for rendering, per-dot collisions, Slow Zones, Watchtower targeting and AI forecasts. Collisions must not sweep through an obstacle or across a teleport gap.
- R7. Existing cities along a route must not be silently captured or receive troops unless they are an explicit destination. Hostile Gatehouses are an explicit access restriction, described below.
- R8. Existing maps without terrain retain their current direct routes, border launch/impact geometry and dispatch rules.

### 2. Gatehouse

- R9. A Gatehouse is a capturable city linked to a particular bridge or mountain pass. Its marker and controlled crossing must be visibly connected.
- R10. Proposed access rule: a faction may route through the controlled crossing only while it owns the Gatehouse. Neutral and hostile Gatehouses block passage for that faction, but remain attackable from an accessible approach.
- R11. Capturing the Gatehouse opens the crossing to the captor and closes it to other factions for new orders. Ownership and access are determined independently for every faction, not by player/enemy labels.
- R12. The map must allow both sides to attack the Gatehouse without first crossing its locked route. No circular requirement such as “cross the bridge to capture the city that unlocks the bridge” is allowed.
- R13. Gatehouses use ordinary city combat unless a separate defensive bonus is approved. Their tactical value comes from access control, not an assumed armour bonus.
- R14. Already-launched troops finish their committed route after Gatehouse capture, without automatic kills. Cancel unlaunched batches whose route becomes unavailable, retaining their troops at the source; new orders use current crossing access. No disappearance, duplication or instantaneous relocation is allowed.

Tactical purpose: hold a shorter attack route, deny an enemy flank, or bypass a strong Gatehouse using the second crossing.

### 3. Artillery city

- R15. An Artillery city automatically attacks eligible hostile city garrisons within a 90-field-unit range, firing once every 1,000/3 ms (~333 ms). It does not replace the Watchtower's airborne-dot targeting.
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
- R25. Each launched Portal batch spends 2,000 ms in transit. Losing ownership of either endpoint disables new transport orders and cancels unlaunched batches, leaving their troops at the source if it is still owned. Troops that have already entered transit finish; arrival resolves against B's current owner. Capturing the source retains normal garrison/capture rules, without refunds to the former owner. No committed transit is automatically destroyed by ownership changes.
- R26. Portal use must not duplicate troops, create routing loops, reset stable dot identities, or permit arbitrary teleport destinations.

Tactical purpose: invest in two separated positions to gain mobility, reinforce distant fronts, and threaten an enemy rear. The opponent can break that advantage by capturing either endpoint.

### 5. Contested Factory and first river scenario

- R27. Maps may author a Factory on a neutral city. Every Factory boosts production for whichever non-neutral faction currently owns it; while neutral it produces no troops.
- R28. Use one feature name and icon: Factory. The Factory upgrade makes the selecting faction's spawn city a Factory, while a map may also contain its own Factories. Change the existing upgrade's original-beneficiary behaviour so capture transfers its production benefit to the new owner, including enemies; recapture transfers it back.
- R29. Retain the existing Factory's 2× local production multiplier, stacking with the current owner's Industry rate, subject to the global automatic-production cap of 50. Changing ownership retains the normal fractional-growth reset rule.
- R30. Factory scenario: a river separates the starting areas, with exactly two open crossings. A neutral Factory at one bridge endpoint is reachable by equally long legal opening attacks from both starting cities. The other crossing offers an alternative flank; no Gatehouse or access lock.
- R31. Place the neutral Factory near the contested approaches, with comparable initial access costs for both factions. It must not be reachable only by the already-winning side or make one opening obviously mandatory.
- R32. The map must support at least these choices: rush the Factory for production; expand into ordinary neutral cities; take the second open crossing to flank an opponent committed elsewhere.
- R33. Artillery and Portal pairs are introduced on later maps rather than crowding this first scenario. A mountain-pass map can reuse the route and Gatehouse rules.

### 6. Integration and verification

- R34. AI must issue only legal orders and account for actual travel time. On river maps it stages reinforcements at bridge cities and crosses explicitly; it cannot bypass the pairing rule. Later slices add Gatehouse, Factory, Artillery and Portal awareness. It receives no hidden bonuses or knowledge of future player orders.
- R35. Pause, backgrounding and mid-round save/restore preserve terrain, route/progress state, ownership, pair identities and feature timers. Restart and Play again restore the original compiled map/setup and reset the round, not current ownership or progress. Closed time grants no growth or shots.
- R36. River map previews and the board show muted straight river gaps and compact river-only bridge decks, with no separate bridge-city icons. Regions and whole-region input are clipped independently to each bank; the river itself is not a city target. Selection highlights the paired endpoint; invalid cross-bank drags show a red dashed guide and accessible feedback. Preserve readable counters. Later slices communicate access and special-city functions.
- R37. Add pure-simulation tests for route legality, ownership changes, bent-path collisions, feature interactions, deterministic forecasts and persistence. Browser tests must cover actual drag routing and readability at small phone sizes.
- R38. Human playtesting must check alternative openings, stalemate risk, AI competence and round duration. Symmetry and automated tests alone do not prove enjoyable balance.

## Assumptions

- River routing is confirmed manual bridge-city staging, not shortest-path automatic detours. Mountain routing remains deferred; existing slice-1 route-query APIs are retained without integrating bent-path physics in this increment.
- Gatehouses restrict access but do not gain extra defence in the initial design.
- Artillery range is measured between city centres. Idle shots are not banked; nearest-target ties use stable city IDs. These defaults were included in approved Artillery revision 1 and are implemented in slice 5. Captures reset cadence; simultaneous guns use stable city/feature IDs.
- Portal links require no resource or unlock beyond owning both endpoints. Existing group size and launch cadence are retained for explicit transport; the confirmed 2-second transit applies independently to each launched batch.
- A city receives at most one Factory multiplier even if its authored Factory and a selected spawn Factory upgrade coincide; no duplicate bonus or badge.
- The first implementation should use fixed authored terrain and limited scenarios, not a general map editor.
- Current gameplay has direct straight routes, river-bank restrictions, paired bridge crossings, Factory/Watchtower/Slow Zone/Artillery features, and generated/authored mountains blocking direct orders and Artillery fire. Mountain flanks require manual city staging; bent-path movement and automatic mountain detours remain deferred; Gatehouse and Portal are not implemented.

## Implementation Plan

### 1. Terrain and legal routes

Status: implemented pure route-query foundation; mountain/bent-path gameplay is not integrated.
Description: Define authored barriers/crossings and deterministic legal-route queries, including unreachable targets and compatibility with terrain-free maps. Verify bridge-only river traversal, mountain detours, path lengths, stable ties and invalid-order queue preservation with unit tests. No Gatehouse ownership restrictions yet.

### 2. Bridge-city movement and presentation

Status: implemented and merged; input now also supports mouse-only click orders using river-aware hit testing. Touch/pen remain drag-only.
Description: Following slice 1 and approved mockup revision 3, add a selectable two-open-bridge river map, validated immutable bank/pair metadata, straight same-bank orders and explicit paired-city crossings. Keep shared existing straight movement, dots, collisions, Slow Zones and Watchtowers; validate formation clearance instead of adding path bends. Integrate AI staging, persistence/restart, independently bank-clipped regions, compact bridges, preview legality and accessible input feedback. Verify queue preservation, real staggered movement, collisions/forecast parity, save/restore and phone-sized drag/keyboard tests. No Gatehouse or Factory changes; mountain detours remain deferred.

### 3. Gatehouse control — skipped for now

Status: explicitly deferred by the user; not a prerequisite for completed Factory work.
Description: Following slice 2, attach cities to crossings and make routing faction-aware, applying the confirmed finish-launched/cancel-blocked-queue policy. Keep Gatehouses attackable from both approaches; expose access in previews and accessibility. Verify neutral locks, capture/recapture, multiple factions, queue handling and AI legal orders.

### 4. River map and contested Factory

Status: implemented in the authored scenario fixture; current-owner production and opening geometry have automated coverage. Home uses generated maps. Human balance/viable-opening playtests remain manual.
Description: Following slice 2 (slice 3 skipped), change all Factories, including existing starting-city upgrades, to benefit their current owner. Use one Factory name/icon, prevent duplicate attachment bonuses and account for old saved Factory definitions. Add a separate river scenario with two open crossings and one neutral Factory, preserving existing maps. Verify capture bonuses, Industry/cap interactions, AI production value, replay/save behaviour and comparable initial attack costs. Human playtesting remains required for balance and viable openings.

### 5. Artillery city — implemented

Status: implemented in commit ae193cd; approved mockup revision 1, authored Siege scenario and generated-map integration boundary documented in SLICE-5.md. Artillery applies deterministically to any authored/generated terrain-aware game that includes an Artillery feature. Current Home map generation does not yet generate/select the Siege scenario.

### 6. Portal pair

Status: pending; next unskipped slice, independent of Artillery.
Description: Following slice 4, add paired endpoints and explicit A → B transport with a 2-second transit per launched batch to live simulation, forecasts, previews and saves. Cancel unlaunched batches when either endpoint is lost, while allowing entered troops to finish. Add a dedicated flanking scenario; verify no automatic forwarding or route shortcutting, no skipped-space collisions, no duplication/loops, mixed-owner inactivity and committed arrivals at captured endpoints. AI must explicitly order Portal transfers. Artillery is not a prerequisite.

## Open Questions

None.
