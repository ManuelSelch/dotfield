# Visual bot editor — mockup

## Revision and review
- Revision: 1.
- Status: in review; not approved for implementation.
- User request: a simple visual editor, similar to Scratch, leaving room for subtrees/functions later.
- Review is user-led in the browser. No browser automation or screenshots requested or performed.

## Goal
Make authored behavior understandable as nested, editable blocks rather than immediately requiring MDSL knowledge. Preserve Dotfield's off-white/green visual language. Use restrained category colors, not a freeform node graph or a copy of Scratch's full interface.

## Layout
- Desktop: small block library and a larger dotted workspace; Main/Capture tabs; no inspector panel.
- Phone: workspace fills width, Blocks opens a drawer. Numeric/select inputs edit arguments directly inside blocks. Move up/down, Delete and tap-to-add avoid requiring drag gestures.
- Flow: amber; city/memory operations: green; planning: blue; execution: ochre; reusable calls: purple.
- Main tries Capture(neutral) then Capture(enemy). The shared Capture definition exposes the existing candidate iteration → chosen-set → exact-set forecast → execution tactic.
- Nested groups give a Scratch-like C-block reading order. A running plan's persistence is explained; this is not an every-frame reactive selector.

## Reviewable behavior
- Open Capture from a call or its tab. Edit its minimum army, retry budget and capture duration; both Main calls share the definition.
- Change a call's neutral/enemy argument. Add blocks from the library (click/tap or desktop drag/drop).
- Select a block/group; add inside a group or after a leaf. Move siblings up/down or delete. Desktop drag/drop can reparent existing blocks; dropping a group into itself is blocked.
- Groups are keyboard-focusable; Enter/Space selects. Library and move/delete controls are native buttons. Inputs have accessible labels and visible focus states.
- Create a named, empty reusable tactic; it appears in tabs and as a callable library block. No custom argument-definition UI yet; Capture's `kind` argument demonstrates the proposed future pattern.
- MDSL view displays an illustrative generated tree with calls expanded and call-site-prefixed slots. This is deliberately not a claim that native MDSL has parameterized function-call syntax or that the production compiler/runtime supports this feature.
- Mock structural checks detect empty groups, missing references and recursive calls, disabling the mock Save. They DO NOT validate game feasibility, slot dataflow, real parser compatibility, comprehensive resource budgets or all capability arguments.
- Save only marks the draft saved in local page state, with explicit mock feedback. Reset restores the example. No localStorage, server calls, game execution or production modifications.

## Direct states
- `/bot-editor/`: populated Main strategy.
- `/bot-editor/?script=capture`: shared tactic and its argument.
- `/bot-editor/?state=empty`: empty entry group.
- `/bot-editor/?state=error`: missing tactic reference.
- States are deterministic on reload. Edits are intentionally not persistent.

## Limitations and design questions
- This is an isolated HTML/CSS/JS mockup; interaction and appearance await human review, not agent-verified visual QA.
- Slot names are fixed, not a complete variable editor. No simulation preview, execution highlighting, undo/redo, game integration or real MDSL import/export/parser.
- Production choices about subtree parameter binding/inlining, memory scoping, authored delay policies, validation budgets, persistence and safe failure handling remain later design/implementation work.
- Review question: does nested block composition with reusable tactic tabs feel simple enough, or should the first revision show fewer block types/parameters?

## Approval
Await explicit approval of revision 1 before implementing production code. Preserve this mockup and record the approved revision when received; verify/stop only the owned mockup server at that handoff.
