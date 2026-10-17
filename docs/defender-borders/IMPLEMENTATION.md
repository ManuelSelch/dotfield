# Defender borders — implemented behavior

This contract supersedes the planning document's pending status and open-policy recommendations. All four recommended policies were confirmed by the user, followed by explicit revision1 mockup approval. Slices1–6 are implemented; slice7 automated verification is complete, with human tactical/device playtests still pending.

## Rules
- Existing Defender role, price20, no production, shield recharge one/10 active seconds and capacity3 are unchanged. Network/Capture Shield share the established pool; depleted or zero-garrison owned Defenders still block transit.
- Every non-neutral Defender blocks other factions' direct ground routes intersecting its full logical Voronoi region. Friendly passage and direct attacks on that Defender remain legal; targeting it does not exempt another blocking Defender earlier on the route. Neutral Defenders are inactive.
- Queries use the actual border-to-border centerline in the fixed360×480 field. Positive-length interior or boundary intersection blocks; isolated vertex/endpoint tangency does not. Stable city-ID ties identify the first blocker. Adjacent regions do not provide a seam exploit.
- River-bank clipping, paired bridge orders and mountain restrictions remain in force. There is no automatic detour or retargeting. Artillery/Watchtower and Defensive Network adjacency are unchanged. Aircraft bypass borders.
- Building, conversion and capture update access immediately. Newly illegal queued batches are cancelled, with troops remaining at source and no automatic resume. Already-launched batches finish their committed route. At simultaneous ground launch/capture, the established physical scheduler processes launches before arrivals; those batches are committed.

## Shared implementation
- `src/game/territoryRegions.ts` and `regionClip.ts` own screen-independent geometry; rendering and network adjacency reuse the same clipping. A bounded geometry cache depends on positions/river, not ownership or counts.
- `defenderBorders.ts` returns the first hostile blocker. `groundAccess.ts` composes terrain, river and Defender checks and cancels blocked reservations.
- Public dispatch, conversion, capture, launch validation, forecast replay, AI mobility/strategic distances and stale worker application share these rules. Queues are cancelled at each capture, so capture/recapture at the same timestamp cannot revive them.
- Existing saves gain blocking on load: preserve airborne batches, cancel blocked queues without garrison deductions, retain exact roles/opening/relay/shields. No new saved role or policy flag. Restart uses the saved opening with current blocking rules. Existing strict terrain/river validation remains unchanged.
- AI can attack feasible blockers, stage along legal legs and use aircraft when ground access is blocked. Successful breach forecasts receive a bounded bonus for opened routes. Multiple self-built Defenders are permitted only with marginal route denial and an exposed front; preserve at least two producers and two-thirds production, original-home safety and unrelated role limits. These heuristics are not a guarantee of optimal fortification or enemy behavior.

## Approved visuals and controls
Revision1 in `mockups/defender-borders/` approved explicitly: “looks good. implement it”. Owned mockup server stopped and listener/process absence checked before production edits; sources preserved.

Owner-coloured reinforced region edges with pale segmented detail distinguish active Defenders from network and Relay markings. Invalid routes/target regions turn red; an intersection cross and visible, accessible first-blocker feedback say to attack it or stage around it. Keyboard focus restoration retains a rejected-order explanation. Aircraft targeting suppresses ground-only invalid feedback. Existing five-icon66px strip,12px gap and Canvas reservation remain unchanged. Logical field edges are projected rather than extending the fortified border into decorative viewport margins. No new controls or animations.

## Verification and limitations
- 804 unit tests /96 files,128 serial Chromium browser tests,2 production PWA tests, TypeScript/production build pass.
- New deterministic coverage includes geometry/tangency/seams, friendly and independent hostile factions, river projections, gaps, commands and stale actions, immediate conversion/capture cancellation, launch-before/at/after capture, conservation, legacy restoration, live/forecast equality, worker parity, useful second-Defender construction and producer safeguards.
- Real application tests exercise keyboard/mouse/touch blocked orders, direct attacks/open-end staging, two-Defender border, Relay coexistence, aircraft delivery, pause/reload/restart and stable Canvas/resolution/66px strip at320/430/1280px.
- Generated Courtyard30 seed42 regression verifies an actual western-pass Defender blocks the southern cross-corridor and remains attackable. This proves legality, not economy-first balance or a sealed border on every seed.
- Human tactical playtesting against ordinary/upgraded opponents,20/24/30 density readability, round duration and actual iPhone Safari/installed-PWA testing remain pending. No balance tuning or guaranteed defensibility claims.
