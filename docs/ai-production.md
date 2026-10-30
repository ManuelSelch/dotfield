# Production-aware AI logistics

The enemy uses the same 50-troop production cap, all-but-one orders and physical simulation as the player. Friendly arrivals can exceed 50. No troop bonuses, new controls or AI inspector are added.

## Behavior

- Safe rear cities become eligible for economic redistribution when they are at the cap or will reach it within five seconds. Time-to-cap uses the current owner's real production rate, local Factory bonus and fractional growth; a Factory therefore becomes eligible earlier than an otherwise equivalent ordinary city.
- Sources feed the best legally reachable staging city rather than distribute their reserves across many almost-full cities. A staging city may accumulate well above 50 while donor cities resume growing.
- Only usable destinations participate in that preference. An Airfield with insufficient room for the whole all-but-one order (including reserved/incoming supplies), or a destination under known ground/air attack, cannot veto another eligible staging city. A full Airfield must not strand the entire production economy at 50.
- A useful staging city has a legal manual-staging path toward a hostile city. Strategic distances account for mountains and paired river crossings. The distance estimate does not forward armies automatically or assume neutral cities are already captured.
- Existing attack, expansion and emergency-defense candidates remain available. Large collected armies can attack when the normal battle forecast finds a successful order; they are not permanently assigned a passive staging role.
- Aggressive prioritizes a forecast-feasible attack/expansion over optional role conversion. It can still build a useful role when no offensive ground order is available; older saved Aggressive configs infer this preference from their attack score.

## Candidate evaluation

- The normal frontline rule still accepts substantial forward concentration. Production relief additionally allows consolidation between similarly positioned cities; it does not require the previous 60-unit improvement toward the front.
- Production candidates compare the normal known-order battle forecast against the same forecast with the proposed transfer. Both use a horizon of at least 15 seconds, extended when the order or relevant arrivals take longer.
- Compare faction-wide surviving troops, including airborne groups but excluding duplicate counts of unlaunched reservations. This credits resumed growth and subtracts recipient production lost to capping. A transfer itself creates no benefit. Collision/combat losses are also reflected: this is a net army benefit, not a separate exact production counter.
- At least two additional forecast troops are required to relax the frontline rule. A bounded, increasing score bonus favors larger net gains without turning economic urgency into an unbounded override of defense. Travel cost still uses the order/arrival duration, not the minimum economic lookahead.
- Existing incoming friendly armies and faction/Factory growth modifiers are included by the shared real simulation. No future player orders or future AI decisions are invented.

## Safety and stability

- Economic redistribution is disabled when known hostile groups target the source or destination. A threatened destination instead uses the existing defense evaluation.
- Hold a source when a hostile city has a useful available army and a legal direct route whose first batch can arrive within three seconds for Aggressive, or five seconds for Balanced/Defensive, at its normal speed. This guard protects exposed capped strongholds even before an enemy dispatch; it is not a perfect future-threat model. Slow effects can make actual arrival later. The separate aircraft-departure guard remains five seconds for every behavior.
- A friendly transfer cannot receive a positive score by sacrificing a source that the no-order forecast would retain. The destination must also remain owned in the proposed forecast.
- Production transfers follow a stable staging priority: nearer front-distance bands, then lower production rate within a band, then shorter front distance, then city ID for equal positions. Band width uses `AiConfig.frontlineAdvance` (60 by default).
- Priority does not depend on current garrison or friendly incoming troop counts, so merely filling a collection city does not reverse the direction. The best reachable eligible sink receives the donors. A Factory can export into an ordinary city in the same band to preserve the higher-value production site.
- Rearward economic transfers are not allowed across front bands. Ownership/strategic-front changes may legitimately change the preferred staging city. Known contested destinations are not used as economic sinks.
- Existing source-busy rules, minimum dispatch size, terrain legality and manual river staging remain unchanged. Holding a capped army is valid when no safe, useful consolidation exists.

## Tuning and verification

`PRODUCTION_AI` in `src/game/ai/config.ts` contains the lookahead, cap lead time, default source-threat window, minimum gain and bounded bonus scale. Aggressive's optional `roleConversionPenalty` affects action selection only; legacy configs derive the same penalty from their existing attack score. Aggressive overrides the production source-threat window with optional `AiConfig.productionThreatTravelMs: 3000`; Balanced/Defensive and legacy saved configs without that field use the five-second default. Existing saved rounds retain their compiled settings; start a new match to receive the new Aggressive override. All AI factions use this policy independently; their existing defense/attack/frontline scores still differ.

`src/game/ai/production.test.ts` covers pre-cap relief, repeated decisions without ping-pong, consolidation above 100, premature evacuation, Factory timing and priority, a net-negative Factory sink, queue accounting, stronghold preservation, known threats, emergency defense, attacks from collected armies, disabled production, bridge/mountain legality, independent factions and immutability. `tests/ai-production.spec.ts` exercises the real worker and production round-save entry path at mobile and desktop widths.

`src/game/ai/cappedStall.test.ts` reproduces the full-Airfield deadlock, checks all behaviors, partial room, reserved supplies, a non-default faction and Relay-off compatibility, then runs 130 seconds of repeated production/decisions through consolidation above 100 and a successful attack. `tests/ai-capped-stall.spec.ts` repeats the progression through the real asynchronous worker and saved-round entry; virtual stepping waits for worker replies rather than applying stale decisions after large clock jumps.

These checks establish rule behavior, not optimal play or human balance. The policy remains a deterministic heuristic with known-order forecasts; it has no long-term campaign planner, predicted enemy feints or persistent logistics-role state.

## Decision performance

A decision runs inside the AI worker, so its cost is visible as *Waiting for worker response* in the enemy dashboard. Large Courtyard + Relay boards (30 cities, city roles, many in-flight armies) previously took 10–18 s per decision because `chooseOrder` ran a full battle forecast for every source/target pair and baselines were recomputed per candidate.

Two kinds of work are now skipped **without changing which action is chosen**:

- **Necessary-condition pruning.** A candidate that the feasibility rules would reject is dropped before its forecast. Friendly targets are skipped when they are neither front-line nor production relief nor a useful airlift sink, or when a full Airfield cannot take the order. Hostile/neutral targets are skipped when even the best possible case — every committed friendly troop plus every in-range artillery shot — cannot outnumber the current garrison. Since combat trades 1:1 and only artillery can lower a garrison without a matching attacker loss, this lower bound is exact for pruning.
- **Shared baselines.** Ground, flight and conversion branches share one decision-scoped `BaselineForecasts` cache keyed by horizon; a relay recapture also stops before forecasting donor prefixes when no prefix can outnumber the holder.

`src/game/ai/candidates.ts` holds the shared lower-bound helpers. `src/game/ai/forecast.ts` exposes `resetForecastCalls`/`forecastCallCount` for profiling. `src/game/ai/decisionLatency.test.ts` builds a 30-city Courtyard + Relay state and bounds both the forecast count and wall-clock time, so candidate enumeration cannot silently regress to forecasting every pair. These changes preserve outcomes; they do not add a time budget or a campaign planner.
