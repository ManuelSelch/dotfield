# Dotfield Upgrade Effects — Requirements

## Goal

Make pre-game upgrade effects easy to add without scattering upgrade IDs through simulation code. Support both simple numeric modifiers and territory-attached mechanics such as towers and, later, slow zones. Keep the simulation deterministic, browser-independent and shared with AI forecasting. Later progression should decide which effects are active without rewriting their implementation.

Implementation begins with Industry (+25% player-owned city production); see [effect catalog](EFFECTS.md). Other effects and later slices remain architecture proposals. It supersedes the earlier immediate progression milestone: no economy, purchase UI or unlocks now.

## Scope

### In Scope

- Immutable per-round configuration, configurable independently for player and enemy.
- A small catalog/compiler that resolves selected upgrades into numeric rules and starting-map features.
- Explicit territory feature definitions and separate mutable-in-time runtime state.
- A common world simulation used by live rounds and AI forecasts.
- Phased implementation of pre-game selection, a tower and eventually a slow zone.
- Existing pause, visibility, restart/replay, real-unit accounting and accessible controls.

### Out of Scope

- Currency, prices, rewards, levels, unlocks, progression saves or mid-round saves.
- Changing AI difficulty, hidden bonuses, new factions or procedural maps.
- A generic plugin/event-bus framework, ECS, arbitrary scripting or a game editor.
- Implementing every suggested effect immediately. Factory, shields and new combat ratios are future candidates, not commitments.
- Hot-changing upgrades during a round.

## Requirements

### 0. Industry implementation checkpoint

- `src/game/rules.ts` resolves, validates and freezes independent faction-ID keyed growth/speed/cadence rules. Current owner and transfer types still support player/enemy only; extra configuration IDs do not enable multiple-enemy gameplay.
- `src/game/upgrades/catalog.ts` defines Industry as a production stat multiplier; `compile.ts` snapshots the map and resolves typed selected IDs. Player-only selection is exposed on Home, off by default and memory-only.
- Play compiles a setup once. The board/hook/session forward its rules, and restart/replay keep it. Legacy `{ unitsPerSecond }` overrides remain supported and normalize to both current factions.
- Dispatch routes and AI order horizons read the issuing faction's resolved speed/cadence. Growth reads the current owner. `worldStep.ts` shares physical updates between live rounds and forecasts without changing their existing orchestration/terminal semantics.
- No tower/slow-zone system or progression is implemented. Feature-event scheduling and forecast optimizations remain later work.

### 1. Baseline before Industry: inspected implementation

| Setting | Current source | Current consumer / limitation |
|---|---|---|
| Growth: 1 unit/s | `src/game/settings.ts`: `GROWTH_RULES` | Copied to `state.rules` by `createSimulation`; `advanceGrowth` reads it. One rate shared by both factions. |
| Travel speed: 35 board units/s | `settings.ts`: `TRAVEL_SPEED` | `route.ts` computes a fixed `durationMs` when dispatching. Not read again during flight. |
| Launch interval: 600 ms; group size: 5 | `settings.ts`: `BATCH_INTERVAL_MS`, `BATCH_SIZE` | `dispatch.ts` builds queued batches; `route.ts` uses these in AI order-duration estimates. |
| Starting units: 36 per faction | `src/board/map.ts`, `src/board/maps.ts` | Map data copied at simulation/session creation. No separate starting-unit rule. |
| Territory radius: 21; dot radius: 4.8; spacing: 12 | `settings.ts` | Shared rendering, route and collision geometry; not merely cosmetic. |
| Fixed simulation step: 50 ms | `settings.ts`: `SIMULATION_STEP_MS` | Clock, round stepping, travel collision sweeps and AI forecasts. |
| AI cadence/scoring | `src/game/ai/config.ts`: `DEFAULT_AI` | Passed through FieldCanvas/startBoard/session; separate from physical rules. |

Before Industry, global prototype tuning could be changed in `settings.ts` and map starting counts in map data. Editing the module changes all new uses, not a supported per-round settings API. Already-created transfers retain their stored duration/launch timing.

The legacy shared-growth override remains supported:

```ts
const session = createSession(TERRITORIES, DEFAULT_AI, { unitsPerSecond: 1.25 });
session.start();
// Or createSimulation(TERRITORIES, { unitsPerSecond: 1.25 }) in a pure test.
```

That legacy override affects both factions. The board now forwards RulesInput; new per-faction overrides use `{ factions: { player: { unitsPerSecond, travelSpeed, batchIntervalMs }, enemy: { ... } } }`. All fields must be supplied for each configured faction. Module constants must not be mutated to implement toggles.

### 2. Separate baseline rules, selected upgrades and resolved round configuration

Proposed conceptual types (names/API can be refined during implementation):

