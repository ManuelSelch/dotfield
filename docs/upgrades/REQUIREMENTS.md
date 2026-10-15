# Dotfield Upgrade Effects — Requirements

## Goal

Keep faction upgrades independently configurable per player and AI faction, with attached map effects deterministic and shared with AI forecasting. Slow Zone remains a field-level map setting; Watchtower and Artillery are buildable exclusive city roles. Industry, Factory and Capture shield remain independently selectable faction upgrades.

Industry, Factory, buildable Watchtower/Artillery roles, Slow Zone, Capture Shield and Defensive Network mechanics are implemented; see the [effect catalog](EFFECTS.md). Slow Zone remains a seeded Home field setting; no weapon role is freely generated or toggled on Home. General faction simulation and per-enemy rules, upgrades and AI behavior are implemented. No economy or unlocks exist. Match preferences persist locally; saved active rounds retain compiled effects/roles.

## Scope

### In Scope

- Immutable per-round configuration, independently resolved for the player and each AI faction.
- A small catalog/compiler that resolves each faction's selected upgrades into numeric rules and starting-map features.
- Explicit territory feature definitions and separate mutable-in-time runtime state.
- A common world simulation used by live rounds and AI forecasts.
- A fixed 23-city Crossfire map with one player and two AI enemies, each with independently selectable AI behavior and upgrade effects.
- Existing pause, visibility, restart/replay, real-unit accounting and accessible controls.

### Out of Scope

- Currency, prices, rewards, levels, unlocks or progression saves. Active-round event saves are implemented separately.
- Changing AI difficulty, hidden bonuses, procedural maps, or asynchronous/networked opponents.
- A generic plugin/event-bus framework, ECS, arbitrary scripting or a game editor.
- Additional unapproved effect types or persisted Home upgrade/AI selections. Slow Zones, variable-speed movement and compiled active-round restoration are part of the current implementation.
- Hot-changing upgrades during a round.

## Requirements

### Current implementation checkpoint

- `src/game/rules.ts` resolves, validates and freezes independent faction-ID keyed growth/speed/cadence rules. Ownership, hostile collisions, capture, elimination, and AI decision schedules now support arbitrary faction IDs; player remains the sole human faction.
- `src/game/upgrades/catalog.ts` defines faction-selectable effects; `compile.ts` snapshots the map and resolves each faction's selected IDs. `src/board/generateMap.ts` resolves Slow Zone into territory features; legacy Watchtower/Artillery map toggles are ignored. Home exposes player and per-enemy upgrades plus independent AI behaviors.
- Play compiles a setup once. The board/hook/session forward its rules, and restart/replay keep it. Legacy `{ unitsPerSecond }` overrides remain supported and normalize to both current factions.
- Dispatch routes and AI order horizons read the issuing faction's resolved speed/cadence. Growth reads the current owner. `worldStep.ts` shares physical updates between live rounds and forecasts without changing their existing orchestration/terminal semantics.
- Factory is now a typed territory feature with a stable ID and production multiplier (legacy beneficiary IDs remain readable). Nested definitions are validated/snapshotted for compiler/session/state; no cooldown/runtime object is needed for this passive feature.
- Factory stays attached on capture and boosts its current non-neutral owner. It stacks multiplicatively with Industry. Silhouette and chevron indicators derive from feature/production state, not combat side effects.
- Historical Watchtower feature behavior is superseded: Watchtower is an exclusive city role, costs30, produces no troops and fires every250ms (range150) at hostile ground dots. Artillery is an exclusive city role, costs40, produces no troops and attacks hostile city garrisons every1000/3ms (range150; mountains block). Both reset cooldown on build/capture, use the shared physical scheduler/forecast and render city coverage/icons. See [city conversion](../city-conversion/IMPLEMENTATION.md).
- Defensive Network links currently owned shared-border neighbors from each faction's original home (paired bridge endpoints count as neighbors). Network sizes 4–6/7–12/13+ set capacity to 1/2/3 batch-blocking shields per connected city; one shield recharges every 10 seconds in simulation time. Capture Shield charges share this pool, and network recharge never removes charges already above capacity. Partial per-city recharge timers persist with active-round saves and are shared by live simulation and AI forecasts.

### Historical baseline before Industry

The shared-rate/fixed-duration limitations below describe the original inspection, not the current per-faction/Slow Zone implementation. Geometry values are synchronized with current `settings.ts` (17 / 3.8 / 10).

