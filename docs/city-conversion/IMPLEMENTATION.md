# City conversion and reusable air transport

## Controls

- A permanent fixed-height bottom strip reserves its space from the initial render. With no selection it says “Tap a city to convert · drag to send troops”. Tap an owned city to populate five roles: Production / Defender / Airfield / Watchtower / Artillery; tap a role icon to convert immediately. The current type is free/no-op. Unaffordable types are disabled. There is no Ground button.
- The card is one 48px control row inside a 66px box (plus safe-area adjustment), with a permanent 12px gap below the map. Five local icons show role and troop cost without scrolling; current role is highlighted. There is no city/garrison header, redundant Production status, empty second row or close button. Current weapon/aircraft/shield state sits under its selected icon; Fly/Cancel stays separate. Tap outside or Escape closes selection. Full city, timing, cargo and targeting details remain accessible. Buttons retain 44px minimum touch targets.
- Costs: Production 10, Defender 20, Airfield 30, Watchtower 30, Artillery 40 troops. Every conversion leaves at least one troop. There is no refund.
- Dragging remains a ground order. Desktop click-to-click and keyboard city activation remain available. Ground orders obey mountains and paired river bridges. Selection, conversion, targeting/cancellation, closing and pausing keep the same map rectangle/backing resolution. Short screens fit the logical 3:4 field into the remaining Canvas space; controls never overlap city targets.
- A ready Airfield exposes **Fly**. Choose Fly, then activate any other city. Cancel/Escape exits targeting without boarding. A flight carries up to 100 troops while leaving one at home.
- Outside tap/Escape clears management. Build/conversion and Fly commands persist the applied state immediately; ordinary ground orders keep the existing deferred lifecycle-save behavior. Pause, background, ownership loss, restart and round end clear actionable selection.

## City roles

| Type | Troop growth | Ability |
|---|---|---|
| Production | Normal, capped at 50 automatic production | Industry/Factory troop multipliers apply |
| Defender | None | Recharges one batch-blocking shield every 10 seconds, capacity 3 |
| Airfield | None | Prepares and supports one reusable airplane |
| Watchtower | None | Fires at hostile ground troops within range 150; 4 shots per second |
| Artillery | None | Fires at enemy garrisons within range 150; 3 shots per second, mountains block |

All types can hold reinforcements above 50 and dispatch ground troops. Roles are mutually exclusive and never stack weapons. Factory and Slow Zone remain independent attached features; Artillery/Watchtower are city roles, not features. Attached Factory troop growth is suspended on nonproduction roles. Original-home identity and Defensive Network adjacency do not change with conversion.

Legacy migration: old attached Artillery/Watchtower features promote a Production/unspecified city to that role and are removed; explicit Defender/Airfield roles win conflicts; ambiguous legacy dual weapons deterministically prefer Artillery. Both opening and live saved cities are normalized. Former timer IDs migrate to unified per-city weapon timers. Old generated-map weapon toggles are ignored and stripped from Home preferences; no free prebuilt weapons are generated. Conversion/capture resets the full weapon cooldown. Weapon cadence boundaries split physical simulation deterministically. AI may build at most one of each when forecasts show useful fire, while retaining its producer safeguards.

Defender uses the existing Capture Shield pool, not a second pool. Defender/network capacities use the maximum, never add together, and recharge through one coordinated stream. Capture-granted excess charges are retained; no conversion grants free charges. Converting away retains stored charges but removes Defender recharge. Initial Defender pool is empty unless charges already existed.

## Airplane lifecycle

1. A new/captured Airfield prepares one plane for 20 simulation seconds.
2. A ready plane boards immediately on launch. Cargo is deducted from the garrison exactly once. Successful boarding cancels unlaunched ground orders; launched ground troops continue.
3. Fly straight at twice the owner's normal troop speed. Mountains, river pairing, Slow Zones, Watchtowers, Artillery and ground-dot collisions do not affect airplanes or embarked cargo.
4. Dock at the target edge. First pulse occurs after 200 ms; each pulse resolves up to five troops through the same combat function as ground arrivals. No short ground-dot unloading route is drawn.
5. Shield blocks destroy that batch only. Every pulse uses the target's current owner, so later pulses reinforce after capture or attack a newly hostile owner.
6. Return empty, then spend 10 seconds in turnaround before readiness. No second plane is produced while one is away.

Capturing the home destroys its old plane and undelivered cargo immediately. Already delivered troops remain. The new owner retains city type/features and starts full preparation. Conversion away is disallowed during outbound/unloading/returning, but permitted when preparing/ready/turnaround. Successful conversion cancels unlaunched ground reservations and resets partial production/recharge progress.

## Simulation and lifecycle

- Equal-time combat ordering is ground arrivals, then air pulses ordered by home/trip identity, then shield recharge and existing city weapons. A capture invalidates its home's old aircraft immediately, including capture and recapture within one step.
- Aircraft have simulation-owned phases, positions, cargo, trip identities and timers. Rendering only reads state and committed delivery feedback. Reduced motion suppresses decorative pulse growth, not combat.
- Cargo counts once in troop composition and faction survival. Empty/preparing/ready/returning planes have no combat strength. Round completion freezes any remaining plane/cargo; no delivery runs after the result.
- Pause/background/terminal state freezes all timers. Reload does not simulate closed time. Restart restores exact opening city types with fresh runtime; New map keeps existing generated-match semantics.
- Event-only saving remains unchanged for frames/ordinary ground dispatch. Explicit build/conversion and aircraft launch are saved as applied command events; pause/visibility/page-exit/round-end are still force-save boundaries. Saves validate city roles, per-city weapon timer associations, aircraft slots/references/phases/routes/cargo/timers, trip counters and shield runtime. Legacy attached weapons migrate to exclusive roles and cooldowns.

## AI

- Player, synchronous AI, worker AI and forecasts use the same conversion/launch/physics paths. Worker returns typed actions for ground, airlift or conversion; stale actions revalidate resources/ownership/readiness.
- Conservative conversion keeps at least two Production cities and at least two thirds of its cities producing. It creates at most one Airfield, Defender, Watchtower and Artillery per faction and does not repeatedly switch roles; weapon conversion requires forecastable, useful targets.
- Airfield supply is bounded, useful flights may carry partial loads, and ready aircraft can attack/reinforce across barriers. Known incoming attacks and original-home reserves limit risky departures.
- These are heuristic decisions over known orders, not predictions of future player commands or guaranteed optimal strategy.

## References and acceptance

- [Full requirements](REQUIREMENTS.md).
- Approved delivery: [Dock & pulse option C](../../mockups/airplane-delivery/DESIGN.md).
- Approved compact control card: [revision 4](../../mockups/city-conversion/DESIGN.md). Approved five-role icon picker: [revision 6](../../mockups/city-conversion/DESIGN.md).
- Verified checkpoint: **714 unit tests in 81 files**, **114 standard Chromium browser tests** (`npx playwright test --workers=1`), **2 production PWA tests**, TypeScript/production build, and whitespace/link checks pass. Browser log: `/tmp/dotfield-weapons-browser-final3.log`; latest unit/build/PWA logs: `/tmp/dotfield-weapons-unit-final4.log`, `/tmp/dotfield-weapons-build-final4.log`, `/tmp/dotfield-weapons-pwa-final4.log`.
- Automated tests cover core physics, resource conservation, legacy weapon/timer migration, cooldown resets, AI/worker actions, mobile role controls, ground orders and full air trips. The full serial browser checkpoint passes without retries. Real-iPhone Safari/installed-PWA readability and performance, and human balance/duration remain manual acceptance. Initial values are centralized playtest tuning, not validated balance.
