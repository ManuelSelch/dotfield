# Runtime architecture

## State and lifetime

[App](../src/app.tsx) owns Home preferences and the selected round. Home generates previews without running simulation or AI. Compiled setup fixes initial territories, faction rules, features, terrain and optional Relay for a round; Restart/replay reuse that opening.

[useBoardSession](../src/board/use-board-session.ts) binds React to one [startBoard](../src/board/start-board.ts) controller. The controller owns the session, animation callback, input bindings, resize/visibility listeners, AI worker and optional development bots. Disposal cancels animation and releases these browser resources. React receives semantic snapshots rather than every animation frame; Canvas reads the live simulation state.

## Simulation and presentation

[session](../src/game/session.ts) owns commands, phase and active-time stepping. The [clock](../src/game/clock.ts) accumulates fixed steps, carries fractional active time and rebaselines on suspension. Hidden/paused time grants no catch-up or offline growth. [worldStep](../src/game/world-step.ts) shares physical rules between live rounds and AI forecasts, including event boundaries for arrivals, weapons and aircraft. Stable IDs order collision/weapon ties.

Simulation modules under `src/game/` are independent of React and Canvas. Shared board-space geometry determines movement, individual troop contacts and impact boundaries; changing rendering must not change those outcomes. [drawBoard](../src/board/draw-board.ts) projects the logical field to Canvas, while accessible React controls/descriptions expose input and game state. Resize changes projection, not simulation distances.

## AI

Normal enemies share an asynchronous [worker](../src/game/ai/worker.ts). The board submits per-faction snapshots when active-time decision schedules permit, tracks pending requests and applies returned actions through the same session commands as the player. Forecasts use known orders and real physical rules, not future player input. The worker uses a best-so-far decision budget; unlimited pure evaluation is available for deterministic rule tests. See [AI policy and limits](ai-production.md) and [dashboard diagnostics](enemy-dashboard/IMPLEMENTATION.md).

The development MDSL prototype is opt-in. The [Blockly editor](bot-editor/IMPLEMENTATION.md) stores source independently; Custom activation remains disabled and must not be confused with the normal AI worker.

## Local persistence and updates

[Round persistence](../src/game/persistence.ts) validates serialized setup/runtime and restores paused/active phase without offline simulation. Browser/session event snapshots write already-applied state; there is no periodic autosave timer. Applied AI commands also request snapshots in the current board adapter. Storage failure must not prevent gameplay; lifecycle writes are best-effort, so crashes can lose progress since the last write. Home abandons the saved round. Preferences, round runtime and editor projects have separate lifetimes.

The [PWA update controller](../src/pwa/app-updates.ts) caches application assets locally, not server-synced progress. Updates install in the background; explicit Home-only **Update now** reloads the app. No unsolicited reload should interrupt a round or editor draft. Browser Online is a connectivity signal, not proof of server reachability.

## Verification boundary

Colocated unit tests cover pure mechanics and browser-adapter lifecycle. [Browser scenarios](../tests/) cover real app/worker/input integration through drivers; production PWA tests separately exercise offline/update behavior. Passing Chromium tests does not establish iPhone Safari behavior, thermal performance or human balance. Performance cleanup must preserve physical outcomes, upgrade effects, controller choices and existing accessible journeys unless explicitly agreed otherwise.
