# Gameplay

## Set up a match

Choose a generated field, city count and opposing factions. Difficulty comes from enemy count, independent enemy upgrades and Balanced/Aggressive/Defensive behavior. Player upgrades are independent. Home remembers preferences; inactive enemy settings are retained without affecting smaller matches.

**Reroll** changes the preview; **Play** starts it. **Restart** and **Play again** repeat the exact opening. Finished rounds also offer **New map** with the same settings. Return Home to change setup. See [generated matches](generated-maps.md) for layouts and limits, [effects](upgrades/EFFECTS.md) for upgrades/field options and [Relay](relay/IMPLEMENTATION.md) for the optional holding objective.

## Ground orders and combat

- Drag from anywhere in an owned city region to another region to send all available troops except one. Friendly targets receive reinforcements.
- A valid replacement order cancels unlaunched batches from that source, includes newly available troops and starts a fresh launch cadence. Already launched groups keep their routes. Invalid/self/off-board drops leave existing orders untouched.
- Troops launch in groups of up to five, normally 600ms apart. Queued troops remain in the garrison as defenders and are deducted only at launch. Capturing their source cancels unlaunched groups.
- Groups travel city-border to city-border. Opposing ground dots destroy each other one-for-one on contact; friendly dots pass through. Survivors retain their formation slots and only survivors reach the destination.
- Friendly arrivals add troops. Hostile arrivals reduce defenders one-for-one; ownership changes only when attackers exceed defenders. A tie leaves the current owner at zero.
- Production cities normally grow one troop per active second, modified by the owner's upgrades and local Factory. Automatic growth stops at 50; reinforcement can exceed that without being reduced. Full cities bank no fractional production.

City regions are touch/selection areas, not a second collision geometry. City circles define ground launch/impact boundaries. Rendering size and pixel density do not change combat outcomes. River crossings require paired bridge-city staging; mountains and hostile Defender regions constrain ground orders. See [Defender borders](defender-borders/IMPLEMENTATION.md).

## Input and city roles

- **Mouse:** click an owned source, then a distinct target; click the source again or press Escape to cancel. Dragging does not also issue a click order.
- **Touch/pen:** tap an owned city to open management; drag to issue ground orders.
- **Keyboard:** Tab to a region, Enter/Space to select/activate, Escape to cancel.
- Pausing, leaving the round, interruptions or losing/depleting a selected source clears pending ground selection. Resizing clears pending ground input; see the city-role guide for targeting controls.

The permanent bottom action strip offers Production, Defender, Airfield, Watchtower and Artillery. Roles are exclusive; only Production grows troops. Airfields support a reusable aircraft with up to 100 cargo troops, direct flights across rivers/mountains, pulsed delivery and an empty return trip. See [city roles and aircraft](city-conversion/IMPLEMENTATION.md) for costs, timing, shields and capture rules.

The battlefield keeps a logical 3:4 aspect ratio with noninteractive margins where necessary. Whole regions remain input targets. Selecting a city never resizes the map; desktop and mobile use the same simulation distances.

## Pause, outcomes and saves

Pause freezes growth, launches, travel, collisions and AI. The pause screen offers **Resume**, **Restart** and **Home**. Restart immediately starts the same opening without confirmation. Home abandons the round without confirmation.

Backgrounding excludes hidden time and does not override a manual pause. Resume grants no catch-up or offline growth. Conquest survival counts owned cities and launched troops; queued troops count only through their source garrison. Finished rounds freeze simulation and reject new orders. Relay can end a round earlier under its separate holding rules.

Active rounds are saved locally at browser/session events and restored on reload. There is no periodic autosave; lifecycle writes are best-effort, so crashes/force-kills may lose progress since the last write. No game progress is uploaded. Unavailable/corrupt storage safely falls back to Home. See [architecture](architecture.md) for persistence ownership and [development](development.md#offline-installation-and-updates) for offline installation and explicit updates.
