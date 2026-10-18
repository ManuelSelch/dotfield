# MDSL real-game prototype — Requirements

## Goal
Validate that a small Mistreevous MDSL tree can control real Dotfield troops through reusable agent capabilities, with persistent multi-tick plans. This is an experiment, not migration of the existing opponent.

## Scope
### In Scope
- A development-only `?bot=mdsl` opt-in using the existing game board and commands for configured AI factions.
- Editable MDSL neutral-expansion and enemy-capture tactics sharing SelectCity, SelectSources, PlanCapture and ExecutePlan.
- One source per capture; evaluate eligible sources using the real battle forecast.
- Simulation-time decision cadence, persistent tree/agent instances, console events and lifecycle tests.

### Out of Scope
- Production bot picker, in-game editor, visual tree debugger and arbitrary player JavaScript.
- Multi-source coordination, staging, air transport, conversion, defense, compound policy definitions and Relay tactics.
- Replacing utility AI, changing game rules, serialization of tree state or claiming competitive strategy quality.

## Requirements
- Without the opt-in, existing AI and worker behavior remain unchanged. The opt-in is development-only and must not run alongside legacy AI.
- Selection and planning issue no commands. Output slots are cleared on failure.
- Selection supports neutral and enemy targets ranked by nearest legally reachable friendly source, with stable city-ID ties. Enemy means another non-neutral faction, not a fixed faction ID.
- The default tree tries neutral expansion first, then enemy capture when the expansion branch fails. Running capture plans retain their branch. Both branches reuse the same planner/executor; attacks require a feasible real-game capture forecast, including enemy production and shields.
- Sources must be owned, have the authored minimum dispatchable army and no existing outgoing order; legal ground access is mandatory.
- Planning uses the same all-but-one dispatch and battle forecast as the game. It must forecast capture and retention of the source within the authored maximum planning duration. It invents no future hostile orders.
- ExecutePlan revalidates before dispatch, issues at most one order, waits across decision ticks for actual target ownership, and fails on rejected commands, source loss, exhausted orders or timeout. It must not repeatedly replace launch queues.
- Exit cleanup is idempotent and drops bot memory only; already accepted game orders continue.
- Pause and hidden time do not step the tree. Restart discards tree/agent memory. Reload starts fresh bot memory and excludes cities with already active outgoing orders to avoid duplicate dispatch.
- Console events identify faction, simulation time, method, outcome and selected city/source. Existing utility-AI dashboard traces must not be fabricated for this prototype.
- Document limitations: nearest target within a query is not automatically replaced when infeasible, one source only, no defense against future commands and no saved plan resumption.

## Assumptions
- A development URL flag and source-file MDSL editing are sufficient for this first experiment; no new UI is needed.
- Running this small opt-in prototype synchronously at the existing decision cadence is acceptable. Worker integration and performance budgeting are subsequent work.

## Implementation Plan
### 1. Minimal Agent and Tree
Description: Implemented: runtime, editable MDSL and typed blackboard with the four capabilities. Deterministic tests verify selection/planning purity, forecast feasibility, persistent execution, rejection and cleanup.

### 2. Opt-in Game Connection
Description: Implemented: real session command boundary in development opt-in mode, without running legacy AI. Unit and real-browser tests verify captures, pause, restart, reload and unchanged default worker behavior.

### 3. Playable Handover
Description: Implemented: [usage and behavior contract](IMPLEMENTATION.md), console events and explicit limitations, with a playable development preview. All 875 unit tests, 140 standard browser tests and the production build pass. Broader validation remains blocked by a pre-existing 320px header overlap in both production PWA tests, reproduced on unchanged HEAD; see the behavior contract. Human tactical evaluation remains manual.

### 4. Enemy Capture
Description: Implemented: faction-relative enemy query, generic nonfriendly capture planning, correct attack command classification and a second MDSL branch. Verified by 882 unit tests and all five focused MDSL browser tests, including real neutral-then-enemy capture and conquest of the last player city. No staging, multi-source coordination, target-candidate iteration or new agent method.

## Open Questions
None.
