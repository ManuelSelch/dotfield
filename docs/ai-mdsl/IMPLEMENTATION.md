# MDSL real-game prototype

## Try it

1. Run `npm run dev` and open the printed URL with `?bot=mdsl` appended, for example `http://localhost:5173/?bot=mdsl`.
2. Start a match. For a clear first experiment choose **Open field**, **one enemy**, and turn **Relay** off.
3. Open the browser console, enable **Verbose/Debug** messages and filter for `[MDSL]`.
4. Edit [`expansion.mdsl`](../../src/game/ai/mdsl/expansion.mdsl). Vite reloads the app; the round restores through normal game persistence, but bot memory starts fresh.

The opt-in controls **every configured AI faction**, not the player. Without it, normal utility AI still runs. Production builds ignore the flag. The URL flag is not written into game saves, so removing it and reloading switches back to normal AI on the saved board. Back up browser storage first if the current round matters: experiments use normal round saves.

There is deliberately no new UI, upload facility or built-in visual tree debugger. The existing enemy dashboard's worker-derived strategy diagnostics are **unavailable** in this synchronous prototype; its utility score/blocker details are not repurposed or fabricated. Console events are the prototype's observation channel. No commands are sent to a remote service.

## Editable tree

```text
root {
    selector {
        sequence exit(ReleasePlan, "capturePlan") {
            action [SelectCity, "neutral", "nearest-reachable", "target"]
            action [SelectSources, "target", 6, "sources"]
            action [PlanCapture, "target", "sources", 15000, "capturePlan"]
            action [ExecutePlan, "capturePlan"]
        }

        sequence exit(ReleasePlan, "attackPlan") {
            action [SelectCity, "enemy", "nearest-reachable", "attackTarget"]
            action [SelectSources, "attackTarget", 6, "attackSources"]
            action [PlanCapture, "attackTarget", "attackSources", 15000, "attackPlan"]
            action [ExecutePlan, "attackPlan"]
        }
    }
}
```

