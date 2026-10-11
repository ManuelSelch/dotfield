# Home upgrade-card mockup

- Goal: apply compact toggle controls to faction upgrades while retaining the first benefit text.
- Revision: 2
- Status: in review.
- Design: compact horizontal clickable rows with upgrade name and benefit description side-by-side; selected rows use pale teal fill and teal border, with `aria-pressed` state. The entire row toggles. This keeps descriptions visible without the taller two-column cards from revision 1.
- Copy: show only the primary benefit (`+25% production`; `New captures block 3 hostile batches`). Omit the additional qualifier after the separator (`You only`; `Refreshes on recapture`). Factory is omitted per current Home settings direction.
- Demo: player Industry and Capture shield; enemy Capture shield. Counts update locally. No persistence or game behavior.
- Responsive: one compact row per upgrade at all widths; description wraps only if needed on narrow screens.
- Review question: does this card layout keep the benefit descriptions readable while still feeling compact?
