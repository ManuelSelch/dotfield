# Dotfield — Requirements and Plan

Status: milestones 1–5 implemented — mobile board, growth, staggered all-but-one dispatch, per-batch border combat, round completion/replay, and a basic active enemy AI. First playable checkpoint reached. Pause controls and slice-8 fixed map variety/home flow implemented; difficulty remains deferred, player-only Industry/Factory and independent faction rules implemented. Watchtower and Slow Zone are now implemented alongside Industry/Factory; real-iPhone/duration playtesting and offline support remain outstanding; progression is deferred.

## 1. Purpose

A small personal strategy game for a few minutes of play when bored. Preserve the satisfying core of State.io: circles accumulate units, the player sends units to capture other circles, and timing and expansion choices matter.

The differentiators are a modern mobile interface, adjustable and persistent AI opposition, and a small amount of capped progression. No advertising, multiplayer, or grind-heavy systems.

## 2. Decisions and proposals

### Confirmed by the user

- Working name: **Dotfield**. Name availability has not been checked.
- Real-time territory conquest using simple circles and growing unit counts.
- Rounds last a few minutes.
- Attacking sends **all available source units except one**, replacing any existing unlaunched source groups while preserving airborne groups.
- AI difficulty is adjustable to find a personal sweet spot.
- AI should continue making meaningful attempts when clearly winning or losing.
- For now, enable upgrade effects before Play without progression. Effects apply only to the player; the opponent retains baseline settings. Industry (+25% owned-city production) is the first implementation. Later progression may determine active effects. Proposed effects and architecture are in [docs/upgrades/EFFECTS.md](docs/upgrades/EFFECTS.md) and [docs/upgrades/REQUIREMENTS.md](docs/upgrades/REQUIREMENTS.md).
- Four fixed maps with 9, 11, 13, and 21 cities. Home shows one map preview at a time with left/right arrow controls and a visual position indicator; map names/descriptions are omitted. Restart and Play again retain the selected map. Selection is memory-only; reloading defaults to the first map.
- Mobile-first, modern, understated visuals. Avoid desktop-like panels, childish themes, and dated-looking graphics.
- Single-player only.
- Tailwind CSS and Mantine for interface styling; keep feature modules and files small.

### Proposed direction, not yet explicitly confirmed

- iPhone-friendly web app, later installable on the Home Screen as a PWA.
- React and TypeScript for interface; Canvas 2D for the game board.
- Portrait-first layout; drag from a friendly circle to a target.
- Typical round target: 2–4 minutes, subject to playtesting rather than a forced timer.
- Offline play and local-only settings/progression; no backend.
- Difficulty changes AI decision quality and timing, not hidden resource advantages.

These proposals are the planning baseline, not authorization to expand scope.

## 3. Scope

### First playable prototype

- One fixed map, one player, one AI faction, and neutral circles.
- Automatic unit generation, all-but-one dispatch, visible travel, combat, and capture.
- A basic active opponent, with tunable parameters.
- Clear victory/defeat and immediate replay.
- Touch controls on iPhone and pointer controls on desktop for development.

### Subsequent small additions

- Three AI difficulty presets, with advanced tuning available for playtesting.
- A small set of varied maps or constrained map generation.
- Selectable pre-game upgrade effects; Industry is implemented, other effects and eventual capped progression remain later work.
- Local persistence, pause/resume, and offline/Home Screen support.

### Out of scope

- Multiplayer, accounts, servers, cloud sync, leaderboards, and social features.
- Ads, purchases, subscriptions, daily rewards, energy limits, and loot boxes.
- Large campaigns, elaborate skill trees, skins, complex territory types, or a game editor.
- Native iOS packaging or App Store release initially.

## 4. Terms

- **Circle / territory:** a capturable node with an owner and unit count.
- **Faction:** the player or an AI opponent.
- **Neutral:** a territory owned by neither faction.
- **Dispatch:** units removed from a friendly source and sent to a target.
- **Growth:** generation of units over time inside an owned territory.
- **Upgrade:** an effect selected before Play, fixed for that round/replay. Progression may determine active effects later; there is no purchase/unlock system now.

