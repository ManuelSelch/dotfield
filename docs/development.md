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
npm test                 # unit tests
npm run test:coverage    # unit tests with LCOV coverage for Sonar
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

[Tests](../.github/workflows/tests.yml) runs the production build and unit tests with coverage on pushes to `main`, pull requests and manual dispatch. Node 24 and `npm ci` reproduce the locked dependencies. Browser and PWA scenarios remain separate, manually run checks; their coverage is not included.

To enable Cloud analysis:

1. Import `ManuelSelch/dotfield` into [SonarQube Cloud](https://sonarcloud.io/projects/create) under your organization. Select CI-based analysis and disable Automatic Analysis if enabled.
2. In GitHub repository **Settings → Secrets and variables → Actions**, add variables `SONAR_ORGANIZATION` (expected: `manuelselch`) and `SONAR_PROJECT_KEY` (expected: `ManuelSelch_dotfield`). Use the actual keys shown by Cloud if different.
3. Add an analysis token with access to that project as repository secret `SONAR_TOKEN`. Never commit the token.
4. Push/merge the workflow, then run it on `main` to establish the initial baseline. Confirm the coverage import and quality gate on Cloud. Subsequent pull requests can then use that baseline.

The Sonar job waits for successful build/unit verification and downloads its LCOV artifact. It is skipped until both variables exist and always skipped on fork pull requests. Once enabled, a missing token fails explicitly. Scanning waits up to five minutes for the quality gate; a failed gate fails the job. Requiring that check for merges is a separate branch-protection/ruleset setting, not configured by this workflow.

[Scanner properties](../sonar-project.properties) use exclusion-based scope, with no explicit `sonar.sources` or `sonar.tests`. Tests, fixtures, mockups, generated output and vendored Blockly assets are excluded from analysis, not classified as test sources. Root tool configuration remains analyzed but excluded from coverage. Vitest measures all production TypeScript/TSX under `src`, including unexecuted files, excluding tests, declarations and fixtures, and writes `coverage/lcov.info`. Both coverage output and scanner work files are ignored by Git.

## Presentation conventions

Use Tailwind for layout/spacing and Mantine for UI components. Mantine styles are layered below Tailwind utilities; Tailwind Preflight is omitted to avoid competing resets. Battlefield visuals use Canvas. See the [high-level architecture](architecture.md) for responsibilities and runtime flow, rather than a source-file inventory.

## Offline installation and updates

Open the production app once over HTTPS, then use the browser's **Add to Home Screen** action. The service worker caches the application shell and assets. Gameplay and saved rounds are local, not server-synced; first load and later updates need a connection.

The header reports Online, Offline, Updating or Update ready. Online is the browser's connectivity signal, not proof of server reachability. Updates download without interrupting play; return Home and choose **Update now** to reload explicitly. Editor drafts must pass their unsaved-change guard before returning Home. Reconnect/focus retries update checks; failures leave gameplay available.

For the development-only tree experiment, see the [MDSL prototype](ai-mdsl/IMPLEMENTATION.md). The [visual editor](bot-editor/IMPLEMENTATION.md) is separate; custom match activation remains disabled.
