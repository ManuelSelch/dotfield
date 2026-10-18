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

The definition declares local target/source city slots, a source list, chosen set and plan. These are **local template slots**. Slice 4 now binds them to deterministic private namespaces for each neutral/enemy call path, with real runtime status/cleanup tests described below.

### Source bounds vs runtime safety

Structural source guards: 256 KiB UTF-8, 128 authored blocks (including roots/scalar shadows), nesting depth 12 (siblings count as blocks, not extra depth), 8 tactics, 4 parameters/tactic, 16 slots/tab, 80-character identities/names. Retained obsolete call argument shapes are also finitely bounded. These reject oversized input; they do not truncate or silently change authored policy.

**The [slice-1 responsiveness gate](../../mockups/bot-editor-blockly/FEASIBILITY.md) remains NOT PASSED.** These authoring guards are not themselves runtime resource admission. Slices 3–4 add expanded limits, dataflow/call validation, runtime JSON allowlists and decision/forecast/work guards, as described below. Isolation/resumable work remains required if target-device evidence is unacceptable. Source horizons up to60000 remain editable, but native admission explicitly rejects values above15000 rather than rewriting them.

### Verification

- TDD: initial missing-module test failed, then format/model/block implementation; a parameter-reorder regression was reproduced red and fixed without rebinding values.
- **46 focused tests**, plus full suite: **939 tests / 108 files pass**. Coverage includes golden and edited round trips, default completeness, IDs/order/cleanup/slot kinds, renames and signature edits, typed nested forwarding, malformed and oversized input, retained shadows and headless repeated disposal.
- TypeScript and production build passed at the slice-2 checkpoint, without an editor import/chunk. An additional standalone browser-target Vite bundle of the headless module also builds (write-disabled; no production config changes).
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
- Slice-3 checkpoint verification: **983 unit tests / 112 files and TypeScript/production build passed**. A full-suite legacy-disposal telemetry regression was reproduced and fixed by keeping the trusted MDSL path's silent disposal unchanged. Direct JSON golden fixture, exact MDSL/native capability trace + physical-state equivalence, real one-/two-source captures, RUNNING cadence, cleanup/disposal, policy failure versus faults, source/runtime allowlists, retry analysis, malformed/oversized JSON, per-decision budgets and internal forecast charging. No game settings or persistence in this slice. The slice-3 checkpoint explicitly rejected calls/parameter references; slice 4 adds their expansion below.

**The responsiveness release gate is still not passed.** Horizon/world/work ceilings respond to the measured expensive fixtures, but arbitrary target-device main-thread responsiveness, complex-physics cost coverage and multi-faction totals are not established. These checks stop excessive work; they do not promise a hard deadline or sandbox. Isolation/resumable work remains a release prerequisite if device evidence is unacceptable.

## Slice 4: parameterized tactics and scoped compilation