| Setting | Source | Historical consumer / limitation |
|---|---|---|
| Growth: 1 unit/s | `src/game/settings.ts`: `GROWTH_RULES` | Copied to `state.rules` by `createSimulation`; `advanceGrowth` reads it. One rate shared by both factions. |
| Travel speed: 35 board units/s | `settings.ts`: `TRAVEL_SPEED` | `route.ts` computes a fixed `durationMs` when dispatching. Not read again during flight. |
| Launch interval: 600 ms; group size: 5 | `settings.ts`: `BATCH_INTERVAL_MS`, `BATCH_SIZE` | `dispatch.ts` builds queued batches; `route.ts` uses these in AI order-duration estimates. |
| Starting units: 36 per faction | `src/board/map.ts`, `src/board/maps.ts` | Map data copied at simulation/session creation. No separate starting-unit rule. |
| Territory radius: 14; dot radius: 3; spacing: 8 | `settings.ts` | Shared rendering, route and collision geometry; not merely cosmetic. |
| Fixed simulation step: 50 ms | `settings.ts`: `SIMULATION_STEP_MS` | Clock, round stepping, travel collision sweeps and AI forecasts. |
| AI cadence/scoring | `src/game/ai/config.ts`: `DEFAULT_AI` | Passed through FieldCanvas/startBoard/session; separate from physical rules. |

Before Industry, global prototype tuning could be changed in `settings.ts` and map starting counts in map data. Editing the module changes all new uses, not a supported per-round settings API. Already-created transfers retain their stored duration/launch timing.

The legacy shared-growth override remains supported:

```ts
const session = createSession(TERRITORIES, DEFAULT_AI, { unitsPerSecond: 1.25 });
session.start();
// Or createSimulation(TERRITORIES, { unitsPerSecond: 1.25 }) in a pure test.
```

That legacy override applies the shared growth value to every configured faction. The board now forwards RulesInput; new per-faction overrides use `{ factions: { player: { unitsPerSecond, travelSpeed, batchIntervalMs }, enemy: { ... } } }`. All fields must be supplied for each configured faction. Module constants must not be mutated to implement toggles.

### 2. Separate baseline rules, selected upgrades and resolved round configuration

Original conceptual type sketches (illustrative, not the current complete API; `RoundSetup` also carries AI/river/terrain metadata. Current faction upgrades support stat, starting-feature and capture-shield effects; field features are resolved by map generation):

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
- `getFactionRules(state, factionId)` is the only faction-rule lookup. Neutrals do not generate units and never accidentally receive another faction's rules.
- Growth reads the current city owner's rate. Dispatch reads the issuing faction's speed/cadence. Launch timing and base movement rules of existing orders remain fixed when their source changes owner.
- A faction is identified by stable `FactionId`, not by the role `player`/`enemy`; control type (human/AI), display identity, and faction rules are separate concerns. Neutral is not a faction.
- Hostility is between distinct non-neutral factions. All hostile pairs collide and fight; friendly transfers pass through. Ownership changes preserve the capturing faction ID.
- Every AI faction has its own policy and next-decision schedule. One faction's turn must not block or overwrite another's; deterministic ordering resolves same-time decisions.
- Victory occurs when the human player is the sole surviving faction. Defeat occurs when the player is eliminated while any faction remains; draw only when no faction remains. AI-vs-AI outcomes continue until that condition or an explicitly designed terminal rule.
- For a map with multiple AI starts, each AI receives its own rules and upgrade selection (baseline/empty by default), and each competes independently. No implicit alliance or shared army.
- Route geometry stays separate from speed. `createRoute`/`orderDurationMs` accept resolved movement/dispatch rules rather than importing upgradeable global constants. AI horizon estimates use exactly the rules used by real dispatch.
- Starting-unit bonuses are applied once while compiling the seed, only to explicitly selected starting cities. They are not added on capture, on render or on each frame.
- Restart/replay rebuild from the same captured RoundSetup, resetting runtime state. Home → Play compiles a new setup from the current selection.
- Keep AI policy configuration separate per AI faction. Each faction's upgrade selection is explicit; no opponent inherits another faction's effects or receives hidden bonuses.

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
- Updated Factory policy (special-city slice 4): the structure remains on capture and boosts its current owner, including enemy captors; only neutral hosts are inactive. Current weapon-role policy: Watchtower/Artillery follow current ownership, are neutral-inactive, and reset their full firing cooldown on build/capture. No Home weapon toggle remains.
- Implemented Factory features modify `getTerritoryGrowthRate(state, city)` on top of faction growth, not duplicate the growth loop. Faction effects belong to armies; building effects belong to their host.
- Feature visuals and accessible descriptions consume domain state, never apply damage or advance cooldowns. Add board feature rendering and describe city features in keyboard/screen-reader controls.
- Preserve existing Voronoi caching keyed by positions/IDs/dimensions; features do not require rebuilding cells.
- Initial area effects use circle/radius geometry in board coordinates. Do not use viewport-dependent clipped Voronoi polygons for physics: margins change with screen aspect ratio. If whole-region effects are wanted later, define a fixed logical-board region geometry independently of rendering.

