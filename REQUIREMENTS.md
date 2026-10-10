# Dotfield — Requirements

## Goal

Status: mobile board, simulation, AI, pause/replay, seeded generated-match Home, Industry/Factory/Watchtower/Slow Zone/Capture shield/Artillery, multi-faction combat, independent per-enemy AI behavior/rules/upgrades, responsive desktop Home/battlefield, mouse-only click orders, event-only round persistence and production PWA caching are implemented. Authored bridge, Factory and Siege/Artillery scenarios remain regression fixtures alongside fresh generated fields. Real-iPhone Safari/installed-offline validation and balance/duration playtesting remain outstanding; progression and difficulty presets remain deferred.

Implemented desktop layout and mouse-control requirements are tracked separately in [docs/desktop/REQUIREMENTS.md](docs/desktop/REQUIREMENTS.md). That focused plan supersedes the portrait-only layout restriction on desktop, preserves the mobile-first experience, and excludes hover feedback.

The original browser assertion failures and lifecycle-save defect are repaired; [docs/test-repair/REQUIREMENTS.md](docs/test-repair/REQUIREMENTS.md) tracks the pending expanded persistence matrix. Merge checkpoint `d2d9702` passed 402 unit tests, 79 Chrome browser tests, build and whitespace checks; totals are checkpoint evidence, not a permanent suite size.

### Purpose

A small personal strategy game for a few minutes of play when bored. Preserve the satisfying core of State.io: circles accumulate units, the player sends units to capture other circles, and timing and expansion choices matter.

The intended differentiators are a modern mobile/desktop interface, configurable AI opposition, fresh generated maps and eventually capped progression. Match preferences are saved locally; progression is not implemented. No advertising, multiplayer, or grind-heavy systems.

Success means enjoyable short rounds, readable controls and a credible opponent; feature count is not a success metric. The 2–4 minute target and real-device usability still require human playtesting.

### Decisions and proposals

#### Confirmed by the user

- Working name: **Dotfield**. Name availability has not been checked.
- Real-time territory conquest using simple circles and growing unit counts.
- Rounds last a few minutes.
- Attacking sends **all available source units except one**, replacing any existing unlaunched source groups while preserving airborne groups.
- AI difficulty is adjustable to find a personal sweet spot.
- AI should continue making meaningful attempts when clearly winning or losing.
- Enable upgrade effects before Play without progression. Player and each AI faction have independent upgrade selections and AI behavior. Generated-match preferences survive reload. Industry (+25% owned-city production), Factory, Watchtower, Capture shield and player-selectable randomly placed Slow Zone are implemented. Details are in [docs/upgrades/EFFECTS.md](docs/upgrades/EFFECTS.md) and [docs/upgrades/REQUIREMENTS.md](docs/upgrades/REQUIREMENTS.md).
- Seeded generated fields contain 6–24 cities and 1–4 enemies, with Industry (neutral Factories) and optional paired river crossings. Home shows an unnamed visual preview with reroll; Play generates a fresh field. Restart/replay retain the current field; New map creates another. Home preferences persist locally. The earlier seven authored maps remain regression fixtures. See [generated match implementation](docs/generated-maps.md).
- Mouse-only click-to-click uses full regions and the existing order command; touch/pen remain drag-only. Source re-click/Escape and lifecycle/source invalidation clear selection.
- Mobile-first, modern, understated visuals. Avoid desktop-like panels, childish themes, and dated-looking graphics.
- One human player and a target map with two independent AI enemies. Each enemy's AI behavior and upgrade effects are selectable separately. All factions are hostile; no alliances/teams. Settings persist locally. Multiplayer/networking is out of scope.
- Tailwind CSS and Mantine for interface styling; keep feature modules and files small.

#### Implemented architecture and remaining product targets