```ts
type FactionRules = Readonly<{
  unitsPerSecond: number;
  travelSpeed: number;
  batchIntervalMs: number;
}>;

type FactionId = string;

type SimulationRules = Readonly<{
  factions: Readonly<Record<FactionId, FactionRules>>;
}>;

type UpgradeSelection = Readonly<Record<FactionId, readonly UpgradeId[]>>;

type RoundSetup = Readonly<{
  territories: readonly TerritoryDefinition[];
  rules: SimulationRules;
}>;
```

- `settings.ts` retains baseline values. Simulation step, batch size and shared geometry remain engine constants initially; do not make every constant an upgrade setting.
- `compileRoundSetup(map, selection)` is a pure function producing a copied starting map, features and resolved rules. It never mutates MAPS or global defaults.
- At Play, snapshot the setup once. Pass it through FieldCanvas → hook → startBoard → createSession → createSimulation. Initialize the hook snapshot with the same setup; do not briefly show default counts/rules.
- Store resolved rules with the simulation snapshot so dispatch, growth, travel and forecasts cannot accidentally read a different configuration.
- `getFactionRules(state, faction)` is the only faction-rule lookup. Neutrals do not generate units and never accidentally receive player rules.
- Growth reads the current city owner's rate. Dispatch reads the issuing faction's speed/cadence. Launch timing and base movement rules of existing orders remain fixed when their source changes owner.
- Route geometry stays separate from speed. `createRoute`/`orderDurationMs` accept resolved movement/dispatch rules rather than importing upgradeable global constants. AI horizon estimates use exactly the rules used by real dispatch.
- Starting-unit bonuses are applied once while compiling the seed, only to explicitly selected starting cities. They are not added on capture, on render or on each frame.
- Restart/replay rebuild from the same captured RoundSetup, resetting runtime state. Home → Play compiles a new setup from the current selection.
- Keep AI policy configuration separate. Upgrade parity is an explicit selection policy, not a hidden AI difficulty change.

### 3. A small typed upgrade catalog, not arbitrary callbacks

Suggested modules: `src/game/rules.ts`, `src/game/upgrades/types.ts`, `catalog.ts`, `compile.ts`.

A catalog entry has a stable ID, UI label/description and typed effects. Examples: `multiplyStat('travelSpeed', 1.2)`, `addStartingUnits(12)`, or `attachFeatureToStartingCity({ kind: 'tower', ... })`. These are conceptual examples, not approved balance values.

- UI and future progression both produce UpgradeSelection. The compiler is the shared boundary; simulation does not know whether an effect was selected, unlocked or awarded.
- Numeric upgrades require a catalog entry using existing modifier types, not special cases such as `if (upgrade === 'quick-march')` in travel.
- Deduplicate selected IDs. Reject invalid IDs/parameters at the domain boundary; do not silently apply duplicate bonuses.
- Define composition explicitly: sum starting-unit bonuses; multiply stat multipliers; add feature instances with stable unique IDs. Apply a canonical order and validate the resolved result.
- All rates/ranges must be finite. Growth may be zero; movement speed and shot/launch intervals must be strictly positive. Size/capacity counts must be valid integers. Bounds on extreme modifiers are a tuning decision, not an undocumented clamp.
- Show resolved numeric effects in the selection UI. Any future saved selection stores IDs/versioned data, not functions or a copy of the entire runtime simulation.
- Adding a new stat requires extending the rule schema and its relevant consumer. Adding genuinely new behavior requires a feature module; the catalog cannot manufacture behavior by itself.

### 4. Territory features are domain data; Voronoi regions remain a view

A tower belongs to a city, not to a Canvas polygon or React component. Extend the starting territory definition with an optional feature list; old maps with no features remain valid.

```ts
type TerritoryFeature =
  | { readonly id: string; readonly kind: 'tower';
      readonly range: number; readonly shotIntervalMs: number }
  | { readonly id: string; readonly kind: 'slow-zone';
      readonly radius: number; readonly speedMultiplier: number };
```

- Keep immutable feature definitions attached to the territory. Use a separate typed `state.featureRuntime` for tower shot deadlines and future charges/statuses. Slow zones may need no runtime state.
- Avoid fields such as `isTower`, `towerRange`, `slowRadius`, `shieldHealth` scattered on every territory. A discriminated union keeps per-feature requirements explicit and supports exhaustiveness checks.
- Generate feature IDs deterministically from the host city and effect instance; validate uniqueness across the round. Restart recreates deadlines/charges, not references to the old runtime object.
- A central initializer validates definitions and creates runtime state. Modules such as `features/tower.ts` and `features/slowZone.ts` own their mechanics. Start with explicit typed dispatch/handlers, not a general-purpose dynamic plugin loader.
- Recommended initial ownership policy: structures remain on capture and use the host's current owner; neutral hosts are inactive. Capture resets tower readiness to a full cooldown to avoid an instant capture shot. These rules still need approval.
- A future factory would modify `getTerritoryGrowthRate(state, city)` on top of faction growth, not duplicate the growth loop. Faction effects belong to armies; building effects belong to their host.
- Feature visuals and accessible descriptions consume domain state, never apply damage or advance cooldowns. Add board feature rendering and describe city features in keyboard/screen-reader controls.
- Preserve existing Voronoi caching keyed by positions/IDs/dimensions; features do not require rebuilding cells.
- Initial area effects use circle/radius geometry in board coordinates. Do not use viewport-dependent clipped Voronoi polygons for physics: margins change with screen aspect ratio. If whole-region effects are wanted later, define a fixed logical-board region geometry independently of rendering.

