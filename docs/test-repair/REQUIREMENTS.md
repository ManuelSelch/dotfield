# Dotfield Test Repair — Requirements

## Goal
Restore a green, meaningful test suite without reverting supported round persistence or weakening assertions. All 317 unit tests passed at the desktop slice 1 checkpoint; the eight confirmed failures are Playwright browser tests. Repair obsolete test expectations separately from a potentially real lifecycle-saving defect, adding focused unit coverage where needed.

## Scope
### In Scope
- Four Factory/Industry reload failures in `tests/factory.spec.ts` and `tests/industry.spec.ts`.
- One obsolete reload-reset expectation in `tests/growth.spec.ts`.
- Two ambiguous Slow Zone description queries in `tests/slow-zone.spec.ts`.
- The stale restored-count failure in `tests/persistence.spec.ts`, including investigation of production save timing and lifecycle handling.
- Focused persistence/lifecycle unit tests and complete regression verification.
- Refreshing verification evidence after changes are committed.

### Out of Scope
- Desktop Home redesign, click-to-click input, new visuals, and gameplay/balance changes.
- Disabling persistence, forcing every reload back to Home, or clearing saves merely to avoid a restoration failure.
- Broad persistence schema/validation redesign, migration, cloud storage, or unrelated refactoring.
- Test skips, reduced assertions, arbitrary sleeps, or excluding the eight failures from final acceptance.

## Requirements
- **R1 — Preserve the intended contract:** Reload during an active round restores that round and its compiled map/rules/features/AI and running or paused phase. Returning Home abandons the saved round. Home setup selections remain in-memory only and reset on reload; this is distinct from restoring the active round's rules.
- **R2 — Correct Factory/Industry tests:** Keep existing effect, faction-isolation, pause, restart, and Home-retention checks. At the final reload, assert that the saved board restores rather than looking for Home checkboxes. Then explicitly navigate through Pause→Home and verify default unchecked Home options after reload. Do not confuse restored active-round effects with persisted Home selections.
- **R3 — Correct growth reset coverage:** Replace the reload-as-fresh-start assumption with explicit Home→Play reset coverage. Verify that abandoning a grown round clears its save and starts the selected map with its initial armies. Keep reload restoration checks in the persistence suite rather than asserting contradictory behavior.
- **R4 — Scope Slow Zone queries:** Query the human upgrade group when checking its description or option. Keep per-enemy settings present and preserve the existing selection/coverage assertions at both phone sizes; do not hide duplicate descriptions or select an arbitrary first match.
- **R5 — Investigate saved-state freshness:** Use a deterministic stopped browser clock and inspect the saved payload before and after lifecycle events to distinguish periodic throttling, callback timing, reload timing, and missing flush behavior. The current App throttles running snapshots to 500ms, and the board's visibility callback uses the same snapshot path. Therefore visibility notification alone does not prove an unthrottled flush. The persistence browser test currently installs a clock without stopping automatic advancement; stabilize it before attributing all mismatches to production.
- **R6 — Lifecycle save correctness:** Routine running saves may remain throttled, but supported hidden/page-exit and explicit pause boundaries must preserve the latest already-applied simulation state without waiting for the next periodic save. Never simulate time solely to save. If investigation confirms a lifecycle flush defect, fix the narrow save-policy/adapter boundary and unit-test it. Do not add synchronous storage writes on every animation frame.
- **R7 — No accidental save recreation:** Leaving Home, abandoning a round, or disposing a board after its save was cleared must not resurrect the discarded save. Lifecycle listeners and any pending save work must be removed/cancelled correctly.
- **R8 — Persistence regression coverage:** Browser tests must assert restored counts and phase, active transfers, selected rules/features, and no offline catch-up. Exercise reload inside the periodic throttle window and paused reload. A reload assertion must not use a test-only forced save or wait long enough to hide a missing lifecycle flush. Compare semantic state, not rendered animation pixels or newly allocated object identity.
- **R9 — Unit coverage:** Where production save behavior changes, first add failing focused tests for periodic throttling, forced latest-state flush, pause/hidden interactions, repeated lifecycle events, cleanup, and Home clear/no-resurrection. Keep the simulation/session clock's existing no-catch-up behavior unchanged. Storage errors must remain nonfatal.
- **R10 — Final acceptance:** Run `npm test`, `npm run build`, `git diff --check`, and the entire Chrome Playwright suite without exclusions. Include all seven desktop layout tests. Repeat targeted persistence tests to check determinism. Commit only this repair work, then inspect the clean working tree and regenerate the verification report so it lists the implementation commit and no obsolete untracked-file warning. Report actual test totals; new tests may increase the checkpoint counts.

## Assumptions
- Existing active-round restoration and ephemeral Home setup behavior are the source of truth; obsolete pre-persistence assertions should change, not the product contract.
- The eight failure cases reproduced on unchanged production code before desktop slice 1; desktop geometry is not the cause.
- A small explicit forced-flush distinction may be needed between frame snapshots and lifecycle snapshots. The exact design depends on reproduction and should not become a new general persistence framework.
- Browser reload/page-exit events cannot guarantee recovery from process crashes or force-killed mobile apps; retain periodic saving as a fallback. Real iPhone Safari lifecycle behavior still requires manual testing.
- The earlier report's dirty-tree/untracked warning was recorded before commit `02f971d`; the working tree was clean when this plan was written. Refreshing the report is evidence bookkeeping, not an additional code defect.

## Implementation Plan
### 1. Repair obsolete reset and selector assertions
Description: Update Factory/Industry reload expectations to distinguish restored active-round effects from default Home options, replace growth's reload-reset assumption with explicit Home→Play reset, and scope Slow Zone selectors to the human upgrade group. Preserve all useful existing checks. Verify all seven affected browser cases at their current viewport sizes; do not alter production behavior in this slice. Treat any new restoration assertions exposing real saving defects as reproduction evidence for slice 2, not reasons to weaken them.

### 2. Reproduce and fix lifecycle save freshness
Description: Stabilize the persistence test clock and reproduce the stale snapshot inside the throttle window. Add failing focused unit tests for the confirmed save-policy/lifecycle defect, then minimally repair the path between App saving and board lifecycle callbacks if needed. Preserve periodic throttling, freeze/no-catch-up behavior, and Home clear/disposal safety. Verify unit tests, exact saved/restored state, and the previously failing persistence browser case without sleeps or manual test-only flushes.

### 3. Expand persistence regression coverage
Description: Building on slice 2, add deterministic reload cases for running/paused rounds, transfers, retained effects/rules, background flush, and no offline growth; cover Home abandonment without save resurrection. Reuse existing public UI and serialization APIs rather than production debug hooks. Repeat targeted browser tests and verify the lifecycle unit coverage remains green. This slice adds protection, not new persistence features or a save-format migration.

### 4. Verify the full suite and refresh evidence
Description: After slices 1–3, run every unit and browser test, production build, and whitespace checks without filtering failed cases. Confirm desktop layout and existing touch/keyboard behavior still pass. Commit the repairs, inspect Git status, and generate a current verification report including the commit and remaining manual-device limitations. Do not declare completion while automated checks fail; diagnose any remaining failure separately.

## Open Questions
None. Investigation in slice 2 determines whether a production lifecycle fix is required or whether a deterministic test correction fully explains the persistence mismatch.
