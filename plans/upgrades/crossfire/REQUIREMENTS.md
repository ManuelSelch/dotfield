# Crossfire Upgrade — Requirements

## Goal

Add a faction-selectable upgrade that rewards a player for fighting on an active front: when the player's forces are attacking and defending at the same time, their combat strength increases. It should offer a tactical option against pressure that makes passive buildup unsafe, without granting a general always-on combat bonus.

## Scope

### In Scope

- Add a Crossfire (working name) faction upgrade to the existing typed catalog and Home selection UI.
- Apply its bonus only during a clearly defined simultaneous offensive and defensive engagement for the upgrade owner.
- Use the same combat rules in live simulation and AI forecasts.
- Make the active condition and effect understandable to players and accessible UI users.

### Out of Scope

- Changing artillery range, river-crossing rules, or terrain line-of-fire.
- A permanent attack/defense bonus when no simultaneous engagement is occurring.
- New map-generation guarantees or changes to other upgrades.

## Requirements

- The upgrade is independently selectable for the player and each AI faction using the existing upgrade catalog/compiler.
- Without Crossfire selected, combat outcomes remain unchanged.
- The effect is determined from simulation state, not UI state or wall-clock timers, and is deterministic in live play and forecasts.
- The bonus must be bounded and must not create a combat loop or affect neutral cities unless explicitly specified.
- The UI must state what counts as “attacking and being attacked at the same time,” once that trigger is decided.
- Tests must cover the trigger boundary, both factions independently, no-upgrade baseline, and live/forecast consistency.

## Assumptions

- “Attack” means hostile troops are actively engaged at a city, not merely travelling toward a target.
- The intent is to help the selected faction win contested fronts; it is not an artillery counter and does not let troops cross rivers or fire through blocked terrain.
- Exact combat bonus and whether it affects attacking troops, defending troops, or both remain undecided.

## Implementation Plan

### 1. Define the simultaneous-combat trigger and bonus

Description: Resolve whether the trigger requires one city with hostile arrivals in both directions, or simultaneous engagements anywhere for that faction; define the active duration, which side(s) receive the bonus, its magnitude, and whether neutral combat qualifies. Record the player-facing description and balance rationale. Completion is an approved, testable rule with no ambiguous “at the same time” condition.

### 2. Implement Crossfire in shared combat rules

Description: Add the confirmed effect through the upgrade catalog/compiler and apply it in the shared combat path used by live simulation and forecasts. Preserve baseline behavior for factions without the upgrade. Verify deterministic outcomes, simultaneous opposing factions, trigger entry/exit, and forecast parity.

### 3. Expose and validate the upgrade

Description: Show Crossfire in player and per-enemy upgrade selection with an accurate description; ensure compiled round setup, persistence/restart, and accessibility surfaces preserve the selection. Run the full unit, browser, and production build checks, including an end-to-end scenario demonstrating the trigger.

## Open Questions

1. Does “attacking and being attacked at the same time” mean at the same city, or can the attack and defense happen at different cities?
2. Should the bonus strengthen only the player's attacking force, only the defending force, or both? Should it increase damage, reduce incoming losses, or modify another combat value?
3. What magnitude and engagement duration feel fair, and should fighting neutral cities qualify?
