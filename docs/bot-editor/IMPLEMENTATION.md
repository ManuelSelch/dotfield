# Visual enemy editor — implementation state

## Slice 2: project format and blocks

Implemented as a **headless authoring foundation**, after [revision 2 approval and preview cleanup](../../mockups/bot-editor-blockly/DESIGN.md). The reviewed mockup is preserved and its server remains stopped. No Home controls, storage, compiler, game activation or runtime changes are included.

### Module boundary

- [src/botEditor](../../src/botEditor/) has no React or game imports. Gameplay does not import it, so Blockly is not initialized or bundled on the current gameplay path.
- `createDefaultProject()` returns fresh deterministic Main/Capture source.
- `parseProject(text)` checks UTF-8 bytes and structural format before Blockly sees input. `loadProject(value)` validates/clones a source object and owns the resulting headless workspaces/models.
- A loaded session exposes `workspaces` by stable tab identity and `models` by stable tactic identity, `setActiveTab(id)`, `save()` and idempotent `dispose()`. Dispose releases workspace registry entries and model/workspace associations.
- **`save()` means a source snapshot, not localStorage Save or execution admission.** It can preserve visibly incomplete/incompatible drafts. The later editor must run semantic validation/compilation before replacing a last-valid saved project.

### Format v1

The envelope is native Blockly editable source with:
- `format: "dotfield-bot"`, `version: 1`, and exact `blocklyVersion` / `proceduresVersion` strings (`13.4.0`). Both npm dependencies are pinned to those tested versions.
- `procedures`: Blockly-compatible backing-model states (`id`, `name`, null `returnTypes`, ordered typed parameters). Models are saved **once**, not duplicated in each workspace.
- `tabs`: `main` plus one tab per tactic ID, each containing typed local slot declarations and Blockly block state (`blocks.languageVersion: 0`). Block IDs, field values, connections, literal shadows, order, positions, collapsed/inline flags and extra state are retained.
- `editor.activeTab`: stable tab identity, not its display name.

Unsupported project/dependency/workspace versions fail explicitly. There is no migration, overwrite, fallback to default or clamping during decode. Names and IDs are separate; renaming a tactic, parameter or slot never changes its references. Input/output slots refer to declarations by ID, not by display text. Tactic IDs cannot be `main`.

Golden serialized fixtures: [default project](../../src/botEditor/fixtures/default-project.json) and [nested forwarding project](../../src/botEditor/fixtures/forwarding-project.json). These are Blockly states, **not a third execution AST**. There is no generated MDSL or runtime JSON in this format.

### Blockly backing models

Custom `TacticModel` / `TacticParameter` implement Blockly's `IProcedureModel` / `IParameterModel`, use its procedure-map and `serialization.procedures.loadProcedure` API, and notify blocks through the official plugin's `triggerProceduresUpdate` helper. Each session shares the same model instances across all its tab workspaces. Separate loaded sessions own separate models.

