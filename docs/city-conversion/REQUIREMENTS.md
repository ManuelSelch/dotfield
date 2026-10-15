# City Conversion and Air Transport — Requirements

## Goal

Give players a meaningful choice between troop production, defense, air mobility and buildable city weapons by converting existing cities at a troop cost. Introduce reusable, capacity-limited airplanes that transport troops to any city across rivers and mountains, while keeping mobile controls quick and the top-down battlefield readable.

Status: implemented and verified in isolated `feat/buildable-weapons` worktree. Verification: 714 unit tests/81 files, all 114 Chromium browser tests serially, 2 PWA tests, production/typecheck build, and diff checks pass. Real-iPhone and balance/duration playtesting remain manual. Gameplay rule proposal (“yes implement it just like that”) and icon picker revision6 (“looks good. implement it”) are approved. User approved **Dock & pulse (option C), revision 1** of [the delivery mockup](../../mockups/airplane-delivery/DESIGN.md), then requested “now use subagents and worktrees to implement it” and confirmed “Yes—use all recommended defaults”. All eight rule questions are resolved by that confirmation. The conversion/flight control mockup revision 1 is also explicitly approved (“yes approved”); its owned preview was stopped and sources preserved before production UI work.

## Scope

### In Scope

- Convert an existing owned city between Production, Defender, Airfield, Watchtower and Artillery by spending its troops.
- Quick tap-to-open mobile conversion controls; preserve drag orders and desktop/keyboard access.
- Production-only troop growth, Defender shielding, and Airfield-only airplane preparation.
- One reusable airplane per airfield, with a proposed capacity of 100 troops, outbound transport, Dock & pulse unloading, and empty return.
- Friendly reinforcement and hostile/neutral attacks at any city, including across rivers and mountains.
- Coexistence with Capture Shield, Defensive Network, Factory/Industry, Watchtower, Slow Zone, Artillery, and existing orders.
- Deterministic simulation, AI/forecast parity, faction symmetry, troop accounting, round completion, persistence, restart/replay, accessibility, and regression coverage.
- Human playtesting and centralized tuning; conversion and flight-control mockup review before implementing those controls.

### Out of Scope

- Creating/moving cities, additional unit classes, combat aircraft, bombing, aircraft-to-aircraft combat, or manual flight steering.
- Multiple airplanes per airfield, airplane transfer to a new home, airborne troop pickup, or carrying troops home after delivery.
- Removing Capture Shield or Defensive Network; redesigning existing unrelated upgrades or map generation.
- Automatic ground detours, new mountain/river routing, progression, resource currencies, multiplayer, or cloud saves.
- General UI redesign or implementing rejected unloading alternatives A/B.

## Requirements

### R1. City identity and conversion

- Every city has exactly one role: Production, Defender, Airfield, Watchtower or Artillery. Factory and Slow Zone remain independent attached effects; Artillery/Watchtower are roles, not stackable features.
- Only the current non-neutral owner can convert a city. Neutral/enemy taps cannot expose actionable conversion controls.
- Conversion spends actual troops from that city's garrison, not airplane cargo or another city's troops. It must not create troops, spend the same troops twice, or make the garrison negative.
- Recheck owner, type, available troops, round phase, and any flight restrictions at command execution. An invalid command leaves state and orders unchanged.
- Selecting the current type is a no-op with no cost. All factions use the same costs and rules.
- Keep territory identity, coordinates, original-home identity, features, and neighboring-region membership unchanged. Conversion is not capture: it must not grant Capture Shield charges.
- Costs, timing, order cancellation, switching restrictions, and capture/type retention follow the explicitly confirmed initial defaults in R11.

### R2. Production and troop handling

- Production cities generate ordinary troops using existing faction/local production effects, fractional accounting, and the current automatic production cap of 50. Reinforcements can exceed 50 without being trimmed.
- Defender, Airfield, Watchtower and Artillery generate **no troops**, including when they carry Factory or belong to an Industry-upgraded faction. All roles can receive, hold, defend with and dispatch ordinary troops.
- An airfield does not automatically create its cargo: a full 100-troop load requires reinforcement/consolidation. Ordinary garrison troops defend until they actually board.
- Never exchange or reinterpret a city troop count as an airplane count. Show airplane readiness/cargo separately from the garrison.
- Reset or retain fractional/timer state explicitly on conversion/capture, with no conversion-loop production exploit. Confirmed reset policy is listed in R11.

