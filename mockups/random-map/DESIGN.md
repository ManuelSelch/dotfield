# Random-map match setup

## Goal and scope

Show generated-map choices in Dotfield's existing Home screen and let the player independently enable a central mountain range. Isolated HTML/CSS/JS prototype; no production changes yet.

## Revision

9 — approved for implementation. Adds a separate Mountains On/Off choice to the existing field-feature controls and reflects it in the map preview. Artillery-specific terrain is outside this change.

## Layout and interactions

- Preserve the approved compact Home layout: settings left and preview right on desktop; settings first and preview below on mobile; fixed Reroll/Play actions on mobile.
- The fresh-field default is 14 cities, matching the approved larger map. City count remains 6–24; enemies remain 1–4.
- On the field choices are Industry, River & bridges, Mountains and Artillery, each with independent On/Off controls. Mountains defaults On to retain the current generated-map behavior.
- Mountains Off removes the central ridge from the preview while leaving the river/bridge and other settings unchanged. Mountains On shows the faceted, unlabeled ridge and cities arranged around its footprint.
- Artillery controls and any Artillery-specific terrain are unchanged by this revision.
- Feature summaries reflect the chosen state. The preview changes when settings change; Reroll changes the illustrative layout. Play, simulated combat, and persistence are not implemented.
- Preserve compact controls, keyboard focus visibility, current palette, and no labels printed on the mountain itself.

## Fake or omitted behaviour

- Seeded jittered city layouts and clipped polygons are illustrative only. They do not prove fair starts, valid bridge staging, route clearance, connectivity or production generation constraints.
- The mockup illustrates the central ridge toggle only. It does not model terrain routing, AI, combat, save data or persistent preferences.
- Feature and upgrade selections are local page state. No real city generator or gameplay effects are simulated.
- The mobile layout is an HTML approximation, not proof of native Safari or installed-app behavior.
- No browser automation, screenshots, or agent visual review performed; serving was confirmed with a lightweight HTTP check.

## Approval

Approved revision 9. Evidence: the user said “ignore the artillery. (Another agent on another worktree already removes this artillery shot-blocking ridge). implement it”. Implement only the Mountains feature flag and its generated-map behavior; do not modify Artillery-specific behavior.
