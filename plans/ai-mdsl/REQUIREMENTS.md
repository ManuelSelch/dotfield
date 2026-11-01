# MDSL real-game prototype — Requirements

## Goal
Validate that a small Mistreevous MDSL tree can control real Dotfield troops through reusable agent capabilities, with persistent multi-tick plans. This is an experiment, not migration of the existing opponent.

## Scope
### In Scope
- A development-only `?bot=mdsl` opt-in using the existing game board and commands for configured AI factions.
- Editable MDSL neutral-expansion and enemy-capture tactics sharing SelectCity, SelectSources, PlanCapture and ExecutePlan.
- Source-list iteration and ordered chosen-source sets; exact-set multi-source capture forecasting using real commands and battle simulation.
- Simulation-time decision cadence, persistent tree/agent instances, console events and lifecycle tests.

### Out of Scope
- Production bot picker, in-game editor, visual tree debugger and arbitrary player JavaScript.
- Automatic source-combination strategies inside the agent, synchronized-arrival tactics, staging, air transport, conversion, defense, compound policy definitions and Relay tactics.
- Replacing utility AI, changing game rules, serialization of tree state or claiming competitive strategy quality.

## Requirements
- Without the opt-in, existing AI and worker behavior remain unchanged. The opt-in is development-only and must not run alongside legacy AI.
- Selection and planning issue no commands. Output slots are cleared on failure.
- Selection supports neutral and enemy targets ranked by nearest legally reachable friendly source, with stable city-ID ties. Enemy means another non-neutral faction, not a fixed faction ID.
- The default tree tries neutral expansion first, then enemy capture when the expansion branch fails. Running capture plans retain their branch. Both branches reuse the same planner/executor; attacks require a feasible real-game capture forecast, including enemy production and shields.
- Sources must be owned, have the authored minimum dispatchable army and no existing outgoing order; legal ground access is mandatory.
- NextCity advances an agent-local source-list cursor and clears its output on exhaustion. ClearSet resets an ordered city set; AddToSet inserts a selected city without duplicates. These operations issue no commands or reservations.
- MDSL decides source combinations, source limits and fallback. The default tree adds one source per planning attempt with retry [4]; unsuccessful retries span decisions. The planner must never silently add/drop sources or search subsets.
- Planning snapshots the exact supplied ordered source set, uses the same all-but-one dispatch and battle forecast as the game, and advances the simulation between commands at actual host decision cadence. It must forecast capture and retention of all supplied sources within the authored maximum planning duration. It invents no future hostile orders.
- ExecutePlan revalidates the remaining combined schedule before each dispatch, issues at most one due order per decision interval, and tracks accepted transfer IDs per source. It waits across decision ticks for actual target ownership, stops unused waves on capture, and fails on rejected commands, source loss, exhausted orders or a fixed execution deadline. It must not repeatedly replace launch queues or replace sources.
- Exit cleanup is idempotent and drops bot memory only; already accepted game orders continue.
- Pause and hidden time do not step the tree. Restart discards tree/agent memory. Reload starts fresh bot memory and excludes cities with already active outgoing orders to avoid duplicate dispatch.
- Console events identify faction, simulation time, method, outcome and selected city/source. Existing utility-AI dashboard traces must not be fabricated for this prototype.
- Console planning events expose the plan slot and chosen source IDs, and selection exposes the query, so neutral and enemy branches are distinguishable.
- Document limitations: nearest target within a query is not automatically replaced when infeasible, greedy bounded source accumulation is an authored tactic rather than optimal combination search, no defense against future commands, no source reservations between parallel plans and no saved plan resumption.

## Assumptions
- A development URL flag and source-file MDSL editing are sufficient for this first experiment; no new UI is needed.
- Running this small opt-in prototype synchronously at the existing decision cadence is acceptable. Worker integration and performance budgeting are subsequent work.

## Implementation Plan
### 1. Minimal Agent and Tree
Description: Implemented: runtime, editable MDSL and typed blackboard with the four capabilities. Deterministic tests verify selection/planning purity, forecast feasibility, persistent execution, rejection and cleanup.

### 2. Opt-in Game Connection
Description: Implemented: real session command boundary in development opt-in mode, without running legacy AI. Unit and real-browser tests verify captures, pause, restart, reload and unchanged default worker behavior.

### 3. Playable Handover
Description: Implemented: [usage and behavior contract](../../docs/ai-mdsl/IMPLEMENTATION.md), console events and explicit limitations, with a playable development preview. All 875 unit tests, 140 standard browser tests and the production build pass. Broader validation remains blocked by a pre-existing 320px header overlap in both production PWA tests, reproduced on unchanged HEAD; see the behavior contract. Human tactical evaluation remains manual.

### 4. Enemy Capture
Description: Implemented: faction-relative enemy query, generic nonfriendly capture planning, correct attack command classification and a second MDSL branch. Verified by 882 unit tests and all five focused MDSL browser tests, including real neutral-then-enemy capture and conquest of the last player city. No staging, multi-source coordination, target-candidate iteration or new agent method.

### 5. Tree-authored Multi-source Capture
Description: Implemented: NextCity, ClearSet and AddToSet primitives; exact-set combined forecasting and per-source acknowledged execution at real host cadence. The editable MDSL—not PlanCapture—grows chosen sets through bounded retries. This supersedes slice 1's single-source planner search. Verified by 893 unit tests, all six focused MDSL browser tests and the production build, including an actual two-source capture with 1800ms dispatch spacing. No automatic source replacement, staging or synchronized-arrival strategy.

## Open Questions
None.
