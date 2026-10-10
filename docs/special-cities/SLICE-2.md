# Slice 2 — Bridge-city movement and presentation

## Summary

Following the approved bridge-city mockup (revision 3), this slice adds a selectable two-open-bridge river map, bank-aware order rules, manual paired-city staging, AI staging behaviour, independent bank-clipped regions, compact bridge rendering, preview legality feedback and accessible descriptions.

## Changes

### Map and terrain

- New `bridges` map at `src/board/riverMap.ts` with 10 cities in two banks separated by a river at y=225–255, plus two paired bridge crossings (west and east, 64 units wide).
- `FieldMap.river` is optional; existing maps remain unchanged.
- `River` type and `createRiver()` validator in `src/game/river.ts` enforce:
  - Horizontal river bounds, distinct aligned endpoint pairs, non-overlapping decks.
  - Formation clearance from water (at least DOT_RADIUS past the bank).
  - Immutable frozen snapshots.
- `bridgeDecks()` returns the same compact 64×38 river-only geometry for Canvas and SVG previews.

### Order legality

- `canRiverOrder(source, target, river?)`: returns `true` for same-bank cities or paired bridge endpoints, `false` otherwise.
- `dispatchUnits()` rejects invalid cross-bank orders before touching queues or counts.
- `riverDistance()` provides a strategic-leg-path metric for AI scoring.

### Movement and AI

- Straight same-bank and straight paired-cross-bank routes use the existing `createRoute()` / `createRoute()` model; no path-bend physics was added.
- `chooseOrder()` iterates only over `canRiverOrder()`-legal targets.
- `scoreOrder()` uses `riverDistance()` for frontline proximity.
- AI stages reinforcements to friendly bridge cities before crossing; it never bypasses the pairing rule.

### Rendering

- `drawRiver()` draws a muted blue-grey river and rounded warm `#ddd8bf` bridge decks with inset rail strokes. The 64×38 footprint remains validated for batch clearance; the later approved mockup revision changes only presentation.
- `drawRegions()` clips Voronoi cells independently per bank; the river itself is not a city region.
- `drawDrag()` shows a dashed paired-city ring on selection, city-border-to-border straight route previews, and red dashed guides for invalid cross-bank targets.
- `MapPreview.tsx` renders river + bridges in the SVG home preview.

### Input

- `hitTest()` ignores the river gap; whole-region touch targets remain bank-only.
- Keyboard and pointer dispatch respect the same `canRiverOrder()` rule.
- Accessible `aria-label` annotations include the paired bridge city name when applicable.
- A live `role="status"` hint explains the staging pattern on river maps.

### Persistence and session

- `SimulationState` includes an optional `river` field.
- `createSimulation()`, `createSession()`, `compileRoundSetup()` accept and freeze an optional `river`.
- `readSavedGame()` validates restored `river` metadata and rejects saves with transfers that violate current pairing rules.
- Restart replays the original authored map, not current ownership or progress.

### Tests

- 6 unit tests in `src/game/river.test.ts`: validation, immutability, order legality, queue preservation, real dot clearance, save/restore, AI staging.
- 5 unit tests in `src/board/riverGeometry.test.ts`: bank-clipped regions and whole-region input at four board sizes, cache invalidation.
- 1 unit test in `src/board/riverMap.test.ts`: map selection, upgrade compilation, dispatch rules and restart fidelity.
- 4 Playwright browser tests in `tests/bridge.spec.ts`: staging workflow, invalid-order rejection, river-area non-selection, AI legal staging.
- 362 total unit tests pass; production build and 4 new browser tests verified.
