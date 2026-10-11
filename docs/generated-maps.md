# Generated matches

The approved revisions in `mockups/random-map/` replace carousel map selection. Home omits introductory headline/subtitle copy; compact settings leave room for the generated preview. Reroll sits beside Play, which generates a new field instead of launching the preview. These decisions supersede the fixed-map Home and reload-reset preference descriptions in the original roadmap.

## Match setup

- Total cities: 6–30, including one starting city for the player and each of 1–4 enemies.
- Map Industry: On adds 1–4 neutral Factories (rounded total cities / 6, capped by neutral count). Off omits neutral Factories. This differs from the faction Industry upgrade, which increases that faction's production by 25%.
- Mountains: On by default. On adds a central ridge that blocks direct orders and Artillery shots; Off omits the central ridge. Cities are repositioned around the ridge when enabled, preserving legal city-to-city staging. The mountain has no text labels.
- Artillery: Off by default. On adds exactly one neutral 14-defender Artillery city with 90-unit range and an additional small mountain ridge, clear of city circles and the central ridge, to create shot-blocking opportunities. Artillery selection persists with the other match settings and both ridges accompany the generated round/save.
- Watchtower: Off by default. On places one Watchtower on a seeded-random city from the full field; its current owner controls it, and a neutral Watchtower is inactive until captured.
- Slow Zone: Off by default. On places one 90-unit, 50%-speed zone on a seeded random city; the host's current owner controls it, while a neutral host slows both sides.
- Introductory Home title/subtitle and helper captions are omitted. Match settings remain directly labelled; segmented selectors are compact, with Reroll beside Play.
- River & bridges: On creates a horizontal river with exactly two aligned, disjoint, paired-city crossings. It is independent of Mountains; each feature can be switched on or off. Manual bank staging is unchanged.
- The fresh Home default is the approved larger 14-city field; the existing 6–30 city control remains.
- Your upgrades and Enemy settings are initially collapsed. Enabled counts appear in summaries. Each enemy has independent Balanced/Aggressive/Defensive behavior and Industry, Factory and Capture shield selections. Watchtower and Slow Zone are shared field settings, not faction upgrades.
- Hidden enemy selections are remembered if their count is increased again, but only active factions are compiled into a round.
- Settings are saved under `dotfield.match-preferences.v1`; missing, malformed or inaccessible storage falls back safely. Map-feature flags (Mountains, Artillery, Watchtower and Slow Zone) are required fields; older preference JSON without them falls back to defaults. No backend or progression.
- Home does not run simulation or AI. The preview shows generated field features, including Watchtower and Slow Zone coverage.

## Generation and lifecycle

`src/board/generateMap.ts` is a pure, seeded generator. A jittered stratification bounds generation and farthest-point sampling spreads cities; dense layouts support up to 30 cities. When Mountains is On, interior slots shift around the central footprint; legal-order graph tests cover both Mountain states and ensure all generated cities remain reachable by manual staging. Farthest-point sampling spreads sparse fields and faction starts; every faction starts with 36 troops. River bridge pairs share an x coordinate, have formation/water clearance and 64-unit width, and are checked by the same `createRiver` validator used by simulation and saved rounds. Two bridge pairs ensure bank connectivity even at the smallest supported count. Artillery adds a second non-overlapping mountain ridge.

- Reroll changes the preview only.
- Play generates another layout, using the selected settings; it does **not** play the preview.
- Restart and Play again reuse the exact compiled opening, upgrades, AI, river, mountain terrain and units, without rerolling or stacking effects.
- New map is available in pause and results. It generates another layout with the current round's frozen preferences, starts a fresh session, and disposes the old adapter/listeners.
- Round saves retain the exact compiled opening and live state, plus seed and generation preferences. Reload resumes the same field and pause state without closed-time growth. Older authored-map saves remain readable.
- Corrupt generation metadata is discarded without preventing an otherwise valid round from resuming.
- Home abandons the saved round but keeps setup preferences. Clearing site data removes both preferences and saves.

## Responsive layout

Desktop puts settings left and preview right. At widths up to 760px, settings come first, compact feature toggles share their label row, and the preview follows. Home's content scrolls internally, while adjacent Reroll and Play actions stay fixed at the bottom with safe-area padding. Bottom clearance prevents the preview from being hidden under the action row. Bridge decks use the reviewed warm, rounded mockup styling with inset rails; their validated 64×38 footprint and river-only overlap stay unchanged. The battlefield itself remains non-scrolling and unchanged.

## Verification and limitations

Unit checks enumerate every city/enemy/river combination across 20 seeds, checking IDs, counts, equal starting forces, bounds, clearance from both ridges, river validation, Factory/Artillery placement and reachability by legal direct orders. Browser tests cover mobile/desktop settings, inactive factions, actual compiled upgrades, preference reload, generated-round reload, reroll, restart, pause/results New map, keyboard controls, and fixed-button reachability. Geometry-specific legacy regressions load authored scenarios through the real save boundary rather than a hidden production carousel.

Generation guarantees playability constraints, not tactical equality, ideal neutral access, or a target match duration. Real iPhone Safari/safe-area behavior and human balance/readability still require playtesting. Difficulty remains separate and is not introduced here.