## 5. Functional requirements

### FR-01: Board and growth

- Show each circle's owner and current whole-unit count at a glance.
- Owned circles generate units over elapsed simulation time, independently of rendering frame rate.
- Proposed prototype rule: neutral circles have defenders but do not generate units.
- Keep growth rate and initial unit counts configurable, not scattered through the code.
- Milestone-2 prototype baseline: one unit per second for both factions, no neutral growth, 50 ms fixed-step clock with fractional carry. Tuning remains open.
- Implemented background handling pauses the clock and excludes hidden elapsed time; explicit Pause/Resume and immediate Restart controls are implemented. Real-iPhone polish remains milestone 7.

### FR-02: Dispatch

- Drag from anywhere in a player-owned city region to a distinct target region to send units. Each city circle remains the troop spawn/impact spot.
- Order all available whole units except one; a source with fewer than two garrison units sends nothing. A new valid order replaces queued groups from that source, restarts the launch cadence and includes newly grown units.
- Keep route/selection feedback, but do not display a numeric dispatch label.
- Reserve ordered units immediately, but deduct them from the source counter only as each group launches. Queued troops remain defenders; replacement cancels their old reservation before creating the new order, never duplicating troops.
- If a source is captured, cancel its unlaunched groups; already airborne units continue. A depleted source launches only available units, keeping at least one.
- Units travel visibly and resolve on arrival.
- Dropping outside the board or inside the source's own region cancels without changing counts. Points anywhere inside another region are valid targets.
- Ignore input from non-player sources and while paused or after the round ends.
- Proposed rule: allow friendly reinforcement as well as attacks.
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

- Enable effects before Play without currency, prices, rewards or unlocks. Defaults are disabled and effects apply only to the player.
- Industry increases production of every player-owned city by 25%; ownership at growth time determines the rate. Enemy and neutral growth remain unchanged.
- Factory doubles only the starting player's city production, stacking multiplicatively with Industry (2.5 units/sec). It remains attached after capture but benefits only its original faction while owning the city. Recapture restores the bonus.
- Show a factory silhouette on its host (dimmed while inactive) and one upward chevron on Industry-boosted cities. Use both icons when stacked; reserve double chevrons for a later improved Industry level. Do not obscure counts or change touch/combat geometry.
- Keep a typed catalog and pure compiler, independent faction-ID keyed rules, typed territory features and a fixed round setup shared by simulation and forecasts.
- Restart/Play again retain selected effects without stacking them. Home allows changing selections; reload resets them.
- Preserve paused/hidden/terminal freeze and fractional growth. Numeric modifiers must not mutate shared defaults or map seeds.
- Watchtower attaches to the starting city, covers a visible 72-field-unit radius and destroys up to four hostile airborne dots per second (one every 250ms). Its allegiance follows current city ownership, so it shoots its former owner after capture; neutral towers are inactive. Live simulation and AI forecasting share deterministic fixed-step firing.
- Slow Zone attaches to a randomly selected city, covers a visible 90-field-unit radius, and reduces eligible airborne group-center movement to 50%. Owned zones slow hostile groups and switch allegiance on capture; neutral zones slow both factions. Overlaps use the strongest slowdown. The selected host is retained for Restart/Play again; Home → Play may choose a new host.
- Later progression supplies the same selected effect IDs. Reward formula, prices and caps remain unresolved and out of current scope.

### FR-08: Settings and persistence

- Persist selected difficulty and, once introduced, upgrade progress locally.
- Reset progression only through an explicit confirmed action.
- Handle missing, outdated, or corrupt saved data with safe defaults rather than preventing play.
- Explain that clearing browser/site data can remove progress.
- Mid-round save/restore is not part of the initial scope.

### FR-09: Pause and offline use

