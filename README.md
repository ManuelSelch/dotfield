# Dotfield

A small personal territory-conquest game, built one milestone at a time.

## Current milestone: city conversion and reusable air transport

The permanent bottom strip keeps the map stable when selecting or closing cities. Tap an owned city for **Production / Defender / Airfield / Watchtower / Artillery** role controls (10 / 20 / 30 / 30 / 40 troops; leave one behind). Defender cities stop producing troops, regenerate batch-blocking shields and block hostile ground transit through their territory regions (attack the Defender or stage around it; aircraft bypass). See [Defender border rules and verification](docs/defender-borders/IMPLEMENTATION.md); Airfields stop producing troops and support one reusable airplane carrying up to **100 troops**. Watchtowers stop production and shoot hostile ground troops at 4/s; Artillery stops production and fires at enemy cities at 3/s (mountains block shots). Choose **Fly**, then any target city—even across rivers and mountains. The plane docks, delivers five troops per pulse, and returns empty. Capture Shield and existing features coexist. See the [implemented controls, rules and limitations](docs/city-conversion/IMPLEMENTATION.md).

## Fresh generated matches

Choose a layout: **Open field**, **River**, **Mountains** (default), or **Courtyard**. The first three support **6–30 cities** and **1–4 enemies**; Courtyard supports **20–30 cities and one enemy**, with multiple mountain ridges, two courtyard entrances, flanking valleys and two river crossings. **Factory**, **Slow Zone** and **Relay** stay independent field options. Artillery/Watchtower are built from city roles during play. The default has14 cities. **Reroll** changes the preview; **Play** starts it. **Restart** and **Play again** repeat the exact opening; return Home to choose another field. No simulation or AI runs on Home. Relay is Off by default. Turn it On to mark a central objective: scoring activates at **2:00**, and **180 cumulative holding seconds** wins without conquering everything. Capture pauses, never resets progress. The relay remains an ordinary convertible city; conquest can still win earlier. The compact scoreboard supports every faction. See [relay rules, AI, persistence and limitations](docs/relay/IMPLEMENTATION.md).

Collapsible **Your upgrades** and **Enemy settings** offer independent Industry, Factory and Capture shield effects, plus Balanced/Aggressive/Defensive behavior for each enemy. Slow Zone is a shared field setting, not a faction upgrade. Watchtower/Artillery are mutually-exclusive buildable roles. Preferences survive reload; inactive enemy settings remain remembered but are not applied to smaller matches. On mobile, settings and preview scroll while **Reroll** and **Play** stay fixed at the bottom. Desktop places settings left and preview right. See [generated matches](docs/generated-maps.md) for the generation contract and limitations. Progression, alliances and teams remain out of scope.

The original field has one player, one opponent and eleven neutral cities. City radius is 14 board units; troop radius/spacing are 3/8. Counters scale from 14 logical units with an 11-pixel minimum; compact feature badges keep dense fields readable. Smaller counters and circles leave room for more routes without pan/zoom. Whole regions remain touch targets. These sizes are shared with travel and collision simulation, not cosmetic-only scaling.

React + TypeScript + Vite, with Tailwind CSS layout utilities, Mantine UI components, a responsive Canvas 2D field, and independent TypeScript simulation. Player and opponent Production cities each generate **one unit per active second**; neutral defenders stay unchanged. Automatic production stops at **50 troops per city**, including upgraded cities and every faction. Reinforcements can raise a city above 50 without being reduced; production resumes only after its garrison falls below 50. Full cities do not bank fractional production. Below the limit, partial growth is preserved, and the accessible territory descriptions track whole-unit counts.

Drag from **anywhere inside a player-owned city region** to another region to order all available units except one. You no longer need to touch either circle precisely. A new valid order from the same city replaces every unlaunched group and sends all troops still inside the city except one to the new target, including newly grown units. Already airborne groups keep their original target and positions. The new order launches its first group immediately and restarts the 600-ms cadence; invalid/self/off-board drops do not cancel an existing order. The drag guide shows the route without a numeric dispatch label. Units are reserved for the order but deducted only as groups of up to five launch, 600 ms apart. Queued troops remain defenders; capturing their source cancels unlaunched groups. Groups travel border-to-border, spread over the first 30% of flight and converge over the final 20% before impact. Each arriving batch immediately reinforces a friendly region or reduces hostile defenders one-for-one. Ownership changes only when attackers exceed defenders; ties leave the current owner at zero.