- The same `compileProject` API now compiles the bundled Main/Capture project and nested calls. Tactics inline into native Mistreevous nodes, not registered global subtrees or invented function syntax. Calls return ordinary SUCCEEDED/FAILED/RUNNING through the existing tree and do not fire-and-forget commands.
- A source-only preflight checks every definition, including uncalled ones: missing/extra/incompatible arguments, local parameter identity/type, finite scalar domains, missing references, direct/indirect recursion, empty inputs and detached drafts. No binding by display name, guessed argument default, implicit numeric type conversion or silent signature repair.
- Inputs are bound by stable parameter identity; calls accept typed literals or forward enclosing parameters. Query/ranking enums and distinct army/attempts/horizon types retain their domains at supplying calls and primitive uses. Numeric constraints are checked even for declared inputs the callee does not currently use. Per-call values remain constants across RUNNING ticks.
- Memoized/saturating DAG summaries count expanded native nodes (including implicit sequence/root wrappers), expanded depth and call depth **before materialization**. Runtime ceilings are128 nodes, depth12 and4 call hops. Repeated acyclic calls cannot evade limits through exponential expansion. A4-level/fanout6 fixture rejects oversize expansion without falsely labelling it recursive; a4-level/fanout4 fixture admits86 native nodes/64 actions.
- Each call site gets deterministic private city/source-list/chosen-set/plan names based on its entire stable call-block path and local slot ID. Main uses a disjoint namespace. Length-framed identities prevent delimiter collisions even for IDs containing punctuation; display renames do not change bindings. Cleanup receives the exact same bound plan as PlanCapture/ExecutePlan. Only declared slot operands are rewritten, never scalar enums/numbers.
- Generated node origins retain definition tab/block IDs and the full call path. The [expanded default fixture](../../src/botEditor/fixtures/tactic-program.json) shows both literal bindings/private namespaces. The direct fixture's slot labels now use the same disjoint Main framing.
- Uncalled definitions are also checked for definite writes using valid type-domain representatives; scalar values do not alter this language's control topology. Those validation-only values are **never exported or used as missing executable arguments**. Main expansion always receives actual authored bindings.
- Re-entry reuses the bounded static namespace and ordinary fresh-attempt BT lifecycle; no growing invocation IDs. The default tactic explicitly rewrites its target/list, clears chosen sources and releases its plan. The compiler does not secretly clear authored memory, select extra donors or change tactical policy.
- Real simulation tests cover direct/shared/nested-forwarded equivalence for neutral and enemy targets, a two-source capture at host cadence, forwarded retry counts across RUNNING ticks, sequential neutral/enemy private plans, success/failure/abort cleanup, stable namespace/fresh chosen-set re-entry, and a shared source-limit edit which affects new compilations but never an older running snapshot. Tests preserve Mistreevous's ordinary retry-exhaustion terminal tick rather than changing runtime semantics to make a call appear synchronous.
- Source/model rename + serialization preserves compilation. Changed signatures stay invalid until explicitly resolved. Existing snapshot cloning/fault/budget admission is reused; no new agent or runtime memory serialization.

Verification: **1008 unit tests / 114 files**, TypeScript and production/PWA build pass (25 new tactic/compiler/runtime tests). The standalone browser compiler bundle also passes:8 modules/31792 unminified bytes, no Blockly/React dependency. No browser/device acceptance was claimed for this headless slice.

The slice-4 checkpoint included no editor screen, localStorage Save, Home activation or match snapshot integration. Slice5 adds editing/storage below; activation remains separate.

## Slice 5: editor and local drafts

### Entry and editing
- Normal Home has **Edit logic** for every configured enemy, independent of development flags. Normal/Custom is visible, but **Custom is explicitly disabled** with an explanation until slice6 integration. Saving an editor project does not change the existing utility controller, presets, match preferences or any running/restored match.
- The approved revision-2 shell is implemented with real Blockly/Zelos: compact desktop library beside a dotted scrollable/zoomable canvas; horizontal phone library above it; Main/tactic tabs and native tap/keyboard controls below. Essential actions do not require dragging: select a step, add after it/inside a group, reorder siblings, move into a chosen group, delete, edit literals/typed slot fields and change literal/input bindings. Structural-cycle commands reject without modifying the draft.
- Tactics and inputs provides creation, stable-ID rename, guarded deletion, typed parameter addition/removal/reordering, call literals and enclosing-parameter forwarding. New tactics get the same small local typed-slot set. Referenced tactic deletion is blocked until calls are removed. Signature changes preserve old incompatible/removed arguments and references; missing inputs remain empty. Binding/replacing/removing obsolete arguments is explicit and undoable.
- Shared procedure models are reused across all tabs of a session, never across enemy sessions. `loadProject` accepts a workspace factory for SVG ownership while preserving its headless default. Rendered entry protection flags are stripped from serialization as editor invariants, not accepted as new untrusted source properties.
- Whole-project history (32 snapshots, bounded rather than unbounded event logs) includes signature/tab creation/deletion and workspace edits. Property ordering and tab navigation alone do not create fake edits. Blockly canvas undo and Ctrl/Cmd-Z use the same source history as the native Undo/Redo buttons. An unrepresentable rendered edit beyond source limits can explicitly Undo to its last editable snapshot; it cannot bypass Save validation.
- Reset replaces only the working draft and is undoable. Back with changes offers **Discard changes / Keep editing**. Browser unload checks flush pending canvas edits and request the browser's normal unsaved-change prompt. Save, Reset and Back never secretly change the other enemies' projects.