- Production web app includes PWA manifest, icons, service worker caching and install support; real-iPhone standalone/offline validation remains manual.
- React and TypeScript for interface; Canvas 2D for the game board.
- Mobile-first proportional battlefield and responsive two-column desktop Home; no pan/zoom. Mouse click-to-click, pointer dragging and keyboard input coexist.
- Typical round target: 2–4 minutes, subject to playtesting rather than a forced timer.
- Generated map bounds, settings, lifecycle, and limits are documented in [generated matches](docs/generated-maps.md).
- Production shell/assets are cached for offline launch after initial online loading. Active rounds and match preferences persist locally; progression is deferred. No backend.
- Difficulty changes AI decision quality and timing, not hidden resource advantages.

Implemented items describe the current baseline; unresolved product targets are not authorization to add difficulty/progression features.

## Scope

### In Scope

#### First playable prototype — implemented baseline

- One fixed map, one player, one AI faction, and neutral circles.
- Automatic unit generation, all-but-one dispatch, visible travel, combat, and capture.
- A basic active opponent, with tunable parameters.
- Clear victory/defeat and immediate replay.
- Touch controls on iPhone and pointer controls on desktop for development.

#### Subsequent additions and follow-ups

- Three AI difficulty presets, with advanced tuning available for playtesting.
- A small set of varied maps or constrained map generation.
- Implemented Industry/Factory/Watchtower/Slow Zone/Capture shield and seeded generated maps; authored maps remain regression scenarios. Progression remains later work.
- Implemented event-only round persistence, pause/resume and production PWA caching; expand persistence regression coverage and test real-device install/offline behavior.

### Out of Scope

- Multiplayer, accounts, servers, cloud sync, leaderboards, and social features.
- Ads, purchases, subscriptions, daily rewards, energy limits, and loot boxes.
- Large campaigns, elaborate skill trees, skins or a game editor. Terrain/special cities are limited to their separately approved [focused plan](docs/special-cities/REQUIREMENTS.md).
- Native iOS packaging or App Store release initially.

## Requirements

### Terms

- **Circle / territory:** a capturable node with an owner and unit count.
- **Faction:** the player or an AI opponent.
- **Neutral:** a territory owned by neither faction.
- **Dispatch:** units removed from a friendly source and sent to a target.
- **Growth:** generation of units over time inside an owned territory.
- **Upgrade:** an effect selected before Play, fixed for that round/replay. Progression may determine active effects later; there is no purchase/unlock system now.

### Functional requirements

### FR-01: Board and growth

- Show each circle's owner and current whole-unit count at a glance.
- Owned circles generate units over elapsed simulation time, independently of rendering frame rate.
- Neutral circles have defenders but do not generate units. Automatic city production is capped at 50; reinforcements may exceed the cap without being reduced.
- Keep growth rate and initial unit counts configurable, not scattered through the code.
- Milestone-2 prototype baseline: one unit per second for both factions, no neutral growth, 50 ms fixed-step clock with fractional carry. Tuning remains open.
- Implemented background handling pauses the clock and excludes hidden elapsed time; explicit Pause/Resume and immediate Restart controls are implemented. Real-iPhone polish remains milestone 7.

### FR-02: Dispatch

- Drag from anywhere in a player-owned city region to a distinct target region to send units. Mouse-only primary-click selection/destination dispatch uses the same rules; a 5-CSS-pixel movement threshold distinguishes dragging. Touch/pen taps do not persist selection. Each city circle remains the spawn/impact spot.
- Order all available whole units except one; a source with fewer than two garrison units sends nothing. A new valid order replaces queued groups from that source, restarts the launch cadence and includes newly grown units.
- Keep route/selection feedback, but do not display a numeric dispatch label.
- Reserve ordered units immediately, but deduct them from the source counter only as each group launches. Queued troops remain defenders; replacement cancels their old reservation before creating the new order, never duplicating troops.
- If a source is captured, cancel its unlaunched groups; already airborne units continue. A depleted source launches only available units, keeping at least one.
- Units travel visibly and resolve on arrival.
- Dropping outside the board or inside the source's own region cancels without changing counts. Points anywhere inside another region are valid targets.
- Ignore input from non-player sources and while paused or after the round ends.
- Support friendly reinforcement as well as attacks. River orders stay on one bank or cross explicitly between paired bridge endpoints; water is not selectable.
- Airborne groups cannot be redirected; replacing a source order affects only its unlaunched groups. Invalid orders or cancelled drags leave the current order intact.

