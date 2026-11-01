# Stability and performance cleanup

## Scope

Preserve the gameplay the user considers successful. Difficulty continues to come from enemy count and independent upgrades. No new gameplay features, UI redesign, AI weakening, compatibility layer or architectural rewrite is part of this cleanup.

First slice: move temporary/historical documentation into `plans/`, retain concise current-system docs in `docs/`, preserve contracts/tests/mockups and repair links. Runtime slices below are **proposed, not implemented or benchmarked**.

## Initial read-only findings

These are code observations, not measured causes of phone heat. Confirm each in focused tests/profiling before optimizing.

| Area                    | Evidence                                                                                                                                               | Small next step                                                                                                                                                             |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repeated order legality | `src/game/ground-access.ts` validates queued batches; launch is used by travel and combat, including forecasts. Terrain legality builds route queries. | Deduplicate repeated source/target/faction checks within a call; consider immutable-round terrain caching, but invalidate ownership-sensitive Defender checks correctly.    |
| Redundant drawing       | `src/board/start-board.ts` redraws while transfers exist, including frames without a new fixed simulation step.                                        | Test render invalidation for simulation, input, resize, feedback expiry and aircraft; skip only provably identical frames.                                                  |
| Draw-call volume        | `src/board/draw-board.ts` fills background dots separately; `drawTransfers.ts` fills troop dots individually.                                          | Count calls and measure before batching. Check overlapping paths/antialiasing and visual parity, rather than assume identical pixels.                                       |
| Collision allocations   | `src/game/collisions.ts` repeatedly copies faction arrays and builds bounds/motions for all transfers.                                                 | Replace repeated array copies; characterize queued/launch-boundary contacts before filtering anything.                                                                      |
| AI lifecycle            | `src/board/start-board.ts` leaves pending entries on send/worker failure and clears bookkeeping without terminating old computation on restart.        | Reproduce failure/restart with worker doubles, then extract only the coordinator needed to make recovery and cancellation reliable. Prevent stale actions and retry storms. |
| React publications      | `startBoard.ts`, `FieldCanvas.tsx`, `TransferDetails.tsx` derive/publish accessible state during battles and diagnostics heartbeats.                   | Measure and memoize stable derivations first. Preserve accessible content and existing scenario semantics.                                                                  |
| Multi-enemy forecasts   | All normal enemies share the worker and use real simulation forecasts with a 1500ms decision budget.                                                   | Measure worker utilization and benefits of shared-physics optimizations before considering policy changes.                                                                  |

## Incremental runtime slices

1. **Characterize and measure.** Fixed-seed dense generated fields, many queued/in-flight groups, opposing factions, mountains, roles/aircraft and Relay. Script commands and capture physical-state checkpoints from the unchanged implementation; test identical results after each optimization. Keep AI wall-clock-budget effects separate from deterministic unlimited-policy checks. Record CPU time per simulated second, live-step and forecast cost, group counts and deterministic work counters. Wall-clock measurements are local comparisons, not fragile CI thresholds.
2. **Remove redundant render work.** Characterize invalidation and batch draw calls separately. Keep simulation cadence, visual feedback, accessibility and input behavior intact.
3. **Reduce shared-physics work.** Deduplicate legality checks and collision allocations in separate tested commits. Compare checkpoints and algorithmic work counts, not just elapsed time.
4. **Harden AI lifecycle.** Send failure, worker error/message error, restart, hidden/pause, disposal and stale replies. Recovery must not freeze factions or apply an old round's action.
5. **Targeted structure cleanup.** Extract the worker coordinator and semantic-change detection only where tests justify it; avoid moving every file or adding speculative abstractions.

For every slice: failing regression/characterization where applicable, minimal change, focused tests, full unit suite/build, affected browser scenarios and documentation update. Browser automation or screenshots for visual comparison require explicit user permission. Do not claim mockup screenshots verify production.

## Decisions deliberately excluded

Ask before changing AI budgets/cadence, overload catch-up behavior, persistence/write scheduling, accessible transfer-list content, troop limits or graphics quality. Those can alter gameplay, durability or journeys, not merely internal performance.

## Acceptance and limits

No phone thermal improvement is claimed from this audit or documentation slice. Confirm the device/browser and reproduce the same sustained battle on the phone, ideally with Safari Web Inspector, before/after runtime changes. Desktop timing is not a thermal measurement. Existing automated tests do not replace user acceptance that gameplay remains unchanged.
