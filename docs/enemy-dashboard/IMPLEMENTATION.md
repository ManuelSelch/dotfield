# Enemy dashboard — first implementation slice

## Scope

The in-round dashboard can be opened from a compact header button while an AI-controlled round is active. It starts closed. At desktop widths (900px and above), it docks to the right of the field; below that breakpoint, it opens as a scrollable bottom-sheet overlay over the field. The mobile field does not reflow. Close with the button, overlay backdrop, or Escape.

## Live data

- The AI worker reports its latest selected action for each configured enemy faction, including a null result when it chooses no action.
- Each enemy card shows the latest action type, its source/target (or conversion city), and the heuristic AI score. Score is a ranking value, not a probability.
- City labels use stable match-local numbers assigned top-to-bottom, then left-to-right. The current owner at decision time is shown; a Relay host is tagged. Matching numbered markers highlight the latest action endpoints while the dashboard is open.
- Latest decisions are in-memory UI state only. Restart/replay clears them; the dashboard does not change simulation, AI scheduling, or saves.

## Deliberately deferred

Candidate rankings, rejected alternatives, score-factor breakdowns, forecast metrics, reason logs, AI behavior badges, and decision history are not in this first slice. The current AI worker returns the chosen action and its aggregate score, but does not expose those explanations. No explanatory values are fabricated.

## Verification

Pure tests cover stable city numbering and action labels. Browser tests exercise a real worker decision, mobile overlay/map stability and dismissal, 320×480 fit, multiple enemy cards, and desktop side-by-side layout. Full project verification is recorded in the implementation session/commit.
