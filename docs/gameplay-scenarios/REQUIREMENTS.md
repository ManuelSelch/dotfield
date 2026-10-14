# Dotfield Gameplay Scenarios — Requirements

## Goal

- Make matches pose different tactical problems rather than repeat efficient expansion followed by overwhelming force.
- Prototype three authored scenarios using existing mechanics: **Bridgehead** (containment and flanking), **Factory Gamble** (economic tempo versus immediate safety), and **Broken Network** (disruption and exploitation).
- Preserve smooth all-but-one dispatch and readable short matches. Tactical variety, not feature count, is the success criterion.
- Status: proposed design for review, not authorization to implement. Coordinates and garrisons below are first-playtest candidates, not proven balance. No scenario gameplay or launcher has been implemented by this plan.

## Scope

### In Scope

- Three fixed, replayable openings with one player, one enemy, authored ownership, forces, features and terrain.
- Existing production, batches, collisions, manual river/mountain staging, Factory and Defensive Network mechanics.
- Proposed scenario-specific fixed rules rather than arbitrary generated-match preferences.
- Observable competing openings, opponent responses, mid-match tactical transitions and failure cases for each scenario.
- Focused AI adjustments only where playtests show the existing policy cannot contest the intended opportunities.
- Geometry validation, deterministic behavioral tests, browser lifecycle checks and human tactical playtests before release.
- A separately approved minimal way to launch the scenarios; production interface changes require mockup approval first.

### Out of Scope

- Campaign progression, unlocks, rewards, new troop classes, economy currencies or new combat abilities.
- Relay objectives, scheduled reinforcements, terrain closures or scripted phase changes in these first prototypes.
- Hidden AI resources, rubber-banding, forced enemy mistakes or a single mandatory solution sequence.
- Replacing generated matches, changing normal-match balance, or generalizing a scenario editor/framework.
- Automatically generated scenario variants before the authored versions demonstrate different viable tactics.

## Requirements

### Shared scenario contract

- Use the current 360×480 logical board, city radius 14, baseline production 1 troop/second, production cap 50, batches of up to five, 600-ms launch cadence and speed 35.
- Keep all-but-one dispatch. Simultaneous defense and offense must be possible using different owned source cities; do not assume a source can split its army through a new percentage control.
- Victory remains elimination using existing territory/airborne-survivor rules. Losing the original home is not an automatic defeat.
- All cities and ownership are visible. No hidden attacks or timers. Briefing text explains the tactical situation without revealing a prescribed solution.
- Fix round rules per scenario. Disable Industry faction bonuses, Capture Shield, starting-city Factory upgrades, Watchtowers, Artillery and Slow Zones unless explicitly listed below. An authored Factory remains active for its current owner. Only the enemy in Broken Network has Defensive Network.
- Use standard AI as a baseline, with proposed Aggressive behavior for Bridgehead and Balanced for the other two. These are starting hypotheses, not difficulty guarantees. The policy must respond to the actual board rather than execute an uninterruptible script.
- Begin with no airborne troops, queued orders or stored shield charges. Broken Network recharges naturally after play starts; the first charge is earned after ten uninterrupted seconds under current rules. No precharged opening-state mechanism is needed.
- Identify the original home explicitly for each faction; never accidentally use a forward city as the home because it appears first in a city list. Restart, replay and restoration must preserve those identities.
- Replay restarts the exact opening, rules and AI. Player Home preferences must not silently alter authored scenarios. Scenario retry must not generate a random field.
- All map diagrams below show placement only. Empty space is not an impassable wall, and proximity is not a movement restriction. Same-bank direct orders remain legal unless blocked by a mountain. Rivers permit cross-bank orders only between paired endpoints.
- Phase descriptions are expected decision opportunities, not scheduled events. If the player or AI acts differently, the scenario must continue coherently.

### Scenario 1 — Bridgehead

#### Tactical identity

- Question: **How little can I commit to holding the obvious front while creating a second front?**
- Distinct skill: allocating separate armies between containment and a manually staged flank; changing the main axis of attack when the enemy commits.
- Suggested briefing: “Their strongest army faces the western bridge. The eastern crossing is open to either side. Hold long enough to create another threat.”

#### Appearance and opening

- A horizontal river divides enemy-held north from player-held south. Two bridges sit far apart, at x=70 and x=290. No mountains.
- The western crossing begins with opposing owned bridgeheads. The eastern crossing begins neutral on both banks.
- The enemy Factory is visibly behind the bridges, not an extra neutral reward at the western front.
- There are ten cities. P = player, E = enemy, N = neutral; F = Factory. Numbers are initial garrisons.

