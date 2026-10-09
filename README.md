# Dotfield

A small personal territory-conquest game, built one milestone at a time.

## Current milestone: combat, round completion and replay

React + TypeScript + Vite, with Tailwind CSS layout utilities, Mantine UI components, a responsive Canvas 2D field, and independent TypeScript simulation. Player and opponent territories each generate **one unit per active second**; neutral defenders stay unchanged. Partial growth is preserved, and the accessible territory descriptions track whole-unit counts.

Drag from a player territory to order all available units except one. Units already reserved for another order cannot be sent again; newly grown units remain available. The drag guide shows the route without a numeric dispatch label. Units are reserved for the order but deducted only as groups of up to five launch, 600 ms apart. Queued troops remain defenders; capturing their source cancels unlaunched groups. Groups travel border-to-border, spread over the first 30% of flight and converge over the final 20% before impact. Each arriving batch immediately reinforces a friendly region or reduces hostile defenders one-for-one. Ownership changes only when attackers exceed defenders; ties leave the current owner at zero.

Victory/defeat counts both owned territories (even empty ones that can grow) and airborne troops. Queued units count through their source garrison, not as independent survivors. Finished rounds freeze growth, movement and orders. **Play again** resets the map, units, batches and clock. AI is not implemented yet, so the opponent currently grows but does not send troops. Progression and offline installation remain later milestones. See [REQUIREMENTS.md](REQUIREMENTS.md) for the plan.

Growth rate, batch cadence, territory radius, travel speed and simulation step are configurable in `src/game/settings.ts`; starting counts are in `src/board/map.ts`. These are prototype tuning values. Backgrounding pauses the animation clock; returning does not grant growth for hidden time. Reloading starts fresh.

## Run

Use a current Node.js LTS release (22.12+ or 24+) and npm.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. The development server listens on the network so you can also open its network URL on an iPhone on the same Wi-Fi. Do not expose the development server to the public internet.

```sh
npm test          # simulation, clock, growth, geometry and lifecycle tests
npm run build    # TypeScript check and production build
npm run preview  # serve the production build locally
```

## Browser checks

```sh
npx playwright install chromium
npm run test:browser
```

If you already have Google Chrome installed, you can avoid the Chromium download:

```sh
PLAYWRIGHT_CHANNEL=chrome npm run test:browser
```

The suite checks three phone viewports and desktop, no scrolling/browser errors, and Canvas sizing at device pixel ratio 3 after resizing. Controlled-clock tests also verify visible growth, per-batch border impacts, victory/defeat, frozen finished rounds, replay, fresh-page state, and simulated background/resume without catch-up. Round UI tests use small deterministic maps in a test-only Vite fixture. Screenshots are written to `test-results/` (ignored by Git).

Automated checks currently use Chromium/Chrome. Real iPhone Safari and safe-area behaviour still require device testing.

## Source layout

Small modules are grouped by feature; production modules currently stay under 80 lines.

- `src/game/types.ts`, `state.ts`: independent state model and fresh-session creation.
- `src/game/settings.ts`, `growth.ts`: tuning defaults and pure elapsed-time growth rules.
- `src/game/clock.ts`: fixed-step timing with fractional carry and background rebaselining.
- `src/game/dispatch.ts`, `travel.ts`, `combat.ts`: staggered batches, border travel and arrival resolution.
- `src/game/round.ts`: faction survival, outcomes and stepping that stops at round end.
- `src/board/map.ts`, `layout.ts`: starting map and aspect-preserving projection.
- `src/board/drawBoard.ts`: Canvas rendering of the current simulation snapshot.
- `src/board/startBoard.ts`: browser animation, resize, visibility and cleanup adapter.
- `src/board/FieldCanvas.tsx`, `TerritoryDetails.tsx`: Canvas wrapper and accessible counts.
- `src/App.tsx`: mobile screen composition.
- `src/ui/`: small header, field heading, footer, and shared Mantine theme modules.
- `src/styles.css`: Tailwind palette, CSS layer order, global viewport lock and safe-area padding.
- `vite.config.ts`: Tailwind's Vite integration; client-only boundary-warning handling.

Use Tailwind for layout/spacing and Mantine for interface components. Mantine styles are layered below Tailwind utilities; Tailwind Preflight is intentionally omitted to avoid competing resets. Canvas visuals remain in the board renderer. Browser tests use port 5180 to avoid reusing a possibly stale user development server on 5173.

Simulation modules have no React, Canvas, or browser dependency. React receives snapshots on counts, dispatch, arrival or outcome changes, not every animation frame. Round updates run growth, travel, combat and elimination in fixed steps, stopping at the winning/losing step even after a delayed frame.

Next milestone: basic active enemy AI.