### R3. Defender cities and shield coexistence

- A Defender trades all troop production for stronger defense based on the existing whole-arrival-batch shield mechanic, not a hidden multiplier to displayed troops.
- Capture Shield remains independently selectable and keeps its capture-grant behavior. Defender conversion never simulates a capture to obtain charges.
- Defensive Network remains independently selectable with original-home/shared-border membership, current 4/7/13 city thresholds, and existing recharge rules on ordinary cities.
- Defender uses the confirmed non-additive capacity/recharge/initial-charge policy in R11; Capture Shield and Defensive Network remain independent optional upgrades.
- Friendly arrivals never consume shields. Each hostile air-delivery batch consumes at most one charge, just like a ground arrival; do not block an entire plane load with one shield.
- Expose stored charges and the active recharge/capacity source without overlapping miniature badges or changing hit/combat geometry. Pause/background/reload cannot grant extra charges.

### R4. Airplane lifecycle

- Only an Airfield city prepares an airplane. Each airfield owns **at most one airplane across all phases**, not one parked plane plus another in flight.
- Phases are explicit: preparing, ready, outbound, unloading, returning, turnaround. No launch while preparing, away, unloading, or turning around. Never produce a second plane during a trip.
- A launch transports a positive whole number of existing troops up to its capacity; it does not wait for a full load. Capacity **100** is the confirmed initial playtest value, not a proven balance setting.
- Remove boarded troops from the source exactly once at launch. They no longer defend that source, grow, collide as ground dots, or count as its queued garrison.
- Target any distinct existing city, irrespective of river-bank pairing or mountain obstructions. Ownership at delivery time determines attack versus reinforcement.
- Plane flies a direct top-down route, without ground-dot collision/bridge-clearance checks. Keep existing ground route legality unchanged.
- Airborne speed, preparation time, turnaround, effect immunity and loss of the home airfield follow confirmed R11 defaults.
- After the last delivery pulse, return empty to the original airfield and complete turnaround before another launch. Neither the airplane nor an empty return can capture a city.
- Plane position, cargo, phase, and timers are simulation state, not CSS/Canvas-owned gameplay state. Outcome must not depend on rendering frame rate.

### R5. Approved Dock & pulse delivery

- Stop the airplane at the target city edge; do not render ground troop dots crossing the final gap, an orbit, a drop-height effect, or a separate landing area.
- Resolve cargo in normal **five-troop batches**, plus a final smaller batch when needed. Show one restrained city pulse for each actual batch and decrement the cargo counter accordingly.
- Use the shared combat path: shield block, ordinary defense, zero-garrison tie, capture, and friendly reinforcement. A blocked batch is lost; do not refund it to the airplane.
- Deliver all cargo to the originally selected city. If ownership changes midway, later batches resolve against the new owner, including friendly reinforcement after capture or an attack after an intervening enemy capture.
- Batch size and cadence are different decisions: existing ground launch cadence is 600 ms, while the approved visual study illustrated 200 ms air pulses. Do not accidentally change ground cadence. Proposed air cadence is 200 ms, approximately four seconds for a full load.
- Use stable event ordering when air pulses, ground arrivals, shields, artillery, and captures share a simulation timestamp. Live and forecast execution must agree, including simultaneous home loss and delivery.
- Render from committed gameplay events. Reduced-motion mode suppresses decorative pulse expansion, never delivery/cargo changes; pause freezes feedback on simulation time.

### R6. Quick role conversion and flight controls