### FR-03: Combat and capture

- Friendly arrivals add units to the destination.
- Hostile arrivals cancel defending units one-for-one.
- If attackers outnumber defenders, ownership changes and surviving attackers become the garrison.
- Implemented tie rule: equal forces leave the current owner with zero units.
- Resolve arrivals against ownership at arrival time, not dispatch time.
- Resolve completed batches by arrival time; exact ties retain dispatch/insertion order.
- Each batch resolves when it reaches the target border, while later batches continue travelling.
- Opposing individual dots destroy each other one-for-one when touching in flight. Friendly dots pass through; queued dots do not collide before launch.
- Keep stable slots for survivors without recentering the group. Destroyed dots cannot arrive or deal damage; fully destroyed groups disappear.
- Use shared board-coordinate dot positions/radii for simulation and rendering; screen size and pixel density must not alter collision outcomes.
- Sweep movement within fixed simulation steps to avoid missed crossings. Resolve contacts by time, then stable transfer/slot IDs on ties, with each dot consumed at most once.

### FR-04: Round lifecycle

- Starting or replaying a round creates a fresh board and clears previous orders.
- Determine elimination using both owned territories and airborne units; losing the last circle alone need not end a faction's chance to recover. Queued groups are still part of their source garrison, not independent survivors.
- End the round when only one faction remains able to fight.
- Show victory or defeat clearly, with an immediately accessible replay action.
- Stop simulation and gameplay input after the round ends.
- Do not impose a round timer in the prototype; tune map size and growth for short rounds.

### FR-05: Active AI

- Use legal orders and the same combat/dispatch rules as the player.
- Evaluate neutral expansion, vulnerable enemies, defence, and friendly reinforcement.
- Account for travel time and known incoming forces when choosing an action.
- Avoid repeatedly sending clearly insufficient attacks or emptying every territory without considering threats.
- Remain active while winning or losing: exploit advantages, seek recoverable targets, and look for counterattacks.
- Waiting is valid when no sensible order exists; constant suicidal attacks are not the goal.
- Being ahead or behind must not disable AI decision-making; the position may still change its tactical priorities.
- Implemented baseline: pure modules separate config, known-order forecasting, candidate scoring/selection and simulation-time scheduling. Default first decision and interval: 1.8 seconds; minimum sent army: six units. No resource or growth bonuses.
- Forecast current orders, per-dot collisions and defender growth through the relevant arrivals; avoid duplicate secured captures and abandoning a source under known threat. Concentrate reserves toward the frontline when individual armies are insufficient.
- The current heuristic does not predict future player orders or guarantee optimal play. Difficulty presets and tactical refinements remain milestone 6.

### FR-06: Difficulty and tuning

- Allow difficulty selection before starting a round.
- Proposed presets: Easy, Normal, Hard.
- Tune decision interval, forecasting depth, reserve policy, and controlled mistakes; aggression alone is not equivalent to intelligence.
- Keep difficulty independent of permanent upgrades.
- Provide development/playtest controls for individual AI parameters without cluttering the normal game screen.
- Stronger difficulty should generally outperform weaker difficulty across repeated test scenarios, not necessarily every individual round.
- Do not promise an optimal opponent; iterate from observed playtest weaknesses.

### FR-07: Pre-game upgrade effects; progression deferred

