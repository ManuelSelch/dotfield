# Dotfield Slow Zone — Requirements

Current status: implemented as a global On the field match setting, not a faction upgrade. When enabled, seeded map generation attaches one 90-unit zone to a random city; saved preferences and compiled round features preserve the choice and host.

## Goal

Add a Slow Zone similar to Watchtower: a visible circle around its host city in which traveling units move more slowly. Preserve consistent movement, collisions, tower targeting and AI forecasts.

Status: the movement foundation, zone mechanics, forecast integration and player selection/presentation (slices 1–4) are implemented. Existing unit tests and browser selection/coverage/reset checks pass at the merged checkpoint. Slice 5's full visual slowed-travel/capture/device matrix is not claimed complete; human balance and real-iPhone Safari remain follow-ups.

## Scope

### In Scope

- A typed city-attached Slow Zone feature and fixed-radius circle in logical field coordinates.
- Spatial slowdown during flight, with normal movement restored on leaving the affected circle.
- Shared movement calculations for live play, rendering, collisions, Watchtower targeting and AI forecasts.
- Integration with the existing pre-game upgrade selection, immutable round setup and restart/replay lifecycle.
- Accessible descriptions and mobile-layout verification, including combination with existing upgrades.

### Out of Scope

- Currency, unlocks, levels or hot-changing a field setting during a round. Existing active-round saves retain compiled zone definitions/progress.
- Changes to base movement speed, launch cadence, troop growth, damage or AI difficulty.
- Pathfinding, rerouting around zones or special AI scoring for their strategic value.
- Independent per-dot slowing or formation deformation in the proposed first version.
- Voronoi-shaped effects, viewport-dependent physics or a generic physics/plugin framework.

## Requirements

- The host city has a visible 90-field-unit-radius coverage circle, larger than Watchtower's 72-unit circle. Its center and radius correspond to the simulation's circle; scaling the screen does not change which positions are affected.
- Eligible airborne groups move at 50% of their issuing faction's base speed inside the circle and recover normal speed outside it. Circle membership uses the group center; the entire formation slows together, even if individual outer dots lie outside the circle. Queued groups and stationary garrisons are not affected.
- A player- or enemy-owned zone slows only groups hostile to its current host owner. Capturing the host switches allegiance immediately. A neutral-owned zone slows all airborne groups in its circle; it is not inactive.
- Turning Slow Zone On adds one zone to a seeded-random generated city, not automatically to the player's starting city. Resolve placement once during map generation, not during rendering or forecasting. The eligible pool is every city, including player/enemy starts and neutral cities. No extra zone is added on capture; host ownership controls allegiance.
- Entering, leaving or changing the allegiance of a zone must not teleport units, reset flight progress or alter stable survivor slots. Slowdown does not itself destroy units.
- A movement update must detect a path crossing a zone even when both update endpoints are outside it. Split movement at circle boundaries and use the resulting piecewise trajectories in collision sweeps.
- Launch delay, active flight time and traveled progress must be distinguishable. Do not implement spatial slowdown by changing an airborne transfer's duration while retaining elapsed-time-based position.
- Formation spreading and gathering follow traveled progress. Shared dot positions remain authoritative for drawing, opposing-dot collisions and Watchtower range/target selection.
- Ownership changes affect subsequent movement from the current position. Existing travel/collision/arrival-before-tower precedence remains intact; this feature must not silently change Watchtower cadence or combat tie-breaking.
- Overlapping eligible zones apply only the strongest slowdown (smallest speed multiplier), never multiply their effects. Equal 50% zones still yield 50% speed, not 25%. Handling must be deterministic and guarantee positive speed.
- AI forecasts use the same spatial movement and ownership rules as live simulation. Replace constant-duration completion assumptions in forecast stepping and AI horizons so slowed orders are not evaluated before they can finish. Conservative completion bounds must account for the approved slowdown/overlap policy.
- Slow-zone-aware world stepping must remain bounded even without opposing transfers or Watchtowers. Forecast quiet skipping must not bypass spatial or ownership changes; retain it only where equivalence is demonstrated.
- Feature definitions are validated and snapshotted through the existing feature/compiler/session boundaries: finite positive radius, finite speed multiplier strictly between zero and one, unique feature IDs and no mutation of source maps.
- The global field setting is off by default and applies equally regardless of which faction owns the random host. Play captures one generated host; Restart and Play again retain it without duplicate features, while returning Home allows changes. Match preferences persist across reload; active-round saves retain the compiled zone/host.
- Simulation, forecasts and restart consume the already-resolved host city, never draw fresh random choices. The seeded map generator makes host placement reproducible.
- Pause, hidden suspension and terminal states freeze motion; restarting removes old travel progress and rebuilds the selected feature from the seed.
- Coverage styling and a distinct marker must distinguish Slow Zone from Watchtower when both are installed, without obscuring counters or changing region hit targets. Accessible city descriptions state radius, slowdown and active ownership behavior.
- Existing no-zone gameplay must retain constant-speed positions, formation geometry, launch timing, collision results and arrival behavior. Verify baseline regressions rather than assuming a movement refactor is neutral.