- **Confirmed interaction, revision 6:** permanently reserve the single-row 66px card plus 12px map gap in every selection, flight, pause and round-end state. Show five non-scrolling icons with troop costs. No city/garrison header, redundant Production label, empty row or close button. Current role is highlighted; weapon/aircraft/shield status is compact beneath its icon, with full details accessible. Fly/Cancel remains separate. Tap outside/Escape closes selection. Nothing selected shows “Tap a city to convert · drag to send troops”; tapping an owned city displays Production / Defender / Airfield / Watchtower / Artillery. A second tap builds/converts without confirmation. Preserve drag, desktop click-to-click and keyboard ground orders. Selection/targeting must not move or resize the battlefield.
- Show current type, troop price, and unaffordable/temporarily unavailable states. The current type is highlighted and cannot incur another charge. Explain disabled reasons in accessible text.
- Keep all five role actions comfortably tappable (at least 44 CSS px wide and high), account for mobile safe areas, and retain readable counts. Avoid long-press, nested menus, and a large management panel.
- A tap is not a drag. Dragging from a region still issues an ordinary order without accidentally converting a city or opening the bar on release. Water/outside taps do not select a city.
- Tapping outside clears the selected controls but leaves the fixed-height strip and its hint. Ownership loss, pause, restart, Home, round end, and invalid source state clear actionable selection. No click-through when dismissing or opening controls.
- Air transport needs an explicit, discoverable send action so a legal same-bank target can receive either ground troops or air cargo. The approved workflow is a Fly action followed by a target tap.
- Busy planes must not prevent ordinary ground dispatch from an airfield. Show preparing/ready/away/returning state without requiring another menu.
- Integrate desktop click-to-click, keyboard city controls, Escape, focus restoration, and screen-reader city/airplane details. Do not sacrifice existing desktop commands to make taps work.
- Controls revisions 1, 2 and 4 were explicitly approved and implemented. Revision 6 explicitly approves five SVG icons/costs, no scrolling or close button, and separate Fly/Cancel (“looks good. implement it”). Preserve approved sources. Delivery remains approved under option C.

### R7. Existing feature and combat boundaries

- Factory and Slow Zone remain attached independently through conversion; Artillery and Watchtower are exclusive city roles, never attached upgrades or stacked weapons. Factory/Industry troop multipliers apply only to Production; weapons/airplane/shield clocks are not accelerated.
- Weapon allegiance follows current owner. Watchtower destroys hostile ground dots within range150 at4/s. Artillery removes one defender from the nearest nonneutral hostile city within range150 at3/s; mountains block shots. Neutral weapons are inactive. Airplanes/cargo are immune while airborne; city garrisons regain normal exposure on delivery.
- Every build/conversion and city capture resets that city's weapon cooldown. No stale queue may spend troops used for construction/boarding.
- City-type changes must not remove map features, alter river endpoints, grant free shields, reset original-home identity, or bypass faction permissions.

### R8. Round lifecycle, accounting, and saving

- Include loaded outbound/unloading cargo exactly once in faction troop totals and elimination/round-completion checks. Unlaunched ground reservations remain counted only in the garrison.
- A parked/empty/preparing/returning airplane has no troop combat strength and cannot alone keep an eliminated faction in the round.
- Specify home-loss cargo handling before coding terminal outcomes; test it alongside a faction losing its last city and possible recovery by other in-flight ground troops.
- Pause, hidden/background handling, and terminal state freeze preparation, travel, delivery, return, shield recharge, turnaround, and AI. No catch-up on resume/reload.
- Persist city roles, exact plane phase/home/owner/target/cargo/timing, per-city weapon cooldowns and opening setup/rules. Validate one-plane-per-airfield, valid references, cargo bounds, owner consistency, valid role/timer associations, and finite timers.
- Preserve the existing event-only save contract; no per-frame or per-pulse storage writes. Storage failures remain nonfatal.
- Restore old valid rounds with missing roles as Production except legacy attached weapon features: promote to the matching Watchtower/Artillery role and remove the weapon feature. Explicit Defender/Airfield wins conflicts; ambiguous dual weapons prefer Artillery. Normalize both opening/live state and migrate old feature-keyed cooldowns to per-city timers. Strip old Home weapon toggles and generate no free weapon cities.
- Restart/Play again restore the exact opening types/setup with fresh runtime. New map uses the existing generated-match lifecycle, not the converted live board. No additional Home setting is assumed.

### R9. AI and forecasts

