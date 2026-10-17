# Courtyard Home selector — revision 1

- Status: IN REVIEW. Courtyard map concept B and compact scoreboard have positive user feedback; user explicitly requested implementing Courtyard as a generator layout option. This control mockup resolves the new Home selector and incompatible-setting policy before production UI changes.
- Scope: add a Standard / Courtyard segmented choice under Your match. Existing city/enemy/field controls remain in place.
- Standard stays the default and retains 6–30 cities, 1–4 enemies and independent field toggles.
- Proposed Courtyard constraints: 20–30 cities, exactly one enemy, River & bridges On and Mountains On. Selecting it clamps city count up to20, selects one enemy and enables both terrain features. Disabled controls remain visible, with a short explanation. Factory and Slow Zone remain independent choices.
- Returning to Standard restores its previous city count, enemy count and terrain settings during the editing session. Inactive enemies' upgrade/AI settings must remain retained by production preferences.
- Preview shows neutral cities and exactly two owned starts. The courtyard city is ordinary: NO relay marker, scoreboard, activation timer or alternative victory condition in this increment. Existing conquest rules apply.
- Production generator should preserve two enclosing ridges, two courtyard entrance cities, side valleys, two bridge pairs and separate starts; add seeded bounded variation and neutral filler cities to the exact requested count. Preserve manual staging and existing movement/combat rules.
- Mockup uses a fixed drawing adapted from B; no production generator, randomness, combat, preference persistence or AI. Standard preview intentionally displays an explanatory placeholder rather than implying a changed generator. Upgrades/AI sections are placeholders for unchanged existing controls.
- Responsive: settings left and preview right on wide screens, stacked on mobile. Existing production typography/control styles should be reused; this HTML approximates the Home composition.
- Questions for approval: selector placement; one-enemy/20-city-minimum restriction; required river/mountains; geography-only scope.
- Approval: pending explicit review of revision 1. No production files changed.
