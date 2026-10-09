# Dotfield Game View — Requirements

## Goal

Reclaim compact vertical space in the active game view by adding a top status bar that shows the live troop composition by faction color. Remove the map name and “Room to grow” copy from that view. The bar should support additional enemy colors later without redesigning the display.

## Scope

### In Scope
- A compact bar at the top of the game view.
- A proportional color-segmented display of troop counts for green, white and red factions, extensible to more factions.
- Removal of the map name and “Room to grow” text from the active game view only.
- Live updates as troops are created, dispatched, destroyed, captured or eliminated.
- Accessible textual values alongside the color encoding.

### Out of Scope
- Changing map selection or map names on the Home screen.
- Changing game rules, troop behavior, maps, upgrades or faction balance.
- Persisting statistics or adding a historical graph.

## Requirements
- The game view top bar shows a horizontal composition bar whose segments represent each faction’s share of currently surviving troops.
- Faction colors follow the game’s existing green/player, white/neutral and red/enemy palette; colors alone are not the only means of conveying values.
- Counts and percentages update from authoritative current simulation state, including airborne troops, and do not use projected or guessed counts.
- Zero-count factions do not occupy visible segment width; their zero value remains available to assistive technology or accompanying labels.
- Segment widths sum to the full bar width when total troops are nonzero. When no troops remain, show a neutral empty state without division-by-zero or stale percentages.
- The representation is data-driven by faction identity/color rather than hard-coded to exactly three segments, allowing later factions to be added.
- The bar fits within the existing compact, mobile-first game view and does not introduce page scrolling, obscure essential board interaction, or interfere with pause/restart controls.
- Remove the selected map name and the “Room to grow” copy from the active game view; retain map naming on Home if currently shown there.

## Assumptions
- “Bard” means “bar”: a compact troop-composition/status bar.
- Percentages are shares of the total surviving units across all factions, not territory counts or only the human player's troops.
- Troop totals include city garrisons and all active airborne groups; queued troops are counted once according to the simulation’s existing conservation rules.

## Implementation Plan

### 1. Identify game-view state and layout
Description: Trace the active game header, map-name and “Room to grow” render paths, and authoritative troop totals. Record existing faction color/accessibility conventions. Verify Home map names remain untouched.

### 2. Derive troop composition
Description: Add or reuse a pure derivation from the current simulation snapshot that aggregates surviving units by faction, includes airborne troops without double counting, and computes safe shares including the zero-total case. Test transfers, losses, captures, elimination and conservation boundaries.

### 3. Add the compact composition bar
Description: Render proportionally sized, faction-colored segments in a responsive top bar, with accessible labels/counts/percentages and a neutral empty state. Ensure the segment model accepts additional factions without structural changes.

### 4. Reclaim game-view space and verify
Description: Remove the active-view map name and “Room to grow” text while preserving Home map labels. Verify pause/restart and board controls, all map sizes, narrow mobile layouts, live updates and the complete existing test suite.

## Open Questions
1. Should the bar show a count and percentage label for every faction, or only percentages in the bar with counts available on tap/accessibility text?
2. Should the percentages be rounded to whole numbers, and how should rounding remainder be handled visually?
