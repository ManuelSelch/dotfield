# Dotfield Browser Test Drivers — Requirements

## Goal

Make integration/browser tests read like concise, executable gameplay and UI specifications. Introduce a small Playwright driver/DSL layer that expresses user intent in ordinary imperative TypeScript while hiding selectors, canvas coordinates, setup plumbing, and repetitive waits. Keep the browser suite end-to-end: tests should exercise the real app and assert observable behavior, not replace it with mocked internals.

## Scope
### In Scope
- A composed test driver with semantic Home, match/scenario, board/input, clock, and observable-state capabilities as justified by current tests.
- Readable browser-test scenarios for setup, actions, and expected outcomes.
- Reusable deterministic authored-match arrangements, preserving their real persistence-boundary setup where useful.
- Incremental migration of existing Playwright tests, with coverage and intent retained.
- A clear boundary between public scenario language and Playwright mechanics.

### Out of Scope
- Rewriting unit tests or changing production gameplay/UI solely to accommodate test architecture.
- Replacing Playwright or removing real-browser coverage.
- Folding the production PWA service-worker suite into the normal Vite browser suite.
- A generic BDD/Gherkin framework, generated test language, or a large abstraction hiding scenario flow.
- Replacing all direct Playwright assertions where precise layout, accessibility, screenshot, or browser behavior is itself under test.

## Requirements
- **R1 — Readable imperative scenarios:** A typical test states the meaningful action sequence and outcome directly, e.g. start/load a match, select a region, send troops, and verify the resulting transfer. Prefer domain verbs and normal TypeScript over Given/When/Then wrappers.
- **R2 — Semantic driver API:** Tests use a root `app` driver composed of focused capabilities (for example `app.home`, `app.match`, `app.board`, `app.clock`, and `app.transfers`). Use idiomatic TypeScript lower camel case for driver properties and methods; CSS selectors, ARIA locator construction, pixel geometry, and retry mechanics remain inside drivers/helpers.
- **R3 — Domain-language assertions:** Scenario specs express expected outcomes only through domain-level driver assertions (for example `app.transfers.shouldContain(...)` or `app.round.shouldBePaused()`). Drivers implement these assertions using user-visible or persisted contract behavior, retain useful Playwright diagnostics, and never substitute private implementation state for behavior.
- **R4 — Explicit deterministic setup:** A scenario declares which authored/generated match, viewport, clock state, and relevant preferences it needs. Setup helpers must avoid leaking storage, fake-clock, or prior-app lifecycle state between tests. Preserve the real persistence boundary for authored round fixtures where that boundary is part of the contract.
- **R5 — Canvas input abstraction:** Tests that exercise gameplay input express city/region intent rather than recomputing canvas coordinates. Geometry-specific tests may opt into lower-level coordinates and document why.
- **R6 — Keep the DSL small and layered:** The root driver composes focused feature drivers over a shared page/context. Drivers own interactions and reusable domain observations; tests retain scenario ordering and assertions specific to that scenario. Do not build a second test runner or hide important actions in opaque workflows.
- **R7 — Coverage preservation:** Migrations preserve the existing behavior matrix: Home and generated setup, dispatch/mouse/touch/keyboard, terrain/river, city features/upgrades, AI, growth, rounds/session, persistence, responsive layout, and accessibility. Existing PWA tests remain independently runnable.
- **R8 — Maintainability and diagnostics:** Driver failures identify the semantic operation and relevant expected/actual data. Avoid arbitrary sleeps; use Playwright's condition-based waits. Keep direct Playwright escape hatches for browser-specific assertions.
- **R9 — Acceptance:** Each slice runs its focused tests. Final acceptance runs unit tests, production build, the complete browser suite at normal and serial worker counts, and the separate PWA suite when its infrastructure or tests are touched. Report exact results and remaining limitations.

## Assumptions
- The existing `tests/helpers/fieldPoints.ts` and `openAuthoredMatch.ts` are useful seeds, but their low-level geometry/setup responsibilities should move behind a coherent semantic driver rather than simply accumulate more helpers.
- The current test suite is approximately 89 standard Playwright tests plus a separately configured PWA suite; exact counts change as coverage evolves.
- Prefer a root `const app = ...` and feature-oriented imperative calls, but follow idiomatic TypeScript naming: lower camel case for driver properties and methods. Do not copy C#-style PascalCase method naming or use Given/When/Then syntax.
- A minimal public API will be refined against representative scenarios before broad migration. Names in this plan are examples, not frozen API.
- Scenario bodies use driver-owned domain assertions; raw Playwright `expect` calls are reserved for driver implementation and browser-specific tests that do not fit the domain API.

## Implementation Plan
### 1. Define the driver contract and pilot scenario
Description: Keep driver classes and fixtures under `tests/driver/` and behavior scenarios under `tests/e2e/`. Pilot a Home-page setup scenario at a mobile viewport: select a small representative set of field features and faction upgrades, then verify the choices through domain-language driver assertions (and, if needed to prove compilation, start the match and assert its resulting setup). Sketch the root `app` lifecycle, shared context, Home vocabulary, and responsibility boundaries. Implement only the smallest driver slice needed for this scenario. Completion requires a materially clearer spec with useful failure output and unchanged behavior.

### 2. Build deterministic match and clock arrangements
Description: Move repeated authored-match creation, real persistence-boundary loading, page lifecycle cleanup, and paused-clock setup behind explicit driver/arrangement methods. Preserve intentional variation such as maps, upgrades, terrain, and viewport. Completion requires multiple existing tests to use the shared setup without state leakage or hidden defaults.

### 3. Add semantic Home, board, and outcome drivers
Description: Encapsulate common Home feature/upgrade selection and configuration assertions, then semantic touch gestures, city/region selection and orders, and observations for transfers, territory details, and round status. Keep geometry-only and DOM/layout tests able to use Playwright directly. Completion requires representative Home, touch, and dispatch specs to read as user-level workflows without inline coordinates or repeated selector plumbing. Add touch-drag dispatch after the Home pilot establishes the driver boundary.

### 4. Migrate feature scenarios incrementally
Description: Migrate river/terrain, Factory/Industry, Artillery, Watchtower/Slow Zone, AI, session/persistence, and responsive flows in small groups, extending the DSL only when repeated domain behavior justifies it. Keep special-case setup and browser-specific evidence explicit. Completion requires preserved assertions and focused green runs after each group.

### 5. Consolidate conventions and verify the suite
Description: Remove superseded helpers, document driver conventions and examples, and check that test names/spec bodies expose behavior rather than implementation details. Run the full unit, build, standard browser, serial browser, and applicable PWA checks. Completion requires all required suites passing and no meaningful coverage removed or weakened.

## Open Questions
1. Should the root driver be instantiated explicitly in each test or provided by a custom Playwright fixture? Recommendation: a fixture constructs/disposes the driver, while each scenario explicitly chooses its setup and actions.
2. The first pilot is a Home-page scenario at a mobile viewport that selects representative field features and faction upgrades. Touch-input scenarios remain an important later migration focus.
