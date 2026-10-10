# Dotfield Test Repair — Requirements

## Goal
Maintain a green, meaningful suite without reverting supported round restoration or weakening assertions. The original eight browser failures were diagnosed and repaired; the remaining work is broader deterministic persistence coverage, not a known failing save path.

Status: slices 1–2 are complete. Periodic saving was subsequently removed by explicit user decision (`551d636`); the event-only contract below supersedes the original 500ms throttle/fallback proposal. Slice 3 remains pending. Full-suite verification has passed repeatedly, including merged checkpoint `d2d9702` (402 unit tests, 79 Chrome browser tests, build and whitespace checks); rerun acceptance after expanding coverage.

## Scope
### In Scope
- Correct reset/reload expectations in Factory, Industry and growth browser tests.
- Unambiguous Slow Zone selectors scoped to the player upgrade group.
- Latest-state lifecycle saves, event-only save policy and round restoration.
- Deterministic running/paused reload, transfer/rule/feature retention, no offline growth and Home abandonment checks.
- Full regression verification and current evidence after changes are committed.

### Out of Scope
- New gameplay, visuals, save-format migrations, cloud storage or broad validation redesign.
- Disabling round restoration, forced Home on reload or clearing saves to hide defects.
- Reintroducing periodic saves or per-frame/per-dispatch storage writes without a separate product decision.
- Test skips, weakened assertions, arbitrary sleeps or excluding failing cases from acceptance.

## Requirements
- **R1 — Restoration contract:** Reload of a valid active-round save restores its compiled map, rules, features, AI configuration and running/paused phase. Home abandons and clears it. Home setup choices remain memory-only; restored round rules are not persisted Home selections.
- **R2 — Upgrade checks:** Preserve effect, faction isolation, pause, restart and Home-retention assertions. Reload checks inspect the restored board, then explicitly return Home to check default unchecked setup options.
- **R3 — Fresh-round checks:** Test reset through Home→Play rather than treating reload as a fresh start. Abandoning a grown round clears its save and starts the selected map with its opening armies.
- **R4 — Scoped selectors:** Check Slow Zone descriptions/options within the player group, retaining enemy controls and coverage assertions at both phone sizes.
- **R5 — Deterministic freshness:** Stop the browser clock and inspect saved payloads alongside rendered counts/transfers. Prove that ordinary growth/dispatch remains unsaved until an event boundary; actual reload must flush the latest applied state without a test-only forced save.
- **R6 — Event-only saves:** Start/restore, visibility changes, page exit, session commands and round completion save immediately. Ordinary frames and dispatches do not save. Saving never advances simulation time. Synchronous storage failures remain nonfatal.
- **R7 — No save resurrection:** Home clears the round; disposal removes lifecycle listeners and cannot recreate a discarded save. Repeated lifecycle events must not revive it.
- **R8 — Expanded persistence coverage:** Assert semantic restored counts, phase, active/queued transfers, rules/features and no offline catch-up. Cover running and paused reloads, background flush and Home abandonment. Do not rely on animation pixels, object identity, arbitrary waits or debug hooks.
- **R9 — Unit protection:** Cover explicit save requests, ordinary-frame/dispatch exclusion, repeated lifecycle events, cleanup, source-state freshness and Home clear/no-resurrection. Retain session freeze/rebaselining and storage-error checks.
- **R10 — Acceptance:** Run unit tests, production build, whitespace checks and the unfiltered Chrome browser suite. Include desktop layout/input checks and repeat targeted persistence tests for determinism. Commit verified changes and record accurate checkpoint counts and manual-device limitations.

## Assumptions
- Reload restoration and ephemeral Home settings are the source of truth; obsolete pre-persistence assertions must change, not the product contract.
- Event-only saves intentionally accept crash exposure: a crash/force-kill that delivers no lifecycle event can lose all progress since the last event save. Browser lifecycle events cannot guarantee recovery.
- `visibilitychange` is the main background signal; `pagehide` handles page exit. Real-iPhone Safari delivery and installed-app behavior still need manual testing.
- Historical checkpoints and test totals are evidence of those revisions, not guarantees about a later revision.

## Implementation Plan
### 1. Repair obsolete reset and selector assertions
Status: complete (`9f98b8e`, with later map-integration updates).
Description: Correct Factory/Industry reload expectations, growth Home→Play reset checks and player-scoped Slow Zone queries without changing supported product behavior. Preserve effect, pause, restart and Home-retention protection.

### 2. Reproduce and fix lifecycle save freshness
Status: complete (`3125897`); event-only persistence followed in `551d636`.
Description: Stabilize the stopped-clock reproduction and flush the latest applied state at lifecycle/session boundaries. Forced writes preserve unsaved dispatches without advancing time. Unit tests cover save events, ordinary-save exclusion, cleanup and no catch-up; no periodic fallback remains.

### 3. Expand persistence regression coverage
Status: pending; basic running reload, upgrade restoration and contested-Factory/river reload checks already exist, but the dedicated matrix is not complete.
Description: Add deterministic running/paused round cases, retained effects/rules, transfers, background flush, no offline growth and Home abandonment without resurrection. Reuse public UI and serialization APIs rather than production debug hooks. Repeat targeted cases to check determinism. No new save features or format migration.

### 4. Verify the full suite and refresh evidence
Status: checkpoint verification complete; final acceptance must be repeated after slice 3.
Description: Run every unit/browser test, build and whitespace checks without exclusions, confirm desktop and touch/keyboard regressions, commit the repair changes and refresh clean-tree evidence. Report real-device Safari limitations explicitly; never close pending coverage merely because existing tests are green.

## Open Questions
None.