```text
                     E home/F 20
   N village 8                          E reserve 8

   E west 28                            N east 8
       |                                    |
~~~~~~~|~~~~~~~~~~~~~~ RIVER ~~~~~~~~~~~~~~~~|~~~~~~~
       |                                    |
   P west 18                            N east 6

   P reserve 10                         N village 8
                     P home 36
```

| ID | Position (x,y) | Owner | Troops | Role / feature |
|---|---|---|---|---|
| EH | 180,60 | Enemy | 20 | Original enemy home; Factory ×2 |
| ER | 300,115 | Enemy | 8 | Northern reinforcement source |
| NW | 70,105 | Neutral | 8 | Northern expansion opportunity |
| EW | 70,200 | Enemy | 28 | Strong western bridgehead |
| NE | 290,200 | Neutral | 8 | Northern eastern endpoint |
| PW | 70,280 | Player | 18 | Exposed western bridgehead |
| SE | 290,280 | Neutral | 6 | Southern eastern endpoint |
| PR | 75,400 | Player | 10 | Separate defensive reserve |
| SN | 290,400 | Neutral | 8 | Optional southern expansion |
| PH | 180,420 | Player | 36 | Original player home; mobile reserve |

- River y=225–255; paired endpoints EW↔PW and NE↔SE, each bridge width 64.
- Opening production before caps: enemy 4 troops/second, player 3. Opening troops: enemy 56, player 64. The player has a temporary army advantage, not a superior passive economy.

#### Competing tactics and transitions

- **Contain and flank:** use the western reserve to support PW; send the home army toward SE, then manually across to NE. Once north, choose the enemy reserve, Factory or western bridgehead according to enemy commitments.
- **Concentrated western breakthrough:** combine owned sources at PW and punish an enemy that diverts too much toward the east. This must remain an alternative, not be blocked by an arbitrary immunity.
- **Counter to an enemy eastern move:** reinforce or contest the eastern pair rather than follow a predetermined flank. A defended second crossing may turn western concentration into the better choice.
- Opening: assess which crossing the enemy actually supports. Middle: hold one crossing while contesting the other. Exploitation: attack the exposed rear or redirect to a weakened western front.
- Travel and staging make changing fronts costly. Capturing SE does not auto-forward troops across the river; capturing NE does not auto-forward them to the Factory.
- If PW falls, the player still owns the home and reserve and may counterattack or continue the flank. The scenario must not treat one lost bridgehead as terminal.

#### Why ordinary expansion is insufficient

- Cheap neutrals are not a substitute for responding to the enemy's owned western endpoint. Ignoring it should expose southern holdings to a real attack.
- Waiting everywhere favors the enemy's larger starting production. Committing everything west leaves the alternate crossing uncontested.
- The tactical difference is simultaneous containment and maneuver, not collecting more neutrals in a different arrangement.

#### Acceptance and tuning

- Verify both crossings require their exact paired endpoints; the home cannot attack the enemy home across the river directly.
- Playtest both a western breakthrough and an eastern flank; each should succeed against an appropriate enemy allocation, not necessarily against every response.
- The AI must be able to stage across either crossing and respond to a threatened rear. Existing single-order scoring may need a focused improvement; do not claim it already provides this behavior.
- Reject the opening if holding west requires no meaningful support, if the flank always wins before opposition can respond, or if the AI always ignores one crossing.

### Scenario 2 — Factory Gamble

#### Tactical identity

- Question: **Do I spend my strongest army on future production, or on keeping my exposed front safe now?**
- Distinct skill: managing economic payback, travel and the opportunity cost of committing the only large reserve.
- Suggested briefing: “The eastern Factory can fund the war, but troops there cannot directly reinforce your western outpost through the ridge.”

#### Appearance and opening

- No river. A vertical mountain in the center separates a western pressure route from an eastern economic opportunity.
- The neutral Factory lies to the east of the ridge. The player home is below it; the enemy home is above it. Both homes have legal direct orders to the Factory around the ridge's ends.
- The exposed player outpost and enemy forward army face each other west of the mountain.
- There are nine cities.

```text
                    E home 30
   N village 8                           E reserve 10

                  +----------+
   E guard 18     | MOUNTAIN |
                  |          |           N FACTORY 14
   N relay 8      |          |
                  +----------+
   P guard 12                            N staging 8

                    P home 36
```