- The same pure commands and physical stepping govern player, AI, and forecasts. Extend worker messages/snapshots and all forecast paths to include city types, shields, planes, and cargo.
- AI forecasts account for stopped troop production, conversion costs, occupied plane slots, whole-batch shielding, air pulses, and potential home loss. No hidden resource advantages.
- AI can reinforce an airfield, launch a partially/full-loaded flight when useful, attack across barriers, and conservatively build one useful Watchtower/Artillery when forecasted shots have value. Conversion safeguards retain at least two Production cities and two thirds of the economy; never role-switch repeatedly.
- Keep a viable production base, avoid repeated type switching/resource waste, and retain ordinary ground logistics/defense. Avoid overfilling a busy airfield through production-relief logic that now misclassifies nonproducing cities.
- Airplanes are not new shared-border links for Defensive Network. Preserve original-home protection and legal ground staging where those features are present.
- Test independent enemy factions and both strong/weak AI positions. AI is heuristic; no promise of optimal strategy or future-enemy-order prediction.

### R10. Verification and delivery discipline

- Implement in small tested slices after unresolved rules for that slice are settled. Keep simulation, rendering, input, persistence, and AI changes modular rather than growing one catch-all component.
- Unit tests cover resource conservation, conversion validation, production gating, shield interactions, complete aircraft lifecycle, partial loads, pulse ordering, capture/loss, and deterministic results across step partitioning.
- Real-browser tests cover mobile tap/drag distinctions, bar/targeting lifecycle, 100-troop delivery with three shields, friendly reinforcement, terrain crossing, busy plane behavior, reload mid-trip, pause, restart, and desktop/keyboard regressions.
- Run the full unit/browser suites, typecheck/production build, and PWA tests for final integration. Keep existing ground combat, geography, upgrades, generated-map and offline-update behavior passing.
- Human playtesting decides conversion prices, carrying capacity, timing, readability, and whether geography/Defender cities remain tactically meaningful. Actual iPhone Safari/installed-PWA checks remain manual acceptance, not inferred from Chromium.

### R11. Confirmed initial implementation defaults

User confirmed all recommended defaults. Values remain tunable after playtesting:

- Initial/legacy cities default to Production, except old attached Watchtower/Artillery features which migrate into the exclusive weapon role. Capture retains the city role and other map features; a captured Airfield starts full preparation.
- Conversion is immediate; prices: Production10, Defender20, Airfield30, Watchtower30, Artillery40 troops; always leave at least one garrison troop. No refunds. Weapon roles replace previous city type and do not produce. Costs are centralized playtest values; current weapon range150 and cadences 4/s (Watchtower), 3/s (Artillery) are playtest values.
- Successful conversion cancels that source's unlaunched ground queue, leaves launched ground groups alone, and resets fractional growth, shield recharge and weapon cooldown. Every capture also resets the weapon cooldown. Ready/preparing airfields may convert away; airfields with a plane away/unloading may not.
- Defender starts empty and regenerates one shield every 10 seconds up to capacity 3, independently of network connectivity. Shared shield pool uses the larger of Defender/network capacities, not their sum; recharge is one coordinated stream, not two additive timers. Preserve capture-granted excess charges. Switching away retains stored charges but removes Defender recharge; reset partial progress when eligibility/capacity changes to prevent timer exploits.
- First airplane preparation 20 seconds; turnaround after return 10 seconds. Airplane speed starts at twice the current normal ground speed. Factory/Industry/Slow Zone do not alter airplane or Defender timers/speed.
- A flight boards up to 100 available troops immediately, keeping one behind. Successful boarding cancels unlaunched source ground reservations; a rejected flight changes nothing. Player chooses air dispatch explicitly using Fly, then taps a target; ordinary drag remains ground dispatch.
- Initial airplanes and embarked cargo are not targetable by ordinary dots, Watchtowers, or Artillery. Troops delivered into cities regain normal garrison vulnerability. Visual dock position never invokes terrain/ground collision rules.
- Capture of the home airfield destroys its plane and any undelivered cargo; already delivered troops remain. Plane allegiance never transfers. Capture before/during return cancels the old trip and starts the new owner's full preparation. This is intentionally a strong commitment and requires balance testing.
- Air unloading cadence starts at 200 ms per batch, separate from ground launches. Exact first-pulse timestamp and deterministic tie policy are specified in slice 6 tests, not inferred from a visual animation frame.
- Conversion is available symmetrically in normal matches without another pre-game toggle. Home Watchtower/Artillery toggles and generated free weapons are removed; old generated preference flags are ignored during migration. No generated Defender/Airfield/weapon placements are added initially.

### R12. Buildable Watchtower and Artillery roles

