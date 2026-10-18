# Enemy decision dashboard mockup

- Status: revision 3 approved for production implementation.
- Goal: let the player inspect a compact enemy-AI decision trace without permanently taking over the game field.
- Desktop: a small `AI` header control toggles the dashboard. When open, the panel is docked to the right of the map; when closed, the map uses the available width.
- Mobile: the same control opens a scrollable bottom-sheet overlay over the map, with a dimmed backdrop. The map does not reflow. Close with the close button, backdrop, toggle, or Escape.
- Initial state: closed, so the field remains unobstructed until requested.
- City identification: assign match-stable display numbers once per map, ordered top-to-bottom then left-to-right. Source/target labels combine faction ownership and city number, e.g. `Enemy 1 · City 8` → `Neutral · City 11 (Relay)`. Ownership changes do not renumber cities. The selected route's numbered callouts appear on the map only while the dashboard is open, avoiding permanent map clutter.
- Dashboard content: illustrative selected action and score, source/target, score factors, forecast bars, top candidates, and decision notes. Data is static and fake; there are no live AI hooks or saved history.
- Accessibility: toggle exposes expanded state and controlled panel; mobile uses modal dialog semantics, focus moves to the title, and close returns focus to the toggle. Reduced-motion preference is respected.
- Responsive behavior: CSS switches at 760px. Intended review sizes include a narrow phone and a wide desktop; the browser viewport itself determines layout.
- Review question: does the stable numbering plus temporary matching map callouts make source/target locations clear without permanent labels?

## Revision history

- Revision 1: initial static dashboard concept.
- Revision 2: added responsive desktop docking/mobile overlay, small toggle, initially closed state, keyboard/backdrop close behavior, and styling.
- Revision 3: replaced placeholder directions with stable per-match city numbers and matching temporary map callouts.

## Approval

Revision 3 approved by the user: “yes looks good. Now start simple with the first step implementing the enemy dashboard in the real game.” This authorizes a small first production slice, not necessarily every static detail in the mockup.
