# Enemy dashboard — implementation status

## In-round panel

The dashboard opens from a compact header button while an AI-controlled round is active. It starts closed. At desktop widths (900px and above), it docks to the right of the field; below that breakpoint, it opens as a scrollable bottom-sheet overlay without reflowing the mobile field. Close with the toggle, close button, backdrop, or Escape.

## Decision diagnostics

- The AI worker returns the selected action plus a trace from the same evaluation pass. Trace collection does not run a second simulation or change the chosen action.
- Each enemy card separates **Current status** from **Last result**. Status reports waiting (next-check countdown), evaluating (pending worker duration), repeated no-action results, actual worker error, paused/hidden, finished, or eliminated. Without Worker support it explicitly reports diagnostics unavailable rather than inventing worker results.
- Last result shows the selected action, source/target (or conversion city), result age, evaluation number, and age of the evaluated board snapshot. Applied means the public command changed the live state at receipt time, not that an attack is still ongoing. Rejected means the command did not change that state; no unsupported rejection explanation is invented. Responses arriving while inactive are labeled not applied; null results say no command issued.
- A bounded 250ms lifecycle heartbeat refreshes even if troops and decision content are unchanged. Request pending time uses monotonic wall time and includes worker queueing. Result/snapshot age and no-action duration use simulation time, freezing while paused/hidden or finished. Repeated null results increment the evaluation count and refresh the last result; elapsed time alone never fabricates a null result.
- **Last evaluation details** collapses the trace and heuristic AI score. The score is a ranking value, not a probability. Details belong to the recorded snapshot, not necessarily the current board. No-action details open by default.
- Up to four highest-priority viable alternatives are listed with scores and why they lost selection (lower priority, stable tie-break, or an explicit priority rule). Further viable candidates are counted rather than flooding the phone panel.
- Rejected source, route, airlift, and conversion checks are grouped by the actual rejection gate, with counts and up to two example cities/routes per group. If no action is selected, **Why no action?** opens by default instead of showing only an empty decision label.
- Selecting an alternative or a blocker example highlights its numbered endpoint(s) on the map. This is diagnostic display only and does not issue a command.
- City numbers are stable for the match, ordered top-to-bottom then left-to-right; owner labels are captured at decision time. Relay hosts are identified.
- Traces and lifecycle display are in-memory only. Restart/replay clears results, evaluation counters and pending request identity; old replies are ignored. Pause retains in-flight request identity so a response received while paused can be reported as not applied. Nothing is persisted. An already-open dashboard remains open at round end to show Finished.

## Limits

The trace includes only candidate paths and rejection gates that the AI actually evaluates. It aggregates equivalent blockers, retains at most two examples per group, and shows at most four viable alternatives plus an omitted count. A Relay multi-wave recapture plan that cannot be built safely is reported as unavailable rather than exposing every internal forecast step. This is an explanation of the heuristic's decision, not a claim that the AI searched every theoretically possible command or found an optimal move.

## Verification

Pure tests cover stable city numbering, blocker aggregation/caps, candidate ranking, action parity, lifecycle states, repeated null results, actual command application/rejection, pending replies during pause, terminal heartbeat flushing and stale reply rejection after restart. Browser tests exercise a real worker decision, repeated real no-action evaluations, pause/resume age freezing, a deliberately withheld worker response with a growing pending timer, an injected worker error, route highlighting, mobile overlay/map stability and dismissal, 320×480 fit, multiple enemy cards, and desktop side-by-side layout. Full project verification is recorded in the implementation session/commit.
