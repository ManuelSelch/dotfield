# Home upgrade-card mockup

- Goal: apply compact toggle controls to faction upgrades while retaining the first benefit text.
- Revision: 3
- Status: approved for implementation.
- Approval: user directed “for the upgrades use the same toggle component as for the 'on the field' features. remove the descriptions.”
- Design: compact clickable pills identical to field-feature toggles; selected pills use pale teal fill and teal border, with `aria-pressed` state. The entire pill toggles. No descriptions.
- Copy: display upgrade names only. Factory is omitted from faction upgrades per current Home settings direction.
- Demo: player Industry and Capture shield; enemy Capture shield. Counts update locally. No persistence or game behavior.
- Responsive: pills wrap to additional rows as needed at all widths.
- Scope note: mockup shows Industry and Capture shield for the player and Capture shield for an enemy; local toggle state only.
