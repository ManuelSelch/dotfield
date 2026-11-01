# Visual enemy editor

## Availability and ownership

Home exposes **Edit logic** independently for each configured enemy. **Custom is disabled**: editing or saving a project does not activate a controller, change match preferences, or affect a running/restored round. The normal utility AI remains responsible for gameplay.

[BotEditorEntry](../../src/ui/BotEditorEntry.tsx) lazy-loads the React/Blockly editor. Normal Home/gameplay does not initialize Blockly workspaces. Each editor session owns its workspaces, procedure models, observers, listeners and bounded whole-project undo history; replacement/unmount disposes them.

## Source and compilation

[src/botEditor](../../src/botEditor/) owns editable versioned Blockly source, typed scalar parameters, stable tactic/slot identities, structural editing, validation and compilation. Tactic calls inline into bounded native Mistreevous JSON with private slot namespaces and source origins. Source JSON is not executable JavaScript. Incomplete drafts can be edited but cannot replace a valid save.

The native runtime independently validates snapshots and bounds nodes, depth, calls, capability use, forecasts, commands and projected world/work size. These limits are not a sandbox or a hard wall-clock deadline. **Target-device runtime responsiveness remains unverified; custom match activation is not released.**

## Editing and persistence

- Native controls support adding/reordering/moving/deleting steps, literals, typed slots, tactics and inputs without requiring drag gestures. Signature changes preserve incompatible arguments for explicit repair.
- Undo/Redo uses at most 32 whole-project snapshots. Reset changes only the working draft and is undoable. Back/unload guards unsaved changes.
- [storage.ts](../../src/botEditor/storage.ts) stores editable source only under `dotfield.bot-project.v1.<encoded faction ID>`. Read and Save validate source and compilation; generated runtime memory is not persisted here.
- A successful single-key write establishes the new saved baseline. Storage failures keep the working draft open and leave the old save intact. A stale read token detects intervening saves; this is not transactional multi-tab merging.
- Unsupported/corrupt saves are preserved until explicit replacement confirmation and Save. There is no automatic version migration or silent overwrite.

## Offline and failure behavior

Blockly media and licenses are local under [public/blockly-media](../../public/blockly-media/) and [public/licenses](../../public/licenses/). Production PWA caching includes the lazy editor assets. Lazy-load errors offer retry or Home without modifying saved data. Updates require returning Home through the unsaved-draft guard.

Relevant coverage: [editor browser scenarios](../../tests/bot-editor.spec.ts), colocated editor unit tests, and the production PWA suite. Chromium/offline automation does not establish real-iPhone usability, heat, heap stability or human acceptance. Historical slice reports and release prerequisites are retained in [plans](../../plans/bot-editor/IMPLEMENTATION.md) and the [requirements](../../plans/bot-editor/REQUIREMENTS.md).
