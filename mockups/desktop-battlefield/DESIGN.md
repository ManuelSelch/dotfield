# Responsive battlefield — revision 1

- Scope: desktop slice 1 only; responsive in-round layout. Home and input are unchanged and not represented here.
- Review status: in review; no approval recorded. Production code remains untouched.
- Layout: largest centered 3:4 battlefield that fits available width and height after safe-area padding, brand header, and composition/pause row. The header and controls align with board edges. Extra widescreen space stays outside interactive regions. Compact screens use the same proportional fit with existing phone padding; desktop retains existing larger vertical padding.
- Appearance: existing understated palette, circle/count sizing scaled uniformly, region borders, rounded board, icon-only Pause.
- Interactions: resize browser to review phone/desktop/short-window fit. Pause opens a board-centered overlay; Resume and Restart close it. `?state=paused` opens that review state directly. Dialog buttons have a minimal focus loop.
- Fake/omitted: static Meadow map, fixed counts/composition; no simulation, AI, dispatch, features, saved state, Home, round results, or actual restart. Shared disposable Voronoi helper reused from bigger-map mockup. Production overlays/controls should use existing components rather than this fake dialog.
- Main review question: approve the centered height-limited board, aligned controls, and outside-board desktop margins before production implementation?
- Verification: source inspection and HTTP serving only. No automated visual review or screenshots requested/performed.
- Approval evidence: pending.