## Assumptions

- Placement is uniformly random across every generated city, including faction starts. A different map seed may choose another host; Restart and Play again preserve the exact generated opening.
- The UI supplies the random choice when compiling the setup; tests supply a reproducible choice. Physics, rendering and forecasting never reroll placement.

## Implementation Plan

### 1. Distance-based movement foundation

Status: implemented.
Description: Separate queued scheduling and flight time from traveled progress, preserving current constant-speed behavior before enabling zones. Inspect and migrate assumptions in types, dispatch/launch, route, movement, dots, travel, contacts/collisions, board drawing and AI timing. Verify original launch/impact boundaries, stable slots, formation positions, replacement orders, arrival ordering and all existing movement/Watchtower regressions. No selectable Slow Zone yet.

### 2. Slow-zone definitions and boundary-aware travel

Status: implemented.
Description: After slice 1, add validated immutable feature definitions and a pure circle-membership/trajectory module. Implement radius 90, multiplier 0.5, group-center membership, hostile-only slowing for owned zones, slowing both factions for neutral zones and strongest-only overlap. Advance groups piecewise through entry/exit boundaries. Feed trajectories to collisions and tower geometry, and bound shared world stepping when zones exist. Verify tangent/boundary starts, endpoints-outside crossings, overlaps, neutral slowing of both factions, captures/recaptures, partial launches/arrivals, no teleportation and bulk-versus-fixed-step equivalence using deterministic fixtures; do not expose the upgrade in Home yet.

### 3. Forecast and arrival timing integration

Status: implemented.
Description: After slice 2, migrate forecast event skipping and AI completion horizons to the shared variable-speed model. Use a documented conservative bound that includes queued launch delays and worst permitted slowdown, or a completion-aware forecast limit; do not retain duration-minus-elapsed estimates for slowed flight. Verify identical live/forecast states with zones, ownership changes, collisions, tower losses and delayed arrivals, plus bounded runtime on the densest map. Keep existing AI scoring and difficulty unchanged.

### 4. Selection and circle presentation

Status: implemented; player-only selection and once-per-setup placement are retained.
Status: implemented through seeded generated-map field settings and typed territory features. The generated Home preview shows the host and coverage; round persistence retains the compiled feature. Verified selection, ownership, neutral behavior, and responsive controls.

### 5. End-to-end verification and documentation

Status: partial; unit mechanics/forecast and browser selection/coverage/reset checks exist. Additional visual travel/capture scenarios and target-device validation remain pending.
Description: After slice 4, add browser scenarios showing actual slowed travel inside the rendered circle, recovery outside, capture behavior and pause/hidden/restart/replay isolation. Check representative frame rates and different viewport/DPR sizes produce the same simulation results. Run the full unit/browser suites, production build and whitespace checks; update the effect catalog and architecture documentation with approved values and policies. Human balance and real-device Safari testing remain explicit playtest follow-ups, not claimed automated results.

## Open Questions

None.
