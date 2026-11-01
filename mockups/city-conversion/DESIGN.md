# City conversion controls

- Revision: **6**.
- Review status: **approved**, revision6. User explicitly replied “looks good. implement it” to the icon-picker preview. This approves five visible icon/cost buttons, separate Fly/Cancel, no scrolling or close button, fixed66px card and12px map gap. User approved the gameplay proposal (“yes implement it just like that”): Watchtower30, Artillery40, exclusive nonproducing roles, existing150range/cadence mechanics, fresh cooldown after build/capture, migration of attached weapons, replacement of Home weapon toggles and AI production safeguards. Revision4’s single-row layout was approved and implemented; this preview extends only the role picker.
- Approval evidence: user replied “yes approved” to the revision 1 preview and explicit implementation-approval question. This covers the compact conversion bar, Fly/target/cancel flow and associated reviewed states. **Dock & pulse, revision 1** in [airplane delivery](../airplane-delivery/DESIGN.md) remains separately approved; A/B treatments remain rejected.
- Cleanup: revision 1 preview PID57952 stopped and verified previously. Revision 2 Vite PID15630 was verified against command, workspace and listener, stopped gracefully, process/listener absence confirmed and runtime record removed before production work. Revision 4 Vite PID24462 and revision6 Vite PID35516 were verified against their command/workspace, stopped gracefully, process/listener absence confirmed and runtime records removed before production implementation. Approved sources preserved.
- Scope: isolated slice 1 control study for [city conversion requirements](../../plans/city-conversion/REQUIREMENTS.md). Plain HTML/CSS/JS, deterministic fake data and disposable local state. No production implementation, dependencies, settings, requirements or shared package changes.

## Design question

Can a compact three-action city bar coexist with normal ground dragging while making explicit air dispatch clear on phone and desktop? Review conversion cost readability, disabled reasons, Fly targeting and cancellation. The user confirmed all eight recommended rule defaults during this task. This review concerns control layout and interaction, not reopening those rule decisions.

## Layout and visual language

- Small top-down six-city board, muted green/teal player palette, terracotta enemy, blue-grey river and faceted mountain. City circles use the current **14 logical-unit radius** in a 360-unit board, not larger combat/hit geometry.
- City buttons have 44 CSS px hit areas even where circles are smaller. Board regions also accept taps/drags; river/mountain/outside taps do not select a city.
- Single-row card: five local SVG icons (factory, shield, airplane, tower, cannon), unselected costs10/20/30/30/40 beneath, and optional separate Fly/Cancel. All five choices remain visible without scrolling. Current role is highlighted; its subtitle is a checkmark or compact live-state label (Ready/Away/Target, shield recharge,4/s or3/s). Names, prices and full status are available in desktop tooltips and accessible button labels. No header, extra row, Ground or close button; tap outside/Escape clears selection.
- Five role buttons have minimum44px width and48px height. Optional Fly/Cancel is44px wide with a44px hit height. Card horizontal padding6px and gaps2px permit all six controls within a288px-wide card on a320px phone. Mockup card now aligns with the map’s full width.
- Card remains66px plus safe area with the permanent12px map gap. Every state reserves identical space; scrolling never moves/resizes the map. Status stays in the selected type button (Current, shield recharge, aircraft phase,4hits/s Watchtower,3shots/s Artillery). Fuller details remain accessible/title text. No weapon firing is simulated; existing fake conversion spending and flight flow are retained.
- Same layout centered at desktop width; no alternative A/B layout. Tab/focus states remain visible, all cities are native keyboard buttons. Reduced motion suppresses travel transitions and decorative pulse expansion, not fake count updates.

## Interactions