- Provide Pause/Resume and immediate Restart actions with 44px minimum touch height. Restart resets state and starts the round without confirmation. No ready popup; home-screen Play starts a fresh round on the selected map. A 44px pause icon is the only in-round menu control; Restart is inside the pause overlay.
- Pause freezes growth, launches, travel, collisions, orders and AI; background automatically suspends the clock without overriding manual pause.
- Resume without simulating all the elapsed background time or granting offline growth.
- After offline support is added and the app has been loaded successfully online, a new round can be played without a connection.
- Home Screen installation is supported as a later delivery step, not a prerequisite for testing the first round.

### FR-10: Fixed map variety and home screen

- Offer four distinct fixed maps through one visual preview with left/right arrows and Play; do not show map names or descriptions. No simulation or AI runs on Home.
- Preserve the original 13-city field and the 9- and 11-city variants. Add a rotationally balanced 21-city field. Maps are selected visually, without names or descriptions.
- Give both factions 36 starting units, rotationally paired positions/neutral defenders and identical rules/AI configuration. Check bounds, circle clearance and nonempty generously sized touch regions.
- Return Home from pause/results, abandon the current round and dispose its browser adapter. Keep the selected map in memory. A subsequent Play creates a fresh round; reload returns to the first map.
- Restart/replay must reset the current map, not silently return to the original field.
- Keep the fixed screen, no pan/zoom or scrolling. Duration and human tactical balance need playtesting; do not infer them from symmetry or automated checks.

## 6. Interface and quality requirements

- Portrait-first single-screen board; no panning or zooming required initially.
- Clean circles, readable numbers, restrained faction colours, and smooth unit movement.
- Avoid decorative themes, heavy panels, and menus during play.
- Clear full-region source selection and valid-target feedback; touch actions must not accidentally scroll the page.
- Automatically generate straight-edged Voronoi city regions from circle positions, clipped to the whole Canvas including margins; use nearest-city input with deterministic map-order ties.
- Subtle faction fills and thin city borders persist even between allied cities. Ownership recolors cells without regenerating geometry; cache cells until city positions/identities or layout dimensions change.
- Keep outer region borders visual/interactive only; never replace circle impact borders or per-dot collision geometry.
- Provide keyboard/screen-reader city controls with visible whole-region focus, Enter/Space activation, Escape cancellation and disabled controls after round end.
- Respect iPhone safe areas and keep controls comfortably tappable.
- Check readability and faction distinction without relying solely on subtle colour differences.
- Aim for smooth animation on the actual target iPhone; measure before adding visual complexity.
- Pause correctly during interruptions and keep combat outcomes independent of rendering frame rate.
- No required network requests during gameplay, telemetry, or third-party tracking.

## 7. Proposed technical structure

- **Vite + React + TypeScript:** a small web project with minimal dependencies.
- **Tailwind CSS + Mantine:** utility-driven layout and Mantine UI components/theme; layered styles with no Tailwind Preflight. Keep custom CSS focused on viewport locking and safe areas.
- **Canvas 2D:** draw territories, counts, travelling units, and touch feedback.
- **Independent TypeScript simulation:** growth, dispatch, travel, combat, lifecycle, and AI. No React or Canvas dependency in core rules.
- **Simulation clock:** fixed-step updates or another explicitly frame-independent approach; rendering uses `requestAnimationFrame`.
- **React interface:** start screen, difficulty, pause/results, and later upgrades/settings. Do not drive animation through per-frame React state updates.
- **Input adapter:** pointer/touch coordinates translated into game commands, accounting for screen size and pixel density.
- **Local storage adapter:** versioned settings/progression. Storage errors must not stop a round.
- **Later PWA layer:** app manifest and offline asset caching.
- **Tests:** a lightweight TypeScript test runner for simulation; browser checks for interaction and lifecycle.

Avoid selecting a large game engine or building general-purpose frameworks before a playable round exists.

Group code by feature: independent rules under `src/game/`, board/browser integration under `src/board/`. Keep files small and focused; do not grow a single simulation, rendering, or React component into a catch-all.

## 8. Incremental implementation plan

