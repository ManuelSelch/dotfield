# Command Relay — Requirements

## Goal

Give Dotfield a mid-game objective and a way to win without conquering every city. Make holding the Courtyard compete with expansion, Factory control and preserving the original home, rather than make bridge ownership itself the victory condition.

Status: planning only. The user requested continuing the relay concept after successfully playtesting Courtyard and the Defensive Network AI fix. This is not authorization to implement relay gameplay. The existing playable baseline is unchanged.

## Scope

### In Scope
- One relay objective on the existing Courtyard layout, with its existing 20–30 cities and exactly one enemy.
- Delayed activation, cumulative ownership-based progress and an alternative victory condition.
- Compact scoreboard, objective marker, countdown and clear result reason.
- Objective-aware AI using existing legal ground, staging, conversion and aircraft commands.
- Exact simulation timing, pause/reload/restart compatibility, legacy non-relay saves and automated regression coverage.
- A focused controls/HUD mockup and explicit visual approval before production UI implementation.

### Out of Scope
- New map layouts, moving mountains/bridges or another generator redesign.
- Relay play on other layouts, multiple relays or multi-enemy relay balance in this increment.
- Bonus production, free troops, special relay shields, terrain changes or a new city role.
- New transport/pathfinding mechanics, automatic ground detours, alliances or hidden AI advantages.
- Progression, rewards, difficulty presets, AI inspector and online services.

## Requirements

- **R1 — Preserve the baseline.** Existing conquest rounds, layout choices, upgrades, city roles and all-but-one dispatch remain available and unchanged. A legacy Courtyard round must not silently become a relay match. Preserve inactive enemy settings. The threat-aware Defensive Network home protection from commit `29198f0` must remain effective; do not restore a fixed garrison minimum.
- **R2 — One stable objective.** Identify the existing `courtyard` city as the relay, away from both paired crossings. Do not add another city, change requested counts or reposition the seed's field. Its identity survives ownership changes, city conversion and restore. Recommended role behavior is specified under Assumptions, pending confirmation.
- **R3 — Visible preparation period.** Announce the relay location and activation countdown from round start. Capturing it before activation is allowed, but earns no points. Activation uses elapsed active simulation time, never wall-clock time.
- **R4 — Cumulative holding.** After activation, only the current non-neutral owner earns holding time at one point per simulation second. Neutral ownership earns nothing. Losing control pauses that faction's total; capture and recapture never reset either score. Track fractional progress without render-rate rounding loss; UI rounding must not decide the winner. A zero-garrison city still belongs to its current owner under existing combat rules and therefore still scores.
- **R5 — Precise event boundaries.** Credit each elapsed scoring interval to the owner during that interval, not retroactively to a city captured at its end. Split activation, capture and winning-threshold boundaries as necessary. Bulk advancement and repeated small steps must agree; do not award an entire delayed frame past a capture or win. Define and test deterministic precedence for simultaneous conquest and relay completion before implementing it.
- **R6 — Alternative victory.** First to the agreed holding target wins even while the opponent still owns cities or has troops/cargo in transit. Ordinary elimination remains a valid way to win, including before activation; preserve existing airborne/cargo survival accounting. Stop simulation, scoring, AI and gameplay commands at the terminal boundary. Show whether the round ended by relay or conquest without replacing existing victory/defeat semantics.
- **R7 — Shared simulation and AI forecasts.** Live play, synchronous AI and worker forecasts must use the same objective definition, scoring clock, capture ordering and terminal rules. Review the current forecast fast paths: they must not skip activation or winning events, or forecast useful actions after a relay defeat. No invented future opponent orders or scoring bonuses.
- **R8 — Persistence and lifecycle.** Save the objective definition, faction scores, timing and terminal reason with the exact opening/live round. Preserve partial progress on reload and pause; exclude hidden/offline time. Restart/Play again reset scores/countdown on the same opening and mode. Reroll changes only the next Home preview. Returning Home clears the abandoned round. Missing objective metadata means legacy conquest, not automatic inference from city IDs/layout; reject malformed objective runtime safely using existing corrupt-save conventions. Persist an explicit Home mode selection if that proposed control is approved.
- **R9 — Objective-aware opposition.** AI must expand during preparation, legally stage toward the relay through bridges/entrances, attempt feasible captures and recaptures, reinforce a threatened held relay and respond to an opponent close to winning. Holding progress must affect strategic priorities without disabling home safety, genuine emergency defense or economy safeguards. All three behaviors must recognize relay victory; aggression is not permission to cheat. Test that the AI can pursue a reachable relay via intermediate cities, not only value a direct attack.
- **R10 — Compact, stable presentation.** Reuse the preferred compact scoreboard from `mockups/relay/` and Courtyard geography, not its illustrative field dimensions or authored mid-game holdings. Show activation time, both accumulated scores, target and current holder; visibly distinguish inactive, neutral, friendly-held and enemy-held states. Keep troop counters, shields and role badges readable. No large mission card, required animation or recurring toast. Provide accessible objective/city descriptions and bounded announcements, not per-frame live-region spam. Maintain the fixed city-action strip, minimum 44px interactive targets and stable Canvas geometry across countdown/holding/urgent/paused/results states at phone and desktop sizes.
- **R11 — Approval and verification.** Rules/tuning and new mode/HUD integration remain subject to the questions below and mockup approval. Use deterministic failing tests before each implementation slice. Automated checks must cover thresholds, capture/recapture, neutral/zero-garrison ownership, simultaneous events, known ground/air arrivals, pause/hidden/reload/restart, worker parity and legacy conquest. Human playtests must assess whether the objective actually creates economy-versus-holding trade-offs; passing tests do not establish balance or real-iPhone usability.

