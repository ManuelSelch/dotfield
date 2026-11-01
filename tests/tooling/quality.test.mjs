import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { ESLint } from 'eslint';
import { getFileInfo } from 'prettier';

const require = createRequire(import.meta.url);
const eslint = new ESLint();
// Import graph analysis needs real files; snippets test the other rules only.
const snippetLint = new ESLint({ overrideConfig: { rules: { 'import/no-cycle': 'off' } } });

async function rulesFor(code, filePath = 'src/quality-probe.ts') {
  const [result] = await snippetLint.lintText(code, { filePath });
  return result.messages.map((message) => message.ruleId);
}

test('hosted verification installs locked dependencies without lifecycle scripts', async () => {
  const workflow = await readFile('.github/workflows/tests.yml', 'utf8');

  assert.match(
    workflow,
    /- run: npm ci --ignore-scripts\s+- run: npm run build\s+- run: npm run test:coverage/,
  );
});

test('native TypeScript 7 CLI coexists with the TypeScript 6 compiler API', () => {
  assert.match(require('typescript').version, /^6\.0\./);
  assert.match(require('@typescript/native/package.json').version, /^7\./);
  assert.match(
    execFileSync('node_modules/.bin/tsc', ['--version'], { encoding: 'utf8' }),
    /Version 7\./,
  );
  assert.match(
    execFileSync('node_modules/.bin/tsc6', ['--version'], { encoding: 'utf8' }),
    /Version 6\.0\./,
  );
});

test('lint accepts a formatted, strictly typed module', async () => {
  assert.deepEqual(await rulesFor('export const qualityProbe: number = 1;\n'), []);
});

test('lint rejects parent imports, barrel files and non-kebab filenames', async () => {
  assert.ok(
    (await rulesFor("export { value } from '../other';\n")).includes('no-restricted-imports'),
  );
  assert.ok(
    (await rulesFor('export const value = 1;\n', 'src/index.ts')).includes('check-file/no-index'),
  );
  assert.ok(
    (await rulesFor('export const value = 1;\n', 'src/QualityProbe.ts')).includes(
      'check-file/filename-naming-convention',
    ),
  );
});

test('lint enforces formatting, import ordering and brace-free guard clauses', async () => {
  assert.ok((await rulesFor('export const value=1\n')).includes('prettier/prettier'));
  assert.ok(
    (
      await rulesFor(
        "import { readFile } from 'node:fs';\nimport { basename } from 'node:path';\nexport { readFile, basename };\n",
      )
    ).includes('import/order') === false,
  );
  assert.ok(
    (
      await rulesFor(
        "import { basename } from 'node:path';\nimport { readFile } from 'node:fs';\nexport { readFile, basename };\n",
      )
    ).includes('import/order'),
  );
  assert.ok(
    (
      await rulesFor('export function check(value: boolean) { if (!value) { return; } }\n')
    ).includes('curly'),
  );
});

test('lint catches conditional hooks and inaccessible controls', async () => {
  assert.ok(
    (
      await rulesFor(
        "import { useState } from 'react';\nexport function Probe({ enabled }: { enabled: boolean }) { if (!enabled) return null; const [value] = useState(0); return <div>{value}</div>; }\n",
        'src/quality-probe.tsx',
      )
    ).includes('react-hooks/rules-of-hooks'),
  );
  assert.ok(
    (
      await rulesFor(
        'export function Probe() { return <img src="probe.png" />; }\n',
        'src/quality-probe.tsx',
      )
    ).includes('jsx-a11y/alt-text'),
  );
});

test('cycle detection is enabled for both TypeScript and React modules', async () => {
  for (const filePath of ['src/quality-probe.ts', 'src/quality-probe.tsx']) {
    const config = await eslint.calculateConfigForFile(filePath);
    assert.equal(config.rules['import/no-cycle'][0], 2);
    assert.ok(config.settings['import/resolver'].typescript);
  }
});

test('cycle detection rejects a real circular TypeScript import', async () => {
  const cwd = await realpath(await mkdtemp(path.join(tmpdir(), 'dotfield-quality-')));
  try {
    await writeFile(
      path.join(cwd, 'one.ts'),
      "import { two } from './two';\nexport const one = () => two;\n",
    );
    await writeFile(
      path.join(cwd, 'two.ts'),
      "import { one } from './one';\nexport const two = () => one;\n",
    );
    const isolated = new ESLint({ cwd, overrideConfigFile: path.resolve('eslint.config.mjs') });
    const results = await isolated.lintFiles(['one.ts', 'two.ts']);
    assert.ok(
      results.some((result) =>
        result.messages.some((message) => message.ruleId === 'import/no-cycle'),
      ),
    );
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test('formatting preserves generated JSON serialization snapshots', async () => {
  const info = await getFileInfo('src/bot-editor/fixtures/default-project.json', {
    ignorePath: '.prettierignore',
  });
  assert.equal(info.ignored, true);
});

test('generated files, mockups and test artifacts are excluded from lint', async () => {
  for (const filePath of [
    'dist/output.js',
    'mockups/prototype.tsx',
    'test-results/report.js',
    'playwright-report/report.js',
    'coverage/report.js',
    'public/blockly-media/generated.js',
  ])
    assert.equal(await eslint.isPathIgnored(filePath), true, filePath);
});
