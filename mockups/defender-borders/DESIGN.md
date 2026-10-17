# Defender borders — revision 1

## Scope and status
In review. Isolated HTML/SVG mockup, not production gameplay. Visual approval is pending. Existing Defender identity, icon, cost20, shield recharge/capacity and nonproduction stay unchanged.

## Confirmed policies
User answered “Yes, use all recommended policies” when asked about keeping Defender naming, neutral inactivity, cancelling blocked unlaunched batches while preserving source troops, and applying blocking to old saves while grandfathering launched troops. Aircraft bypass and manual ground staging retained. Geometry recommendation: interior crossing and positive-length boundary travel block; isolated vertex tangency does not.

## Visual proposal
Owner-coloured reinforced region outlines, with small pale crenellation-like gaps, identify active Defenders. Neutral regions have no fortified border. Thin dashed green network indicator and gold Relay city ring remain distinct. Red dashed invalid route and cross identify blocked transit; green dashed direct attack/air route shows allowed counterplay. Existing fixed66px five-icon strip with12px gap; no new gameplay buttons. Full-region interactions are approximated by keyboard-focusable city hit areas in this study.

## Review states
`?layout=courtyard|open&state=blocked|attack|gap|captured|air|neutral|paused|result`.
Courtyard uses fixed production anchor proportions, 20-city illustrative opening and unscaled ridge/river recipe. Open field uses12 regular sites to show a three-Defender border and a middle gap. Select a city for details; friendly cities expose fake role conversions, Airfield exposes Fly. Escape closes selection. States reset local conversions. No persistence or simulation.

## Limitations
Voronoi polygons are local illustrative SVG geometry, not the future shared physics module. Routes/statuses are canned examples, not authoritative intersection checks. Shield counts, garrisons, Relay scores and aircraft are fake. No queue playback, collision, automatic detours, real balance proof, weapon simulation or real production save migration. Network outline is an illustrative thin dashed marker, not a calculated connected-group perimeter. No browser automation or visual verification performed; user review required. No animations.

## Approval
Pending: approve revision1 for implementation or request changes. Production implementation has not begun.
