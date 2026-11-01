# AI Phase 2 — responsiveness and assemble-then-attack

Phase 1 (commit `264edc8`) pruned infeasible candidates and shared baseline
forecasts, cutting decision latency ~2–3×. It deliberately changes no outcome.
This phase adds the two behavior changes the user asked for: a hard decision
time budget (2a) and general assemble-then-attack (2b), plus the role-priority
rebalance that makes 2b observable.

Everything here is a proposal until the user approves the scenario outcomes.

## 2a — Decision time budget

### Design

- `chooseActionWithTrace(state, config, factionId, options?)` gains an optional
  `options: { budgetMs?: number; now?: () => number }`. `now` defaults to
  `performance.now`; omitted/`Infinity` means today's unlimited behavior.
- One `DecisionBudget` object is created per decision and threaded into
  `chooseOrder`, `chooseFlight`, `chooseConversion`, `chooseRelayRecapture`.
- The budget is checked **before every forecast/candidate**, not inside a
  forecast. On expiry each enumerator stops and returns its best-so-far; the
  deadline is shared, so a truncated `chooseOrder` also prevents flight and
  conversion from starting fresh work.
- `worker.ts` passes `budgetMs: 1200` (a named constant, tunable). The
  synchronous `chooseAction` path used by pure tests keeps an unlimited budget,
  so existing deterministic tests are untouched.
- Observability: when the budget truncates a decision, add a decision-scope
  blocker `decision-budget` to the trace so the dashboard reports it instead of
  implying a full evaluation.

### Scenarios — `src/game/ai/decision-budget.test.ts`

1. **Preserved** — with no options, `chooseActionWithTrace(state, cfg, 'enemy')`
   selects the same action as today on the 30-city Courtyard+Relay fixture.
2. **Preserved** — `{ budgetMs: Infinity }` equals the no-options action.
3. **New** — with `budgetMs: 0` the call still completes, returns the action
   chosen before expiry (or `null`), and never throws.
4. **New** — an injected `now` that expires after N forecasts bounds
   `forecastCallCount()` to that N; no forecast starts after expiry.
5. **New** — a truncated decision records `decision-budget` in the trace.

## 2b — General assemble-then-attack

### Design

New module `src/game/ai/assembly.ts`:

```
chooseAssembly(state, config, factionId, distances, baselines, budget): AiOrder | null
```

- **Objectives** (bounded to the top 3): a hostile or neutral target `T` with a
  legal ground route from at least one owned city, ranked by value — an active
  hostile Relay first, then Factory/economic neutrals, then breach value and
  low garrison.
- **Needs help**: only consider `T` when no single owned city can already capture
  it. Reuse the Phase 1 conservative bound: `max` over staging cities of
  `available(D) - 1 + committedFriendly + maxArtilleryDamage <= T.units` means a
  single city cannot win, so normal `chooseOrder` ignores `T`.
- **Staging city** `D`: owned, `canGroundOrder(D, T)`, not under known threat,
  stable choice (front-distance, then city id) so assembly does not ping-pong.
- **Donor** `S`: owned, `canGroundOrder(S, D)`, enough troops, not the network
  home reserve, `keepsHomeReserve` safe, no incoming threat.
- **Not futile**: only return the reinforce order when
  `available(D) + sum(eligible donors) + maxArtilleryDamage > T.units`, using the
  same bound, so the AI never builds an army that cannot reach capture.
- **Score**: `objectiveValue × progress − travelCost`, kept below emergency
  defence and below any feasible direct attack/expansion. Assembly is chosen
  only when no real offensive order is feasible.
- **Integration**: `chooseOrder` already evaluates direct attacks and relay
  recapture first. `selectAction` calls `chooseAssembly` when the ground result
  is `null` (or only a low-value order), before conversion. Relay recapture stays
  the multi-wave direct-attack fast path; assembly is the fallback that builds
  the wave when no donor set is currently large enough.

### Scenarios — `src/game/ai/assembly.test.ts`

1. **New** — hostile Relay at 240 troops; three owned 50-troop cities, none able
   to take it alone, but a rear donor can reach a staging city that borders the
   Relay → the AI returns `reinforce` from the donor to that staging city rather
   than building Artillery.
2. **New** — repeating decisions lets the staging city accumulate; the AI then
   attacks and captures the Relay before the holder's victory threshold.
3. **Preserved** — when one source already forecasts a Relay capture, the AI
   attacks directly and never assembles.
4. **Preserved** — a real emergency defence (`incomingThreat`) still outranks
   assembly.
5. **Preserved** — an unsafe donor (would break the original-home reserve or lose
   its source) is rejected; assembly picks another donor or returns `null`.
6. **Preserved** — with no legal staging route to any valuable objective,
   `chooseAssembly` returns `null` and existing behavior is unchanged.

## Role-priority rebalance

### Design

- `chooseConversion` evaluates Artillery/Watchtower opportunities only when no
  feasible expansion/attack was found **and** no assembly was chosen. A real
  Defender for an exposed city remains available at all times.
- This is behavior-gated, not a score tweak, so the reason is visible in the
  trace (`role-already-built`/`conversion-economy-guard` unchanged; add
  `offense-available` for the gated case).
- Aggressive's `roleConversionPenalty` stays as a secondary tiebreak.

### Scenarios

1. **New** — Aggressive AI with a capturable adjacent neutral expands instead of
   building Artillery.
2. **Preserved** — with no useful expansion/attack and a real threat, the AI still
   builds a Defender.
3. **Preserved** — with no useful expansion/attack and no threat, a useful
   Artillery build is still possible.

## Verification plan

- Unit: the three new files above plus the whole suite green.
- Browser: `tests/ai.spec.ts`, `ai-capped-stall`, `ai-production`, `airfield-ai`,
  `courtyard-ai`, `relay-ai`, `relay-recapture`, then the full serial suite.
- Regression guard: the 30-city latency guard must still pass under the worker
  budget.