- Add mutually-exclusive Watchtower and Artillery city roles at 30 and 40 troops. Each leaves at least one garrison troop and stops troop production. They replace, never stack with, any other role; Factory/Slow Zone remain separate attached effects.
- Preserve existing mechanics: Watchtower range150 and fires once every250ms at hostile ground dots; Artillery range150 and fires once every1000/3ms at the nearest eligible hostile city garrison. Mountains block Artillery. Neutral weapons are inactive.
- A successful build/conversion and every capture/recapture reset a full weapon cooldown. Shots remain in the deterministic physical event schedule, including fractional Artillery timing. Keep existing current-owner allegiance.
- Remove Home weapon toggles and random/free weapon placement. Existing saved/mapped attached weapon features migrate to their exclusive role and disappear from the feature list; explicit nonweapon roles win, legacy dual weapons choose Artillery. Migrate old timer keys in both opening and live saved state; ignore old generated preference flags.
- Render/accessibly describe each role and coverage/status. Add the two icon/cost choices to the approved non-scrolling single row; no map movement or additional control row.
- AI can build at most one of each when a forecast demonstrates useful fire. Preserve ≥2 and ≥2/3 production safeguards and avoid role-switch loops.
- Validate migration, cooldown reset on conversion and same-time recapture, weapon physics/forecast parity, worker actions, Home toggle removal, render/accessibility, keyboard/touch role conversion and unchanged normal ground controls.

## Assumptions

None. Weapon-role rules/prices and control mockup revision6 are explicitly approved; human balance and real-device acceptance remain.

## Implementation Plan

### 1. Rules and Control Mockup
Status: complete; defaults and control mockup revision 1 explicitly approved.
Description: Settle the numbered open questions below, centralize the accepted tuning table, and extend isolated mockups with the tap conversion bar and explicit flight targeting/cancel controls at mobile and desktop sizes. Include current type, prices, insufficient troops, busy plane, ownership loss, and keyboard behavior. Preserve approved option C. Verify by user review and record explicit approval for new UI; stop its owned preview before production UI work. No gameplay implementation in this slice.

### 2. City Types and Conversion Commands
Status: implemented and unit-tested.
Description: Add explicit city types with default Production normalization and an owner-validated conversion command. Implement cost conservation, minimum garrison, queue invalidation, type retention on capture, and growth-remainder reset according to slice 1 decisions. Gate troop growth to Production while preserving Factory/Industry behavior there. Verify pure tests for every source/target type, hostile/neutral/paused rejection, repeat commands, cap-overflow reinforcements, and immutable inputs. Do not expose the incomplete feature in normal UI yet.

### 3. Defender Shield Rules
Status: implemented and unit/browser-tested.
Description: After slices 1–2, implement Defender capacity/recharge with the selected stacking policy using the shared batch shield/combat path. Cover conversion, capture, network connection/tier changes, excess capture charges, no free conversion charges, friendly arrivals, and timing across pause/bulk stepping. Verify live/forecast physical-step parity and no changes to non-Defender network behavior. Keep recharge source/capacity available to rendering/accessibility.

### 4. Airfield Preparation and Plane State
Status: implemented and unit-tested.
Description: After slice 2, introduce the one-plane-per-airfield lifecycle, preparation/readiness/turnaround timers, frozen runtime ownership/home identity, and shared validated tuning. Capture/conversion resets must follow slice 1 policy. Verify no duplicate planes after large steps or repeated conversion, no troop production from an Airfield, no premature readiness, and phase validity. Rendering and dispatch UI remain deferred.

### 5. Flight Dispatch and Direct Travel
Status: implemented and unit/browser-tested.
Description: After slice 4, add the shared launch command, partial/full boarding up to capacity, reservation cancellation, cargo accounting, direct terrain-independent outbound travel, and empty-return travel. Implement agreed in-flight effect immunity and home-loss behavior. Verify river/mountain crossings without changing ground legality, busy/invalid/no-cargo rejection, all-but-one boarding, conservation, and faction/owner boundaries. Intermediate tests can exercise arrival/return states directly until slice 6 adds unloading.

