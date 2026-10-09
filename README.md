# Dotfield

A small personal territory-conquest game, built one milestone at a time.

## Current milestone: multi-enemy map and configurable home screen

Choose among five maps on the home screen using left/right arrows, then press **Play**. The fifth Crossfire map contains one player and two independent AI enemies. Each enemy can select its own Balanced, Aggressive or Defensive behavior and Industry, Factory or Watchtower effects. Selection is visual only: one static map preview at a time, with no map names or descriptions. Nothing simulates before Play. Settings remain in memory and reset on reload. Slow zones, progression and alliances/teams are out of scope.

The original field has one player, one opponent and eleven neutral cities. City radius is 21 board units; troop radius/spacing are 4.8/12. Smaller counters and circles leave room for more routes without pan/zoom. Whole regions remain touch targets. These sizes are shared with travel and collision simulation, not cosmetic-only scaling.

React + TypeScript + Vite, with Tailwind CSS layout utilities, Mantine UI components, a responsive Canvas 2D field, and independent TypeScript simulation. Player and opponent territories each generate **one unit per active second**; neutral defenders stay unchanged. Partial growth is preserved, and the accessible territory descriptions track whole-unit counts.

Drag from **anywhere inside a player-owned city region** to another region to order all available units except one. You no longer need to touch either circle precisely. A new valid order from the same city replaces every unlaunched group and sends all troops still inside the city except one to the new target, including newly grown units. Already airborne groups keep their original target and positions. The new order launches its first group immediately and restarts the 600-ms cadence; invalid/self/off-board drops do not cancel an existing order. The drag guide shows the route without a numeric dispatch label. Units are reserved for the order but deducted only as groups of up to five launch, 600 ms apart. Queued troops remain defenders; capturing their source cancels unlaunched groups. Groups travel border-to-border, spread over the first 30% of flight and converge over the final 20% before impact. Each arriving batch immediately reinforces a friendly region or reduces hostile defenders one-for-one. Ownership changes only when attackers exceed defenders; ties leave the current owner at zero.

Opposing dots now destroy each other **one-for-one on contact during travel**; friendly dots pass through. Surviving dots keep their original slots in the group, so losses leave holes rather than rearranging the formation. Only survivors reach the region and deal damage. Collision geometry is shared with rendering in board coordinates, so screen size/pixel density does not change the outcome. Movement is swept between fixed simulation steps, including exact launch/impact boundaries; contacts resolve chronologically, then by stable dot IDs on ties.

Victory/defeat counts both owned territories (even empty ones that can grow) and airborne troops. Queued units count through their source garrison, not as independent survivors. Finished rounds freeze growth, movement and orders. **Play again** resets the map, units, batches and clock. The opponent is now active: it expands, attacks vulnerable regions, reinforces threatened allies and moves reserves toward the frontline. It uses the same growth, all-but-one dispatch, batch travel and combat rules as the player. Progression and offline installation remain later milestones. Home now offers **Industry**, off by default: your owned cities produce **25% faster** (1.25 units/sec), including new captures; the opponent stays at 1 unit/sec. Restart/Play again retain it, Home lets you change it, and reload resets it. **Factory**, also off by default, doubles your starting city's production (2 units/sec, or 2.5 with Industry). Its factory silhouette stays on the city but dims and stops giving a bonus if the opponent captures it; recapture restores your bonus. Industry shows an upward chevron on your boosted cities. Combined effects show both icons, without obscuring counters. There is no economy or unlock system. See the [seven proposed upgrade effects](docs/upgrades/EFFECTS.md) and [upgrade architecture](docs/upgrades/REQUIREMENTS.md). See [REQUIREMENTS.md](REQUIREMENTS.md) for the overall roadmap.

Baseline tuning is in `src/game/settings.ts`; geometry, batch size and simulation step remain global. `src/game/rules.ts` snapshots independent faction-ID keyed growth, movement speed and launch cadence. `src/game/upgrades/catalog.ts` defines typed stat modifiers; `compile.ts` resolves selections into per-round rules without changing shared defaults. Growth uses the current city owner; orders use the issuing faction's speed/cadence, including AI duration estimates. Starting positions/counts are in `src/board/map.ts` and `src/board/maps.ts`. Configuration supports extra faction IDs, but multiple-enemy gameplay still needs identity/AI/collision/outcome work. These are prototype tuning values. Backgrounding pauses the animation clock; returning does not grant growth for hidden time. Reloading returns to the home screen with the first map selected. Selection is kept in memory when returning home, not saved to storage.