### 5. Shared deterministic world stepping, including new damage

`worldStep.ts` provides physical stepping shared by live rounds and AI forecasts; their orchestration remains separate. Forecast quiet skipping and conservative completion horizons account for timed/spatial effects. The original duplicated-physics risk has been addressed; new features must preserve the common kernel.

- Extract a browser-independent world-advance kernel used by both live play and forecasts. It owns physical rules and terminal checks but never issues AI orders.
- The live orchestrator runs world steps and then scheduled AI decisions; the forecast replays only known orders through the same world steps. Never recursively run AI during forecasting.
- Preserve no-upgrade behavior with regression tests. Changes to existing event timing/combat semantics require explicit review, not incidental changes disguised as refactoring.
- Use bounded simulation steps and split where needed at launches, tower firing deadlines, zone crossings and arrivals. Damage to moving dots must resolve in time order with existing swept contacts, not via independent passes that each consume the same dot.
- Implemented event precedence within each 50ms world step: travel/collisions, arrivals/combat, then tower firing. Thus a dot consumed by a collision or impact cannot also be shot. Tower target ties sort by distance, transfer ID, then stable slot ID.
- Initially disable quiet-time skipping whenever active timed/spatial features could change a forecast. Optimize only after equivalence tests and profiling, using a shared next-event calculation rather than maintaining a second simplified simulator.
- Tower kills change the real `dotSlots`/unit total, retaining survivor slots and formation size. Empty batches disappear. No fake visual projectiles that later apply guessed damage; no refund of destroyed units.
- Evaluate elimination after damage and impacts. Features are not independent armies: an unowned/inactive tower cannot keep a faction alive.
- Pause, hidden suspension and terminal states freeze feature clocks/effects with the rest of the world. Cooldowns use simulation time, never setInterval or wall time.
- The board adapter currently publishes on counts/ownership/transfer changes. Include relevant feature-runtime/events in render invalidation so shots can be drawn even if no garrison count changes. Do not send continuous animation through React.
- AI forecasting must honor tower deaths and slow movement. Special preferences for capturing a strategically useful feature can be added later as an explicit scoring change; correct physics does not automatically make the existing heuristic expert at new mechanics.

### 6. Watchtower field setting (historical; superseded by buildable city role)

- Historical setting (superseded): the former On the field toggle placed a seeded-random Watchtower feature. Current behavior is the exclusive buildable Watchtower city role; no Home toggle or generated free tower remains. See [city conversion](../city-conversion/IMPLEMENTATION.md).
- On a firing opportunity, target the nearest eligible hostile airborne dot within range. Stable transfer/slot IDs break equal-distance ties.
- Remove one real dot per shot; do not damage friendly dots, queued troops or city garrisons. Range uses shared dot-position geometry in board space.
- A shot requires a live eligible target at that event time. Empty firing opportunities do not accumulate a burst of stored shots.
- Feature existence, current-owner allegiance and simulation-time firing cadence are shared by rendering, live simulation and forecasts.
- Draw a compact tower silhouette and subtle owner-tinted 72-unit coverage circle without changing counters, region touch targets or combat geometry.
- Confirmed values/policies: 72 field units; 250ms cadence; dot-center range; tower switches allegiance on capture; impacts/collisions resolve before tower shots in each fixed step.

Slow Zones and the variable-speed movement foundation were implemented after the original two-enemy increment. See the focused [Slow Zone plan](slow-zone/REQUIREMENTS.md) for travel, ownership, overlap and verification boundaries.

## Assumptions

- Each enemy can independently select Industry/Factory/Capture shield and Balanced/Aggressive/Defensive behavior; defaults are empty effects and Balanced behavior. Slow Zone is a shared map setting; Watchtower/Artillery are buildable roles. Home preferences persist locally; compiled active-round rules/AI/roles are restored with the round.
- Each faction starts with baseline rules and no selected upgrades unless configured. Player and AI selections are independent, in-memory only; no mirroring or shared enemy configuration.
- Factory stays with its city and transfers its bonus to the current owner, including enemy captors. Weapon roles and Slow Zone follow the current owner; neutral weapons are inactive and neutral zones slow everyone. Faction modifiers follow the current owner or issuing army as described above.
- Existing engine constants and collision geometry remain unchanged by these upgrades.