Each step must leave a small verifiable result. Do not build the full game in one pass.

| Step | Deliverable | Acceptance check |
| --- | --- | --- |
| 1 (complete) | Minimal project and static board | Board fits a portrait phone viewport; circles and counts are readable; project builds. |
| 2 (complete) | Simulation and growth | Unit generation matches elapsed time across different update/render frequencies; core tests pass. |
| 3 (complete) | All-but-one dispatch and travel | Valid drag orders all unreserved units except one; counters reduce per launch; invalid drag cancels; groups spread after launch and converge before impact; input and rule tests pass. |
| 4 (complete) | Combat and round completion | Reinforcement, capture, ties, ownership changes in transit, elimination, and replay behave according to tested rules. |
| 5 (complete) | Basic active AI | One fixed-map round is playable; AI can expand, attack, defend, and continue acting from strong and weak positions. |
| 6 | Difficulty and tactical improvements | Presets and tuning work; targeted scenarios cover vulnerable targets, incoming threats, and winning/losing positions. |
| 7 | Mobile feel and pause | Real-iPhone touch play is comfortable; backgrounding pauses without catch-up; restart and pause are obvious. |
| 8 (implemented; playtest pending) | Replayable map variety and minimal home | Three fixed presets, equal/mirrored starts, nonoverlapping cities and region targets checked; home/Play/map-aware restart/navigation verified. Target round duration and human tactical fairness still need playtesting. |
| 9 (Industry/Factory/Watchtower/Slow Zone implemented) | Player-only selectable upgrade effects | Industry/Factory/Watchtower/Slow Zone toggles, typed city features, deterministic tower firing/capture allegiance, boundary-aware slowdown, AI forecast parity, coverage rendering and retained pause/restart/replay verified. Progression/local saves are deferred. |
| 10 | Offline and Home Screen support | Previously loaded app starts and plays offline; installed layout respects safe areas; update caching does not leave missing assets. |

**First playtest checkpoint reached: step 5 complete.** Decide whether attacking, growth, travel and the basic opponent feel satisfying before adding progression or offline packaging. Revise numbers and AI before adding features.

## 9. Verification approach

- Unit-test integer dispatch, reservation-aware conservation, growth, travel, per-dot collisions, stable survivors, combat, ties, arrival ordering, elimination, and replay reset. Verify collision outcomes across rendering rates and bulk updates; compare forecasts to live results.
- Use deterministic scenarios and seeded randomness where needed for reproducible AI tests.
- Test both a dominant AI and a nearly defeated AI with a viable action; verify that neither stops considering orders.
- Compare difficulty presets across repeated scenarios; use results as tuning evidence, not a substitute for player feedback.
- Browser-test drag/cancel, pause, background/resume, and results/replay at phone viewport sizes.
- Playtest on the user's actual iPhone; desktop browser emulation does not prove touch usability or installed/offline behaviour.
- Later test save migration/corruption, upgrade caps/rewards, and offline launch after a successful online load.

## 10. Open decisions

Resolve only those needed for the next milestone; the rest can wait.

### Before the first interactive prototype

1. Web/React/Canvas and portrait layout are the implemented milestone-1 baseline; validate their feel on the actual iPhone before interactive gameplay.
2. Confirm drag controls, friendly reinforcement, and the equal-force tie rule.
3. Establish first-map numbers through playtesting: circle count, initial forces, growth rate, and travel speed.

### After the first playable round

4. Three fixed map presets are confirmed/implemented; random maps and more AI factions remain out of scope.
5. How much fine-grained AI tuning belongs in the normal interface.
6. Upgrade levels, effect sizes, costs, and rewards for wins versus losses.
7. Whether AI receives equivalent upgrades or progression intentionally gives the player a small advantage.
8. Target iPhone/browser and eventual hosting location.

## 11. Completion criteria

Dotfield is successful when the user enjoys repeatedly playing short rounds, can tune a credible opponent to a comfortable challenge, and has a small sense of progression without chores. Feature count is not a success metric.
