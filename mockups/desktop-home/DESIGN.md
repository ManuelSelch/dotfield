# Desktop Home — revision 3

- Scope: desktop slice 2 only. Larger Home preview beside existing upgrades, enemy settings and Play; no gameplay or new input features.
- Review status: in review; approval pending. Production code remains unchanged.
- Wide layout: at least 900px wide and 600px high, centered shell up to 1120px, proportional 3:4 map/navigation on the left, 300–360px setup column on the right. Preview fits available width/height without the old 280px cap. Title spans both columns; brand stays at shell left. Play occupies a separate 44px bottom row below both map and settings, centered on the same axis as the title, up to 360px wide. Settings content is vertically centered within the middle row beside the map when it fits. It can grow to the full middle-row height without the former 480px cap, scrolling only when its content exceeds available space.
- Compact layout: narrow or short viewports stack preview above setup. Existing phone safe-area padding and 44px controls retained. Setup settings have bounded internal scrolling; Play stays outside the scrolling area and reachable. No page scrolling. This bounded settings area also contains player upgrades so very short windows do not clip them.
- Interactions: arrows and ArrowLeft/ArrowRight within map selection cycle five visual maps. Checkboxes and per-enemy behavior selects retain fake local choices across map changes and resizing. Enemy settings remain collapsible. Fifth map exposes two independent enemies. Play is a no-op with a screen-reader preview notice; no production session is created.
- Review URLs: default `/desktop-home/`; expanded two-enemy state `/desktop-home/?map=5&enemies=open`.
- Fake/omitted: static map snapshots and fake upgrade/config state, native controls approximate Mantine styling, no actual upgrade compilation, AI, simulation, saves, Home-to-round navigation or outcome overlays. Existing disposable Voronoi helper is reused. Do not copy mockup state management into production.
- Modular implementation approach after approval:
  - Keep `HomeScreen` as a small composition component with existing controlled props; App remains the owner of map/upgrades/AI selection.
  - Extract map navigation/preview/position indicators into a focused `MapSelector` component, reusing `MapPreview` and catalog data.
  - Extract enemy behavior and per-faction upgrade sections into `EnemySettings`, reusing `UpgradeOptions` rather than duplicating effect UI.
  - Keep responsive styles in a focused Home stylesheet; adapt the app shell only for Home. Use CSS layout switching rather than remounting components or moving state between layouts.
  - Keep the Play handler and round setup compiler unchanged. No new dependencies, layout framework, or generic panel system.
- Verification: source inspection and lightweight HTTP serving only; no agent browser review or screenshots requested/performed.
- Revision 2 feedback: user requested removing unnecessary two-enemy scrolling on roomy desktops and moving Play below the map, centered like the title. Removed the arbitrary desktop settings height cap and moved Play outside both columns; compact layouts retain a full-width bottom Play button.
- Revision 3 feedback: user found top-aligned settings visually unbalanced beside the centered map. Vertically center the natural-height settings content on desktop, retaining the full available height as the overflow limit. Play and compact layouts are unchanged.
- Approval evidence: pending.