## Implementation Plan

### 1. Round rules and shared world stepping

Status: implemented.
Description: Replace upgradeable global reads with resolved per-faction rules; thread one immutable setup through simulation, session and board initialization/restart. Extract shared live/forecast physics without changing baseline gameplay or AI policy. Verify zero-modifier baseline equivalence, independent player/enemy rates, route/dispatch/AI-horizon agreement, restart isolation and all existing tests.

### 2. Upgrade catalog and setup compiler

Status: implemented for catalog stats, Starting Factory and capture-shield effects. Slow Zone remains a generated map feature; Watchtower/Artillery have migrated to buildable city roles.
Description: Add typed catalog effects, deterministic composition, validation and seed transformation for starting units/features. Keep UI/progression concerns outside core rules. Verify selection-order independence, duplicate handling, unchanged source maps, one-time starting bonuses and no neutral bonuses. Depends on slice 1; no progression implementation.

### 3. Pre-game selection for numeric effects

Status: implemented for confirmed effects; Quick march/Rapid deployment remain proposals.
Description: Add a compact upgrade selection surface before Play, with resolved-effect descriptions and independent per-faction selections. Snapshot on Play; keep selection on Home; restart/replay retain the same setup. Verify phone layouts without scrolling, no simulation before Play, modified actual units/speed/growth, fresh starts and keyboard/touch behavior. Depends on slice 2; only confirmed numeric effects appear.

### 4. Territory feature definitions and runtime lifecycle

Status: implemented.
Description: Add validated discriminated feature definitions, separate runtime initialization, capture policy, board/accessibility feature presentation and shared simulation integration points. Verify old maps without features, unique IDs, copied seed/runtime independence, capture/reset and unchanged Voronoi cache/input. Depends on slices 1–2; no tower damage yet.

### 5. Watchtower simulation, forecasts and field setting (historical feature design; role behavior is specified in city conversion)

Status: implemented.
Description: Seeded map generation attaches one tower to a random city when enabled in On the field settings. At each 250ms cadence boundary, remove the nearest hostile airborne dot whose center is within 72 field units. The tower follows current host ownership and switches sides immediately on capture; the timer is continuous. Draw the coverage circle and silhouette and expose accessible status. Verify deterministic tie-breaking, actual slot removal, capture, live/forecast parity and mobile rendering. The shared world step bounds tower updates to 50ms and resolves travel collisions/arrivals before tower fire.

### 6. Variable-speed movement foundation and Slow Zone

Status: implemented; Slow Zone is enabled through global On the field settings.
Description: Separate launch scheduling from flight distance/time. Make shared position/formation/collision/arrival and AI timing helpers support piecewise motion without changing constant-speed outcomes. Verify no teleportation, partial-step launches/impacts, baseline formation geometry, stable survivor slots, fixed/bulk-step equivalence and old regression scenarios. Resolve one Slow Zone host during seeded map generation; preserve the compiled feature through Restart/replay.

### 7. General faction identity and multi-enemy simulation

Status: implemented.
Description: Replace the two-value player/enemy ownership assumption with stable faction IDs plus separate human/AI control metadata. Generalize ownership, dispatch authorization, hostile pair collisions, tower targeting, capture, elimination, terminal outcomes, and accessible faction presentation. All factions are mutually hostile; do not add alliances or teams. Preserve exact two-faction behavior. Verify three-or-more factions with pairwise combat, friendly pass-through, captures among AI factions, player victory/defeat and no-faction draw, deterministic simultaneous events, and existing regression tests.

### 8. Independent AI behavior and upgrade configuration

Status: implemented.
Description: Give each AI faction its own AI behavior settings, simulation-time decision schedule, faction rules and selected upgrade IDs. Extend the immutable round setup and compiler to resolve each faction independently; thread the setup through Home → Play → board/session and preserve it on restart/replay. Add Home controls to configure both enemies' AI behavior and upgrade effects separately. Home preferences persist locally; active-round saves retain their compiled configuration. Verify choices affect only their selected enemy, both AIs act independently, baseline defaults are valid, and restart/replay preserve the in-memory choices.

### 9. Two-enemy map and complete round flow

Status: implemented; human balance/real-device playtesting remains.
Description: Add the 23-city Crossfire map containing the player, two distinct mutually hostile AI factions and neutrals. Make it playable through the existing visual map picker. Verify the full Home → Play → multi-enemy combat → player victory/defeat → replay/Home flow, including both enemies' independent settings and upgrades. Slow Zones and variable-speed movement were separate later increments and are now implemented.

## Open Questions

None.