| ID | Position (x,y) | Owner | Troops | Role / feature |
|---|---|---|---|---|
| EH | 180,60 | Enemy | 30 | Original enemy home; economic contest source |
| ER | 280,110 | Enemy | 10 | Eastern reserve / possible raid target |
| NW | 80,100 | Neutral | 8 | Northern western expansion |
| EG | 80,200 | Enemy | 18 | Western pressure source |
| F | 280,245 | Neutral | 14 | Contested Factory ×2 |
| W | 80,275 | Neutral | 8 | Western relay / buffer opportunity |
| PG | 80,350 | Player | 12 | Exposed outpost |
| E | 280,350 | Neutral | 8 | Eastern staging / fallback opportunity |
| PH | 180,420 | Player | 36 | Original player home; main reserve |

- Mountain rectangle: x=140–220, y=170–310. No automatic detours.
- Opening production before caps: enemy 3 troops/second, player 2. Opening troops: enemy 58, player 48.
- A captured Factory adds two local troops/second while below the cap. Its value is delayed and depends on keeping it; taking it does not guarantee economic superiority if other cities are lost.

#### Competing tactics and transitions

- **Factory first:** send the home army directly to F. Use PG independently to delay western pressure or reposition. Accept that PG may be lost; preserve the home and exploit Factory production to recover or raid the enemy reserve.
- **Safety first:** reinforce PG or take W before committing east. This reduces the immediate western risk but may let the enemy acquire the Factory. The subsequent problem becomes contesting or raiding an established economic position.
- **Punish the enemy's investment:** if the enemy home sends its army to F, use that commitment window to gain western ground. If its eastern reserve empties, a Factory owner can attack that reserve instead of repeatedly feeding the western front.
- Opening: decide where to commit the large reserve. Middle: survive the exposed interval and observe which economic asset the enemy contests. Exploitation: turn production into a counterattack, or punish overinvestment while the enemy's troops are displaced.
- F→PG is blocked by the mountain; reinforcing the western outpost from F requires a legal manual route around an end, potentially through PH. F→PH and F→ER are direct legal orders.
- PG falling does not instantly end the match. The gamble must be recoverable; equally, losing PG must have a real cost in production, position or home exposure.

#### Why ordinary expansion is insufficient

- The player starts with two independent sources but only one large army. Sending it east leaves the western problem unresolved; sending it west gives the opponent an economic window.
- The Factory is not simply a better neutral city on the same expansion path. Geography prevents its surviving army from instantly solving the threatened front.
- The lesson is choosing when an investment is worth temporary vulnerability, not always rushing the Factory.

#### Acceptance and tuning

- Verify PH→F and EH→F are legal; F→PG and PH→EH are blocked; EG→PG is legal. Do not imply the neutral relay must be captured to issue every legal western attack.
- Playtest Factory-first and defense-first against responsive AI. Require at least one recoverable Factory-first line and one successful defense-first line under appropriate enemy commitments.
- The enemy must be able to contest F and exploit an exposed western outpost. If the existing policy cannot weigh both, add only the focused response needed and re-test both openings.
- Reject the opening if the Factory can be captured with no meaningful exposure, if losing PG causes unavoidable defeat before Factory production matters, or if waiting safely always beats both choices.

### Scenario 3 — Broken Network

#### Tactical identity

- Question: **Which connecting territory lets me weaken several defenses without defeating each one head-on?**
- Distinct skill: reading shared-border connectivity, striking a junction, then exploiting a temporary disruption before reconnection.
- Suggested briefing: “Their two forward cities recharge shields through the southern bridge junction. Capture that junction to stop their recharge; existing shields and armies remain.”

#### Appearance and opening

- A horizontal river has one central bridge. The enemy controls both endpoints and two strong forward cities on the player's bank.
- The northern home, northern reserve and northern endpoint connect to the southern junction through that one bridge. The two forward cities connect back to the original home only through the junction.
- The player has three separate southern sources, allowing one force to strike the junction while others reinforce threatened cities or exploit a weakened forward city.
- There are ten cities. The diagram does not imply the forward cities physically block direct orders to the junction.

```text
                    E home 18
                                        E reserve 8
                    E north bridge 12
                           |
~~~~~~~~~~~~~~~~~~~~~~~~ RIVER ~~~~~~~~~~~~~~~~~~~~~~~~
                           |
                    E JUNCTION 24

   E forward 32                         E forward 32
                    N buffer 10

   P reserve 25                         P reserve 25
                    P home 40
```

