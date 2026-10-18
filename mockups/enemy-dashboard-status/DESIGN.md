# Enemy dashboard status — revision 1

Status: revision 1 approved. User approval: “looks good. implement it”.

## Goal
Distinguish current AI lifecycle from its last completed evaluation. An old selected attack must not look like an ongoing attack. User requested: “yes add current status and last result”.

## Design
- Preserve compact desktop docking and mobile overlay with scrolling; no new permanent game controls.
- Per enemy: Current status first; Last result separately with age, evaluation identity, route, and applied/rejected/no-command outcome.
- Current states: waiting, evaluating (pending duration), no action selected, actual worker error, paused, finished, eliminated; first evaluation has no invented last result.
- Repeated no-action evaluations refresh result age and evaluation count even when reasons are identical.
- Applied means command accepted at the time, not a promise troops are still attacking. Rejected means command could not apply; do not invent a rejection reason without evidence.
- Last result details stay collapsible and explicitly belong to the prior evaluated board snapshot.
- In production result age uses active simulation time and freezes on pause/end; pending worker duration uses monotonic wall time. Slow alone is not an error. No strategy changes.

## Review
`?state=evaluating|waiting|no-action|rejected|error|paused|finished|eliminated|first`; review-only dropdown switches states. Default illustrates an old attack with a still-pending evaluation. All data is fake. Repeated no-action heartbeat and pending/age labels are simulated. Waiting countdown is fixed illustrative data, not a real scheduler. Stylized field is not the production game. No browser automation performed.

Revision 1 approved for production implementation; preserve AI strategy unchanged.