- `6`: minimum troops available to dispatch from a source, excluding the one retained troop.
- `15000`: maximum capture duration and execution timeout, in simulation milliseconds. The prototype accepts positive finite horizons up to 60000 ms.
- `target`, `sources`, `capturePlan` (and the attack branch's separate slots): named, agent-local memory slots. They are not IDs of actual cities.
- The selector tries neutral expansion first. If selection, planning or execution fails, it tries an enemy capture. A running plan keeps its branch; the selector does not reconsider expansion each tick during an attack. Swapping the two sequences makes enemy attacks the priority, without changing agent code.
- A finished tree starts a new attempt at the next normal decision. There is no infinite `repeat` decorator needed in this host.
- Select/plan actions can all succeed in one decision. ExecutePlan then stays running across decisions until the actual capture or failure. It does not rerun the completed selection/planning nodes.

The configured enemy behavior currently supplies only its initial delay and decision interval; its attack/expansion/role-scoring preferences do not influence this tree. To slow observation further, raise that behavior's `decisionIntervalMs` in `src/game/ai/behaviors.ts` (this also changes normal AI using that profile). `wait [1000]` nodes may be inserted between actions for demonstration pacing. Waits use **simulation time**, quantized to bot decision ticks, never paused/background wall time.

## Capability contracts

### SelectCity(query, ranking, outputSlot)

Queries are `neutral` and `enemy`; ranking is `nearest-reachable`. Enemy means any non-neutral city owned by another faction, relative to the acting bot—not the literal faction ID `enemy`. It selects a matching city with minimum center-to-center distance from an available friendly city with legal ground access, breaking ties by city ID. It excludes targets with this faction's existing ground orders. It does **not** forecast capture feasibility or silently run utility scoring.

### SelectSources(targetSlot, minimumArmy, outputSlot)

Stores eligible friendly source IDs in distance/ID order. Sources must have the minimum dispatchable army, legal access to the target, and no current outgoing ground groups. This is the clearer name for the earlier illustrative `SelectDonors`: these cities could supply the target. No command or reservation is created.

### PlanCapture(targetSlot, sourcesSlot, maxDurationMs, planSlot)

Tries each selected source independently and keeps the first feasible **single-source** plan. It does not combine their troops. The forecast simulates real all-but-one dispatch, staggered launches, growth, collisions, shields, weapons, terrain, rivers, Defender access, existing orders and round boundaries. It requires predicted capture and source retention within the allowed duration; an opposing Relay winner invalidates the plan. There are no hidden home-reserve or utility-scoring policies.

Selection/planning leave simulation state unchanged. Failed calls clear their output slots. Unsupported query/ranking names fail loudly rather than silently mapping to an invented policy.

### ExecutePlan(planSlot)

Rechecks feasibility using current state, applies the order through `session.applyFactionAction`, and records accepted transfer IDs. It returns RUNNING without dispatching again while the plan's groups exist. Target ownership is the success criterion; source loss, exhausted orders without capture, timeout, invalidation or rejection fail the plan. Events distinguish these reasons.

Both neutral and enemy targets use the same capture planner/executor; no special AttackEnemy method exists. Ground commands are labeled `expand` for a currently neutral target and `attack` for a hostile-owned target. Enemy growth, shields and other real defenses participate in feasibility forecasts, including a final enemy capture that ends the round.

The compatibility action has `score: 0` only because the existing command type requires a score; it is **not** a tactic evaluation and is not shown as a utility score.

### ReleasePlan(result, planSlot)

Mistreevous supplies `{ succeeded, aborted }` before the authored slot argument. Cleanup is idempotent and drops bot memory only. This slice creates no separate bot reservations. Already accepted queued/airborne game orders continue; cleanup does not recall troops or cancel the game's launch queue.

## Runtime and lifecycle

- `agent.ts`: capabilities and typed blackboard.
- `runtime.ts`: Mistreevous 4.3.1 tree, explicit five-method agent binding and simulation-time delta.
- `expansion.mdsl`: source-authored neutral-expansion/enemy-capture selector, imported as raw text by Vite.
- `startBoard.ts`: development URL opt-in, one persistent runtime per AI faction and normal simulation-time decision scheduling. Legacy workers and synchronous utility AI are both disabled while opted in.
- One accepted action maximum per tick for this two-tactic selector. Public game commands still enforce all rules.
- Pause/hidden time does not step the bot. Resume keeps its plan. Restart/Home/disposal drop runtime memory; new sessions get fresh trees.
- Reload does not deserialize tree/plan state. Existing outgoing orders make sources busy, and friendly incoming ground orders exclude already-targeted neutral and hostile cities. Fresh trees observe rather than replace those orders.
- Synchronous execution is intentional for this small experiment. Moving the planner to a worker needs an explicit command-acknowledgement protocol; merely marking a worker-returned action as dispatched would be incorrect.

## Limits and next experiments

This is a connection proof, **not a competitive opponent**. It expands into neutrals and falls back to capturing enemies. If neither selected target is feasible, it waits. It has no defense, conversion, aircraft, staging, multi-source planning, candidate-target fallback, compound user rules or visual editor. A nearest target that is legal but infeasible can block farther feasible targets within its query. Source retention is checked against known orders during the bounded capture forecast; future opponent commands are not predicted. All-but-one dispatch can still expose a city.

The MDSL is trusted project source, not validated untrusted player input. Runtime isolation, resource budgets, an upload/editor validation contract, worker performance and serialized resumable plans remain future work. No framework-wide migration is implied.

Possible later experiments: candidate-target fallback, persistent multi-source plans and player-defined interruption conditions. Keep these separate from optional editor/dashboard UI work.

## Verification

- `src/game/ai/mdsl/runtime.test.ts`: pure planning, persistent one-shot execution, actual capture, failures, source isolation, reload exclusion, source fallback, shields, access rules, source safety, simulation-time waits and cleanup.
- `src/board/startBoard.test.ts`: opt-in excludes workers, pause/resume/hidden handling, restart and disposal; existing default worker lifecycle remains covered.
- `tests/mdsl-prototype.spec.ts`: real neutral-then-enemy captures, conquest of the last player city, restart, pause/reload without duplicate orders, and unchanged default-worker operation.
- Enemy-capture follow-up: **882 unit tests / 104 files**, **all 5 focused MDSL browser tests** and TypeScript/production build pass. Unit coverage adds hostile faction identity, infeasible neutral fallback, neutral priority, enemy growth/shields and persistent attack execution. The full standard-browser suite was not rerun for this small follow-up; the 140-test result below is the preceding prototype checkpoint.
- Implementation checkpoint: **875 unit tests / 104 files**, **140 standard Chromium browser tests serially**, TypeScript/production build and whitespace checks pass. Live generated Open-field smoke test confirmed real MDSL dispatch/capture with console events.
- Separate production PWA verification is **blocked by a pre-existing header overlap**: at 320px with Update ready, the dashboard toggle intercepts Home clicks. Both PWA tests reproduce the same timeouts on an archived, unchanged HEAD, without any prototype changes. This was not fixed or hidden by weakening tests. Logs: `/tmp/dotfield-mdsl-pwa-debug.log` and `/tmp/dotfield-mdsl-baseline-pwa.log`.
- The first standard-browser attempt caught a transient incomplete source edit; the full stable-source rerun passed all 140 tests. Final logs: `/tmp/dotfield-mdsl-unit.log` and `/tmp/dotfield-mdsl-browser-final.log`.
- Human tactical balance and real-device performance remain manual, not completed by automated tests.
