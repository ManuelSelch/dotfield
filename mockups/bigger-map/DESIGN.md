# Bigger map — revision 1

Status: revision 1 approved. User: “looks good. implement it”. Owned preview process stopped and port listener removal verified before implementation.

## Scope
13 cities on the existing 360 × 480 logical field, no pan/zoom or scrolling. Whole Voronoi regions remain touch targets. Preserve the approved city-region visual language.

- One enemy city north and one player city south, 36 starting units each; 11 neutral cities with 8–20 defenders.
- Staggered symmetric positions create more routes across five intermediate rows.
- City radius 21 (previously 29), count size 17 (previously 21), troop radius 4.8 (previously 7.2), formation spacing 12 (previously 18), all scaled to screen size.
- Circles remain launch/impact borders; region borders do not constrain travel.
- Drag anywhere in a friendly region to another region; keyboard activation and reset retained.

## Review
Check counter readability and density on a narrow phone, plus smaller troop dots during a drag dispatch. `/bigger-map/?state=selection` previews full-region selection.

Fake local combat only: no growth, enemy AI, per-dot collisions, round lifecycle or persistence. Smaller production troop geometry must be shared by rendering and collision simulation, not applied as a cosmetic shrink alone. No production map/difficulty changes until approval.
