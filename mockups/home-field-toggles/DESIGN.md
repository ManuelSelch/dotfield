# Home field-feature toggle mockup

- Goal: make the Home “On the field” options compact and directly toggleable.
- Revision: 4
- Status: approved for implementation.
- Approval: user said “looks good. implement it” for revision 4.
- Layout: wrap feature-name pills into compact rows; active options use a pale teal fill and teal border/text; inactive options remain neutral. Six options shown: Industry, River & bridges, Mountains, Artillery, Watchtower, Slow Zone.
- Interaction: each pill is a keyboard-focusable button with `aria-pressed`; clicking toggles it. Fake local state only. Other match controls and map art are illustrative.
- Responsive: pills wrap naturally; on narrow screens the field settings stack above preview and Play stays fixed at the bottom.
- Open for review: whether active-state treatment and pill labels feel clear enough without explicit On/Off buttons.
