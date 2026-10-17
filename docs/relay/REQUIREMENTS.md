# Command Relay — Requirements

## Goal

Give Dotfield a mid-game objective and a way to win without conquering every city. Make holding a central relay compete with expansion, Factory control and preserving the original home, rather than make bridge ownership itself the victory condition.

Status: rules updated from user feedback; production gameplay remains unimplemented. Relay is an On the field option across layouts, activates after 120 active seconds and requires 180 cumulative holding seconds to win. The relay remains an ordinary convertible city. The user delegated exact simultaneous-victory precedence to the simplest implementation: existing conquest evaluation first, then relay completion. The next step is a controls/HUD integration mockup, not production UI implementation. The existing playable baseline is unchanged.

## Scope

### In Scope
- One optional relay objective on every generated layout, selected under On the field alongside the independent Factory and Slow Zone controls. Preserve existing layout-specific city/enemy limits: Courtyard 20–30 cities/one enemy; other layouts 6–30 cities/one to four enemies.
- Delayed activation, cumulative ownership-based progress and an alternative victory condition.
- Compact scoreboard, objective marker, countdown and clear result reason.
- Objective-aware AI using existing legal ground, staging, conversion and aircraft commands.
- Exact simulation timing, pause/reload/restart compatibility, legacy non-relay saves and automated regression coverage.
- A focused controls/HUD mockup and explicit visual approval before production UI implementation.

### Out of Scope
- New map layouts, moving mountains/bridges or another generator redesign.
- Multiple relays, randomized objective placement or a guarantee of competitive balance across every seed/faction count. Multi-enemy functionality is included, but balance still needs playtesting.
- Bonus production, free troops, special relay shields, terrain changes or a new city role.
- New transport/pathfinding mechanics, automatic ground detours, alliances or hidden AI advantages.
- Progression, rewards, difficulty presets, AI inspector and online services.

## Requirements

- **R1 — Preserve the baseline.** Existing conquest rounds, layout choices, upgrades, city roles and all-but-one dispatch remain available and unchanged. A legacy Courtyard round must not silently become a relay match. Preserve inactive enemy settings. The threat-aware Defensive Network home protection from commit `29198f0` must remain effective; do not restore a fixed garrison minimum.
- **R2 — One stable central objective.** Relay On marks the existing `courtyard` city on Courtyard, away from both paired crossings. Other layouts select an existing neutral city near the field's center, considering legal approaches from each starting faction rather than choosing a random city or a faction's starting home. Use deterministic selection/ties for the seed, keep the objective visible in the Home preview and assess unequal approach times in tests/playtests; central placement alone does not prove fairness. Do not add another city, change requested counts, reposition the seed's field or alter its normal opening garrison. The relay starts as ordinary Production and may become any existing role; ownership alone controls scoring. Its objective identity survives capture, conversion and restore.
- **R3 — Visible preparation period.** Announce the relay location and activation countdown from round start. Capturing it before activation is allowed, but earns no points. Activation occurs at **120 seconds** of elapsed active simulation time, never wall-clock time.
- **R4 — Cumulative holding.** After activation, only the current non-neutral owner earns holding time at one point per simulation second. Neutral ownership earns nothing. Losing control pauses that faction's total; capture and recapture never reset any faction's score. Track fractional progress without render-rate rounding loss; UI rounding must not decide the winner. A zero-garrison city still belongs to its current owner under existing combat rules and therefore still scores.
- **R5 — Precise event boundaries.** Credit each elapsed scoring interval to the owner during that interval, not retroactively to a city captured at its end. Split activation, capture and winning-threshold boundaries as necessary. Bulk advancement and repeated small steps must agree; do not award an entire delayed frame past a capture or win. At a timestamp, account for the holding interval just completed, resolve physical events, then evaluate existing conquest before relay completion. Capture alone cannot undo an already-earned threshold: if no conquest result supersedes it, the faction that completed its holding target wins even if the city changes hands at that timestamp. Capture just before completion pauses progress below the target. Encode these boundaries explicitly in tests.
- **R6 — Alternative victory.** First to **180 cumulative holding seconds** wins even while opponents still own cities or have troops/cargo in transit. The earliest relay victory is therefore 5:00 after round start; this is not a forced match duration. The user's current matches last around ten minutes, so replace the older 2–4-minute assumption for relay playtesting with observed duration rather than a promised limit. Track progress independently for every participating faction, with no alliances. Ordinary elimination remains a valid way to win, including before activation; preserve existing airborne/cargo survival accounting. Stop simulation, scoring, AI and gameplay commands at the terminal boundary. Show whether the round ended by relay or conquest without replacing existing victory/defeat semantics.
- **R7 — Shared simulation and AI forecasts.** Live play, synchronous AI and worker forecasts must use the same objective definition, scoring clock, capture ordering and terminal rules. Review the current forecast fast paths: they must not skip activation or winning events, or forecast useful actions after a relay defeat. No invented future opponent orders or scoring bonuses.
- **R8 — Persistence and lifecycle.** Save the objective definition, faction scores, timing and terminal reason with the exact opening/live round. Preserve partial progress on reload and pause; exclude hidden/offline time. Restart/Play again reset scores/countdown on the same opening and mode. Reroll changes only the next Home preview. Returning Home clears the abandoned round. Missing objective metadata means legacy conquest, not automatic inference from city IDs/layout; reject malformed objective runtime safely using existing corrupt-save conventions. Persist the explicit Relay On/Off field setting; switching layouts retains it, and preview/Play use the same resolved objective. Missing legacy preference fields default Relay Off.
- **R9 — Objective-aware opposition.** AI must expand during preparation, legally stage toward the relay through bridges/entrances, attempt feasible captures and recaptures, reinforce a threatened held relay and respond to an opponent close to winning. Holding progress must affect strategic priorities without disabling home safety, genuine emergency defense or economy safeguards. All three behaviors must recognize relay victory; aggression is not permission to cheat. Test that the AI can pursue a reachable relay via intermediate cities, not only value a direct attack.
- **R10 — Compact, stable presentation.** Reuse the preferred compact scoreboard from `mockups/relay/` and Courtyard geography, not its illustrative field dimensions or authored mid-game holdings. Show activation time, every participating faction's accumulated score, target and current holder; remain readable with up to five factions, not just the two-column study; visibly distinguish inactive, neutral, friendly-held and enemy-held states. Keep troop counters, shields and role badges readable. No large mission card, required animation or recurring toast. Provide accessible objective/city descriptions and bounded announcements, not per-frame live-region spam. Maintain the fixed city-action strip, minimum 44px interactive targets and stable Canvas geometry across countdown/holding/urgent/paused/results states at phone and desktop sizes.
- **R11 — Approval and verification.** Activation/holding times, ordinary role behavior and On the field placement are confirmed; production controls/HUD integration still needs mockup approval. Use deterministic failing tests before each implementation slice. Automated checks must cover thresholds, capture/recapture, neutral/zero-garrison ownership, simultaneous events, known ground/air arrivals, pause/hidden/reload/restart, worker parity and legacy conquest. Human playtests must assess whether the objective actually creates economy-versus-holding trade-offs; passing tests do not establish balance or real-iPhone usability.

