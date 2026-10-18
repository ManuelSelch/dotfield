# Enemy decision dashboard mockup

- Status: draft in review
- Revision: 1
- Goal: show an enemy AI decision trace in a compact, readable panel without taking over the game board. The mockup focuses on the minimum useful info: chosen order, top candidates, forecast window, and the reasons the chosen action won.
- Layout: desktop uses a left field + right decision panel; mobile collapses to one column while retaining the same priority order: board, chosen action, top candidates, decision log.
- Core interactions: device toggle between desktop and mobile, no real logic attached; all values are illustrative.
- Included states: one active attack choice, top candidates, a score breakdown, and a short reason log. The design is intentionally static and does not simulate AI re-evaluation.
- Important omissions: no live updates, no real game state, no persisted history. This is a UI concept for review, not production gameplay.
- Questions to review: is the compact score card enough, or should the chosen action be paired with more per-candidate rollback reasons? Should the mobile view keep the same field preview or switch to a more text-first list?

## Approved scope

This mockup is intentionally a static UI design study and should be treated as disposable review material until explicit approval is given.
