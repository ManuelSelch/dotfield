# Dotfield

A small personal territory-conquest game, built one milestone at a time.

## Current milestone: simulation and growth

React + TypeScript + Vite, with a responsive Canvas 2D field and independent TypeScript simulation. Player and opponent territories each generate **one unit per active second**; neutral defenders stay unchanged. Partial growth is preserved, and the accessible territory descriptions track whole-unit counts.

This is a **growth preview**, not a playable round yet. Dispatch, combat, AI, progression, and offline installation are not implemented. See [REQUIREMENTS.md](REQUIREMENTS.md) for the plan.

Growth rate and simulation step are configurable in `src/game/settings.ts`; starting counts are in `src/board/map.ts`. These are prototype tuning values. Backgrounding pauses the animation clock; returning does not grant growth for hidden time. Reloading starts fresh.

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

The suite checks three phone viewports and desktop, no scrolling/browser errors, and Canvas sizing at device pixel ratio 3 after resizing. Controlled-clock tests also verify visible growth, unchanged neutrals, fresh-page state, and simulated background/resume without catch-up. Screenshots are written to `test-results/` (ignored by Git).

Automated checks currently use Chromium/Chrome. Real iPhone Safari and safe-area behaviour still require device testing.

## Source layout

Small modules are grouped by feature; production modules currently stay under 80 lines.

- `src/game/types.ts`, `state.ts`: independent state model and fresh-session creation.
- `src/game/settings.ts`, `growth.ts`: tuning defaults and pure elapsed-time growth rules.
- `src/game/clock.ts`: fixed-step timing with fractional carry and background rebaselining.
- `src/board/map.ts`, `layout.ts`: starting map and aspect-preserving projection.
- `src/board/drawBoard.ts`: Canvas rendering of the current simulation snapshot.
- `src/board/startBoard.ts`: browser animation, resize, visibility and cleanup adapter.
- `src/board/FieldCanvas.tsx`, `TerritoryDetails.tsx`: Canvas wrapper and accessible counts.
- `src/App.tsx`, `styles.css`: mobile interface and portrait styling.

Simulation modules have no React, Canvas, or browser dependency. React receives snapshots only when whole-unit counts change, not every animation frame. Growth batches elapsed fixed steps; future movement/combat may need per-step updates.

Next milestone: half-unit dispatch and visible travel.