The plugin's legacy procedure blocks/model semantics are deliberately not installed: their global-variable parameters and general-purpose return behavior do not fit this bounded scalar-input language. This follows Blockly's [custom procedure-model guidance](https://docs.blockly.com/guides/create-custom-blocks/procedures/creating-custom-procedure-data-models/). No arbitrary method/generator or executable JavaScript is exposed.

- Parameter types: `query` (neutral/enemy), `ranking` (nearest-reachable), `army` (integer 1–999), `attempts` (integer 1–8), `horizon` (integer 1–60000 ms, the existing prototype's domain).
- Scalar fields use typed literal/shadow blocks or a typed parameter-reference block, never arbitrary expression blocks. This supports literal call arguments and nested forwarding without parsing field text.
- Call extra state stores the tactic ID and ordered argument shape (`parameterId`, scalar type). Connections use `ARG_<parameterId>`. Parameter blocks store the declaring scope's parameter ID and authored type.
- Renames update labels across tabs. Reordering parameters reorders call inputs without rebinding arguments by position.
- Adding a parameter exposes an **empty required input**, never a guessed default. Removed/retyped parameters retain obsolete inputs/values and visibly warn, rather than disconnecting/discarding source. Reload preserves those drafts. Missing/retyped forwarded parameters also warn. Semantic rejection is a slice-4 compiler responsibility.
- Model mutation itself does not yet provide production undo/history, signature-edit controls or cross-tab editor commands. Those belong to slice 5. The low-level maps are not a complete tactic create/delete API; referenced deletion protection is still required there.

### Bounded block catalog

| Block | Authored inputs / slots |
| --- | --- |
| Main / tactic definition | One BODY; stable definition identity |
| Selector | Ordered BODY steps |
| Sequence | Ordered BODY; explicit none/release-plan-on-exit cleanup and capture-plan slot |
| Retry | Typed attempt count; BODY |
| SelectCity | Query, ranking, output city slot |
| SelectSources | Target city, minimum army, output source-list slot |
| NextCity | Source-list, output city slot |
| ClearSet | Chosen-set slot |
| AddToSet | Chosen-set and city slots |
| PlanCapture | Target city, chosen-set, horizon and capture-plan slot |
| ExecutePlan | Capture-plan slot |
| Tactic call / scalar literal / parameter reference | Typed, identity-based values described above |

Connections distinguish executable statements from each scalar type. Native dropdowns show only declarations of the required city/source-list/chosen-set/capture-plan kind. The decoder rejects unknown types, extra properties, invalid fields/enums/numbers, wrong slot kinds and incompatible serialized connections **before** Blockly could silently clamp fields or drop connections. No disabled/executable-code/custom-variable/generator state is accepted.

Empty inputs/groups, obsolete parameter arguments and detached supported draft blocks can remain editable source; structural decode is **not** semantic validation or approval to run. A tab must retain exactly one correctly scoped entry. The compiler must reject incomplete/dangling executable source rather than ignore it.

### Default strategy

Main's selector calls shared `Capture(kind)` with neutral first, enemy second. Capture authors target selection, candidate source selection (minimum 6), chosen-set clearing, retry up to 4 attempts of NextCity → AddToSet → PlanCapture(15000ms), then ExecutePlan. The outer sequence explicitly releases its plan on exit; the inner retry sequence has no cleanup.

The definition declares local target/source city slots, a source list, chosen set and plan. These are **local template slots**: slice 4 must bind them to deterministic private namespaces for each neutral/enemy call path. This slice does not execute calls, allocate runtime memory or claim status/cleanup equivalence from serialization tests alone.

### Source bounds vs runtime safety

Structural source guards: 256 KiB UTF-8, 128 authored blocks (including roots/scalar shadows), nesting depth 12 (siblings count as blocks, not extra depth), 8 tactics, 4 parameters/tactic, 16 slots/tab, 80-character identities/names. Retained obsolete call argument shapes are also finitely bounded. These reject oversized input; they do not truncate or silently change authored policy.

**The [slice-1 responsiveness gate](../../mockups/bot-editor-blockly/FEASIBILITY.md) remains NOT PASSED.** These authoring guards are not runtime resource admission. Expanded node/depth/call limits, read-before-write checks, recursion/missing references/argument compatibility, numeric forwarding constraints, runtime JSON allowlists, decision/forecast/world-work budgets and isolation are still required in slices 3–4 and before normal activation. In particular, keeping the source horizon domain at 60000 does not authorize it at runtime; any narrower admission limit must be explicit and reject, not rewrite, a draft.

### Verification

- TDD: initial missing-module test failed, then format/model/block implementation; a parameter-reorder regression was reproduced red and fixed without rebinding values.
- **46 focused tests**, plus full suite: **939 tests / 108 files pass**. Coverage includes golden and edited round trips, default completeness, IDs/order/cleanup/slot kinds, renames and signature edits, typed nested forwarding, malformed and oversized input, retained shadows and headless repeated disposal.
- TypeScript and production build pass. Current application output still has no editor import/chunk. An additional standalone browser-target Vite bundle of the headless module also builds (write-disabled; no production config changes).
- Browser/PWA suites and rendered mount/listener/device checks were **not run** for this headless slice. No new UI or offline editor availability is claimed. The separately documented PWA header-overlap baseline is unchanged.
- License texts retained under [licenses](licenses/). Blockly and block-shareable-procedures are Apache-2.0; upstream notices remain in installed packages. Production editor packaging must retain notices and test its lazy/offline assets in the later UI/integration slices.

## Slice 3: direct validation, JSON compiler and guarded runtime

- `compileProject` validates source without initializing Blockly, rejects detached/empty/incomplete executable source and emits typed Mistreevous JSON directly. Nodes retain runtime-path → tab/block/call-path origins. Format errors carry block identities where available; semantic diagnostics map back through origins. The direct fixture is equivalent to the existing handwritten capture tree, with deliberately renamed private slot labels.
- The native validator is independent of React/Blockly and is also called at runtime admission. It allows only root/selector/sequence/finite retry, the seven capture actions, and explicit sequence `ReleasePlan(plan)` exit cleanup. No arbitrary methods, guards, callbacks, branch/global lookups, expressions, waits or unknown properties. JSON is cloned/frozen, not trusted merely because it was compiled or saved.
- Conservative definite-write analysis follows sequence success, selector failure/success intersections, retry failure fixed points and cleanup deletion. Analysis has a finite visit budget, so nested retries cannot make validation unbounded. Runtime selection/planning FAILED remains normal behavior, not an invalid strategy.
- `createMdslBot` accepts native JSON in addition to its existing trusted handwritten MDSL path. **Use `createProgramBot` for untrusted snapshots**: it requires one native root object, so a corrupt string cannot accidentally opt into the legacy MDSL path. Neither factory activates Home custom logic.
- Native decisions enforce 128 runtime nodes/depth12, retry1–8, army1–999, horizon1–15000ms (rejects rather than rewrites larger source values), chosen-set8, capability64, forecast4 and command1 budgets. A default plan plus its ExecutePlan revalidation both consume forecast budget. Direct node count, including implicit sequence wrappers, is checked before materialization. Runtime JSON is independently revalidated.
- Observed/projected world admission caps cities24, factions5, transfer/arrival groups128 each, city garrisons1024, aircraft24 and features8/city. Projection checks the full queued dispatch **before allocating groups**. No silent truncation or donor substitution. Live accepted orders are not recalled on faults.
- Forecast work is charged before initial combat/outer forecast iterations **and internal world-step physics iterations**, including aircraft/weapon/relay splitting. Per-decision ceilings:2048 charged iterations and100000 weighted work units (city count plus squared transfer/arrival group count per charge). This conservative work proxy is not a complete cost model or wall-clock timeout. Shared unbudgeted simulation/legacy MDSL behavior remains unchanged.
- Unexpected native capability/host/observer/budget faults stop that runtime, clear all city/list/set/plan memory, best-effort emit aborted plan cleanup, expose a sticky `{code,message,method}` fault and notify once. Fault reporters cannot revive the runtime or replace its primary fault. Expected FAILED does not fault. Disposal is idempotent and never cancels game transfers. Host scheduling still owns pause/hidden-time stepping.
- Verification: **983 unit tests / 112 files and TypeScript/production build pass**. A full-suite legacy-disposal telemetry regression was reproduced and fixed by keeping the trusted MDSL path's silent disposal unchanged. Direct JSON golden fixture, exact MDSL/native capability trace + physical-state equivalence, real one-/two-source captures, RUNNING cadence, cleanup/disposal, policy failure versus faults, source/runtime allowlists, retry analysis, malformed/oversized JSON, per-decision budgets and internal forecast charging. No game settings, persistence or reusable tactic expansion in this slice. Calls/parameter references explicitly report that slice 4 is required rather than disappearing.

**The responsiveness release gate is still not passed.** Horizon/world/work ceilings respond to the measured expensive fixtures, but arbitrary target-device main-thread responsiveness, complex-physics cost coverage and multi-faction totals are not established. These checks stop excessive work; they do not promise a hard deadline or sandbox. Isolation/resumable work remains a release prerequisite if device evidence is unacceptable.

## Next

Slice 4 adds bounded tactic expansion, typed substitution and private call-site slot binding. No custom bot may be activated merely because its source can round-trip or a direct tree compiles.