**Mouse only:** alternatively, primary-click a player region with at least two troops, then primary-click a distinct region to send the same all-but-one order (including friendly reinforcement). Selection clears after dispatch; source re-click or Escape cancels. With city management enabled, movement of at least 8 CSS pixels starts a drag from the pressed source instead; it never adds a second click order. Touch/pen taps open management rather than selecting a persistent ground source; dragging still dispatches ground troops. Resizing the board, pausing, interruptions, reset/Home, round completion, or a captured/depleted source clear pending selection. Keyboard region controls retain Enter/Space dispatch and Escape cancellation, coordinated with mouse selection.

Opposing dots now destroy each other **one-for-one on contact during travel**; friendly dots pass through. Surviving dots keep their original slots in the group, so losses leave holes rather than rearranging the formation. Only survivors reach the region and deal damage. Collision geometry is shared with rendering in board coordinates, so screen size/pixel density does not change the outcome. Movement is swept between fixed simulation steps, including exact launch/impact boundaries; contacts resolve chronologically, then by stable dot IDs on ties.

Victory/defeat counts both owned territories (even empty ones that can grow) and airborne troops. Queued units count through their source garrison, not as independent survivors. Finished rounds freeze growth, movement and orders. **Play again** resets the map, units, batches and clock. The opponent is now active: it expands, attacks vulnerable regions, reinforces threatened allies and moves reserves toward the frontline. It uses the same growth, all-but-one dispatch, batch travel and combat rules as the player. Progression remains a later milestone. Home now offers **Industry**, off by default: your owned cities produce **25% faster** (1.25 units/sec), including new captures; the opponent stays at 1 unit/sec. Restart/Play again retain it, Home lets you change it, and preferences survive reload. **Factory**, also off by default, doubles your starting city's production (2 units/sec, or 2.5 with Industry). Its factory silhouette stays on the city, and capture transfers the bonus to the new owner, using that owner's Industry rate. Neutral Factories are dimmed and produce nothing. Industry shows an upward chevron on your boosted cities. Combined effects show both icons, without obscuring counters. There is no economy or unlock system. See the [implemented and proposed effect catalog](docs/upgrades/EFFECTS.md) and [upgrade architecture](docs/upgrades/REQUIREMENTS.md). See [REQUIREMENTS.md](REQUIREMENTS.md) for the overall roadmap.

