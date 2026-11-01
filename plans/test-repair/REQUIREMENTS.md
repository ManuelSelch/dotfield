# Dotfield Playwright Suite Repair — Requirements

## Goal

Make the full Playwright suite reliable and meaningful for the checked-out worktree. Diagnose the latest partial run rather than weakening assertions or assuming the canvas-layer change caused failures.

Latest evidence: the full run reported 57 passed and 30 failed at six workers. Five failures observed 14 cities where tests expected 12; the other 25 failed to connect to `http://127.0.0.1:5180`. The user clarified that 14 cities is the intended new default. This checkout still declares `DEFAULT_MAP_SETTINGS.cities` as 12, indicating stale branch code/tests. The three generated-setup viewport cases passed serially against this checkout. Playwright config permits reusing an existing local server; reusing a different Dotfield checkout and then losing that server is a plausible explanation, but must be confirmed.

## Scope

### In Scope

- Reproduce the five city-count mismatches and the 25 browser-server connection failures.
- Record which app/worktree owns the Playwright server, its lifecycle, and the actual rendered city elements/preferences during failures.
- Make server startup/reuse safe across concurrent tests and multiple worktrees.
- Keep assertions aligned to actual city data and the confirmed 14-city default; do not count decorative SVG circles as cities.
- Run the unfiltered browser suite and relevant unit/build checks after repair.

### Out of Scope

- Changing gameplay, generated-map defaults, or the already-committed troop render order to hide test failures.
- Weakening assertions, skipping tests, arbitrary sleeps, or accepting connection-refused failures.
- Changing round persistence or its event-only save contract to hide failures. Retain the separate pending persistence matrix: running/paused reloads, transfers and rules/features, background flush, no offline catch-up, Home abandonment/no resurrection, and source-state freshness. Do not reintroduce periodic saves.

## Requirements

- **R1 — Reproducible diagnosis:** Re-run the affected tests individually and under serial and normal worker counts. Capture the actual city data, relevant SVG/list contents, persisted preferences, base URL, and Playwright server process/worktree for any mismatch.
- **R2 — City-count correctness:** The default generated setup is 14 cities. Reconcile this checkout's stale 12-city default and related tests. Assertions count semantic city nodes/details, not decorative circles, bridge geometry, or feature indicators.
- **R3 — Server ownership:** Playwright must not unknowingly reuse a Vite server from another checkout or depend on a server that disappears during the run. The test server must use the intended checkout and configured port; startup conflicts must fail clearly rather than produce later page-level connection refusals.
- **R4 — Concurrency safety:** The suite must not share mutable browser state between tests in a way that changes city preferences or shuts down the server. Validate both serial and configured parallel execution.
- **R5 — Preserve test intent:** Keep all affected behavior assertions, including generated setup, Factory/Industry, Home/new-map, persistence, region controls, round/session, Slow Zone, styling, viewport, and Watchtower scenarios. Repair causes, not coverage.
- **R6 — Acceptance:** Run all unit tests, production build, whitespace checks, and the complete unfiltered Playwright suite. Report pass/fail counts and any remaining limitations accurately.

## Assumptions

- The intended fresh Home default is 14 cities, per the user's clarification. This checkout currently has a stale 12-city `DEFAULT_MAP_SETTINGS` value and test expectations.
- The three generated-map preview cases (`tests/home.spec.ts`) passed serially against the stale 12-city checkout. The two post-Play list-count cases have not yet been isolated serially.
- The 25 `ERR_CONNECTION_REFUSED` failures all targeted `127.0.0.1:5180`. Since local Playwright config allows server reuse, reuse of a 14-city server from another checkout followed by its exit is plausible, not yet proven.
- The earlier persistence-test repair slices remain complete; their separate expanded regression matrix remains pending under the event-only persistence contract.
- Historical test totals are revision-specific evidence, not permanent suite-size guarantees.

## Implementation Plan

### 1. Reproduce and instrument the failures

Description: Run the five count-mismatch cases and representative connection-refused cases individually, with one worker, and at normal worker count. Record city IDs/counts, preview DOM, local preferences, base URL, server PID/cwd, and when the server exits. Completion requires a reproducible root cause or evidence that the original failures were transient, plus captured serial/parallel outcomes.

### 2. Isolate Playwright server lifecycle

Description: Based on slice 1 evidence, ensure the suite starts or reuses only the Vite server for this checkout. If local reuse remains supported, verify ownership; otherwise use an isolated/configurable port and fail fast on conflicts. Verify the server remains reachable through the run and is cleaned up afterward.

### 3. Make generated-city assertions semantic and deterministic

Description: Bring this checkout and its generated-map tests into agreement with the confirmed 14-city default. Use stable semantic city selectors and isolated preference state; retain generated setup and post-Play count assertions across phone and desktop viewports.

### 4. Verify full-suite stability

Description: Run unit tests, production build, whitespace checks, and the unfiltered Playwright suite first serially and then at the supported parallel worker count. Repeat affected tests to demonstrate determinism; commit only the verified repair and record accurate results.

## Open Questions

1. Was the full run's 14-city page served by a reused Vite process from the newer checkout, or did another source of state produce the 14-city result?
2. Did the reused Vite server exit during the run, or did another parallel-run issue make port 5180 unreachable?
