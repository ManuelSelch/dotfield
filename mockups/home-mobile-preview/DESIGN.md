# Mobile preview-first Home mockup

- Goal: make the generated map the first and dominant element on mobile; user explicitly requested no summary label.
- Revision: 2
- Status: in review.
- Mobile layout: compact brand header, map preview first, inline expandable Customize match section beneath it, fixed Reroll and Play footer. No summary chips/label below the preview and no popup/modal.
- Customize interaction: expands settings in normal document flow beneath the map; city/enemy controls, field-feature pills, Your upgrades and Enemy settings scroll with the page. Sample values and map are illustrative; state is not persisted or wired to map generation.
- Desktop layout: settings remain alongside the map; inline mobile customization section is hidden.
- Responsive: uses dynamic viewport height and safe-area insets; compact-height adjustment keeps map and actions visible.
- Review focus: whether the map-first page and inline customization section work without a popup or summary label.