### Save and recovery
- `readEnemyProject` / `saveEnemyProject` in `src/botEditor/storage.ts` store only the editable source under `dotfield.bot-project.v1.<encoded faction ID>`. Both persisted source and its generated native definition are validated on read/Save; compiled JSON and runtime memory are not editor storage. Only a successful one-key write updates the saved baseline.
- Invalid/recursive/out-of-admission drafts do not overwrite the last valid project. Storage read/write/quota failures remain readable errors while the working draft stays open. A stale read token detects newer saves from another tab; this is an optimistic check, not transactional multi-tab merging.
- Unsupported/corrupt stored projects are preserved. The editor explains the failure and offers a default working draft; replacement requires **Replace unreadable save → Confirm replacement → Save**. Reset alone does not authorize replacement. No migration, automatic overwrite or arbitrary source import/export UI is added.
- Lazy-load errors explain reconnect/retry and allow returning Home without modifying saved data. PWA update actions are unavailable while editing, just as while playing; return Home through the draft guard before applying an update.

### Lazy loading, offline assets and disposal
- `BotEditorEntry` lazy-loads the editor. Normal Home/gameplay imports neither Blockly nor project models; no workspaces initialize before entering the editor. The lazy editor chunk is approximately837kB raw/231kB gzip, separate from the approximately494kB main JS. Vite's existing500kB chunk warning remains visible; it is not a build failure or a performance approval.
- Blockly media is local under `public/blockly-media/`, not fetched from a demo CDN. Full upstream licenses are served under `public/licenses/` and linked in the editor. VitePWA explicitly precaches media/licenses and includes lazy JS/CSS (26 entries, approximately1.63MiB total).
- Production tests actually open the editor **for the first time offline**, change/Save/reload/reopen source, and fetch media/licenses offline. No prior editor visit is used to make caching appear successful. This does not establish real-iPhone installed behavior.
- All workspaces, model attachments, resize observers, change listeners, pending callbacks and owned DOM are disposed on source-session replacement/unmount. Partial mounting failures also clean up and disable Save. Tests exercise repeated mount/disposal and injected observer failures; no general heap-leak/security guarantee is claimed.

### Verification and outstanding gates
- **1029 unit tests / 116 files pass**, including93 focused editor tests. TypeScript/production build passes. **156 standard browser tests pass**, including13 editor cases for save/reopen/isolation, native and real SVG edits, whole-project undo, parameter bindings/rename/type invalidation, reset/discard, storage/version and lazy-load recovery, partial mount/disposal and320×480 /430×932 /1280×900 layouts.
- **Both new production-PWA editor tests pass**: first-use offline editing/assets and update safety for unsaved drafts.
- **Full PWA suite is NOT green:** both existing `tests/pwa/updates.spec.ts` cases time out on the Home action at320px. Reproduced with unchanged slice-4 `048407d` sources in an isolated archive using the same installed dependencies. The dashboard/list icon subtree intercepts the Home button; current trace stops at `updates.spec.ts:61`, baseline at`:100`. No existing assertions were removed/relaxed and this unrelated header-layout repair was not smuggled into slice5. Local baseline trace retained at `mockups/.runtime/slice5-baseline-update-trace.zip`; temporary source archive/server cleaned up.
- User-led phone/desktop/keyboard acceptance is still outstanding. Automated browser geometry/interactions are not human approval. The pre-existing runtime responsiveness release gate remains **NOT PASSED**; editor availability does not authorize custom game activation.

## Next

Slice6: validated immutable per-enemy runtime snapshots and exactly-one-controller integration for new/restored/replayed matches. Custom remains disabled until integration and responsiveness release prerequisites are satisfied. The existing320px PWA update/header blocker remains separately outstanding.