## Assumptions

These are recommendations, not confirmed rules:
- Make Relay an optional Courtyard-only match mode, Off by default so current Courtyard conquest remains intact. Keep Factory and Slow Zone independent. Show the relay in the Home preview only when enabled; preserve the selection when temporarily switching layouts, but never apply it to an unsupported layout.
- Use the mockup's initial tuning: activation at **60 active seconds**, first to **90 cumulative holding seconds** wins. This gives a minimum relay victory time of 2:30; conquest may finish sooner. Values are tuning constants, not a new advanced-settings panel or proven balance.
- Keep the relay as an ordinary neutral 10-troop Production city at the opening. Ownership alone determines scoring; normal conversion into any existing role remains legal and does not remove the objective. Ordinary Factory/Slow Zone and faction effects continue to obey existing rules, with no relay-specific boost.
- For simultaneous events, resolve physical combat/capture and existing elimination consistently before declaring relay completion at that timestamp; elapsed holding already earned is not reassigned to the captor. Confirm this policy and encode explicit boundary tests before implementation.
- The preferred compact scoreboard is a visual direction, not approval of its exact placement in the current production shell. The prior relay mockup remains a study, and the Courtyard approval explicitly excluded relay scoring.

## Implementation Plan

### 1. Confirm Rules and Approve Integration Mockup
Description: Resolve all open questions, record confirmed defaults and adapt the existing compact scoreboard to the real Home/playing shell in an isolated mockup. Show mode selection, inactive/holding/urgent/paused/result states, objective marker and five-role controls at 320px, 430px and desktop widths. Obtain explicit visual approval. Do not change production code in this slice.

### 2. Objective State and Holding Clock
Description: After slice 1, add an explicit optional relay definition and runtime scores with pure simulation tests. Attach it to the existing Courtyard city only for the selected mode. Implement activation, fractional cumulative holding, neutral handling and capture-boundary accounting in the shared physical timeline. Verify small-step/bulk equivalence and no scoring in legacy conquest states; leave production mode entry disabled until the playable integration is ready.

### 3. Victory and Forecast Boundaries
Description: Build on slice 2 to resolve relay completion alongside conquest, preserve a terminal reason and freeze exactly at the winning event. Cover simultaneous capture/elimination/threshold cases and cargo survival. Update forecast fast paths and worker-visible state so live and forecast objective outcomes agree without running recursive AI decisions. Verify terminal forecasts cannot value post-defeat moves.

### 4. Save, Restore and Replay
Description: After slices 2–3, thread the exact objective definition through opening/session construction and restart, and validate objective runtime/results in round saves. Preserve fractional scores and remaining activation time without offline catch-up. Legacy saves stay conquest. Cover paused, hidden, active and terminal restoration, corrupted objective data, Home abandonment and replay resets using existing event-only save semantics.

### 5. Relay-Aware AI
Description: After slices 2–4, add bounded objective priorities to existing order/action scoring and strategic staging. Test preparation expansion, routes through paired crossings and entrances, feasible capture/recapture, reinforcement and urgent denial across all three behaviors. Use the real command/forecast paths for ground and air actions; retain threat-aware home safety, production safeguards and independent faction rules. Verify deterministic synchronous/worker parity and continued non-relay behavior.

### 6. Playable Mode and Compact HUD
Description: After the approved mockup and slices 2–5, wire the mode into Home preferences, the exact preview-to-Play setup and replay, then implement the relay marker, compact scoreboard/countdown, accessible descriptions and terminal reason. Test supported-layout guards and legacy preference handling. Verify stable Canvas/action-strip geometry, no overflowing counters/controls, keyboard/screen-reader operation and normal drag/Fly interaction across all match states.

### 7. Integrated Verification and Playtesting
Description: After slice 6, run the complete unit, serial browser, production build and PWA suites. Add real-worker browser scenarios for both factions scoring, relay victory without elimination, capture/recapture, upgrades including Defensive Network, pause/reload/restart and unchanged conquest rounds. Playtest several seeds at 20/24/30 cities to assess competing approaches, economy choices, urgency and duration; separately record actual-iPhone checks and remaining limitations. Tune only from observed evidence and document the delivered behavior.

## Open Questions

1. Should Relay be an optional Courtyard-only mode, Off by default, preserving ordinary Courtyard conquest?
2. Should the initial rules be activation at 60 active seconds and victory at 90 cumulative holding seconds, with progress preserved after losing control?
3. Should the relay remain an ordinary convertible city, with ownership alone earning points regardless of its current role?
4. If conquest and relay completion occur at the same timestamp, should conquest take precedence after physical combat/capture resolution?
