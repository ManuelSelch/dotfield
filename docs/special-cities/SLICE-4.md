# Slice 4 — Contested Factory

Gatehouse (slice 3) is skipped for now. The user waived a mockup and authorized direct implementation.

## Rules

- Every Factory benefits its current non-neutral owner, including captured starting-city upgrades and all AI factions.
- Production remains 2× local base production, stacking with the current owner's Industry (2.5 units/second), capped at 50 automatic-production troops. Neutral Factories do not grow; combat still resets fractional growth on capture.
- The starting-city Factory upgrade does not duplicate an already-authored Factory. One name, multiplier and badge.
- Old saves containing `beneficiaryId` remain readable; that legacy field does not restrict production. Pause/restore retains current ownership; replay restores the original map ownership and features.
- Canvas badges and accessible labels show captured Factories active and neutral Factories inactive. Home previews show the same Factory silhouette.
- AI values the extra production of capturable Factories over a short scoring horizon, after normal forecast feasibility checks. It receives no production or routing exceptions.

## Separate scenario

The seventh preview (`foundry`, 8 cities) adds two open bridges and one 14-defender neutral Factory at the western north endpoint. Both factions start with 36 troops and have legal 100-field-unit opening attacks on it: the enemy along its bank, the player from the paired southern endpoint. Border travel and staggered batches are identical for both attacks. The eastern crossing offers a flank. No Gatehouse locks or automatic forwarding; all six earlier map layouts are unchanged.

Equal opening travel costs do not establish overall balance. Human playtesting of Factory rush versus expansion/flanking, AI competence and round duration remains outstanding.

## Verification

Unit tests cover capture/recapture, fractional reset, neutral production, multiple factions, Industry/cap, upgrade deduplication, legacy/new save restoration, replay, real river capture batches, forecast parity, AI preference and accessible/badge activity. Browser tests cover Factory capture with real batches at 320/430px, paused growth, restart, the home preview, river save/reload and selection of all seven maps.