- Tap an owned city/region, then choose another type for immediate fake conversion. Current type is highlighted and cannot charge again. Prices are visible even when unaffordable.
- Confirmed initial prices (simulated here): Production **10**, Defender **20**, Airfield **30**; preserve one troop, no refund. New Airfield shows preparing; new Defender shows no invented shield charges. Production/growth and preparation clocks are not simulated.
- Ready Airfield: **Fly → target tap** to any distinct city, including enemy/neutral and across geography. **Cancel** or **Escape** exits without boarding. Plane capacity **100** is the confirmed initial tuning;  launch boards up to capacity, leaving one garrison troop.
- Busy Airfield displays its phase; Fly is unavailable until ready, conversion is unavailable while away/unloading/returning, but ordinary ground dispatch remains available. These restrictions match the confirmed initial implementation defaults.
- Ground drag from an owned region shows a dashed guide and dispatches on release; drag never opens conversion or launches a plane. A simple 8px movement threshold separates tap/drag. Ground crossing of this illustrative river is blocked; no automatic detours.
- Ground orders remain available via dragging (and existing desktop/keyboard behavior in production); no separate Ground button or G shortcut in the study. Enter/Space activates focused cities/actions. **Escape** cancels flight targeting first, then clears selection without collapsing the reserved strip. Close/cancel restores source-city focus.
- Enemy/neutral cities cannot open management; their native buttons expose `aria-disabled` outside targeting, remain navigable for city information, and become valid flight/ground targets in targeting mode.
- Outside tap closes selection; water/mountain taps cancel selection/targeting without spending troops. Ownership-loss review state clears actionable selection. No opening/dismissing tap passes through to conversion/launch.
- Illustrative successful flight docks at target edge, applies five-troop city pulses (final partial batch if needed), then returns empty. No ground dots, orbit or drop effect. Cargo is separate from garrison. This reuses the approved treatment, not its source or the full combat simulation.

## Direct review states

Use the shared existing `mockups/` Vite workspace. Feature slug: **`/city-conversion/`**. Parent session owns preview startup; this task starts no server and assumes no port.

| URL suffix | Review focus |
| --- | --- |
| `?state=production` | Orchard selected, instant type conversion, visible prices/current type |
| `?state=watchtower` | Watchtower selected/revealed,4hits/s, no growth; conversion costs visible via scrolling |
| `?state=artillery` | Artillery selected/revealed,3shots/s, no growth; current role cannot charge again |
| `?state=poor` | 12 troops: current Production, other roles unavailable |
| `?state=ready` | Meadow Airfield, 126 garrison, ready plane, proposed capacity 100 |
| `?state=busy` | Plane away, conversion/Fly unavailable, ground still available |
| `?state=preparing` | Preparation label and disabled Fly |
| `?state=returning` | Returning-empty label and busy restriction |
| `?state=targeting` | Explicit Fly target mode with Cancel |
| `?state=lost` | Orchard now enemy; no actionable selection |

The review-state selector updates the URL; reload/Reset restores deterministic data. No persistence. To replay Dock & pulse, reset Ready, choose Fly, then Ridge or a friendly city. Busy/preparing/returning deep links are static samples, not automatic lifecycle progression.

## Fake behavior, limitations and unresolved rules

- All eight recommended defaults were explicitly confirmed: user selected “Yes—use all recommended defaults”. See focused requirements R11. This mockup still uses fake data and simplified mechanics; rule approval does not imply visual approval of these controls.
- No production code imports, application dependencies, API/network calls, storage, Home settings, generated maps, AI, save/replay, upgrades, combat shields, exact terrain legality or pause/round lifecycle. Ground dispatch only subtracts troops and reports a fake order; travel/combat are omitted. Flight combat is intentionally simplified; Defender shields are not simulated. Timing is wall-clock illustration, not deterministic gameplay or approved balance.
- Type badges use compact text glyphs, not final artwork. Delivery glyph/positions are illustrative; no native Safari/PWA assurance. Static busy states omit the away plane's position/cargo.
- Ownership-loss sample demonstrates cleared UI, not a live capture event. No live pause/Home/restart/round-end integration is represented; Reset clears pending illustrative flight timers and state.
- Reduced-motion travel snaps to positions; timed count changes still occur. No per-pulse focus movement; status is a polite live region.
- Revision6 mockup source was syntax checked and served with HTTP200; user explicitly approved the rendered design (“looks good. implement it”). No mockup browser automation or screenshots were used. Production implementation has been completed in the isolated feature worktree; final verification outcomes are recorded in the focused requirements/implementation docs. Real-device verification remains manual.

## Approval checkpoint

Revisions1,2 and4 approved and preserved in Git. Revision5’s scrolling proposal was superseded at user request. Revision6 explicitly approved (“looks good. implement it”): icons/costs instead of text, no scrolling or close button, separate Fly/Cancel. Weapon-role gameplay and prices are already approved; fixed-layout and Dock & pulse behavior remain unchanged.
