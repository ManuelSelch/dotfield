import { expect, test } from '@playwright/test';
import { createServer, type Server } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';

let server: Server;
let url: string;
let revision = 0;
const types: Record<string, string> = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };

test.beforeAll(async () => {
  // Serve the real production build. Changing SW bytes simulates a deployment,
  // without mutating dist or relying on mocked service-worker callbacks.
  server = createServer(async (request, response) => {
    const path = new URL(request.url ?? '/', 'http://localhost').pathname;
    try {
      const file = path === '/' ? '/index.html' : path;
      const body = await readFile(resolve('dist', `.${file}`));
      response.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
      response.end(file === '/sw.js' ? Buffer.concat([body, Buffer.from(`\n// deployment ${revision}\nself.addEventListener('install', event => event.waitUntil(new Promise(resolve => setTimeout(resolve, 800))));\n`)]) : body);
    } catch {
      response.writeHead(404); response.end();
    }
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No test server address');
  url = `http://127.0.0.1:${address.port}`;
});
test.afterAll(async () => { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); });

test('offline launch and reconnection never reload a round; update requires a Home action', async ({ page, context }, testInfo) => {
  await page.goto(url);
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await expect(page.locator('header').getByRole('status')).toHaveText('Online');

  await context.setOffline(true);
  await expect(page.locator('header').getByRole('status')).toHaveText('Offline');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  const counts = await page.getByRole('list', { name: 'Territory details' }).textContent();
  // A document-local marker disappears on any unexpected reload.
  await page.evaluate(() => { document.documentElement.dataset.noReload = 'round-in-progress'; });
  await page.waitForTimeout(3200);
  await expect(page.locator('header').getByRole('status')).toHaveText('Offline');

  revision++;
  await context.setOffline(false);
  await expect(page.locator('header').getByRole('status')).toHaveText('Updating', { timeout: 15000 });
  await expect(page.locator('header').getByRole('status')).toHaveText('Update ready', { timeout: 15000 });
  await expect(page.getByRole('button', { name: 'Update now', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
  expect(await page.getByRole('list', { name: 'Territory details' }).textContent()).toBe(counts);
  expect(await page.evaluate(() => document.documentElement.dataset.noReload)).toBe('round-in-progress');
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  const apply = page.getByRole('button', { name: 'Update now', exact: true });
  await expect(apply).toBeVisible();
  const bounds = await apply.boundingBox();
  expect(bounds!.height).toBeLessThanOrEqual(20);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(320);
  const screenshot = testInfo.outputPath('home-update-ready.png');
  await page.screenshot({ path: screenshot });
  await testInfo.attach('home-update-ready', { path: screenshot, contentType: 'image/png' });
  await Promise.all([page.waitForEvent('framenavigated', frame => frame === page.mainFrame()), apply.click()]);
  await expect(page.locator('header').getByRole('status')).toHaveText('Online');
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.dataset.noReload)).toBeUndefined();
  await expect(page.getByRole('button', { name: 'Update now', exact: true })).toHaveCount(0);
});

test('activation in another tab does not reload an active round', async ({ page, context }) => {
  await page.goto(url);
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  const other = await context.newPage();
  await other.goto(url);
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.evaluate(() => { document.documentElement.dataset.noReload = 'active-tab'; });
  const counts = await page.getByRole('list', { name: 'Territory details' }).textContent();
  revision++;
  await other.evaluate(async () => { await (await navigator.serviceWorker.ready).update(); });
  await expect(other.getByRole('button', { name: 'Update now', exact: true })).toBeVisible();
  await expect(page.locator('header').getByRole('status')).toHaveText('Update ready');
  await Promise.all([
    other.waitForEvent('framenavigated', frame => frame === other.mainFrame()),
    other.getByRole('button', { name: 'Update now', exact: true }).click(),
  ]);
  await expect(other.locator('header').getByRole('status')).toHaveText('Online');
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => document.documentElement.dataset.noReload)).toBe('active-tab');
  expect(await page.getByRole('list', { name: 'Territory details' }).textContent()).toBe(counts);
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await Promise.all([
    page.waitForEvent('framenavigated', frame => frame === page.mainFrame()),
    page.getByRole('button', { name: 'Update now', exact: true }).click(),
  ]);
  await expect(page.locator('header').getByRole('status')).toHaveText('Online');
});