- Enable effects before Play without currency, prices, rewards or unlocks. Player upgrades and each AI faction's upgrade effects are configured independently; generated-match settings persist locally.
- Industry increases production of every city owned by the faction that selected it by 25%; ownership at growth time determines the rate. Neutral growth remains unchanged.
- Factory upgrades attach to the selecting faction's starting city; maps can author neutral Factories. Every Factory doubles its current non-neutral owner's local production, stacking with that owner's Industry (2.5 units/sec). Capture transfers the bonus, recapture transfers it back, and duplicate upgrades on authored Factories do not stack. See [special-city slice 4](docs/special-cities/SLICE-4.md).
- Artillery attacks the nearest hostile garrison within90 units, removing one defender per2000ms. Neutral/friendly targets and airborne troops are ignored; mountains block direct fire but rivers do not. Capturing a gun transfers control and starts a full cadence; artillery cannot capture alone. The focused Siege map remains an authored fixture while Home uses fresh generated matches. See [special-city slice 5](docs/special-cities/SLICE-5.md).
- Artillery is a map-authored capturable city feature: nearest hostile positive garrison within 90 units loses one defender every 2,000 ms; neutrals/friends are ignored, mountains block shots and rivers do not. Capture transfers control and resets cadence. It cannot capture alone or damage traveling troops. Siege is the eighth map; blocked mountain orders require explicit staging, not automatic detours. See [special-city slice 5](docs/special-cities/SLICE-5.md).
- Show a factory silhouette on its host (dimmed while inactive) and one upward chevron on Industry-boosted cities. Use both icons when stacked; reserve double chevrons for a later improved Industry level. Do not obscure counts or change touch/combat geometry.
- Keep a typed catalog and pure compiler, independent faction-ID keyed rules, typed territory features and a fixed round setup shared by simulation and forecasts.
- Restart/Play again retain compiled effects without stacking them. Home allows changing selections; reload on Home resets setup choices, while a saved active round restores its effects.
- Preserve paused/hidden/terminal freeze and fractional growth. Numeric modifiers must not mutate shared defaults or map seeds.
- Watchtower attaches to the selecting faction's starting city, covers a visible 72-field-unit radius and destroys up to four hostile airborne dots per second (one every 250ms). Its allegiance follows current city ownership; neutral towers are inactive. Live simulation and AI forecasting share deterministic fixed-step firing.
- Each AI faction has selectable Balanced/Aggressive/Defensive behavior and catalog upgrades, including Capture shield. Slow Zone selection is player-only: radius 90, speed multiplier 0.5, randomly placed once per setup across all cities. Owned zones slow hostile groups; neutral zones slow everyone; overlaps use the strongest slowdown. Restart/replay keep the resolved host.
- No alliances/teams. Home choices persist locally, while saved active rounds retain their compiled AI/rules/features and generated-match seed/preferences.
- Later progression supplies the same selected effect IDs. Reward formula, prices and caps remain unresolved and out of current scope.

### FR-08: Settings and persistence

- Persist the active round and generated-match preferences locally; persisted difficulty/progression remain future requirements.
- Reset progression only through an explicit confirmed action.
- Handle missing, outdated, or corrupt saved data with safe defaults rather than preventing play.
- Explain that clearing browser/site data can remove progress.
- Save the active round, including territories, fractional growth, airborne/queued transfers, feature timers, rules, AI, river metadata and phase; restore on reload without simulating closed time.
- Saving is event-only: start/restore, visibility changes, page exit, session commands and round completion. Frames/dispatches do not write storage; lifecycle saves preserve latest applied state without advancing time. Abrupt termination without lifecycle delivery may lose progress since the last event save. Home clears the save; disposal cannot resurrect it.

### FR-09: Pause and offline use

- Provide Pause/Resume and immediate Restart actions with 44px minimum touch height. Restart resets state and starts the round without confirmation. No ready popup; home-screen Play starts a fresh round on the selected map. A 44px pause icon is the only in-round menu control; Restart is inside the pause overlay.
- Pause freezes growth, launches, travel, collisions, orders and AI; background automatically suspends the clock without overriding manual pause.
- Resume without simulating all the elapsed background time or granting offline growth.
- Production PWA caching supports launch/new rounds without a connection after initial online loading; first load and updates require a connection. Round persistence is independent of the service worker and never grants offline growth.
- Manifest/icons and Home Screen install support exist; real-iPhone standalone, safe-area, offline launch and update behavior require manual validation.

### FR-10: Generated map variety and home screen

