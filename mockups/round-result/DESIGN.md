# Round result overlay

- Goal: simplify the battle-end popup for Victory and Defeat.
- Revision: 1
- Status: in review.
- Content: result title only; omit generic flavor/detail copy.
- Actions: icon-only replay (↻) and Home (house); remove New map. Accessible names and native tooltips remain (`Play again`, `Home`). Replay is visually primary.
- Context: compact centered overlay over the battle map; defeat uses a restrained warm accent. Switch result via `?state=victory` and `?state=defeat`.
- Interaction: icons are illustrative controls, no game state changes. No production code changed.
- Review question: are replay and Home icons clear enough without visible text?
