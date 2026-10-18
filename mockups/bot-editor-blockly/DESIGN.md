# Blockly enemy editor — revision 2

## Review and scope
- Status: **in review; not approved**. This implements the isolated prototype portion of [slice 1](../../docs/bot-editor/REQUIREMENTS.md), not production integration. Slice 1 is awaiting user interaction review and explicit approval.
- Supersedes the handwritten revision 1 as the current review candidate; that source remains untouched at [bot-editor](../bot-editor/DESIGN.md).
- Real Blockly **13.4.0**, Zelos renderer, custom nested blocks, inline fields and a Dotfield-colored shell. Dependencies are installed only in the shared `mockups/` workspace. Blockly's Apache-2.0 license is retained in the installed dependency; see [license notes](LICENSES.md).
- Preview: <http://localhost:5176/bot-editor-blockly/>. Capture directly: <http://localhost:5176/bot-editor-blockly/?script=capture>.

## Reviewable interactions
- Main contains a selector with distinct Capture(neutral) and Capture(enemy) calls. The Capture tab edits their single shared body; its query uses `$kind`. Both call arguments remain independently editable.
- Capture exposes the existing query → candidate list → clear chosen set → bounded retry/next/add/exact forecast → execute sequence. Outer cleanup releases the plan on exit; the inner retry sequence has no cleanup.
- Desktop: compact library beside a dotted, scrollable/zoomable Blockly workspace. Phone: horizontally scrollable library above the workspace; no hidden desktop-only essential controls.
- Add from library inside a selected group or after a selected leaf. Blockly supplies dragging, nesting, field editing and trash. Below the workspace, native step-picker/field/move/delete buttons provide a tap/keyboard path without canvas dragging. Reordering is restricted to siblings.
- Undo/redo history is separate per tab for this study. Reset replaces disposable page state. Check draft only checks obvious structural errors and direct self-calls; it never saves or claims runtime validation.
- Inspect project JSON exposes real Blockly workspace serialization. Measure runs headless 128-block operations on the current device, not rendered editor/game performance.
- Shared edits are visible in Main's summary; calls are **not executed**. Editing updates source only, not a running game.

## Deliberate omissions
- No game activation, compiler, native runtime tree generation, storage, MDSL generation, or source import. No React/application/dependency/config changes outside `mockups/`.
- This feasibility study uses fixed Main/Capture identities and a fixed scalar `kind` input. It does not yet demonstrate creation/rename/deletion, editable signatures, nested forwarding, scoped memory execution or Blockly procedure backing models. These are confirmed later-slice requirements, not deferred product scope.
- No claim of full validation, reliable production undo semantics, access to every workspace function via keyboard, or a mobile accessibility audit. Native controls cover essential example edits; user review must determine usability.
- No browser automation, screenshots, or human visual acceptance has been performed by the agent. HTTP checks and headless tests are not visual evidence.

## Verification and release gate
See [FEASIBILITY.md](FEASIBILITY.md) for repeatable measurements, proposed admission ceilings and the **not-passed runtime responsiveness gate**. Rendering, touch behavior, real iPhone performance, final call expansion and multi-faction runtime costs remain unverified.

## User review checklist
1. On desktop and narrow phone, change neutral/enemy call arguments, then edit Capture minimum army, retries and forecast duration; return to Main and inspect shared summary.
2. Add, reorder, delete and undo using both inline Blockly interactions and the native step controls. Confirm first-child Move up is disabled and inner cleanup remains `none`.
3. Decide whether Zelos nesting/scrolling/zoom and the phone library feel simple enough. Any requested layout changes require another revision.

## Approval and cleanup
- Approval evidence: **none**. The request to implement slice 1 does not approve this newly built design.
- Ask: **Approve revision 2 for implementation, or continue iterating?**
- Keep preview running during review. Runtime ownership is recorded in ignored `mockups/.runtime/scratch-editor-preview.json` (managed preview, verified Vite PID/cwd/port).
- Before slice 2: record explicit approval of this exact revision, preserve its sources, reverify process identity, stop the owned managed preview, verify process/listener exit and clear the runtime record. Do not stop servers belonging to other worktrees.