| ID | Position (x,y) | Owner | Troops | Role / feature |
|---|---|---|---|---|
| EH | 180,70 | Enemy | 18 | Original enemy home; network root |
| ER | 290,125 | Enemy | 8 | Northern reserve |
| NB | 180,200 | Enemy | 12 | Northern bridge endpoint |
| J | 180,280 | Enemy | 24 | Southern bridge endpoint; network junction |
| FW | 70,335 | Enemy | 32 | Western forward defense |
| FE | 290,335 | Enemy | 32 | Eastern forward defense |
| N | 180,355 | Neutral | 10 | Optional buffer; not a mandatory movement waypoint |
| PW | 60,420 | Player | 25 | Western source |
| PE | 300,420 | Player | 25 | Eastern source |
| PH | 180,435 | Player | 40 | Original player home; main strike source |

- River y=225–255; NB↔J is the only bridge, width 64. No mountains, Factory or other field features.
- Enable Defensive Network for the enemy only. This is a disclosed asymmetric scenario rule; player sources get no network bonus.
- Opening production before caps: enemy 6 troops/second, player 3. Opening troops: enemy 126, player 90. Safe neutral expansion alone offers no plausible economic parity.
- The six initially connected enemy cities have shield capacity two each. Stored charges start at zero and recharge under existing ten-second rules; the opening therefore offers a possible early-disruption window.

#### Competing tactics and transitions

- **Early junction strike:** attack J before its first recharge if current enemy movements make the route and commitment favorable. Use the other sources to defend against the forward cities. This is an opportunity, not a guaranteed rush solution.
- **Contain, then cut:** reinforce the threatened side and wait for the enemy to commit a forward army. Strike J when fewer troops can answer, then use a different source against the exposed forward city.
- **Direct local breakthrough:** if an enemy forward city empties to reinforce J, attack that city instead. Coordinated conventional assaults remain legal; the junction is strategically valuable, not magically mandatory.
- Opening: judge whether to use the pre-recharge window or contain a forward attack. Middle: capture the junction or exploit the forces sent to defend it. Exploitation: remove stored shields with sufficiently concentrated follow-up batches and prevent an easy reconnection.

#### Exact consequences of a cut

- After J changes owner, FW and FE are disconnected from the original enemy home. Their shield recharge stops, but their troops, normal production and stored shields remain.
- EH, ER and NB remain connected as a group of three, reducing their capacity from tier two to tier one. Existing excess shield charges are not removed.
- Losing J also interrupts northern reinforcement across the bridge until the enemy retakes it. The isolated forward cities can still reinforce and attack on the south bank; this is not a supply-starvation mechanic.
- If the enemy recaptures J, connectivity and recharge can resume under existing cooldown rules. The player must exploit or defend the disruption rather than assume the match is solved.

#### Why ordinary expansion is insufficient

- The only neutral is a buffer, not a path to a larger safe economy. The enemy begins with twice the player's city production and a larger army.
- Repeated small attacks into recharging shields waste batches. A structural attack can disable future shields at multiple cities, while a direct assault may be preferable if the enemy exposes a position to protect its junction.
- The lesson is changing the defense system before committing to a finishing attack, not simply reaching a larger troop total.

#### Acceptance and tuning

- Verify with actual Voronoi shared-border adjacency and paired bridge rules, not a hand-drawn connection graph: initially EH/ER/NB/J/FW/FE are connected; after J capture, exactly EH/ER/NB remain in the enemy home component.
- Test no shield recharge at isolated cities, retention of existing charges, unchanged production and resumed recharge after reconnection. Test the tier reduction without trimming excess charges.
- The enemy must contest a threatened junction and attempt useful reconnection when feasible. Current target scoring does not explicitly value network disruption; this is an implementation risk, not an existing capability claim.
- Reject the opening if an uncontested home-to-junction rush always settles the match, if both forward armies always overrun the player before a response is possible, or if the network cut has no practical effect.

### Tactical acceptance across all three

