# Upgrade effects

Pre-game faction upgrades, without currency, purchases, levels or unlocks. Player and AI upgrades are selected independently. Watchtower and Slow Zone are now shared On the field settings, not faction upgrades. Match choices persist in local storage, while a saved active round restores its compiled rules/features.

| Upgrade | Simple effect | What it changes | Status |
|---|---|---|---|
| Reinforcements | Start with 48 instead of 36 units. | Stronger opening; no lasting production advantage. | Proposed |
| Industry | Owned cities produce 25% faster: 1.25 instead of 1 unit/sec. | Rewards expansion and holding territory. Applies to newly captured cities too; other factions and neutral production are unchanged. | Implemented |
| Quick march | Troops move 20% faster. | Faster attacks and defensive reinforcement; still vulnerable to collisions. | Proposed |
| Rapid deployment | Launch groups every 450 ms instead of 600 ms. | Commits armies sooner, but also empties the source sooner. | Proposed |
| Watchtower | On the field: places one tower on a seeded-random city; it destroys nearby hostile airborne dots within a 72-field-unit radius. | Creates visible defensive coverage; the tower switches sides on capture and can be used against its former owner. | Implemented as a field setting |
| Factory | Starting city produces twice as fast, rather than boosting every city. | Creates a valuable location to defend or capture. | Implemented; stacks with current owner's Industry, transfers to captors |
| Slow Zone | On the field: a seeded random city projects a 90-field-unit circle where eligible airborne groups move at 50% speed. | Slows hostile groups while owned, switches sides on capture, and slows both factions while neutral. Overlaps use the strongest slowdown. | Implemented as a field setting |
| Capture shield | Each newly captured city blocks its first three hostile arriving batches without losing garrison (normally 15 troops). | Helps establish a foothold; qualifying recapture grants three fresh charges. Defensive Network can recharge the shared charges. | Implemented; independently selectable for every faction |
| Defensive Network | Connected cities recharge one batch-blocking shield every 10 seconds; network sizes 4–6, 7–12, or 13+ set capacity to 1, 2, or 3 shields. | Gives each connected city a regenerating shield charge that blocks one hostile troop-arrival batch. | Implemented; independently selectable for every faction |

## Industry scope

- Off by default; select it on Home before Play.
- The chosen setup stays fixed for the round and its Restart/Play again actions.
- Return Home to change it. Match preferences persist locally across reloads.
- Ownership determines growth: capturing a city grants the new owner's rate, not a permanent city bonus. Capture keeps the existing fractional-growth reset rule.
- Pause/background suspension exclude inactive time; no offline production.
- Configuration is resolved independently by faction ID. Gameplay supports multiple mutually hostile AI factions with independent rules, upgrade selections and AI schedules.

## Factory scope

- Off by default; attaches one Factory to the selecting faction's starting city. Maps may also author neutral Factories. Selecting the upgrade on an existing Factory does not add another multiplier or badge.
- Factory alone doubles production at its host; Factory + Industry multiplies that faction's base production by 2.5. Other cities receive only Industry's 1.25× rate when enabled.
- The Factory stays attached after capture and benefits its current owner, including any AI faction. Neutral Factories do not produce. Recapture transfers the bonus back; existing capture rules reset fractional growth. Legacy saved beneficiary IDs remain readable but no longer restrict the bonus.
- Restart/Play again recreate the same seed/bonus without stacking another Factory. Home preferences persist locally.
- Factory is a typed immutable territory feature, not a faction-wide config change. Its rate is used by both real simulation and AI forecasts.

## Slow Zone scope

- Shared On the field setting, not faction-selectable; any side can own/control the randomly chosen host.
- Off by default in On the field; when enabled, one seeded random city receives a zone. The host is resolved during map generation; Restart and Play again retain the same host, while reroll/new map may choose another city.
- Its fixed 90-unit radius is drawn as a distinct dashed owner-tinted circle with an hourglass marker. The circle uses logical field coordinates and does not change touch regions or combat geometry.
- A zone owned by a faction slows only hostile airborne groups. Capturing the host switches allegiance immediately. A neutral-owned zone slows both player and enemy airborne groups.
- The entire formation slows according to its group center. Entering and exiting split the shared trajectory; leaving restores base speed without teleporting or resetting slots/progress.
- Overlapping eligible zones use only the strongest slowdown (smallest multiplier), never multiplicative stacking. Current multiplier is 0.5.
- Live simulation, collisions, Watchtower target positions and AI forecasts use the same boundary-aware trajectory. Queued launch timing and garrison units are unaffected.

## Watchtower scope

