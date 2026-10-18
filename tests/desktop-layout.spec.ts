import { expect, test, type Page } from '@playwright/test';
import { fieldPoints } from './helpers/fieldPoints';
import { openAuthoredMatch } from './helpers/openAuthoredMatch';

async function start(page: Page) {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
  await openAuthoredMatch(page);
}

async function assertLayout(page: Page) {
  const canvas = page.getByRole('img', { name: 'Territory board' });
  // Logical 3:4 geometry is fitted inside a stable Canvas with the action strip
  // reserved from the start, rather than resizing the Canvas on selection.
  const strip = (await page.locator('.city-action-strip').boundingBox())!;
  expect(strip.height).toBe(66);
  const box = (await canvas.boundingBox())!;
  expect(box.height).toBeGreaterThan(100);
  expect(strip.y - (box.y + box.height)).toBeCloseTo(12, 1);
  const viewport = page.viewportSize()!;
  expect(box.x).toBeGreaterThanOrEqual(16);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width - 15);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height - 15);
  expect(Math.abs(box.x + box.width / 2 - viewport.width / 2)).toBeLessThan(1);
  const heading = (await page.locator('header').boundingBox())!;
  const composition = (await page.getByRole('region', { name: 'Troop composition' }).boundingBox())!;
  expect(Math.abs(heading.x - box.x)).toBeLessThan(1);
  expect(Math.abs(heading.width - box.width)).toBeLessThan(1);
  expect(Math.abs(composition.x - box.x)).toBeLessThan(1);
  expect(composition.y + composition.height).toBeLessThanOrEqual(box.y);
  expect(await page.evaluate(() => ({ x: scrollX, y: scrollY,
    width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight })))
    .toEqual({ x: 0, y: 0, width: viewport.width, height: viewport.height });
  return box;
}

for (const viewport of [
  { width: 320, height: 480 }, { width: 430, height: 932 },
  { width: 768, height: 1024 }, { width: 1280, height: 720 },
  { width: 1440, height: 900 }, { width: 1280, height: 480 },
]) {
  test(`fitted battlefield and aligned controls at ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await start(page);
    const box = await assertLayout(page);
    if (viewport.height >= 900 && viewport.width >= 768) expect(box.width).toBeGreaterThan(496);
    // Whole-region coordinates, away from the city circles, still issue an order.
    const { regionSource, regionTarget } = await fieldPoints(page);
    await page.mouse.move(regionSource.x, regionSource.y); await page.mouse.down();
    await page.mouse.move(regionTarget.x, regionTarget.y); await page.mouse.up();
    await expect(page.getByRole('list', { name: 'Unit transfers' }).getByRole('listitem')).toHaveCount(7);
    await expect(page.getByRole('listitem').filter({ hasText: /^south:/ })).toHaveText('south: You, 31 units. Production city.');
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await expect(page.getByRole('group', { name: 'Game controls' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Paused' })).toHaveCount(0);
    for (const name of ['Resume', 'Restart', 'Home']) {
      const button = page.getByRole('button', { name, exact: true });
      await expect(button).toBeVisible();
      await expect(button).toHaveAttribute('title', name);
      const bounds = (await button.boundingBox())!;
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(box.y);
      const header = (await page.locator('header').boundingBox())!;
      expect(bounds.y).toBeGreaterThanOrEqual(header.y);
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(header.y + header.height);
    }
    await page.screenshot({ path: `test-results/desktop-layout-paused-${viewport.width}x${viewport.height}.png` });
    await page.getByRole('button', { name: 'Resume', exact: true }).click();
    await page.screenshot({ path: `test-results/desktop-layout-${viewport.width}x${viewport.height}.png` });
  });
}

test('resizing an active round preserves armies and orders and updates pointer/keyboard coordinates', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await start(page);
  const { source, target } = await fieldPoints(page);
  await page.mouse.move(source.x, source.y); await page.mouse.down();
  await page.mouse.move(target.x, target.y); await page.mouse.up();
  const details = page.getByRole('list', { name: 'Territory details' });
  const transfers = page.getByRole('list', { name: 'Unit transfers' });
  const before = { details: await details.textContent(), transfers: await transfers.textContent() };
  for (const viewport of [{ width: 320, height: 480 }, { width: 1280, height: 720 }]) {
    await page.setViewportSize(viewport);
    await assertLayout(page);
    expect({ details: await details.textContent(), transfers: await transfers.textContent() }).toEqual(before);
  }
  await page.getByRole('button', { name: /^Select south region:/ }).focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: /^Select north region:/ }).focus();
  await page.keyboard.press('Enter');
  await expect(transfers.getByRole('listitem').filter({ hasText: 'south → centre' })).toHaveCount(1);
  await expect(transfers.getByRole('listitem').filter({ hasText: 'south → north' })).toHaveCount(6);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  const paused = await details.textContent();
  await page.setViewportSize({ width: 430, height: 932 });
  await assertLayout(page);
  await page.clock.runFor(10000);
  expect(await details.textContent()).toBe(paused);
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
});
