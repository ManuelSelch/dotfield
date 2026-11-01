# Dotfield Desktop — Requirements

## Goal

Make Dotfield comfortable on desktop through responsive use of available space, a larger home-screen map preview, and mouse click-to-click orders alongside dragging. Preserve battlefield proportions, existing mobile usability, and all gameplay rules.

Status: slices 1–3 are implemented and merged into `main`; slice 4's automated regression pass is complete at merge checkpoint `d2d9702` (402 unit tests, 79 Chrome browser tests, build and whitespace checks passed). User confirmed the merged controls work. Real-iPhone Safari and human balance/duration checks remain manual follow-ups, not automated completion claims.

## Scope

### In Scope

- Responsive application and game layouts beyond the current 496px-wide shell.
- Uniformly scaled, centered 360×480 battlefield with all cities visible.
- Side-by-side home layout with a larger map preview and existing setup controls.
- Mouse click-to-click dispatch alongside existing mouse/touch dragging and keyboard controls.
- Regression checks for resizing, input, lifecycle, and phone layouts.

### Out of Scope

- Mouse hover highlighting, tooltips, cursors that change on territory hover, and territory inspectors.
- New gameplay sidebars, map thumbnails, additional shortcuts, pan, zoom, or map rotation.
- Map, AI, production, upgrade, combat, persistence-format, or balance changes.
- Unrelated production changes beyond the completed desktop layout/input scope.

## Requirements

- **R1 — Responsive shell:** Replace the universal 496px width restriction with an adaptive layout. Wide windows must use more horizontal space where useful; narrow windows must retain the compact stacked experience. Do not enlarge the battlefield by stretching its axes independently.
- **R2 — Battlefield proportions:** Preserve the logical field's 3:4 aspect ratio. Size the visible battlefield from both available width and height, center it, and keep the entire field visible. Additional widescreen space belongs outside the battlefield rather than creating oversized interactive Voronoi margins. Retain modest mobile margins where necessary.
- **R3 — Shared geometry:** Rendering, whole-region hit detection, selection routes, feature coverage, and keyboard focus must agree after any resize. Keep city positions, dot geometry, simulation distances, travel times, tower/zone ranges, and collision outcomes in existing field coordinates. Resize changes presentation only.
- **R4 — In-round layout:** Keep the composition bar and pause control clearly associated with the board. Pause/results overlays stay centered on the battlefield; do not stretch controls across otherwise empty widescreen space. Do not add panels merely to fill unused width.
- **R5 — Desktop Home:** Where width and height permit, place a larger map preview/navigation area beside player upgrades, enemy settings, and Play. Remove the desktop preview's effective 280px size limitation. Keep the preview proportional and all existing maps, arrows, position indicators, and settings available; do not introduce map names or descriptions.
- **R6 — Compact Home:** Fall back to stacking when the two-column layout cannot fit comfortably, including narrow windows and short viewports. Keep Play reachable without clipping. Long enemy settings may use bounded internal scrolling rather than forcing page scrolling or hiding controls. Preserve phone safe areas and touch-sized controls.
- **R7 — Mouse click-to-click:** A primary-button click on a player city with at least two troops selects it without issuing an order. A subsequent primary-button click on any distinct city dispatches exactly one order, including friendly reinforcement, and clears selection. Click selection uses the existing full-region hit test, not just the circle.
- **R8 — Click/drag coexistence:** Continue dispatching on a valid mouse or touch drag release. Use a small movement threshold to distinguish a mouse click from a drag; a drag must never generate an additional click order. Starting a drag clears any previous click selection and uses the pressed eligible source. Mouse-only click selection must not change existing touch gesture semantics.
- **R9 — Cancellation:** Clicking the selected source again or pressing Escape cancels selection without issuing an order. An invalid drag, pointer cancellation, or releasing outside the battlefield must not dispatch or change existing queued orders. Cancel pending selection on actual board resize, pause, hidden-tab interruption, restart, replay, Home, and terminal round. If the selected source is captured or becomes unable to dispatch, clear selection without issuing an order. Coordinate mouse and keyboard selection so they cannot leave contradictory active sources.
- **R10 — Feedback and dispatch rules:** Reuse existing source-region highlighting to show persistent click selection; no hover feedback is required. Validate ownership, troop availability, and round state at dispatch time. Both control modes use the same all-but-one and queued-order replacement command; no alternate dispatch logic or numeric send label.
- **R11 — Accessibility and lifecycle:** Retain Tab/Enter/Space/Escape city controls, visible keyboard selection, accessible control labels, pause/results focus behavior, and disabled input while paused/terminal. Layout changes must not recreate a live session, reset an active round, or change its saved state.
- **R12 — Verification:** Cover phone sizes 320×480 and 430×932, a tablet-sized viewport, desktop 1280×720 and 1440×900, and a short wide window. Test resizing an active round across layout modes, proportional previews/boards, absence of clipping/page scroll, mouse click/drag order counts, cancellation, friendly reinforcement, replacement orders, and keyboard/touch regressions. Run unit tests, production build, and relevant browser tests; inspect representative phone/desktop screenshots. Desktop emulation does not prove real-device Safari behavior.

