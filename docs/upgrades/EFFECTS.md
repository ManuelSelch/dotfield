# Upgrade effects

Pre-game effects, without currency, purchases, levels or unlocks. Selected effects apply **only to the player** for now; opponents retain baseline settings. Later progression can supply the same active-effect IDs instead of manual selection.

| Upgrade | Simple effect | What it changes | Status |
|---|---|---|---|
| Reinforcements | Start with 48 instead of 36 units. | Stronger opening; no lasting production advantage. | Proposed |
| Industry | Owned cities produce 25% faster: 1.25 instead of 1 unit/sec. | Rewards expansion and holding territory. Applies to newly captured cities too; enemy and neutral production are unchanged. | Implemented |
| Quick march | Troops move 20% faster. | Faster attacks and defensive reinforcement; still vulnerable to collisions. | Proposed |
| Rapid deployment | Launch groups every 450 ms instead of 600 ms. | Commits armies sooner, but also empties the source sooner. | Proposed |
| Watchtower | Starting city automatically destroys one nearby enemy airborne dot per second, within a fixed radius. | Creates defensive coverage and makes route choice matter. | Proposed; radius/capture/timing rules unresolved |
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

## Board indicators

- Factory: a small vector factory silhouette (sawtooth roof and chimney) at the upper-right edge, dimmed while inactive. No letter F or emoji.
- Industry: one upward chevron at the upper-left of every city owned by a faction with a production rate above baseline. In the current app, this means player cities while Industry is enabled, including newly captured cities.
- Losing ownership removes the player's Industry chevron. Factory alone does not add one; combined Factory + Industry shows separate factory and single-chevron badges.
- Counters stay readable. Minimum-sized badges are presentation only: touch regions, launch boundaries and collision geometry are unchanged.
- Two stacked chevrons are reserved for a future Industry level. The drawing helper supports that shape, but there is no level-2 selection or progression yet.

See [architecture and implementation plan](REQUIREMENTS.md). All effects other than Industry and Factory remain proposals, not implemented features.
