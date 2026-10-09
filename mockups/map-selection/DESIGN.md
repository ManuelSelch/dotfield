# Visual map selection — revision 2

Status: approved for implementation (revision 2). User approval: “looks good. implement it”.

## Goal
Replace map names and descriptions on Home with image-only selection. Add one substantially denser map to the catalog: 21 cities on the existing 360×480 field. Preserve the current restrained palette, territory previews, upgrades, and Play action.

## Proposed Home behavior
- Show exactly one large map preview at a time, with explicit left/right arrow buttons to cycle through the four maps.
- Selection is shown by a teal outline and a position indicator; no map title, name, count, or descriptive copy.
- Arrow buttons are labelled for assistive technology; keyboard left/right arrows also change maps.
- Production retains existing upgrade options and gameplay behavior; this mockup isolates the map picker.

## Assumptions / questions
- Dense map uses 21 cities, with symmetric north/south starts and three interior bands; no pan/zoom.
- Review map scale and arrow placement on a narrow phone.