## City regions and map generation

Each circle is a city center. Voronoi regions are generated automatically from the city positions, clipped to the complete visible Canvas—including its aspect-ratio margins. Subtle faction fills, thin borders between cities and full-region source/target highlights match the approved mockup in `mockups/city-regions/`.

- `src/board/regions/clip.ts` / `geometry.ts`: dependency-free half-plane clipping for the small maps. Duplicate IDs/positions and non-finite coordinates are rejected.
- `cache.ts`: regenerate only when city IDs, positions or Canvas dimensions change; counters and ownership changes reuse the geometry.
- `styles.ts` / `drawRegions.ts`: separately tunable fills, outlines and focus/selection rendering.
- `hitTest.ts`: nearest-city selection inside the board, with stable map-order ties. Off-board releases cancel; dropping inside the same region cancels. Borders do not restrict movement or attacks.
- `bindDrag.ts` / `bindKeyboard.ts` / `bindBoardInput.ts`: separate pointer and keyboard adapters, sharing the same orders and ownership/garrison validation.

City circles remain the **only troop spawn and region-impact boundaries**; per-dot collision physics, AI and combat are unchanged. Cells are a visual/input layer, not a second combat geometry. This lets future maps be specified by circle positions rather than hand-drawn borders.

Keyboard: Tab to a region, Enter/Space to select a friendly source, then focus and activate a target. Escape cancels. Focus and selection show on the full region. Region fills update immediately without decorative transition animations; essential troop spreading/convergence remains tied to actual collision geometry even under reduced-motion preferences.

## Session lifecycle and mobile controls

`src/game/session.ts` exposes a UI-independent `createSession(map, ai, rules)` controller: `start`, `pause`, `resume`, `restart`, `setHidden`, `frame(timestamp)` and `dispatch`. Sessions begin ready; paused/hidden/ready sessions reject orders and do not advance growth, launch queues, travel or AI. Resume rebaselines the clock without catching up; restart creates a fresh ready state and clock, clearing fractional timing, orders and AI deadlines. Terminal outcomes cannot be resumed.

The board adapter uses this controller for simulation frames, player dispatch and background suspension. Play mounts a fresh session for the selected map. Home unmounts it and disposes the animation, input and visibility listeners. A compact **pause icon** sits above the field; **Restart** is available only in the pause screen. Pause cancels active selection and freezes growth, launches, travel, collisions and AI; the paused screen offers **Resume**, **Restart** and **Home**. Backgrounding never overrides a manual pause. Resume excludes paused time without catch-up.

Restart immediately resets the map, troops, growth fractions, clock, outcome and AI deadline, then starts the fresh round—**no confirmation or ready popup**. Finished rounds offer **Play again** on the same map and **Home** to choose another. Restart/replay use the same controller reset without recreating browser listeners. Home abandons the current round without confirmation. Region keyboard controls are disabled while paused, and pause actions have 44px minimum touch height.

## Enemy AI architecture and tuning

The opponent is deterministic and browser-independent. Small modules under `src/game/ai/` separate responsibilities:

- `config.ts`: decision cadence, minimum useful army, action scores, source-risk penalty and frontline distance threshold.
- `forecast.ts`: immutable forecasts of growth and already-known orders, using the real launch/travel/collision/combat rules. Uses fixed steps while opposing groups exist; skips only safe quiet steps.
- `score.ts`: evaluates expansion, attack, defensive reinforcement and forward army concentration.
- `decision.ts`: enumerates legal candidates, compares forecasts, and picks one useful order; waits if none are worthwhile.
- `tick.ts`: schedules decisions on active simulation time, not rendering frames or wall-clock timers.

Prototype cadence: first decision after **1.8 seconds**, then every **1.8 seconds**; armies must have at least six units to send. Busy sources wait for their existing groups to finish. The policy considers travel time, defender growth, incoming groups, source exposure and existing captures, without extra resources or knowledge of future player input. It does not stop making decisions simply because it is winning or losing.