- Each scenario must support at least two plausible opening plans, with their relative value changing under different enemy commitments. They need not both beat optimal opposition from exactly the same state.
- Record the player's opening plan, first meaningful change of plan, reason for that change, losses recovered from, round duration and whether the final phase was contested or cleanup.
- Compare a simple nearest-affordable-neutral policy, a one-front concentration policy and scenario-aware play. Automated results are diagnostic only; successful geometry and deterministic victories do not prove tactical depth.
- Repeat human playtests after the first successful win. If one rehearsed sequence consistently solves a scenario regardless of opponent response, revise the opening or opponent rather than declaring variety achieved.
- First tune positioning, garrisons and existing AI priorities. Add no new mechanic merely to rescue an unproven layout.
- Verify touch/readability on a phone and mouse controls on desktop. Any launcher or briefing presentation must be visually approved before production implementation.

### Design-time validation completed

- The proposed coordinates were checked against the current pure movement, river validation and connectivity code using a temporary Vite module runner. No runtime scenario code was added.
- Both Bridgehead pairs and the single Broken Network pair pass river validation. All cities in every scenario are reachable through legal manual staging.
- Factory Gamble's key legal and blocked orders match the requirements above.
- Broken Network's initial enemy component has six cities; capturing J leaves exactly EH, ER and NB connected to the enemy home.
- These are static geometry checks, not battle simulations, AI acceptance, balance tests or proof of multiple viable openings. This worktree has no installed dependencies; the check used the primary checkout's existing Vite installation. Its initial automatic application dependency scan warned about missing worktree dependencies; the pure geometry checks themselves completed successfully.

## Assumptions

- The user wants the three proposed scenarios developed in detail before approving gameplay or interface changes.
- Initial scenarios use disclosed fixed ownership, garrisons and upgrade presets; normal Home preferences do not apply.
- Access can remain playtest-only while tactical viability is evaluated. A production Scenarios mode is not yet approved.
- A single enemy isolates the intended choices better than adding independent factions to these first prototypes.
- Proposed AI behavior presets are sufficient starting points for observation, but may need narrowly scoped tactical responses. No claim is made that the current AI will generate the desired transitions unaided.
- The 2–4 minute duration remains a playtest target, not a forced timer or a measured property of these openings.
- Initial replay is identical. Constrained variants are later work, not a substitute for validating these designs.

## Implementation Plan

### 1. Authored Scenario Contract

Description: After design approval, define fixed opening data, explicit original home IDs, disclosed faction rules and a minimal isolated playtest launch path. Keep production generated matches unchanged. Verify scenario compilation, no inherited Home preferences, exact replay and save/restore. Obtain a mockup approval before any new production launcher or briefing UI. Do not add a general scenario editor or new combat mechanics.

### 2. Bridgehead Prototype

Description: Depends on slice 1. Add the ten-city, two-crossing opening and its briefing. Verify legal staging and both crossings; observe real AI pressure and only add focused staging/rear-defense improvements if necessary. Human-playtest western concentration and eastern flanking, including recovery after losing PW. Completion requires useful enemy responses and distinct viable choices, not merely a rendered map.

### 3. Factory Gamble Prototype

Description: Depends on slice 1; evaluate after Bridgehead to avoid tuning both simultaneously. Add the nine-city mountain/Factory opening and briefing. Verify the documented legal and blocked orders, current-owner Factory production and recoverability after losing PG. Playtest Factory-first and safety-first; tune exposure and AI contesting without forcing a fixed sequence. No new economy or movement mode.

### 4. Broken Network Prototype

Description: Depends on slice 1 and the existing Defensive Network behavior. Add the ten-city, single-bridge opening, enemy-only upgrade and briefing. Assert actual shared-border connectivity before cut/after cut/after reconnection, shield retention and continued city production. Observe early-rush vulnerability and AI junction protection; add focused network-value scoring only where needed. Verify at least two plausible approaches and a meaningful exploitation window.

### 5. Comparative Playtest and Release Decision

Description: Depends on slices 2–4. Conduct repeated human comparisons with the same baseline controls and record tactical choices, adaptations, duration, readability and cleanup. Revise openings that collapse to the same expansion flow. Only then approve and implement a mockup-reviewed production entry point, if desired, and run the normal unit/build/browser regression suites for changed code. Keep scenarios playtest-only if tactical acceptance is not met; do not ship variety based only on passing geometry tests.

## Open Questions

1. Should these scenarios use fixed starting forces and upgrade presets as proposed, or should the player be able to override them before playing?
2. Should the scenarios initially be accessed through a small Scenarios mode alongside generated matches, or kept in a playtest-only launcher until their tactics are proven?
3. Should replaying an authored scenario remain identical, or should a later version offer small, constrained variations?