### 6. Dock and Pulse Combat
Status: implemented and unit/browser-tested; artillery event-order regressions repaired.
Description: After slices 3 and 5, connect arrival to edge docking, five-troop pulses, final partial batches, cargo decrement, empty return, and turnaround. Reuse shared combat rather than duplicating shield/capture rules. Specify exact first-pulse timing and stable equal-time order with ground arrivals/home loss. Verify 100 troops against three shields, friendly deliveries, partial loads, mid-unload ownership changes, same-time captures, no orphaned cargo, and equivalent coarse/fine physical stepping. Rendering-independent end-to-end flight cycle must pass.

### 7. Save Replay and Round Accounting
Status: implemented and unit/browser-tested.
Description: After slice 6, integrate types/planes/cargo into snapshots, restore validation, worker serialization, troop composition, elimination, and round setup/restart/replay. Preserve event-only persistence. Verify legacy defaults, corrupt/mismatched references, duplicate-plane rejection, mid-preparation/outbound/unloading/return/turnaround reload, pause/background freeze, last-city loss, and exact opening reset. Complete this before exposing playable controls so active saves cannot silently lose new state.

### 8. Conversion Bar and Flight Controls
Status: approved revision 6 implemented; five-role icon conversion, mobile/short desktop hit targets, mixed desktop input and fixed-map geometry tests pass.
Description: After slices 1 and 7, implement only the approved compact conversion UI and air targeting flow using shared commands. Preserve mobile full-region dragging, existing desktop click-to-click and keyboard commands, safe areas, pause controls, and click-through prevention. Add accessible cost/readiness/cargo/state descriptions. Verify browser interactions on narrow mobile and desktop, insufficient/busy states, source capture, outside/Escape cancellation, and zero unintended conversions during ground dispatch. Keep incomplete renderer/AI integration out of normal releases until subsequent slices pass.

### 9. Aircraft and Defender Rendering
Status: implemented and unit/browser-tested; actual-device readability remains manual.
Description: After slices 3, 6 and 8, render clear city-type indicators, plane readiness/cargo, direct flights, approved option C edge docking/pulses, shield-block feedback, and empty return from simulation state. Keep counts readable with stacked map features, no new collision geometry, and no per-frame React publications. Respect reduced motion and pause. Verify board rendering tests and browser scenarios at compact phone/desktop sizes against the approved sources; actual iPhone readability is checked in slice 11.

### 10. Conversion and Air Transport AI
Status: implemented and unit/real-worker browser-tested; includes conservative forecast-gated Watchtower/Artillery building and production safeguards. Human tactical balance remains manual.
Description: After slices 6–7, extend forecast/worker decisions and production-aware logistics for nonproducing city types and complete flights. Add conservative conversion spending/production-base safeguards, Defender placement, Airfield supply, partial/full flights, barrier attacks, and original-home defense without switching loops. Use the exact player commands and physics. Verify deterministic pure/worker/browser scenarios across multiple factions, useful cross-barrier attacks, home-loss risk, strong/weak positions, and unchanged legal ground staging.

### 11. Buildable Weapon Roles and Legacy Migration
Status: implemented, unit/browser-tested, and fully verified.
Description: After role conversions and weapon physics, add Watchtower/Artillery costs, exclusive roles, the approved five-icon picker, current-owner/cooldown rules, save/timer migration, generated weapon-toggle removal, rendering/accessibility and forecast-gated AI construction. Verify legacy explicit-role conflicts and dual weapon precedence, per-city timer migration, captures/recaptures at exact event times, map generation, worker actions, and short-screen controls. Preserve other city features, battlefield geometry and legal ground orders.

### 12. Integrated Playtest and Documentation
Status: automated verification complete (714 unit tests, 114 browser tests, 2 PWA tests, production/typecheck build and diff checks); real-iPhone and human balance/duration acceptance remain manual.
Description: After slices 8–11, enable the complete feature, run full unit/browser/build/PWA checks, and document actual roles, controls, weapon tuning and saved-round migration. Playtest conversion/weapon-defense balance, producer safeguards, no-producer situations, battlefield clutter and short-round pacing. Check actual iPhone tap/drag, safe areas, interruption, installed/offline use and performance. Adjust only centralized tuning with explicit balance feedback; mark automated evidence separately from manual/human acceptance and commit verified slices without pushing automatically.

## Open Questions

None. All eight proposed rule defaults were explicitly accepted. Conversion/flight-control visual review and manual balance/device acceptance remain implementation gates, not unresolved rule choices.