Tune `DEFAULT_AI` in `config.ts`, or pass an `AiConfig` to `FieldCanvas`/`startBoard`. The actual app enables AI by default. Pure `advanceRound(state, elapsedMs, config)` takes the policy explicitly; omitting it or passing `null` disables AI for isolated rule tests. Replay resets its decision deadline and backgrounding excludes hidden time. Difficulty presets and smarter tactics remain deferred; the current opponent is unchanged across all three maps.

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

The suite checks three phone viewports and desktop, no scrolling/browser errors, and Canvas sizing at device pixel ratio 3 after resizing. Controlled-clock tests also verify visible growth, per-batch border impacts, victory/defeat, frozen finished rounds, replay, fresh-page state, and simulated background/resume without catch-up. AI browser tests run the real app and verify expansion, background-paused decisions, an idle-player defeat and replay. Isolated dispatch/round tests use test-only Vite fixtures with AI disabled. Per-dot browser checks use the real simulation and Canvas renderer in a deterministic crossing-battle fixture at two viewport sizes and pixel densities. They inspect Canvas pixels to verify that the destroyed center dot disappears, the outer dots stay in place, and only four survivors deal damage. Region browser checks cover far-from-circle pointer/touch dispatch, full-region selection and capture colors at different viewport/DPR sizes, keyboard cancellation/dispatch, and existing off-board cancellation. Screenshots are written to `test-results/` (ignored by Git).

Automated checks currently use Chromium/Chrome. Real iPhone Safari and safe-area behaviour still require device testing.

## Source layout

Small modules are grouped by feature.

- `src/game/types.ts`, `state.ts`: independent state model and fresh-session creation.
- `src/game/settings.ts`, `rules.ts`, `growth.ts`: tuning defaults, validated faction rules and pure elapsed-time growth.
- `src/game/upgrades/`: typed stat/starting-feature effect catalog and pure round-setup compiler; no progression dependencies.
- `src/game/features/`: typed Factory definitions, immutable nested snapshots and per-territory production calculation.
- `src/game/clock.ts`: fixed-step timing with fractional carry and background rebaselining.
- `src/game/dispatch.ts`, `launch.ts`, `route.ts`, `travel.ts`, `combat.ts`: shared faction orders, reservations, staggered launches, border travel and arrival resolution.
- `src/game/movement.ts`, `dots.ts`: shared board-space movement, eased formations and stable dot slots.
- `src/game/sweep.ts`, `contacts.ts`, `collisions.ts`: swept-circle math, individual contact detection and deterministic one-for-one destruction.
- `src/game/ai/`: separately configurable timing, forecasting and action policy.
- `src/game/worldStep.ts`, `round.ts`: shared live/forecast physical update, faction survival, outcomes and live stepping that stops at round end.
- `src/board/map.ts`, `maps.ts`, `layout.ts`: original field, fixed map catalog and aspect-preserving projection.
- `src/board/drawBoard.ts`, `drawCityFeatures.ts`, `upgradeIcons.ts`: Canvas snapshot rendering and vector Factory/production indicators.
- `src/board/startBoard.ts`: browser animation, resize, visibility and cleanup adapter.
- `src/board/FieldCanvas.tsx`, `TerritoryDetails.tsx`: Canvas wrapper and accessible counts.
- `src/App.tsx`: mobile screen composition.
- `src/ui/`: home/map preview, pause/results, header, field heading, footer, and shared Mantine theme.
- `src/styles.css`: Tailwind palette, CSS layer order, global viewport lock and safe-area padding.
- `vite.config.ts`: Tailwind's Vite integration; client-only boundary-warning handling.

Use Tailwind for layout/spacing and Mantine for interface components. Mantine styles are layered below Tailwind utilities; Tailwind Preflight is intentionally omitted to avoid competing resets. Canvas visuals remain in the board renderer. Browser tests use port 5180 to avoid reusing a possibly stale user development server on 5173.

Simulation modules have no React, Canvas, or browser dependency. React receives snapshots on counts, dispatch, arrival or outcome changes, not every animation frame. Round updates run growth, travel, combat and elimination in fixed steps, stopping at the winning/losing step even after a delayed frame.

**First playable checkpoint reached.** Playtest the basic loop on the target phone before adding features. Playtest all three maps for round duration and tactical fairness; symmetry is not proof of enjoyable balance. Real-device checks and the 2–4 minute duration goal remain unverified. Difficulty remains deferred; progression costs/rewards/caps still require agreement.
