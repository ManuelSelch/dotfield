# Generated matches

Home offers a seeded preview with Reroll beside Play. Play starts the displayed field. Restart and Play again retain its exact compiled opening. The approved layout selector is preserved in `mockups/courtyard-setup/` revision2; the Courtyard geography is based on `mockups/relay/` layout B. These contracts supersede older independent River/Mountains toggles and fixed-map carousel descriptions.

## Match setup

- **Layout:** Open field / River / Mountains / Courtyard, in a two-column segmented picker.
  - Open field: neither river nor mountains.
  - River: horizontal river with exactly two paired-city crossings; no mountains.
  - Mountains: existing central ridge; no river. This is the fresh Home default, with14 cities and2 enemies.
  - Courtyard: two ridges enclosing an ordinary neutral city, northern/southern entrance cities, side valleys, two paired river crossings and a third ridge separating the two southern starting areas.
- Open field, River and Mountains support6–30 total cities and1–4 enemies. Courtyard supports20–30 cities and exactly one enemy.
- Selecting Courtyard raises a smaller city count to20 and selects one enemy. Enemy buttons2–4 are visibly disabled; the minimum city range is20. A short explanation states that river and mountains are included. Switching back to another layout restores the last regular city/enemy counts during this Home editing session. That temporary backup is not persisted across reload or leaving Home.
- **On the field:** only Factory and Slow Zone. No separate river or mountain switches.
- Factory adds neutral double-production cities. Regular layouts use the existing rounded cities/6 rule; Courtyard always has two mirrored northern Factory pockets. Off removes these attachments, not their cities. This differs from the faction Industry upgrade (+25% production).
- Slow Zone defaults Off. On adds one seeded random city attachment: radius150, hostile speed×0.5 (neutral hosts slow everyone). The current owner controls it.
- Watchtower and Artillery remain buildable roles; no free weapon cities or Home weapon toggles.
- Your upgrades and Enemy settings stay collapsed initially. Faction upgrades and AI behavior are independent; inactive enemy settings remain remembered but are not compiled into smaller matches.
- Home runs no simulation or AI. Courtyard does **not** add a relay badge, scoring, countdown or alternative victory condition. Winning still requires eliminating the other faction.

## Generation

`src/board/generateMap.ts` remains pure and uint32-seeded. Open/River/Mountains use the existing stratified slot sampling and faction placement, with terrain flags derived from the selected recipe. Every faction starts with36 troops.

`src/board/courtyard.ts` uses a bounded recipe rather than scattering arbitrary mountains:

- Reserve15 strategic anchors: two starts, two supply cities, four bridge endpoints, courtyard, both entrances, both side valleys and both economic pockets.
- Add a northern centerline city for even counts, then mirrored neutral expansion pairs up to the requested total. A seeded shuffle selects available pairs at lower counts. Ordinary cities are not mandatory movement waypoints; any legal direct order is still possible.
- Seeded symmetric horizontal/vertical scaling varies the geometry within94–100% of its authored footprint, around the center of the360×480 logical board. City radius14, troop geometry, movement and combat remain unchanged.
- Mountains use existing immutable, non-touching rectangular barriers. Rendering remains faceted; blocked direct ground orders and Artillery shots use the true rectangles. Aircraft retain existing terrain immunity.
- River position is recipe-specific, below the courtyard. Bridge pairs use stable IDs, aligned x coordinates and64-unit widths, validated with the existing formation-clearance rules.
- North/south entrance orders reach the courtyard without intersecting either ridge; direct side-valley orders into the courtyard are blocked. All cities are reachable by manual city-to-city staging. Mirrored geometry gives both starts equal shortest legal ground distances to the courtyard; this does not prove balanced gameplay.
- Placement is bounded by a finite known-clear candidate set: no rejection loops, unbounded retries or fallback to a different layout. Tests enumerate counts20–30 and30 seeds for count, clearance, connectivity and route-access invariants. The approach preserves the topology instead of making a generic random-terrain generator.
- Two mirrored Factory pockets have14 neutral defenders when Factory is On; otherwise ordinary neutral cities start10. The courtyard starts10 as well. No relay-specific combat strength is introduced.

## Preferences, saves and lifecycle

- Preferences remain under `dotfield.match-preferences.v1`. `map.layout` is optional only for compatibility with old records. New Home settings include an explicit layout and canonical terrain booleans; layout is authoritative during new generation.
- Reading legacy Home settings maps mountains-on (including old combined river+mountain fields) to Mountains, river-only to River, and neither to Open field. It never silently changes an old combined field into Courtyard. Upgrades, city/enemy counts and AI choices remain retained. Old weapon flags are stripped.
- Exact active saved fields, terrain, simulation state, opening, restart and generated metadata remain unchanged when restored. Old generation records without layout remain accepted and preserve their old generation behavior. Only the *next Home setup preferences* are normalized to the new selector, including after returning from a legacy saved round.
- Invalid layout strings and unsupported Courtyard counts/opponents invalidate preferences/metadata through the existing safe validation boundary; missing/corrupt storage falls back safely.
- Reroll changes only the preview. Play compiles that preview with current active faction settings.
- Restart and Play again repeat the exact opening without rerolling or stacking upgrades. Pause freezes the simulation; reload restores the same field and pause state without closed-time growth.
- Home abandons the round and retains setup choices. There is no in-round New map action in the current UI: return Home and Reroll/Play for another field.
- Round persistence stores terrain and city coordinates, so no Courtyard-specific runtime state or save schema is required. Existing authored fixtures remain available for regressions, not through a production carousel.

## Responsive layout and verification

Home keeps settings left and preview right on desktop, stacked with internal scrolling on phones. Layout buttons have44px minimum height, visible keyboard focus and pressed state. Courtyard's disabled faction choices are explained in text. Reroll/Play remain fixed at the bottom on mobile; the battlefield stays non-scrolling.

Unit checks cover all existing generator combinations, named layouts, invalid settings, deterministic Courtyard seeds, city counts, terrain clearance, both courtyard entrances, blocked valley shortcuts, graph connectivity, symmetric legal approach distances, Factory/Slow Zone and immutable snapshots. Browser checks cover the actual mobile/desktop selector, minimum count and enemy guards, restoring regular choices, repeated rerolls,30-city preview, compiled rounds, paused reload and exact restart. Existing conquest, movement, weapons, worker AI and PWA regressions remain applicable.

Human tactical balance, match duration, city density/readability and actual iPhone Safari/installed usability remain unverified. Courtyard AI uses existing terrain-aware staging and conquest priorities; no relay-aware AI is claimed. A future relay objective is separate work.
