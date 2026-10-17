# Courtyard Home selector — revision 2

- Status: IN REVIEW. User requested implementing Courtyard generation; selector controls remain under review before production UI changes.
- User feedback: move River & bridges and Mountains into Layout; rename River & bridges to River.
- Layout is now a single-choice 2×2 picker: Open field / River / Mountains / Courtyard. Standard is replaced by explicit terrain recipes. River and Mountains toggles are removed from On the field; only Factory and Slow Zone remain there.
- Open field: no river/mountains. River: two paired crossings, no mountains. Mountains: central ridge, no river. Courtyard: multiple mountains plus two river crossings. Combining River and Mountains separately is replaced by Courtyard in this proposed UI; user review is pending.
- Open/River/Mountains retain existing 6–30 city and 1–4 enemy limits. Proposed Courtyard constraints: 20–30 cities and exactly one enemy. On selection, clamp cities up to20 and set one enemy; incompatible enemy buttons remain visibly disabled with explanation.
- Leaving Courtyard restores previous regular city/enemy settings. Factory/Slow Zone remain independent. Production should preserve inactive faction upgrades and AI settings.
- Initial mockup selection: Courtyard with24 cities. Production default selection/migration policy must be determined during implementation; legacy combined river+mountain preferences should not be silently interpreted as a proven equivalent Courtyard layout.
- Preview shows fixed neutral cities and exactly two owned starts. Courtyard city is ordinary: NO relay marker, scoreboard or alternative victory condition in this increment. Existing conquest rules apply.
- Other layout previews explicitly show placeholders in this controls study; no new generator implementation is implied.
- Reroll/Play are explanatory mock controls. No combat, random generation, persistence or AI. Upgrades/AI sections are placeholders for existing controls.
- Responsive: settings left, preview right on wide screens; stacked on mobile. Layout buttons form two columns with visible focus. Reuse existing production style conventions during implementation.
- Production Courtyard intent: reserve enclosing ridges, both entrance cities, side valleys, paired crossings and separate starts; seeded bounded variation; exact requested city count; terrain clearance, legal staging connectivity and comparable access checks.
- Approval: pending explicit review of revision 2. User's “continue” during this mockup edit authorizes completing the revision, not unreviewed production changes.
