# Dotfield Icon — Requirements

## Goal

Create a recognizable Dotfield game icon that communicates a compact territory-control game at a glance, remains legible at favicon and phone home-screen sizes, and fits the existing restrained teal/cream visual language.

## Scope

### In Scope

- Define one primary icon concept based on Dotfield's core visual vocabulary: dots/cities, connected territory, and a contested field.
- Produce a scalable master asset suitable for the browser favicon and future installed/PWA icon surfaces.
- Add the icon to the currently supported browser surface and document the asset variants and usage rules.
- Verify legibility at small sizes, on light and dark browser chrome, and in the existing app palette.

### Out of Scope

- Redesigning the in-game Canvas symbols for Factory, Watchtower, Slow Zone, or Industry.
- Adding progression, branding typography, a wordmark, or a full logo system.
- Building PWA install/offline support, app-store packaging, or native iOS assets unless the selected icon exposes a required follow-up.
- Changing the Home screen, map previews, or game mechanics.

## Requirements

- The icon must be identifiable without text; it must not depend on the word “Dotfield” being readable.
- The primary motif should use a small number of geometric shapes, with a clear focal contrast between the board/background and the occupied or contested dots.
- It must preserve the current visual tone: restrained, modern, mobile-first, and non-childish; use the existing field/teal palette unless a contrast check requires a supporting colour.
- The silhouette and focal motif must remain recognizable at 16×16, 32×32, 48×48, and 180×180 pixels. Details that disappear at 16×16 must not carry the icon's only meaning.
- The design must work as a square asset with safe padding and rounded-corner treatment handled by the platform where possible; do not bake in a large platform-specific mask or transparent edge that makes the mark too small.
- The master must be vector-based or otherwise losslessly scalable. Export at least the browser-sized variant and a high-resolution variant for future home-screen use.
- The asset must not use emoji, text glyphs, external icon packages, or runtime-generated Canvas drawing for the browser icon.
- `index.html` must reference the approved browser icon without broken or stale asset paths. Existing page behavior and game rendering must remain unchanged.
- Automated checks must cover asset existence/reference and a visual inspection must confirm no clipping, accidental transparency, or loss of contrast at the required sizes.
- Keep the icon visually distinct from the existing in-game upgrade badges; the game icon represents the whole game, not one upgrade.

## Assumptions

- The current `public/favicon.svg` is a temporary placeholder and may be replaced rather than preserved.
- The first deliverable is the browser/game icon, with a reusable master that can support PWA assets later.
- A recommended direction is a dark teal field containing three offset circular nodes, with one lighter connecting/territory accent suggesting expansion; this is a starting concept, not an approved final design.
- The existing colours in `public/favicon.svg` and the board palette are the initial colour source.
- The icon will be reviewed in the repository's browser UI rather than through a separate mockup project unless visual exploration reveals materially different concepts are needed.

## Implementation Plan

### 1. Establish the icon brief and visual constraints

Description: Inspect the current favicon, board palette, typography, and browser metadata; confirm the primary motif, contrast targets, safe area, and required output sizes. Completion is a short asset brief recorded with the implementation and an explicit choice among the proposed motif variants.

### 2. Create the scalable master and exports

Description: Draw the approved icon as a small, dependency-free vector asset with a square silhouette, safe padding, and deliberate small-size simplification. Export the SVG master plus the raster/high-resolution variants needed for the current browser surface and later app-icon reuse. Completion is verified by opening each asset and checking the required dimensions and transparency.

### 3. Integrate the browser icon

Description: Replace the temporary favicon reference/assets in the public metadata without changing game UI or simulation code. Keep paths deterministic and ensure the browser uses the new asset after a clean build. Completion is verified by production build output inspection and a browser test or manual browser inspection of the tab/icon metadata.

### 4. Verify legibility and document handoff

Description: Inspect the icon at 16, 32, 48, and 180 pixels against light and dark backgrounds, checking node separation, silhouette, contrast, and clipping. Add concise asset usage notes and tests/checks so future PWA or app-store packaging can reuse the master without redrawing it. Completion is a recorded visual review plus passing asset/build checks.

## Open Questions

1. Should the final icon be a single abstract contested field of dots, or should it include a more explicit symbol such as a route/expansion wedge?
2. Should the first implementation include only the browser favicon, or also ship 180×180 and 512×512 app-icon exports now for future Home Screen/PWA work?
3. Should the icon use the current cream background, a dark teal background, or support both light and dark variants?
4. Is a custom raster export tool available/acceptable in the project workflow, or should the first version remain SVG-only until PWA packaging begins?
