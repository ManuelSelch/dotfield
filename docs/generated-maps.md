# Generated matches

The approved revision 4 in `mockups/random-map/` replaces carousel map selection. These implemented decisions supersede the fixed-map Home and reload-reset preference descriptions in the original roadmap.

## Match setup

- Total cities: 6–24, including one starting city for the player and each of 1–4 enemies.
- Map Industry: On adds 1–4 neutral Factories (rounded total cities / 6, capped by neutral count). Off omits neutral Factories. This differs from the faction Industry upgrade, which increases that faction's production by 25%.
- City/enemy/feature titles stay visible; explanatory helper captions and the derived faction/neutral count line are omitted.
- Every generated map includes a central mountain ridge. Direct orders and Artillery shots through its footprint are blocked; players and AI must stage city by city around a flank. The ridge has no text labels.
- River & bridges: On adds a horizontal river with exactly two aligned, disjoint, paired-city crossings. Off leaves the mountain ridge in place and permits orders across the field where they do not hit it. Manual bank staging is unchanged.
- Fresh Home defaults use the accepted larger 14-city field; the existing 6–24 city control remains available.
- Your upgrades and Enemy settings are initially collapsed. Enabled counts appear in summaries. Each enemy has independent Balanced/Aggressive/Defensive behavior and Industry, Factory, Slow Zone, Watchtower and Capture shield selections.
- Hidden enemy selections are remembered if their count is increased again, but only active factions are compiled into a round.
- Settings are saved under `dotfield.match-preferences.v1`; missing, malformed or inaccessible storage falls back safely. No backend or progression.
- Home does not run simulation or AI. The preview shows generated map features, not starting-city upgrade effects.

## Generation and lifecycle

`src/board/generateMap.ts` is a pure, seeded generator. A jittered 24-slot stratification bounds work and guarantees at least 58 logical units of city separation. Interior slots shift around a fixed central mountain footprint, keeping all cities clear while preserving west/east staging lanes. Tests verify generated cities remain connected through legal direct city orders and paired crossings. Farthest-point sampling spreads sparse fields and faction starts; every faction starts with 36 troops. Bridge pairs share an x coordinate, have formation/water clearance and 64-unit width, and are checked by the same `createRiver` validator used by simulation and saved rounds. Two bridge pairs ensure bank connectivity even at the smallest supported count.

- Reroll changes the preview only.
- Play new map generates another layout, using the selected settings; it does **not** play the preview.
- Restart and Play again reuse the exact compiled opening, upgrades, AI, river, mountain terrain and units, without rerolling or stacking effects.
- New map is available in pause and results. It generates another layout with the current round's frozen preferences, starts a fresh session, and disposes the old adapter/listeners.
- Round saves retain the exact compiled opening and live state, plus seed and generation preferences. Reload resumes the same field and pause state without closed-time growth. Older authored-map saves remain readable.
- Corrupt generation metadata is discarded without preventing an otherwise valid round from resuming.
- Home abandons the saved round but keeps setup preferences. Clearing site data removes both preferences and saves.

## Responsive layout

Desktop puts settings left and preview right. At widths up to 760px, settings come first, feature toggles share their label row, and the preview follows. Home's content scrolls internally, while Play stays fixed at the bottom with safe-area padding. Bottom clearance prevents the preview's last controls from being hidden under Play. The battlefield itself remains non-scrolling and unchanged.

## Verification and limitations

Unit checks enumerate every city/enemy/river combination across 20 seeds, checking IDs, counts, equal starting forces, bounds, clearance from the mountain, river validation, Factory placement and reachability by legal direct orders. Browser tests cover mobile/desktop settings, inactive factions, actual compiled upgrades, preference reload, generated-round reload, reroll, restart, pause/results New map, keyboard controls, and fixed-button reachability. Geometry-specific legacy regressions load authored scenarios through the real save boundary rather than a hidden production carousel.

Generation guarantees playability constraints, not tactical equality, ideal neutral access, or a target match duration. Real iPhone Safari/safe-area behavior and human balance/readability still require playtesting. Difficulty remains separate and is not introduced here.
