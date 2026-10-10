# Slice 5 — Artillery city

## Approved design

User approved [Artillery mockup revision 1](../../mockups/artillery-city/DESIGN.md) with “looks good. implement it”. Preview stopped and approved sources preserved before production work.

- Compact cannon badge, persistent dashed 90-unit range, subtle nearest-target ring.
- Brief border-to-border shot, impact ring and −1 feedback; no aiming controls. Reduced-motion omits the beam while keeping static impact/loss feedback.
- Muted polygonal regions, 14-unit circles/counters, whole-region controls and proportional single-screen board remain intact.

## Rules

`artillery` is a validated immutable map-authored city feature, not a selectable spawn upgrade. It targets the nearest hostile non-neutral city with positive troops, measured centre-to-centre, including the exact range edge. Range 90; one defender every 2,000 ms; zero is the lower bound. Empty cities retain ownership and continue ordinary production; only troop combat can capture them. Traveling dots are untouched.

Capture transfers firing control and starts a full new cadence after the combat step. Neutral guns do not fire. Idle boundaries are discarded, not banked. Nearest-distance ties use stable city IDs; simultaneous guns fire in stable city-ID then feature-ID order and later guns see earlier losses. Direct centre-to-centre mountain intersection blocks a shot; tangent shots and river shots are allowed.

The shared world step resolves growth → movement/arrivals → combat → Watchtowers → Artillery, substepping at most 50 ms whenever Artillery is present. Live rounds and AI forecasts use identical physics. AI legal-order filtering respects mountains; a feasible captured gun covering a hostile garrison earns its ten-second potential shot-count value in scoring, without free troops or extra damage.

## Siege map and terrain

Authored `siege` scenario: eleven cities, one neutral 14-defender gun at (180,240), and the approved ridge at x211–231/y205–237. Starting cities remain 36; nearby player/enemy outposts have 12 defenders. The mockup's low target count and initially owned gun are replaced with a contested opening. It is appended to authored `MAPS` fixtures and exercised through test fixtures; production Home generates fresh fields and does not yet expose a Siege selector. Playtest balance and viable openings are not established.

Terrain definitions now flow through compiled setups, session/replay, AI worker snapshots, Canvas/SVG previews and saves. The authored siege scenario is not surfaced on generated Home. Mountains are visible and direct blocked orders preserve troops and queues, showing red guides/regions and accessible staging help. **Automatic mountain detours/bent-path movement are not implemented**: use ordinary explicit staging around the ridge. Slice-1 route queries remain pure and reusable. There is no Gatehouse or Portal in this map.

## Persistence and lifecycle

Ownership-aware cadence timers and brief shot records are serializable. Saves validate feature definitions, timer identities/owners/ranges, shot references and terrain; illegal stored terrain transfers are rejected. Legacy saves without Artillery fields remain readable. Pausing/backgrounding grants no shots or catch-up time; restarting/replaying restores original neutral ownership and resets timers/feedback.

## Verification

- 404 unit tests / 52 files; build and diff checks passed.
- 68 Playwright tests passed without retries, including five new Artillery tests: real neutral capture at320/430px, enemy firing and real recapture, full post-capture cadence, pause/restart, zero-garrison ownership followed by troop capture, mountain-blocked orders, authored scenario and paused reload metadata.
- Unit coverage includes range edge, multiple hostile factions, stable target/gun ties, river/mountain shot distinctions, timer save/restore/replay, large/small/live/forecast parity, AI gun value and compact Canvas feedback/scaling/reduced motion.
- Production screenshots captured at320/430px;320px screenshot inspected against approved design.

Limitations: real-iPhone Safari, human map balance/counterplay and broad mountain-routing playtests remain outstanding. Browser gun tests disable AI/growth for exact timing; AI integration is deterministic unit coverage plus the all-map Home/real-AI browser suite. Portals (slice6) are next; Gatehouse remains skipped.