- Generate fresh seeded maps from selected city/enemy/feature settings. Do not show map names. Reroll changes only the preview; Play generates and starts a new layout. Restart/replay retain the current layout; New map generates another using the active match preferences. No simulation or AI runs on Home. Full generation invariants and limitations are in [docs/generated-maps.md](docs/generated-maps.md).
- Preserve the original 13-city field and the 9-, 11- and 21-city variants. Add a 23-city Crossfire field containing one player and two independent AI starts. Maps are selected visually, without names or descriptions.
- Preserve authored opening counts per map: original symmetric player/enemy spawns use 36, Crossfire uses one 36-unit player and two 30-unit enemies, and river maps have explicit starting holdings/features. Check bounds, circle clearance and generous region hit areas; do not infer balance from symmetry.
- Return Home from pause/results, abandon the current round and dispose its browser adapter. Keep the selected map in memory. A subsequent Play creates a fresh round; reload on Home defaults to map 1, but reload during a saved round restores that round.
- Restart/replay must reset the current map, not silently return to the original field.
- Keep the fixed screen, no pan/zoom or scrolling. Duration and human tactical balance need playtesting; do not infer them from symmetry or automated checks.

### Interface and quality requirements

- Mobile-first proportional 360×480 logical board fitted to width and height; no pan/zoom. Desktop Home uses two columns at ≥900×600, centered Play below them and vertically centered settings when they fit. Narrow/short windows stack with bounded settings overflow.
- Clean circles, readable numbers, restrained faction colours, and smooth unit movement.
- Avoid decorative themes, heavy panels, and menus during play.
- Clear full-region source selection and valid-target feedback; touch actions must not accidentally scroll the page.
- Generate straight-edged Voronoi regions from city positions, clipped to the proportional Canvas (separate banks on river maps). Widescreen margins remain outside hit testing; nearest-city input uses deterministic map-order ties and excludes water.
- Subtle faction fills and thin city borders persist even between allied cities. Ownership recolors cells without regenerating geometry; cache cells until city positions/identities or layout dimensions change.
- Keep outer region borders visual/interactive only; never replace circle impact borders or per-dot collision geometry.
- Provide keyboard/screen-reader city controls with visible whole-region focus, Enter/Space activation, Escape cancellation and disabled controls after round end.
- Respect iPhone safe areas and keep controls comfortably tappable.
- Check readability and faction distinction without relying solely on subtle colour differences.
- Aim for smooth animation on the actual target iPhone; measure before adding visual complexity.
- Pause correctly during interruptions and keep combat outcomes independent of rendering frame rate.
- No required network requests during gameplay, telemetry, or third-party tracking.

### Technical architecture

- **Vite + React + TypeScript:** a small web project with minimal dependencies.
- **Tailwind CSS + Mantine:** utility-driven layout and Mantine UI components/theme; layered styles with no Tailwind Preflight. Keep custom CSS focused on viewport locking and safe areas.
- **Canvas 2D:** draw territories, counts, travelling units, and touch feedback.
- **Independent TypeScript simulation:** growth, dispatch, travel, combat, lifecycle, and AI. No React or Canvas dependency in core rules.
- **Simulation clock:** fixed-step updates or another explicitly frame-independent approach; rendering uses `requestAnimationFrame`.
- **React interface:** modular Home/map/settings components, Canvas wrapper, pause/results, upgrades/AI choices and offline notice. App owns Home setup state; difficulty presets remain deferred. Do not drive animation through per-frame React state updates.
- **Input adapter:** pointer/touch coordinates translated into game commands, accounting for screen size and pixel density.
- **Local storage adapter:** versioned active-round saves; storage errors are nonfatal. Home selections are not persisted.
- **PWA layer:** manifest, icons and production shell/asset caching are implemented.
- **Tests:** a lightweight TypeScript test runner for simulation; browser checks for interaction and lifecycle.

Avoid selecting a large game engine or building general-purpose frameworks before a playable round exists.

Group code by feature: independent rules under `src/game/`, board/browser integration under `src/board/`. Keep files small and focused; do not grow a single simulation, rendering, or React component into a catch-all.

## Assumptions

- The 2–4 minute round target and human tactical balance are playtest goals, not proven by automated checks.
- Browser lifecycle delivery is best-effort; event-only persistence intentionally accepts crash/force-kill exposure.
- Chrome emulation does not establish real-iPhone Safari, installed-app or offline-update behavior.
- Existing performance/tuning values are a prototype baseline; future changes must preserve shared rendering/simulation geometry.

## Implementation Plan