### 5. Shared deterministic world stepping, including new damage

Currently `round.ts` and `ai/forecast.ts` each orchestrate growth → travel → combat. Forecasts also skip quiet intervals using launch/arrival times. Adding a tower to only the live loop would make the opponent reason about the wrong game.

- Extract a browser-independent world-advance kernel used by both live play and forecasts. It owns physical rules and terminal checks but never issues AI orders.
- The live orchestrator runs world steps and then scheduled AI decisions; the forecast replays only known orders through the same world steps. Never recursively run AI during forecasting.
- Preserve no-upgrade behavior with regression tests. Changes to existing event timing/combat semantics require explicit review, not incidental changes disguised as refactoring.
- Use bounded simulation steps and split where needed at launches, tower firing deadlines, zone crossings and arrivals. Damage to moving dots must resolve in time order with existing swept contacts, not via independent passes that each consume the same dot.
- Define explicit stable tie ordering for simultaneous events, including collision vs shot vs impact, and tower IDs/transfer IDs/slot IDs. At an impact-time tie, a shot must not damage a unit already consumed by arrival. The exact gameplay precedence is an open question.
- Initially disable quiet-time skipping whenever active timed/spatial features could change a forecast. Optimize only after equivalence tests and profiling, using a shared next-event calculation rather than maintaining a second simplified simulator.
- Tower kills change the real `dotSlots`/unit total, retaining survivor slots and formation size. Empty batches disappear. No fake visual projectiles that later apply guessed damage; no refund of destroyed units.
- Evaluate elimination after damage and impacts. Features are not independent armies: an unowned/inactive tower cannot keep a faction alive.
- Pause, hidden suspension and terminal states freeze feature clocks/effects with the rest of the world. Cooldowns use simulation time, never setInterval or wall time.
- The board adapter currently publishes on counts/ownership/transfer changes. Include relevant feature-runtime/events in render invalidation so shots can be drawn even if no garrison count changes. Do not send continuous animation through React.
- AI forecasting must honor tower deaths and slow movement. Special preferences for capturing a strategically useful feature can be added later as an explicit scoring change; correct physics does not automatically make the existing heuristic expert at new mechanics.

### 6. Tower proposal

- One tower on each affected faction's designated starting city, selected by a placement policy during seed compilation rather than hard-coded `south`/`north` logic in combat.
- On a firing opportunity, target the nearest eligible enemy airborne dot within range. Stable transfer/slot IDs break equal-distance ties.
- Remove one real dot per shot; do not damage friendly dots, queued troops or city garrisons. Range uses shared dot-position geometry in board space.
- A shot requires a live eligible target at that event time. Empty firing opportunities do not accumulate a burst of stored shots.
- Feature existence, allegiance and shot deadline must be available to rendering and forecasting.
- Draw a compact tower marker and optional shot/range feedback without obscuring counters or reducing region touch targets.
- Range, interval, dot-center versus dot-edge eligibility, capture policy and tie precedence are provisional until approved.

### 7. Slow zones need a movement model extension, not only a setting

Current Transfer uses signed `elapsedMs` for queued launch delay and `elapsedMs / durationMs` for both position and formation progress. A per-round speed upgrade can keep this fixed-duration model. A zone that changes speed during flight cannot safely mutate durationMs: that would jump the unit's position and invalidate collision/arrival calculations.

- Separate queued launch time, elapsed flight time and traveled distance/progress when introducing spatial effects. Queued batches are not slowed before launch.
- Compute base speed from the issuing faction's resolved rules, then local zone multipliers from current ownership/position.
- Recommended first model: apply slowdown to the group center, moving the whole formation together. Per-dot independent speed would require a different formation/transfer model and is outside the first implementation.
- Preserve physical position when a group enters/exits a zone or the zone host changes allegiance. Spreading/convergence follows distance progress, not wall-clock flight age.
- Split motion at circle entry/exit and use piecewise swept trajectories for dot collisions. A group must not tunnel through a small zone because both sampled endpoints lie outside it.
- Rendering, tower target positions, collision sweeps and forecasts use the same motion/path helpers. Old assumptions `durationMs - elapsedMs` in contacts, travel, AI horizons and forecast skipping all need migration, not just movement.ts.
- Arrival estimates use the same path-speed model. With known future captures, forecasts simulate allegiance changes; an initial horizon estimate is only a bound and must not end before relevant orders finish. Use a documented bound or completion-based forecast limit.
- Keep positive nonzero minimum speed if bounded completion horizons are needed. Overlapping-zone stacking and which factions are affected are open questions.

