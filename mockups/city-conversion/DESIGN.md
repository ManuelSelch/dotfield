# City conversion controls

- Revision: **1**.
- Review status: **in review**. No approval of these controls has been given.
- Approval evidence: none for this revision. Only **Dock & pulse, revision 1** in [airplane delivery](../airplane-delivery/DESIGN.md) is approved; rejected A/B treatments are not included here.
- Scope: isolated slice 1 control study for [city conversion requirements](../../docs/city-conversion/REQUIREMENTS.md). Plain HTML/CSS/JS, deterministic fake data and disposable local state. No production implementation, dependencies, settings, requirements or shared package changes.

## Design question

Can a compact three-action city bar coexist with normal ground dragging while making explicit air dispatch clear on phone and desktop? Review conversion cost readability, disabled reasons, Fly targeting and cancellation. The user confirmed all eight recommended rule defaults during this task. This review concerns control layout and interaction, not reopening those rule decisions.

## Layout and visual language

- Small top-down six-city board, muted green/teal player palette, terracotta enemy, blue-grey river and faceted mountain. City circles use the current **14 logical-unit radius** in a 360-unit board, not larger combat/hit geometry.
- City buttons have 44 CSS px hit areas even where circles are smaller. Board regions also accept taps/drags; river/mountain/outside taps do not select a city.
- Compact bottom-of-board bar: selected city/type/garrison; Production / Defender / Airfield; short availability reason; plane state and Fly / Ground actions. No confirmation dialog, long press, nested menus or management sheet.
- Bar lives in normal document flow so narrow/short viewports can scroll without obscuring the field. Mobile safe-area inset is included beneath controls. All action controls are at least 44 CSS px high.
- Same layout centered at desktop width; no alternative A/B layout. Tab/focus states remain visible, all cities are native keyboard buttons. Reduced motion suppresses travel transitions and decorative pulse expansion, not fake count updates.

## Interactions

- Tap an owned city/region, then choose another type for immediate fake conversion. Current type is highlighted and cannot charge again. Prices are visible even when unaffordable.
- Confirmed initial prices (simulated here): Production **10**, Defender **20**, Airfield **30**; preserve one troop, no refund. New Airfield shows preparing; new Defender shows no invented shield charges. Production/growth and preparation clocks are not simulated.
- Ready Airfield: **Fly → target tap** to any distinct city, including enemy/neutral and across geography. **Cancel** or **Escape** exits without boarding. Plane capacity **100** is the confirmed initial tuning;  launch boards up to capacity, leaving one garrison troop.
- Busy Airfield displays its phase; Fly is unavailable until ready, conversion is unavailable while away/unloading/returning, but ordinary ground dispatch remains available. These restrictions match the confirmed initial implementation defaults.
- Ground drag from an owned region shows a dashed guide and dispatches on release; drag never opens conversion or launches a plane. A simple 8px movement threshold separates tap/drag. Ground crossing of this illustrative river is blocked; no automatic detours.
- Desktop click-to-click ground order: select city → **Ground…** → target; **G** is a shortcut. Enter/Space activates focused cities/actions. **Escape** cancels targeting first, then closes the bar; close/cancel restores source-city focus. Target mode puts focus on another city for keyboard navigation.
- Enemy/neutral cities cannot open management; their native buttons expose `aria-disabled` outside targeting, remain navigable for city information, and become valid flight/ground targets in targeting mode.
- Outside tap closes selection; water/mountain taps cancel selection/targeting without spending troops. Ownership-loss review state clears actionable selection. No opening/dismissing tap passes through to conversion/launch.
- Illustrative successful flight docks at target edge, applies five-troop city pulses (final partial batch if needed), then returns empty. No ground dots, orbit or drop effect. Cargo is separate from garrison. This reuses the approved treatment, not its source or the full combat simulation.

## Direct review states

Use the shared existing `mockups/` Vite workspace. Feature slug: **`/city-conversion/`**. Parent session owns preview startup; this task starts no server and assumes no port.

| URL suffix | Review focus |
| --- | --- |
| `?state=production` | Orchard selected, instant type conversion, visible prices/current type |
| `?state=poor` | 12 troops: current Production, Defender/Airfield unavailable |
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
- Verification is **JavaScript syntax and source checks only**. No server, HTTP serving check, browser automation, screenshots, visual review, interaction execution or device testing was performed by this task. Parent session handles preview and user review.

## Approval checkpoint

Ask after user review: **“Approve this revision for implementation, or continue iterating?”** Record explicit approval and exact revision here before production controls. Do not infer approval from the previously approved delivery style, a planning request or this handoff. Gameplay defaults are confirmed; production controls still require this visual approval.