- Off by default in On the field; when enabled, one seeded-random city from the full field receives a tower. Its fixed 72-unit radius is drawn as a subtle owner-tinted circle; a distinct tower silhouette marks the host. Neutral towers remain inactive until captured.
- Every 250 ms, the tower destroys at most one hostile airborne dot currently within range (up to four per second). It selects the nearest eligible individual dot; ties resolve deterministically by transfer ID and stable formation slot. It never targets friendly units or stationary garrisons.
- The tower's firing timer is continuous even while no target is in range. It does not bank missed shots; an in-range target is destroyed at the next 250ms cadence boundary.
- Tower ownership follows the current owner of its host city. Capturing a tower immediately turns it against the original owner; recapture turns it back. Neutral-owned towers do not fire.
- Fire resolution is part of the shared fixed-step physical simulation used in live rounds and forecasts. A tower kill removes one dot/slot, not an entire dispatched group.
- The radius uses fixed 360×480 field coordinates and scales with the board. The coverage circle is visual only; it does not change touch regions, launch boundaries or collision geometry.

## Defensive Network scope

- Off by default and independently selectable for the player and each AI faction.
- A network includes same-owner cities connected to the faction's original starting city through a chain of currently owned neighboring territories that share a border. Paired endpoints of an authored river bridge count as neighbors. Troop-order legality and mountain-blocked direct routes do not determine network adjacency. Neutral/enemy cities cannot serve as links.
- Network tiers count every connected owned city, including cities with zero garrison: 4–6 cities allow one stored shield, 7–12 allow two, and 13 or more allow three. Groups of fewer than four cities have no tier. Each connected city recharges one shield every 10 seconds while below its tier capacity. Existing charges above the current capacity are preserved but not replenished until the count falls below capacity.
- Each Defensive Network shield blocks one entire hostile troop-arrival batch before it damages the garrison. It does not block artillery, friendly arrivals, outgoing attacks or change garrison counts. Recharge uses simulation time and resets partial cooldown when the city disconnects or the network tier changes. Shield charges are shared with Capture shield: qualifying captures can grant three charges, and Defensive Network never removes charges above its capacity.
- Tiers are computed from current ownership. Losing the starting city or a shared-border link stops recharge for cities beyond it; stored charges remain. Recapturing the home/link restores recharge. Live combat and AI forecasts use the same shared combat path.
- The player's connected group has a strong outer-perimeter outline. Connected cities of any faction with the upgrade show one, two or three compact shield markers; the board's accessible description explains the player's current tier.
- Approved visual reference: [Defensive Network mockup revision 3](../../mockups/defensive-network/DESIGN.md).

## Capture shield scope

- Off by default and independently selectable for the player and each AI faction. Compiles into that faction's capture bonus, not a permanent building.
- Successful captures of neutral or hostile cities grant three charges. Starting holdings, ties and friendly reinforcement grant none; reinforcements do not replenish charges.
- One charge blocks one entire hostile arriving batch, regardless of its surviving troop count. A partial final launch or a batch reduced by collisions/Watchtower still consumes one charge. Fully destroyed batches never arrive or consume a charge.
- Capture shield alone does not regenerate or expire. When Defensive Network is also selected, its recharge restores the same shared charge pool up to network capacity. Recapture by an upgraded faction grants three fresh charges; capture by an unupgraded faction clears protection.
- Existing sequential arrival ordering applies: a capture can protect against later hostile arrivals in the same simulation step. Live combat and AI forecasts use the same path.
- Three owner-coloured compact arcs surround the city. Each blocked batch removes one arc with a brief simulation-time flash; reduced-motion mode skips flashing. Unit counters, production, input regions and collision/impact geometry are unchanged.
- Runtime charges and hit feedback persist with the round. Legacy saves default to no shields, never retroactively grant charges. Restart/Play again retain the rule but clear capture runtime; paused/hidden/terminal state freezes effects.
- Approved design: [mockup revision 2](../../mockups/capture-shield/DESIGN.md). Browser regression tests cover three blocks then normal damage at 320/430px, partial/depleted shield restore in the real application, pause, restart and Home setup.

## Board indicators

- Factory: a small vector factory silhouette (sawtooth roof and chimney) at the upper-right edge, dimmed while inactive. No letter F or emoji.
- Industry: one upward chevron at the upper-left of every city owned by a faction with a production rate above baseline. It marks cities owned by any faction whose resolved production rate exceeds baseline.
- Losing ownership removes the player's Industry chevron. Factory alone does not add one; combined Factory + Industry shows separate factory and single-chevron badges.
- Defensive Network: one owner-coloured Tabler Shield silhouette with a centered 1/2/3 capacity numeral marks every connected city. Existing shield arcs show current stored charges; each charge blocks one hostile batch. Markers are presentation only and do not change counters, touch regions, launch boundaries or collision geometry.
- Counters stay readable. Minimum-sized badges are presentation only: touch regions, launch boundaries and collision geometry are unchanged.
- Two stacked chevrons are reserved for a future Industry level. The drawing helper supports that shape, but there is no level-2 selection or progression yet.

See [architecture and implementation plan](REQUIREMENTS.md). Industry, Factory, Watchtower, Slow Zone, Capture shield and Defensive Network are implemented. Reinforcements, Quick march and Rapid deployment remain proposals, not implemented features.
