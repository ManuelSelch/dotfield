# Capture shield

- Revision: 1
- Review status: in review; not approved for production.
- Goal: review compact, three-charge protection on newly captured cities.
- Layout: small responsive preview with interactive city and six static examples; three-column examples on mobile and desktop.
- Visual: three owner-coloured 96-degree arcs at radius 23 around a radius-17 city. One arc disappears per charge. Unit counter remains separate. Depleted shields have no ring.
- Interactions: send one or five fake attackers; shields absorb first, remainder reduces garrison. Recapture/reset restores 12 units and three charges. Reset cancels an active attack.
- Motion: incoming dots approach, consumed arcs flash and fade. Reduced-motion preference skips travel and flashing. Controls have keyboard focus styling; charge/garrison results use a live region.
- States: full, partial and depleted shield; Factory and Watchtower badges; enemy colours. Static states are visible together; no query parameters required.
- Assumptions: fresh protection on every qualifying capture/recapture, no regeneration, no starting-city protection.
- Limitations: fake combat only, no actual ownership transition or production integration; Watchtower range deliberately omitted to focus on badge coexistence. Preview enlarges field geometry responsively like a scaled board; static examples show nominal city size.
- Open question: approve segmented arcs and depletion feedback, or adjust visual prominence?
- Approval evidence: none.
