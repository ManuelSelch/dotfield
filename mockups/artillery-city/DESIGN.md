# Artillery city — revision 1

Status: approved for implementation.

## Goal
Review an unobtrusive Artillery identity and explain automatic garrison losses using Dotfield's current muted polygonal regions and compact 14-unit cities.

## Presentation and interactions
- 360×480 logical field, proportional mobile/desktop fitting and no page scroll.
- Small cannon badge outside the city counter; subtle 90-unit coverage circle.
- Current nearest eligible target has a faint dashed ring. Brief border-to-border shot and −1 impact feedback every two seconds.
- Yours, Opponent and Neutral ownership links use `?state=player|enemy|neutral`; reload restores that scenario.
- Pause/resume, Fire once, Transfer control and Reset are keyboard-accessible review controls, not proposed gameplay controls.
- Mountain blocks the eastern hostile city; friendly and neutral cities are ignored. Northern target starts with four troops to demonstrate zero defenders without artillery-only capture. Enemy ownership switches targeting to the nearby player garrison.
- No automatic aiming UI or redundant large icon in the city centre.

## Simulation limits and assumptions
Isolated fake data, no production imports/dependencies, combat dispatch, growth, AI, persistence or real map integration. This is a focused siege composition, not a balanced production map. Centre-to-centre range90 and nearest hostile positive-garrison targeting; neutral inactivity. Review control transfers ownership instantly, rather than simulating a capture. Shots do not bank while idle. Reduced-motion omits the beam but retains static loss feedback. Mountain occlusion uses a mock-only sampled rectangle test.

## Questions for review
Does the compact cannon badge read clearly at mobile size? Is the persistent range circle helpful or should it appear only on selection? Is the brief shot/−1 feedback sufficient without clutter?

Approval: user said “looks good. implement it” for revision 1. Persistent range, compact badge and brief shot/loss feedback approved.