Each step must leave a small verifiable result. Do not build the full game in one pass.

### 1. Minimal project and static board
Status: complete.
Description: Fit the board to a phone viewport with readable counts/circles and a passing build.

### 2. Simulation and growth
Status: complete.
Description: Verify elapsed-time production across render frequencies, fractional carry and production caps with core tests.

### 3. All-but-one dispatch and travel
Status: complete; mouse-only click orders are also implemented under the desktop plan.
Description: Verify reservation-aware staggered launches, invalid-input cancellation, formation spreading/convergence and shared pointer/keyboard dispatch rules.

### 4. Combat and round completion
Status: complete.
Description: Verify reinforcement, capture, ties, collisions, ownership changes in transit, elimination and replay resets.

### 5. Basic active AI
Status: complete.
Description: Verify legal expansion, attack, defense and reinforcement from strong/weak positions, without hidden bonuses. River staging and Factory awareness follow the special-city plan.

### 6. Difficulty and tactical improvements
Status: pending; Balanced/Aggressive/Defensive behaviors are implemented, not difficulty presets.
Description: Define and verify difficulty/tuning separately from upgrades; targeted scenarios must cover vulnerability, incoming threats and winning/losing positions.

### 7. Mobile feel and pause
Status: controls/lifecycle implemented; real-iPhone acceptance pending.
Description: Check touch dragging, safe areas, interruptions, no catch-up and restart/pause usability on the target device.

### 8. Replayable map variety and responsive Home
Status: seeded generated-match setup and responsive Home implemented; human playtesting pending.
Description: Verify every supported city/enemy/river combination, region targets, preference retention and same/new-map lifecycle. Desktop and automated generation checks are complete; duration and tactical fairness remain manual.

### 9. Two-enemy Crossfire map
Status: implemented; balance/real-device playtesting pending.
Description: Verify one player and two independent hostile AIs on the 23-city map, including retained faction-specific behavior/effects through Play, restart, replay and Home.

### 10. Selectable upgrade effects
Status: Industry/Factory/Watchtower/Slow Zone implemented; progression deferred.
Description: Verify typed features, current-owner Factory production, deterministic tower targeting, boundary-aware slowing, AI forecast parity and pause/reset/restore isolation. Independent AI effects exclude player-only Slow Zone selection. Further effects follow the focused upgrade/special-city plans.

### 11. Offline and Home Screen support
Status: production PWA infrastructure implemented; target-device validation pending.
Description: Validate cached offline launch, installed safe areas and update behavior after initial online loading. Event-only round persistence is implemented independently; its expanded regression matrix remains test-repair slice 3.

The former duplicated milestone 9 is normalized to consecutive steps; focused desktop, persistence and special-city slice numbers are unchanged. Human playtesting remains the acceptance gate for duration, fairness and real-device usability.

### Verification acceptance

- Unit-test integer dispatch, reservation-aware conservation, growth, travel, per-dot collisions, stable survivors, combat, ties, arrival ordering, elimination, and replay reset. Verify collision outcomes across rendering rates and bulk updates; compare forecasts to live results.
- Use deterministic scenarios and seeded randomness where needed for reproducible AI tests.
- Test both a dominant AI and a nearly defeated AI with a viable action; verify that neither stops considering orders.
- Compare difficulty presets across repeated scenarios; use results as tuning evidence, not a substitute for player feedback.
- Browser-test drag/cancel, pause, background/resume, and results/replay at phone viewport sizes.
- Playtest on the user's actual iPhone; desktop browser emulation does not prove touch usability or installed/offline behaviour.
- Keep existing corrupt/unavailable-save validation; expand running/paused/transfer/background/Home persistence cases. Save migrations and progression caps/rewards remain future work. Validate offline launch/update behavior after online loading on the target device.

## Open Questions

1. How much fine-grained AI tuning should be exposed beyond the implemented behavior choices?
2. What progression levels, costs, rewards and caps should apply if progression is introduced?
3. Should future progression stay faction-symmetric or intentionally advantage the player? Independent AI effect selection already exists.
4. Which target iPhone/Safari version and deployment location should anchor manual acceptance?
