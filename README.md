# Dotfield

A small personal territory-conquest game, built one milestone at a time.

## Current milestone: static board

React + TypeScript + Vite, with a responsive Canvas 2D field, seven fixed territories, faction markers, and readable unit counts. There is an accessible text description of each territory.

This is a **visual preview**, not a playable game yet. There is no growth, dispatch, combat, AI, progression, or offline installation. See [REQUIREMENTS.md](REQUIREMENTS.md) for the plan.

## Run

Use a current Node.js LTS release (22.12+ or 24+) and npm.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. The development server listens on the network so you can also open its network URL on an iPhone on the same Wi-Fi. Do not expose the development server to the public internet.

```sh
npm test          # board geometry and static-map tests
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

The suite checks 320×568, 390×844, and 430×932 phone viewports plus desktop, verifies no scrolling or browser errors, and checks Canvas sizing at device pixel ratio 3 after resizing. Screenshots are written to `test-results/` (ignored by Git).

Automated checks currently use Chromium/Chrome. Real iPhone Safari and safe-area behaviour still require device testing.

## Source layout

- `src/App.tsx`: lightweight mobile interface and faction legend.
- `src/FieldCanvas.tsx`: Canvas sizing and lifecycle; accessible territory description.
- `src/board.ts`: fixed preview map and proportional layout (no simulation yet).
- `src/drawBoard.ts`: static drawing in CSS pixels with Retina backing resolution.
- `src/styles.css`: portrait layout and safe-area padding.

Next milestone: independent, tested unit growth simulation.