## Assumptions

- Proposed first selectable effects: starting-unit bonus, growth multiplier, movement-speed multiplier and tower. The user has requested examples/architecture, not confirmed this exact set.
- Confirmed: selected upgrades apply only to the human player for now. Opponent configuration remains baseline; there is no mirrored-effects toggle. Faction-ID keyed rules permit independent future opponent configurations, but do not themselves implement multiple-enemy gameplay.
- Feature structures stay with the captured city; faction modifiers follow the current owner or issuing army as described above. Capture behavior remains subject to approval.
- Initial spatial effects are radial and group-level; exact-region and per-dot independent slowing are deferred.
- Existing engine constants and collision geometry remain unchanged by these upgrades.

## Implementation Plan

### 1. Round rules and shared world stepping

Replace upgradeable global reads with resolved per-faction rules; thread one immutable setup through simulation, session and board initialization/restart. Extract shared live/forecast physics without changing baseline gameplay or AI policy. Verify zero-modifier baseline equivalence, independent player/enemy rates, route/dispatch/AI-horizon agreement, restart isolation and all existing tests.

### 2. Upgrade catalog and setup compiler

Add typed catalog effects, deterministic composition, validation and seed transformation for starting units/features. Keep UI/progression concerns outside core rules. Verify selection-order independence, duplicate handling, unchanged source maps, one-time starting bonuses and no neutral bonuses. Depends on slice 1; no progression implementation.

### 3. Pre-game selection for numeric effects

Add a compact upgrade selection surface before Play, with resolved-effect descriptions, affecting only the player. Snapshot on Play; keep selection on Home; restart/replay retain the same setup. Verify phone layouts without scrolling, no simulation before Play, modified actual units/speed/growth, fresh starts and keyboard/touch behavior. Depends on slice 2; only confirmed numeric effects appear.

### 4. Territory feature definitions and runtime lifecycle

Add validated discriminated feature definitions, separate runtime initialization, capture policy, board/accessibility feature presentation and shared simulation integration points. Verify old maps without features, unique IDs, copied seed/runtime independence, capture/reset and unchanged Voronoi cache/input. Depends on slices 1–2; no tower damage yet.

### 5. Tower simulation, forecasts and selection

Implement approved tower rules using chronological shot/contact/impact handling, real stable-dot removal and simulation-time cooldowns. Enable tower selection and marker/shot feedback only when the full mechanic works. Verify no-target behavior, no double kills, range/tie boundaries, capture, pause/visibility/restart, last-airborne-unit elimination, live/forecast equivalence and viewport/DPR independence. Depends on slice 4; profile forecast cost before optimizing.

### 6. Variable-speed movement foundation

Separate launch scheduling from flight distance/time. Make shared position/formation/collision/arrival and AI timing helpers support piecewise motion without changing constant-speed outcomes. Verify no teleportation, partial-step launches/impacts, baseline formation geometry, stable survivor slots, fixed/bulk-step equivalence and old regression scenarios. Depends on slice 5 so tower geometry also migrates; no slow-zone UI yet.

### 7. Slow-zone feature

Add approved group-center radial slowing, ownership effects, overlap policy and path boundary splitting. Feed it through shared movement, tower targeting, live simulation, AI forecasts, rendering and optional pre-game selection. Verify entry/exit, crossing with endpoints outside, ownership changes mid-flight, overlap limits, arrival horizons, pause/restart and viewport-independent outcomes. Depends on slice 6; may be deferred after the first four effects are playable.

## Open Questions

1. Which effects should ship first, and what values should starting-unit, growth and movement-speed modifiers use?
2. Player-only upgrades are confirmed for now; what opponent-specific presets, if any, should be added in a later multi-enemy feature?
3. Should structures remain on capture and switch allegiance, and should tower capture reset its firing cooldown?
4. What tower range and shot interval should we use, and does range include a dot when its center or its edge enters the circle?
5. What precedence should simultaneous tower shots, troop collisions, launches and impacts have?
6. Should slow zones affect only hostile groups, and is group-center slowing acceptable instead of independent per-dot slowing?
7. Should overlapping slow zones use only the strongest effect or multiply effects with a minimum-speed bound?
8. Should upgrade selections survive browser reloads, or remain in memory like the current map selection?