**Capture shield**, off by default and independently selectable for every faction, grants three charges after each successful capture. Each owner-coloured arc blocks one whole hostile arriving batch (normally five troops), including partial survivors. Friendly reinforcement does not consume or refill it; qualifying recapture refreshes it. Starting cities have no shield. Charges persist on reload and reset on Restart/Play again. See [Capture shield scope](docs/upgrades/EFFECTS.md#capture-shield-scope).

Baseline tuning is in `src/game/settings.ts`; geometry, batch size and simulation step remain global. `src/game/rules.ts` snapshots independent faction-ID keyed growth, movement speed and launch cadence. `src/game/upgrades/catalog.ts` defines typed stat modifiers; `compile.ts` resolves selections into per-round rules without changing shared defaults. Growth uses the current city owner; orders use the issuing faction's speed/cadence, including AI duration estimates. Fresh starting positions/counts are generated by `src/board/generateMap.ts`; `src/board/map.ts` and `src/board/maps.ts` retain authored regression fixtures. Independent faction rules, AI, collisions and outcomes support all four generated enemies. These are prototype tuning values. Backgrounding pauses the animation clock; returning does not grant growth for hidden time. While a round is active, the current board, airborne groups, pause state, rules and AI settings are saved locally and restored after a browser/mobile app reload. No offline growth is granted while the app is closed. Saving is event-only: round start/restore, visibility changes, page exit, session commands, and round completion write the latest applied state immediately without advancing time. There are no periodic saves or writes during ordinary frames/dispatches. Browser lifecycle events are best-effort: a crash or force-kill can lose all progress since the last event save. Choosing Home, starting a new round, or clearing site data removes the saved round. Corrupt or unavailable storage safely falls back to a new Home screen.

## Responsive battlefield layout

The game screen fits a centered logical **3:4 battlefield** to the available Canvas width and height. A permanent single-row city-action card (66px plus safe-area adjustment) is reserved below it with a 12px gap, including when nothing is selected or the round is paused/finished; selection and flight targeting never resize or move the map. The card omits the city/garrison header and redundant Production status; readiness/shield information sits inside the selected type button. On short screens the field fits inside the remaining Canvas with noninteractive margins. Its header, troop composition (or fixed-height relay scoreboard) and pause control align with the Canvas. Phones retain safe-area padding and the page remains scroll-locked. Resizing updates rendering and input geometry without replacing the active session or changing simulation distances. Home uses the approved settings-first mobile layout with fixed Play and an internally scrolling preview/settings area; desktop puts settings left and preview right. Mouse click-to-click input remains available during gameplay.

Approved designs are preserved in `mockups/desktop-battlefield/` and `mockups/random-map/`. `tests/desktop-layout.spec.ts`, `tests/desktop-home.spec.ts` and `tests/mouse-orders.spec.ts` cover proportions, generated setup retention, authored gameplay scenarios, input-mode coordination, lifecycle cancellation, overlays and live/paused resizing. Real-iPhone Safari verification remains a follow-up.

## Terrain routing foundation

[Special-city slice 1](docs/special-cities/SLICE-1.md) adds validated logical-field barriers/crossings and pure shortest legal-route queries. [Slice 2](docs/special-cities/SLICE-2.md) implements the approved bridge-city design with manual staging, AI staging, preview legality, persistence and accessible hints. [Slice 4](docs/special-cities/SLICE-4.md) adds contested-Factory scenarios and current-owner production bonuses. [Slice 5](docs/special-cities/SLICE-5.md) documents the historical generated contested-Artillery experiment; normal matches now build Artillery as an exclusive city role. The authored Siege field remains a regression/migration fixture. Gatehouse is skipped; Portal is next. See the [terrain and special-city plan](docs/special-cities/REQUIREMENTS.md).

## City regions and map generation

Each circle is a city center. Voronoi regions are generated automatically from the city positions, clipped to the proportional battlefield Canvas; widescreen margins remain outside its input area. River maps clip cells separately to each bank and exclude water from hit testing. Subtle faction fills, thin borders between cities and full-region source/target highlights match the approved mockup in `mockups/city-regions/`.

- `src/board/regions/clip.ts` / `geometry.ts`: dependency-free half-plane clipping for the small maps. Duplicate IDs/positions and non-finite coordinates are rejected.
- `cache.ts`: regenerate only when city IDs, positions, Canvas dimensions or river metadata change; counters and ownership changes reuse the geometry.
- `styles.ts` / `drawRegions.ts`: separately tunable fills, outlines and focus/selection rendering.
- `hitTest.ts`: nearest-city selection inside the board, with stable map-order ties. Off-board releases cancel; dropping inside the same region cancels. Region borders do not restrict movement; river maps permit same-bank orders and explicit crossings only between paired bridge cities.
- `bindDrag.ts` / `bindKeyboard.ts` / `bindBoardInput.ts`: separate pointer and keyboard adapters, sharing the same orders and ownership/garrison validation.

City circles remain the **only troop spawn and region-impact boundaries**; per-dot collision physics, AI and combat are unchanged. Cells are a visual/input layer, not a second combat geometry. This lets future maps be specified by circle positions rather than hand-drawn borders.

Keyboard: Tab to a region, Enter/Space to select a friendly source, then focus and activate a target. Escape cancels. Focus and selection show on the full region. Region fills update immediately without decorative transition animations; essential troop spreading/convergence remains tied to actual collision geometry even under reduced-motion preferences.

## Session lifecycle and mobile controls

`src/game/session.ts` exposes a UI-independent `createSession(map, ai, rules)` controller: `start`, `pause`, `resume`, `restart`, `setHidden`, `frame(timestamp)`, `dispatch`, `convert` and `fly`. Sessions begin ready; paused/hidden/ready sessions reject orders and do not advance growth, launch queues, travel or AI. Resume rebaselines the clock without catching up; restart creates a fresh ready state and clock, clearing fractional timing, orders and AI deadlines. Terminal outcomes cannot be resumed.

The board adapter uses this controller for simulation frames, player dispatch and background suspension. Play mounts a fresh session for a newly generated map. Home unmounts it and disposes the animation, input and visibility listeners. A compact **pause icon** sits above the field; **Restart** is available only in the pause screen. Pause cancels active selection and freezes growth, launches, travel, collisions and AI; the paused screen offers **Resume**, **Restart** and **Home**. Backgrounding never overrides a manual pause. Resume excludes paused time without catch-up.

Restart immediately resets the map, troops, growth fractions, clock, outcome and AI deadline, then starts the fresh round—**no confirmation or ready popup**. Finished rounds offer **Play again** on the same map, **New map** with the same settings, and **Home** to change the setup. Restart/replay use the same controller reset without recreating browser listeners. Home abandons the current round without confirmation. Region keyboard controls are disabled while paused, and pause actions have 44px minimum touch height.

## Enemy AI architecture and tuning

The opponent is deterministic and browser-independent. Small modules under `src/game/ai/` separate responsibilities:

- `config.ts`: decision cadence, minimum useful army, action scores, source-risk penalty and frontline distance threshold.
- `forecast.ts`: immutable forecasts of growth and already-known orders, using the real launch/travel/collision/combat rules. Uses fixed steps while opposing groups exist; skips only safe quiet steps.
- `score.ts`: evaluates expansion, attack, defensive reinforcement and production-aware army concentration.
- `logistics.ts`: terrain/bridge-aware front distances, stable staging priorities, conservative source protection and faction-wide army accounting for production relief.
- `decision.ts`: enumerates legal candidates, compares forecasts, and picks one useful order; waits if none are worthwhile.
- `tick.ts`: schedules decisions on active simulation time, not rendering frames or wall-clock timers.
- `actions.ts` / `mobility.ts`: shared typed ground/conversion/airlift actions, conservative production-base safeguards and bounded Airfield supply.

Prototype cadence: first decision after **1.8 seconds**, then every **1.8 seconds**; armies must have at least six units to send. Busy sources wait for their existing groups to finish. The policy considers travel time, defender growth, incoming groups, source exposure and existing captures, without extra resources or knowledge of future player input. It does not stop making decisions simply because it is winning or losing.

Safe rear cities also export troops shortly before reaching the 50-unit production cap, concentrating at a few useful staging cities which may exceed 50. Production relief compares faction-wide forecast troop gains, including the recipient's lost growth, and protects threatened sources and exposed strongholds. Stable staging priorities prevent cap-driven back-and-forth transfers. See [production-aware AI logistics](docs/ai-production.md) for behavior, safeguards and limits.

Tune `DEFAULT_AI` and `PRODUCTION_AI` in `config.ts`, or pass an `AiConfig` to `FieldCanvas`/`startBoard`. The actual app enables AI by default. Pure `advanceRound(state, elapsedMs, config)` takes the policy explicitly; omitting it or passing `null` disables AI for isolated rule tests. Replay resets its decision deadline and backgrounding excludes hidden time. Difficulty presets and smarter tactics remain deferred; each enemy uses its selected Balanced, Aggressive or Defensive behavior on generated maps. River AI stages at bridge endpoints and values contested Factory production; these behaviors are not Easy/Normal/Hard difficulty presets.

### Experimental MDSL bot (development only)

Open the development app with `?bot=mdsl` to replace configured enemies with a minimal Mistreevous neutral-expansion tree. Edit `src/game/ai/mdsl/expansion.mdsl`; watch `[MDSL]` debug messages in the browser console. Start with Open field, one enemy and Relay off. The prototype uses real commands/forecasts and persistent plans, but has no defense or enemy-city attacks. Without the flag, normal AI remains unchanged; production builds ignore it. See [setup, method contracts and limits](docs/ai-mdsl/IMPLEMENTATION.md).

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

The production build is a PWA. Open it once over HTTPS, then install Dotfield from the browser's **Add to Home Screen** action. The service worker caches the application shell and hashed assets, so an installed app can start without the server. The current round is stored locally and restored after reload; no server connection is required for gameplay. The first visit and later application updates still require a connection. A persistent badge at the top right shows Online, Offline, Updating or Update ready. Online reflects the browser's network signal, not verified server reachability. New app files download in the background without reloading an active round. When an update is ready, return Home and choose **Update now** to reload explicitly; updates never upload game progress. Failed updates leave gameplay available and retry when reconnecting or focusing the app. Run `npm run test:pwa` to verify offline launch and the explicit-update lifecycle against the production build.

## Browser checks

```sh
npx playwright install chromium
npm run test:browser
```

If you already have Google Chrome installed, you can avoid the Chromium download:

```sh
PLAYWRIGHT_CHANNEL=chrome npm run test:browser
```

The suite checks phone/tablet/desktop layouts, scrolling Home content with reachable fixed mobile Play, a locked battlefield without browser errors, and Canvas sizing at device pixel ratio 3 after resizing. Controlled-clock tests also verify visible growth, per-batch border impacts, victory/defeat, frozen finished rounds, replay, fresh-page state, and simulated background/resume without catch-up. AI browser tests run the real app and verify expansion, background-paused decisions, an idle-player defeat and replay. Isolated dispatch/round tests use test-only Vite fixtures with AI disabled. Per-dot browser checks use the real simulation and Canvas renderer in a deterministic crossing-battle fixture at two viewport sizes and pixel densities. They inspect Canvas pixels to verify that the destroyed center dot disappears, the outer dots stay in place, and only four survivors deal damage. Region browser checks cover far-from-circle pointer/touch dispatch, full-region selection and capture colors at different viewport/DPR sizes, keyboard cancellation/dispatch, and existing off-board cancellation. Screenshots are written to `test-results/` (ignored by Git).

Automated checks currently use Chromium/Chrome. Real iPhone Safari and safe-area behaviour still require device testing.

## Source layout

Small modules are grouped by feature.

- `src/game/types.ts`, `state.ts`: independent state model and fresh-session creation.
- `src/game/settings.ts`, `rules.ts`, `growth.ts`: tuning defaults, validated faction rules and pure elapsed-time growth.
- `src/game/upgrades/`: typed stat/starting-feature effect catalog and pure round-setup compiler; no progression dependencies.
- `src/game/features/`: attached Factory/Slow Zone features, legacy snapshots, local production and deterministic shield handling. City-role weapons run through the shared weapon scheduler.
- `src/game/clock.ts`: fixed-step timing with fractional carry and background rebaselining.
- `src/game/cityConversion.ts`, `aircraft.ts`, `aircraftState.ts`, `restoreAircraft.ts`: conversion commands, one-plane lifecycle, direct travel/delivery and strict aircraft save validation.
- `src/board/CityControls.tsx`, `drawAircraft.ts`: approved conversion/targeting bar and top-down Dock & pulse rendering.
- `src/game/dispatch.ts`, `launch.ts`, `route.ts`, `travel.ts`, `combat.ts`: shared faction orders, reservations, staggered launches, border travel and arrival resolution.
- `src/game/movement.ts`, `dots.ts`: shared board-space movement, eased formations and stable dot slots.
- `src/game/sweep.ts`, `contacts.ts`, `collisions.ts`: swept-circle math, individual contact detection and deterministic one-for-one destruction.
- `src/game/ai/`: separately configurable timing, forecasting and action policy.
- `src/game/worldStep.ts`, `round.ts`: shared live/forecast physical update, faction survival, outcomes and live stepping that stops at round end.
- `src/board/generateMap.ts`: seeded generation, validated map settings, separated starts and paired crossings.
- `src/board/map.ts`, `maps.ts`, `layout.ts`: authored regression fields and aspect-preserving projection.
- `src/game/matchPreferences.ts`: validated, versioned match preferences and generation metadata.
- `src/board/drawBoard.ts`, `drawCityFeatures.ts`, `drawArtillery.ts`, `upgradeIcons.ts`: Canvas rendering, compact city badges and Artillery coverage/shot feedback.
- `src/board/startBoard.ts`: browser animation, resize, visibility, persistence snapshots and cleanup adapter
- `src/game/persistence.ts`: versioned local round save/restore with safe storage failure handling.
- `src/board/FieldCanvas.tsx`, `TerritoryDetails.tsx`: Canvas wrapper and accessible counts.
- `src/App.tsx`: responsive screen composition and controlled Home setup state.
- `src/pwa/appUpdates.ts`, `src/ui/ConnectionBadge.tsx`: offline/reconnect/update status and explicit Home-only update activation.
- `src/ui/`: home/map preview, pause/results, header, field heading, footer, and shared Mantine theme.
- `src/styles.css`: Tailwind palette, CSS layer order, global viewport lock and safe-area padding.
- `vite.config.ts`: Tailwind's Vite integration; client-only boundary-warning handling.

Use Tailwind for layout/spacing and Mantine for interface components. Mantine styles are layered below Tailwind utilities; Tailwind Preflight is intentionally omitted to avoid competing resets. Canvas visuals remain in the board renderer. Browser tests use port 5180 to avoid reusing a possibly stale user development server on 5173.

Simulation modules have no React, Canvas, or browser dependency. React receives snapshots on counts, dispatch, arrival or outcome changes, not every animation frame. Round updates run growth, travel, combat and elimination in fixed steps, stopping at the winning/losing step even after a delayed frame.

**First playable checkpoint reached.** Playtest the basic loop on the target phone before adding features. Playtest generated fields for round duration and tactical fairness; structural constraints are not proof of enjoyable balance. Real-device checks and the 2–4 minute duration goal remain unverified. Difficulty remains deferred; progression costs/rewards/caps still require agreement.
