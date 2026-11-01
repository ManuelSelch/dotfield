# Slice 5 — Artillery city

> **Historical implementation note:** this slice originally implemented Artillery as an attached feature and generated Home toggle. The current approved design supersedes that model: Artillery is a mutually-exclusive buildable city role (40 troops; range150; 3 shots/s), with no Home toggle/free generated weapons. Existing attached weapons and saves migrate to roles. See [current city-role behavior](../../docs/city-conversion/IMPLEMENTATION.md); the authored Siege layout remains a migration/regression fixture.

## Approved design

User approved [Artillery mockup revision 1](../../mockups/artillery-city/DESIGN.md) with “looks good. implement it”. Preview stopped and approved sources preserved before production work.

- Compact cannon badge, persistent dashed 90-unit range, subtle nearest-target ring.
- Brief border-to-border shot, impact ring and −1 feedback; no aiming controls. Reduced-motion omits the beam while keeping static impact/loss feedback.
- Muted polygonal regions, 14-unit circles/counters, whole-region controls and proportional single-screen board remain intact.

## Rules

`artillery` is a validated immutable city feature, not a selectable faction upgrade. The generated-map Artillery toggle defaults Off; On creates exactly one neutral 14-defender gun and a small clear mountain ridge, reserves that city from neutral Factory placement, and carries feature/terrain data through compilation, save/restore and AI forecasts. The separate authored Siege scenario remains for focused tests. It targets the nearest hostile non-neutral city with positive troops, measured centre-to-centre, including the exact range edge. Range 90; one defender every 1,000/3 ms (~333 ms); zero is the lower bound. Empty cities retain ownership and continue ordinary production; only troop combat can capture them. Traveling dots are untouched.

Capture transfers firing control and starts a full new cadence after the combat step. Neutral guns do not fire. Idle boundaries are discarded, not banked. Nearest-distance ties use stable city IDs; simultaneous guns fire in stable city-ID then feature-ID order and later guns see earlier losses. Direct centre-to-centre mountain intersection blocks a shot; tangent shots and river shots are allowed.

The shared world step resolves growth → movement/arrivals → combat → Watchtowers → Artillery, substepping at most 50 ms whenever Artillery is present. Live rounds and AI forecasts use identical physics. AI legal-order filtering respects mountains; a feasible captured gun covering a hostile garrison earns its ten-second potential shot-count value in scoring, without free troops or extra damage.

## Siege map and terrain

Authored `siege` scenario: eleven cities, one neutral 14-defender gun at (180,240), and the approved ridge at x211–231/y205–237. Starting cities remain 36; nearby player/enemy outposts have 12 defenders. The mockup's low target count and initially owned gun are replaced with a contested opening. It remains appended to authored `MAPS` fixtures for focused tests; Home uses fresh generation and adds a compact Artillery On/Off option. Generated neutral guns are deterministic with the selected seed. Playtest balance and viable openings are not established.

Terrain definitions now flow through compiled setups, session/replay, AI worker snapshots, Canvas/SVG previews and saves. River bridges retain their validated 64×38 footprint; the approved warm rounded deck/inset-rail treatment changes presentation only. Generated Home exposes the Artillery On/Off setting; Off creates no gun/ridge, while On adds one neutral contested gun and a deterministic clear ridge. Mountains are visible and direct blocked orders preserve troops and queues, showing red guides/regions and accessible staging help. **Automatic mountain detours/bent-path movement are not implemented**: use ordinary explicit staging around the ridge. Slice-1 route queries remain pure and reusable. There is no Gatehouse or Portal in this map.

## Persistence and lifecycle

Ownership-aware cadence timers and brief shot records are serializable. Saves validate feature definitions, timer identities/owners/ranges, shot references and terrain; illegal stored terrain transfers are rejected. Legacy saves without Artillery fields remain readable. Pausing/backgrounding grants no shots or catch-up time; restarting/replaying restores original neutral ownership and resets timers/feedback.

## Verification

- Combined generator/UI/bridge revision: 461 unit tests / 60 files, production build, 87 Playwright tests, and two production PWA tests passed. Artillery generation tests enumerate compact/sparse, one-to-four enemy and river/no-river combinations; browser Home tests verify the Off/On selector, preview/range/mountain, persisted choice and generated round setup.
- Original Artillery gameplay coverage remains: neutral capture at320/430px, enemy firing/real recapture, full post-capture cadence, pause/restart, zero-garrison ownership followed by troop capture, mountain-blocked orders, authored scenario and paused reload metadata.
- Unit coverage includes range edge, multiple hostile factions, stable target/gun ties, river/mountain shot distinctions, timer save/restore/replay, large/small/live/forecast parity, AI gun value and compact Canvas feedback/scaling/reduced motion.
- Production screenshots captured at320/430px;320px screenshot inspected against approved design.

Limitations: real-iPhone Safari, human map balance/counterplay and broad mountain-routing playtests remain outstanding. Browser gun tests disable AI/growth for exact timing; AI integration is deterministic unit coverage plus the all-map Home/real-AI browser suite. Portals (slice6) are next; Gatehouse remains skipped.
