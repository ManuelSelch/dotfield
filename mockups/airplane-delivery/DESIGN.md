# Airplane delivery studies

- Revision: 1. Status: in review; no implementation approval.
- Goal: compare three small top-down 2D delivery animations within Dotfield's muted green board language, not a full game screen.
- A: park alongside target and stream five-dot groups into city.
- B: orbit target twice while releasing five-dot groups inward.
- C: park at city edge and resolve five-troop batches with city pulses, no traveling dots.
- Same illustrative timeline: 2s outbound flight, 4s release sequence, brief clearance, 2s empty return. Cargo 100, batches 5. Enemy starts 20 with three shield charges. First three batches blocked, subsequent arrivals attack, remaining arrivals reinforce after capture. Friendly mode bypasses combat.
- Three cards desktop, stacked on mobile. Replay all/per-card, pause/play, half speed, friendly/enemy choice. Reduced-motion preference starts paused at a sample frame; motion can be explicitly started. Animation stops after one trip.
- All data and mechanics simulated. No production dependencies or gameplay code changed. No flight interception, turnaround, home capture, conversion, AI or persistence. Positions/plane size exaggerated for review.
- Agreed direction from discussion: tap owned city for quick conversion controls; Production/Defender/Airfield; Capture Shield coexists. Airfield holds one reusable plane, returns home empty; any city reachable over rivers/mountains. Capacity 100 is a proposed playtest value. Exact costs, cadence, dispatch controls, Defender rules and unloading treatment remain open.
- Review question: which delivery treatment is clearest and best fits the existing 2D board?
- Preview owned by this session using managed preview_start. Runtime metadata under ../.runtime/airplane-delivery.json. Keep alive for review; stop owned preview on approval/cancel after identity verification.
