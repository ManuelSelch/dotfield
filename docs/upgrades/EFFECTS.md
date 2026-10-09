# Upgrade effects

Pre-game effects, without currency, purchases, levels or unlocks. Selected effects apply **only to the player** for now; opponents retain baseline settings. Later progression can supply the same active-effect IDs instead of manual selection.

| Upgrade | Simple effect | What it changes | Status |
|---|---|---|---|
| Reinforcements | Start with 48 instead of 36 units. | Stronger opening; no lasting production advantage. | Proposed |
| Industry | Owned cities produce 25% faster: 1.25 instead of 1 unit/sec. | Rewards expansion and holding territory. Applies to newly captured cities too; enemy and neutral production are unchanged. | Implemented |
| Quick march | Troops move 20% faster. | Faster attacks and defensive reinforcement; still vulnerable to collisions. | Proposed |
| Rapid deployment | Launch groups every 450 ms instead of 600 ms. | Commits armies sooner, but also empties the source sooner. | Proposed |
| Watchtower | Starting city automatically destroys up to four nearby hostile airborne dots per second, within a 72-field-unit radius. | Creates visible defensive coverage; the tower switches sides on capture and can be used against its former owner. | Implemented |
| Factory | Starting city produces twice as fast, rather than boosting every city. | Creates a valuable location to defend or capture. | Implemented; stacks with Industry, inactive for captors |
| Capture shield | Each newly captured city absorbs its first three incoming enemy units without losing garrison. | Helps establish a foothold; shield does not regenerate. | Proposed; recapture policy unresolved |

## Industry scope

- Off by default; select it on Home before Play.
- The chosen setup stays fixed for the round and its Restart/Play again actions.
- Return Home to change it. Selection stays in memory, not browser storage; reload resets it.
- Ownership determines growth: capturing a city grants the new owner's rate, not a permanent city bonus. Capture keeps the existing fractional-growth reset rule.
- Pause/background suspension exclude inactive time; no offline production.
- Configuration is resolved independently by faction ID. Current gameplay still supports one human and one opponent; multiple enemies require further ownership/AI/collision/outcome work.

## Factory scope

- Off by default; attaches one Factory to the starting player city. No Factory is added to enemy cities or later captures.
- Factory alone produces 2 units/sec at its host; Factory + Industry produces 2.5 units/sec there. Other player cities receive only Industry's 1.25 units/sec when enabled.
- The Factory stays attached after capture, but is inactive for the opponent or neutrals. Recapturing it restores the original player's bonus; existing capture rules reset fractional growth.
- Restart/Play again recreate the same seed/bonus without stacking another Factory. Home selection is memory-only and reload clears it.
- Factory is a typed immutable territory feature, not a faction-wide config change. Its rate is used by both real simulation and AI forecasts.

## Watchtower scope

- Off by default; attaches one tower to the starting player city. Its fixed 72-unit radius is drawn as a subtle owner-tinted circle; a distinct tower silhouette marks the host.
- Every 250 ms, the tower destroys at most one hostile airborne dot currently within range (up to four per second). It selects the nearest eligible individual dot; ties resolve deterministically by transfer ID and stable formation slot. It never targets friendly units or stationary garrisons.
- The tower's firing timer is continuous even while no target is in range. It does not bank missed shots; an in-range target is destroyed at the next 250ms cadence boundary.
- Tower ownership follows the current owner of its host city. Capturing a tower immediately turns it against the original owner; recapture turns it back. Neutral-owned towers do not fire.
- Fire resolution is part of the shared fixed-step physical simulation used in live rounds and forecasts. A tower kill removes one dot/slot, not an entire dispatched group.
- The radius uses fixed 360×480 field coordinates and scales with the board. The coverage circle is visual only; it does not change touch regions, launch boundaries or collision geometry.

## Board indicators

- Factory: a small vector factory silhouette (sawtooth roof and chimney) at the upper-right edge, dimmed while inactive. No letter F or emoji.
- Industry: one upward chevron at the upper-left of every city owned by a faction with a production rate above baseline. In the current app, this means player cities while Industry is enabled, including newly captured cities.
- Losing ownership removes the player's Industry chevron. Factory alone does not add one; combined Factory + Industry shows separate factory and single-chevron badges.
- Counters stay readable. Minimum-sized badges are presentation only: touch regions, launch boundaries and collision geometry are unchanged.
- Two stacked chevrons are reserved for a future Industry level. The drawing helper supports that shape, but there is no level-2 selection or progression yet.

See [architecture and implementation plan](REQUIREMENTS.md). All effects other than Industry, Factory and Watchtower remain proposals, not implemented features.
