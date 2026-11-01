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
npm run test:coverage   # unit tests with LCOV coverage for Sonar
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

## SonarQube Cloud and CI

[Tests](../.github/workflows/tests.yml) runs the production build and unit tests with coverage on pushes to `main`, pull requests and manual dispatch. Node 24 and `npm ci --ignore-scripts` reproduce the locked dependencies without executing dependency lifecycle scripts. CI runs the build and coverage checks with dependency scripts disabled; dependencies must work without install-time lifecycle hooks. Browser and PWA scenarios remain separate, manually run checks; their coverage is not included.

To enable Cloud analysis:

1. Import `ManuelSelch/dotfield` into [SonarQube Cloud](https://sonarcloud.io/projects/create) under your organization. Select CI-based analysis and disable Automatic Analysis if enabled.
2. In GitHub repository **Settings → Secrets and variables → Actions**, add variables `SONAR_ORGANIZATION` (expected: `manuelselch`) and `SONAR_PROJECT_KEY` (expected: `ManuelSelch_dotfield`). Use the actual keys shown by Cloud if different.
3. Add an analysis token with access to that project as repository secret `SONAR_TOKEN`. Never commit the token.
4. Push/merge the workflow, then run it on `main` to establish the initial baseline. Confirm the coverage import and quality gate on Cloud. Subsequent pull requests can then use that baseline.

The Sonar job waits for successful build/unit verification and downloads its LCOV artifact. It is skipped until both variables exist and always skipped on fork pull requests. Once enabled, a missing token fails explicitly. Scanning waits up to five minutes for the quality gate; a failed gate fails the job. Requiring that check for merges is a separate branch-protection/ruleset setting, not configured by this workflow.

Identifier sorting uses the shared, locale-independent UTF-16 comparator to preserve simulation, serialization and map-edge ordering. Seeded map generation wraps its accumulator to an unsigned 32-bit value; fixed sequence tests protect overflow behavior. Do not replace that wrap with `Math.trunc` or use locale-sensitive ordering for these identifiers.

Presentation unit tests exercise rendered editor controls, AI diagnostics and map-preview markup without a browser. They contribute to unit coverage but do not establish DOM event handling, focus, Canvas drawing or responsive layout; the browser scenarios remain responsible for those behaviors.

[Scanner properties](../sonar-project.properties) use exclusion-based scope, with no explicit `sonar.sources` or `sonar.tests`. Tests, fixtures, mockups, generated output and vendored Blockly assets are excluded from analysis, not classified as test sources. Root tool configuration remains analyzed but excluded from coverage. Vitest measures all production TypeScript/TSX under `src`, including unexecuted files, excluding tests, declarations and fixtures, and writes `coverage/lcov.info`. Both coverage output and scanner work files are ignored by Git.

## Quality conventions

ESLint uses framework-independent React, Hooks, accessibility and TypeScript rules, plus import ordering and cycle detection. Source files and folders use kebab-case; component names remain PascalCase. Import another source folder through `@/` (configured in TypeScript, Vite and Vitest), and use `./` for siblings. Barrel/index files are prohibited. Single-statement control-flow bodies have no braces. These checks do not yet enforce feature-layer boundaries; the architecture migration is separate.

Prettier owns formatting: single quotes, trailing commas, two-space indentation and a 100-character print width. Run `npm run format` to apply it, and `npm run lint:fix` for automatic lint fixes. Generated output, disposable mockups, third-party Blockly media/licenses, generated JSON serialization snapshots and test artifacts are excluded. Narrow, explained lint exceptions preserve intentional focus management, event-bubbling boundaries and invalid-JSON test fixtures.

TypeScript runs [side by side](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#running-side-by-side-with-typescript-6.0): `@typescript/native` aliases TypeScript 7 and provides `tsc` for builds/typechecking; `typescript` aliases `@typescript/typescript6` and provides the TypeScript 6 compiler API needed by ESLint, plus `tsc6`. Do not replace the aliases with a direct TypeScript 7 dependency until API-dependent tools support it. No peer-dependency bypass is required. Browser tests and tooling configurations are linted, but are not yet included in the standalone TypeScript check.

The local [Pi pipeline](../.pi/pipeline.yaml) prepares a fresh worktree with `npm ci`, then exposes lint, typecheck, format and tooling gates alongside the existing build/unit/browser/PWA suites. Quality, build and unit suites run automatically after agent changes; browser and PWA suites remain manual. These quality gates run locally; the hosted workflow above currently runs only build, unit coverage and Sonar analysis.

## Presentation conventions

Use Tailwind for layout/spacing and Mantine for UI components. Mantine styles are layered below Tailwind utilities; Tailwind Preflight is omitted to avoid competing resets. Battlefield visuals use Canvas. See the [high-level architecture](architecture.md) for responsibilities and runtime flow, rather than a source-file inventory.

## Offline installation and updates

Open the production app once over HTTPS, then use the browser's **Add to Home Screen** action. The service worker caches the application shell and assets. Gameplay and saved rounds are local, not server-synced; first load and later updates need a connection.

The header reports Online, Offline, Updating or Update ready. Online is the browser's connectivity signal, not proof of server reachability. Updates download without interrupting play; return Home and choose **Update now** to reload explicitly. Editor drafts must pass their unsaved-change guard before returning Home. Reconnect/focus retries update checks; failures leave gameplay available.

For the development-only tree experiment, see the [MDSL prototype](ai-mdsl/IMPLEMENTATION.md). The [visual editor](bot-editor/IMPLEMENTATION.md) is separate; custom match activation remains disabled.