## Assumptions

- The existing 360×480 field and uniformly scaled `fieldTransform` remain authoritative; no new coordinate system is needed.
- Desktop game space should prioritize a larger readable board, not a new information panel. Empty side margins are preferable to stretching the field.
- Implemented two-column Home breakpoint: at least 900px wide and 600px tall; smaller/shorter viewports use the compact stack.
- Implemented mouse drag threshold: 5 CSS pixels, independent of board scale and device pixel ratio. Touch/pen remain drag-only.
- After sending a click order, clear the source rather than keeping it selected for repeated destinations.
- Outside-board clicks and right-click cancellation are not added initially; source re-click and Escape provide cancellation.

## Implementation Plan

### 1. Responsive battlefield layout

Status: complete; implemented proportional sizing and board-aligned controls, with seven viewport/resize browser checks.
Description: Adapt the application shell and in-round board sizing to available width and height, preserving the 3:4 field, board-associated controls, overlay placement, and narrow-screen safe areas. Keep existing shared coordinate transforms and simulation unchanged. Verify proportional dimensions and agreement between rendered cities and region input at phone/desktop sizes, plus active-round resize without state loss. No home redesign or new input mode in this slice.

### 2. Side-by-side home screen

Status: complete; approved revision 3 implemented in modular Home components. Eight layout/state browser checks now cover all seven maps, compact fallback, expanded enemies, centered settings and setup retention.
Description: Building on slice 1's adaptive shell, introduce a larger proportional map preview beside existing setup controls and Play when space permits, with a stacked fallback and bounded settings overflow. Preserve map navigation, selections, and Home/Play behavior. Verify all maps, multiple enemy sections, keyboard map navigation, and visible Play at wide, short, and phone viewports; inspect screenshots. No new settings or map-picker features.

### 3. Mouse click-to-click orders

Status: implemented. Explicitly mouse-only (`pointerType === 'mouse'`); touch/pen remain drag-only. Movement threshold is 5 CSS pixels. Persistent source selection, cancellation, live source validation and shared keyboard coordination are covered by focused unit/browser regressions. No simulation or dispatch-rule changes.
Description: Add persistent mouse source selection and destination-click dispatch while retaining drag behavior and existing keyboard/touch controls. Distinguish click jitter from intentional dragging, reuse selection visuals and the shared dispatch command, and implement cancellation/source-invalidity lifecycle rules. Unit-test input transitions and browser-test exactly-one dispatch, reinforcement, source re-click/Escape, invalid drag, queued-order replacement, pause/resize/capture cancellation, and touch/keyboard regressions. No hover behavior or new shortcuts.

### 4. Cross-layout regression verification

Status: automated regression pass complete at `d2d9702`; full suites/build passed and representative phone/desktop screenshots were inspected. Existing checks cover Home/Play, pause/resume, restart, results/replay, Home return and reload across the suite, plus active resize/state retention. This does not claim every lifecycle action is parameterized over every viewport. Expanded deterministic persistence coverage remains [test-repair slice 3](../test-repair/REQUIREMENTS.md); real-device Safari remains manual.
Description: After slices 1–3, verify the viewport matrix and live resizing end to end, including Home→Play, pause/resume, restart, results/replay, Home return, and save/restore. Run the complete unit suite, production build, and relevant/full browser regression suite as feasible; record any skipped checks explicitly. Inspect representative desktop and phone screenshots for proportions, preview size, clipping, and control reachability. Resolve failures before declaring the feature complete; real-device Safari remains a separate manual check.

## Open Questions

None. Breakpoint and movement threshold are implemented values; future tuning must retain the input/layout regressions.
