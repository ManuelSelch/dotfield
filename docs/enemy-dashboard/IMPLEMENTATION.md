# Enemy dashboard — implementation status

## In-round panel

The dashboard opens from a compact header button while an AI-controlled round is active. It starts closed. At desktop widths (900px and above), it docks to the right of the field; below that breakpoint, it opens as a scrollable bottom-sheet overlay without reflowing the mobile field. Close with the toggle, close button, backdrop, or Escape.

## Decision diagnostics

- The AI worker returns the selected action plus a trace from the same evaluation pass. Trace collection does not run a second simulation or change the chosen action.
- Each enemy card shows its latest action, source/target (or conversion city), and heuristic AI score. The score is a ranking value, not a probability.
- Up to four highest-priority viable alternatives are listed with scores and why they lost selection (lower priority, stable tie-break, or an explicit priority rule). Further viable candidates are counted rather than flooding the phone panel.
- Rejected source, route, airlift, and conversion checks are grouped by the actual rejection gate, with counts and up to two example cities/routes per group. If no action is selected, **Why no action?** opens by default instead of showing only an empty decision label.
- Selecting an alternative or a blocker example highlights its numbered endpoint(s) on the map. This is diagnostic display only and does not issue a command.
- City numbers are stable for the match, ordered top-to-bottom then left-to-right; owner labels are captured at decision time. Relay hosts are identified.
- Traces and decision display are in-memory only. Restart/replay clears them; nothing is persisted.

## Limits

The trace includes only candidate paths and rejection gates that the AI actually evaluates. It aggregates equivalent blockers, retains at most two examples per group, and shows at most four viable alternatives plus an omitted count. A Relay multi-wave recapture plan that cannot be built safely is reported as unavailable rather than exposing every internal forecast step. This is an explanation of the heuristic's decision, not a claim that the AI searched every theoretically possible command or found an optimal move.

## Verification

Pure tests cover stable city numbering, blocker aggregation/caps, candidate ranking, and action parity. Browser tests exercise a real worker decision, a real no-action explanation, route highlighting, mobile overlay/map stability and dismissal, 320×480 fit, multiple enemy cards, and desktop side-by-side layout. Full project verification is recorded in the implementation session/commit.
