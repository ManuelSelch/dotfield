# Capture shield

- Revision: 2
- Review status: in review; not approved for production.
- Goal: review compact protection against three hostile batches on newly captured cities. Each charge blocks an entire arriving batch, not one troop; three full batches means 15 troops.
- Layout: small responsive preview with interactive city and six static examples; three-column examples on mobile and desktop.
- Visual: three owner-coloured 96-degree arcs at radius 23 around a radius-17 city. One arc disappears per charge. Unit counter remains separate. Depleted shields have no ring.
- Interactions: send one or three fake five-troop batches; each blocked batch consumes one charge, unblocked batches damage garrison. Recapture/reset restores 12 units and three charges. Reset cancels an active attack.
- Motion: incoming dots approach, consumed arcs flash and fade. Reduced-motion preference skips travel and flashing. Controls have keyboard focus styling; charge/garrison results use a live region.
- States: full, partial and depleted shield; Factory and Watchtower badges; enemy colours. Static states are visible together; no query parameters required.
- Assumptions: fresh protection on every qualifying capture/recapture, no regeneration, no starting-city protection.
- Limitations: fake combat only, no actual ownership transition or production integration; Watchtower range deliberately omitted to focus on badge coexistence. Preview enlarges field geometry responsively like a scaled board; static examples show nominal city size.
- Open question: approve segmented arcs and depletion feedback, or adjust visual prominence?
- Approval evidence: user liked revision 1 visuals, then clarified protection must block three batches rather than individual troops. Revision 2 reflects that correction; production implementation not authorized.
- Production edge case: actual arriving batches can be reduced by travel combat or have a partial final launch. Recommended semantics: any hostile arriving batch consumes one charge and is fully blocked regardless of surviving troop count.
