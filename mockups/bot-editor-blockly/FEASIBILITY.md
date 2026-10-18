# Slice 1 feasibility findings

## Outcome
- **Editor revision 2 approved by the user; preview cleanup complete. Runtime responsiveness gate NOT PASSED.** No production code or application packages changed.
- Real Blockly/Zelos supports nested custom statement blocks, bounded numeric fields and headless serialization. Five headless tests cover example arguments/cleanup, ID-preserving round trip, numeric constraints and safe native-control sibling reordering.
- Project size/retry limits alone do not bound the simulation cost of a forecast. Before normal release, require either measured, enforceable world-work limits plus a resumable/budgeted forecast, or an isolated runtime with bounded work and explicit cancellation/fault handling. A worker is not a security sandbox. No hard synchronous wall-clock timeout is claimed.

## Reproduce
Run from repository root after `npm ci --prefix mockups`:

```sh
(cd mockups && node --test bot-editor-blockly/blocks.test.js)
node mockups/bot-editor-blockly/measure.mjs
# Optional: very expensive queued-transfer stress, several minutes:
node mockups/bot-editor-blockly/measure.mjs --stress
(cd mockups && node node_modules/vite/bin/vite.js build bot-editor-blockly --outDir ../.runtime/blockly-dist)
```

The script uses Vite SSR to import the existing `createSimulation`, `CaptureAgent`, `dispatchUnits` and `forecastBattle` read-only. Only Mistreevous's installed State enum is adapted for the SSR evaluator; capability/simulation code is not copied or replaced. No browser is launched. The test workspace and benchmark dependencies live under `mockups/` only.

## Environment and method
- Apple M2 Max, arm64 macOS, Node v26.5.0. These are **desktop Node**, not browser/iPhone, measurements; JIT, thermal/load and device differences apply.
- [measurements.json](measurements.json): one warmup, then 20 workspace samples, 3 single-plan samples, and 1 measured sample for each batch/busy case. A single sample is directional evidence, not a percentile or maximum guarantee.
- 24 cities; eight donors with 30 troops; target with 10000 troops intentionally forces failed forecasts; other city garrisons are 10000 in planning-only cases. Weapon fixtures alternate Watchtower/Artillery on remaining hostile cities. No unit production; no terrain/slow zones/aircraft/relay. Not exhaustive worst-case world coverage.
- Busy cases issue eight enemy orders and eight opposing player orders from cities with 80 troops, producing **176 transfer groups**. The stress fixture instead sends 10000-troop player cities, producing **16048 groups**. Those are legal constructed high-load inputs, not a claim about ordinary match frequency.
- Retry batches manually invoke eight successive authored source prefixes. This measures cumulative capability work, **not** a claim that Mistreevous executes all retries in one tick. A later bounded compiler/runtime must measure actual per-decision traversal, call expansion and multi-faction totals.

## Recorded costs (milliseconds)
| Fixture | Median / measured single value | Max sampled |
| --- | ---: | ---: |
| 128 blocks headless load + serialize + dispose | 1.98 | 3.98 |
| PlanCapture, 8 sources, 15s, production | 2.28 | 3.45 |
| PlanCapture, 8 sources, 60s, production | 1.80 | 1.94 |
| PlanCapture, 8 sources, 15s, weapons | 9.48 | 10.24 |
| PlanCapture, 8 sources, 60s, weapons | 13.22 | 13.70 |
| Eight failed prefixes, 15s, production / weapons | 7.07 / 40.77 | single samples |
| Eight failed prefixes, 60s, production / weapons | 6.96 / 69.02 | single samples |
| Busy forecast, 15s, production / weapons | 46.50 / 59.60 | single samples |
| Busy forecast, 60s, production / weapons | 42.99 / 65.31 | single samples |

The 128-block synthetic project serializes to 10654 bytes. It is a long sibling chain, not a rendered/nested/call-expanded acceptance fixture. Differences between 15s/60s include warmup and early resolution; horizon is not a linear cost proxy.

[stress-results.json](stress-results.json) records the earlier 16048-group, 60s forecast run: **36.3s production / 63.3s weapons** per measured sample. It used the same planning fixtures and method but measured only 60s busy forecasts. The current `--stress` option additionally measures 15s busy forecasts. These results rule out treating the current synchronous forecast as safe merely because the editor has 128 nodes and eight sources.

## Proposed enforceable limits — provisional, not installed
- Envelope: 256 KiB UTF-8 **before parsing**, 128 authored blocks across all tabs, 128 expanded executable nodes counted **before allocation**, structural/expanded depth 12, 8 tactics, 4 parameters/tactic, call depth 4. Reject oversized/cyclic graphs; no silent truncation. Measure maximum-byte/depth/parameter cases later; the 10.7 KiB fixture is not a 256 KiB test.
- Scalar inputs: allowlisted target/ranking enums; integer minimum army 1–999; retry count 1–8; chosen sources at most 8, checked before appending. Forecast horizon candidate **15000 ms**, not the prototype's permissive 60000 ms ceiling. A narrower horizon is an admission policy to confirm, not permission to silently rewrite a draft's value. The UI retains the existing 60000 bound for comparison.
- Execution candidates: at most one expensive forecast and one accepted dispatch command per faction decision; 128 capability entries per decision; check budgets before work and report a custom-runtime fault on violation. A one-forecast limit requires resumable traversal/forecast scheduling to preserve ordinary authored retry and RUNNING semantics; do not simply run the existing agent and claim enforcement. Test ExecutePlan revalidation as well as PlanCapture.
- Those ceilings are **necessary but insufficient**: busy worlds already exceed a frame budget on this desktop. Enforce additional simulation-work accounting (transfer/physical-step/collision work) or isolate the runtime before production activation. A preliminary 16ms main-thread decision target requires target-device evidence; no measured universal transfer ceiling is justified yet.
- Narrowing limits, staging forecasts or moving execution must not change tactical policy: no donor substitution, source truncation, utility fallback or reordered commands. Expected FAILED results remain distinct from exhausted-budget faults.

## Bundle and unverified gates
- Isolated Vite build passes: JS **726.72 kB raw / 199.79 kB gzip**, CSS 2.79 kB raw. Vite reports its >500 kB chunk warning; not suppressed. This is the standalone mockup, not the incremental production bundle. Lazy editor loading remains required.
- HTTP checks confirm feature HTML and transformed modules serve on the owned port. JS syntax checks/headless tests/build do not prove rendered behavior, touch/keyboard usability, or design approval.
- Outstanding: specific real-iPhone rendering/touch/keyboard/performance coverage (not reported by the user); procedure-model/signature spike during slice 2; bounded expansion/recursive rejection; maximum-depth/bytes stress; busy PlanCapture/ExecutePlan at real cadence; multiple custom factions; complex physics; fault cleanup/isolation; listener disposal under repeated mounts; lazy/offline assets. Existing PWA header-overlap baseline is untouched and untested here.
- Slice 2's design approval and verified preview-cleanup gates are complete; see [DESIGN.md](DESIGN.md). Normal activation in slice 6 remains gated on resolving responsiveness; design approval and these measurements do not waive it.