## Assumptions

- Default Relay Off for fresh Home preferences as a conservative compatibility choice; show/review this default in the integration mockup. The user confirmed an On the field option, not a separate mode picker or automatic Courtyard activation.
- Central selection on other layouts follows the preceding recommendation in this discussion; exact candidate ranking/approach fairness remains an implementation/playtest detail, not a promise of equal travel time. If center lies in terrain or water, mark a suitable existing neutral city rather than force a city into the geometric center.
- Ordinary Factory/Slow Zone and faction effects continue to obey existing rules on the relay, with no relay-specific boost.
- The preferred compact scoreboard is a visual direction, not approval of its exact placement in the current production shell. The prior relay mockup's 60/90 timings and two-faction study are superseded by this plan; the Courtyard layout approval itself excluded relay scoring.

## Implementation Plan

### 1. Approve Integration Mockup
Description: Adapt the existing compact scoreboard to the real Home/playing shell in an isolated mockup using the confirmed 120/180 timings. Show the Relay On the field control on all layouts, central placement, inactive/holding/urgent/paused/result states, two-to-five-faction scores, objective marker and five-role controls at 320px, 430px and desktop widths. Obtain explicit visual approval. Do not change production code in this slice.

### 2. Objective State and Holding Clock
Description: After slice 1, add an explicit optional relay definition and runtime scores with pure simulation tests. Resolve the existing Courtyard city or a deterministic central neutral city on other layouts only when Relay is enabled. Test all supported city/enemy/layout combinations for stable objective identity and a neutral, legally reachable opening host. Implement activation, fractional cumulative holding, neutral handling and capture-boundary accounting in the shared physical timeline. Verify small-step/bulk equivalence and no scoring in legacy conquest states; leave production mode entry disabled until the playable integration is ready.

### 3. Victory and Forecast Boundaries
Description: Build on slice 2 to resolve relay completion alongside conquest, preserve a terminal reason and freeze exactly at the winning event. Cover simultaneous capture/elimination/threshold cases and cargo survival. Update forecast fast paths and worker-visible state so live and forecast objective outcomes agree without running recursive AI decisions. Verify terminal forecasts cannot value post-defeat moves.

### 4. Save, Restore and Replay
Description: After slices 2–3, thread the exact objective definition through opening/session construction and restart, and validate objective runtime/results in round saves. Preserve fractional scores and remaining activation time without offline catch-up. Legacy saves stay conquest. Cover paused, hidden, active and terminal restoration, corrupted objective data, Home abandonment and replay resets using existing event-only save semantics.

### 5. Relay-Aware AI
Description: After slices 2–4, add bounded objective priorities to existing order/action scoring and strategic staging. Test preparation expansion, routes through paired crossings and entrances where present, feasible capture/recapture, reinforcement and urgent denial across all three behaviors and independently hostile factions. Use the real command/forecast paths for ground and air actions; retain threat-aware home safety, production safeguards and independent faction rules. Verify deterministic synchronous/worker parity and continued non-relay behavior.

### 6. Playable Mode and Compact HUD
Description: After the approved mockup and slices 2–5, wire the mode into Home preferences, the exact preview-to-Play setup and replay, then implement the relay marker, compact scoreboard/countdown, accessible descriptions and terminal reason. Test Relay across all four layouts, layout switching, independent Factory/Slow Zone controls and legacy preference handling. Verify stable Canvas/action-strip geometry, no overflowing counters/controls, keyboard/screen-reader operation and normal drag/Fly interaction across all match states.

### 7. Integrated Verification and Playtesting
Description: After slice 6, run the complete unit, serial browser, production build and PWA suites. Add real-worker browser scenarios for independent faction scores, two-to-five-faction HUDs, relay victory without elimination, capture/recapture, upgrades including Defensive Network, pause/reload/restart and unchanged conquest rounds. Playtest every layout and several Courtyard seeds at 20/24/30 cities to assess competing approaches, economy choices, urgency and duration; separately record actual-iPhone checks and remaining limitations. Tune only from observed evidence and document the delivered behavior.

## Open Questions

None.
