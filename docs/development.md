# Development

## Run locally

Use a current Node.js LTS release supported by Vite (22.12+ or 24+) and npm.

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. The development server listens on the network so a phone on the same Wi-Fi can connect. Do not expose it to the public internet.

## Build and verify

```sh
npm run lint            # ESLint; warnings fail the gate
npm run typecheck       # native TypeScript 7 check (src, including unit tests)
npm run format:check    # verify Prettier formatting without rewriting files
npm run test:tooling    # verify compiler aliases and lint-rule enforcement
npm test                # unit tests
npm run build           # TypeScript check and production PWA build
npm run preview         # serve the production build locally
npx playwright install chromium
npm run test:browser    # browser scenarios
npm run test:pwa        # build and test production offline/update behavior
```

To use installed Google Chrome instead of downloaded Chromium:

```sh
PLAYWRIGHT_CHANNEL=chrome npm run test:browser
```

Browser scenarios use an isolated development server on port 5180. Fixtures disable AI where exact physical outcomes are required; other scenarios exercise the real asynchronous worker. Screenshots and traces are written to ignored `test-results/`. Chromium checks do not establish real-iPhone Safari behavior, safe-area handling, thermal performance or human balance.

## Quality conventions

ESLint uses framework-independent React, Hooks, accessibility and TypeScript rules, plus import ordering and cycle detection. Source files and folders use kebab-case; component names remain PascalCase. Import another source folder through `@/` (configured in TypeScript, Vite and Vitest), and use `./` for siblings. Barrel/index files are prohibited. Single-statement control-flow bodies have no braces. These checks do not yet enforce feature-layer boundaries; the architecture migration is separate.

Prettier owns formatting: single quotes, trailing commas, two-space indentation and a 100-character print width. Run `npm run format` to apply it, and `npm run lint:fix` for automatic lint fixes. Generated output, disposable mockups, third-party Blockly media/licenses, generated JSON serialization snapshots and test artifacts are excluded. Narrow, explained lint exceptions preserve intentional focus management, event-bubbling boundaries and invalid-JSON test fixtures.

TypeScript runs [side by side](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#running-side-by-side-with-typescript-6.0): `@typescript/native` aliases TypeScript 7 and provides `tsc` for builds/typechecking; `typescript` aliases `@typescript/typescript6` and provides the TypeScript 6 compiler API needed by ESLint, plus `tsc6`. Do not replace the aliases with a direct TypeScript 7 dependency until API-dependent tools support it. No peer-dependency bypass is required. Browser tests and tooling configurations are linted, but are not yet included in the standalone TypeScript check.

The local [Pi pipeline](../.pi/pipeline.yaml) prepares a fresh worktree with `npm ci`, then exposes lint, typecheck, format and tooling gates alongside the existing build/unit/browser/PWA suites. Quality, build and unit suites run automatically after agent changes; browser and PWA suites remain manual. These are local checks, not a hosted CI configuration.

## Presentation conventions

Use Tailwind for layout/spacing and Mantine for UI components. Mantine styles are layered below Tailwind utilities; Tailwind Preflight is omitted to avoid competing resets. Battlefield visuals use Canvas. See the [high-level architecture](architecture.md) for responsibilities and runtime flow, rather than a source-file inventory.

## Offline installation and updates

Open the production app once over HTTPS, then use the browser's **Add to Home Screen** action. The service worker caches the application shell and assets. Gameplay and saved rounds are local, not server-synced; first load and later updates need a connection.

The header reports Online, Offline, Updating or Update ready. Online is the browser's connectivity signal, not proof of server reachability. Updates download without interrupting play; return Home and choose **Update now** to reload explicitly. Editor drafts must pass their unsaved-change guard before returning Home. Reconnect/focus retries update checks; failures leave gameplay available.

For the development-only tree experiment, see the [MDSL prototype](ai-mdsl/IMPLEMENTATION.md). The [visual editor](bot-editor/IMPLEMENTATION.md) is separate; custom match activation remains disabled.
