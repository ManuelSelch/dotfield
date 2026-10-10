import { expect, test } from '@playwright/test';
import { fieldPoints } from './helpers/fieldPoints';
import { openAuthoredMatch } from './helpers/openAuthoredMatch';

test.use({ viewport: { width: 320, height: 568 }, hasTouch: true });
test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
  await openAuthoredMatch(page);
});

test('starts immediately; pause freezes the board and survives backgrounding', async ({ page }) => {
  const canvas = page.getByRole('img', { name: 'Territory board' });
  const pixels = () => canvas.evaluate(el => (el as HTMLCanvasElement).toDataURL());
  const details = page.getByRole('list', { name: 'Territory details' });
  await expect(page.getByText('Ready to grow?')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Start', exact: true })).toHaveCount(0);
  const { source, target } = await fieldPoints(page);
  await page.mouse.move(source.x, source.y); await page.mouse.down();
  await page.mouse.move(target.x, target.y); await page.mouse.up();
  await page.clock.runFor(1100);
  await page.getByRole('button', { name: 'Pause', exact: true }).tap();
  const paused = await pixels(), counts = await details.textContent();
  await page.clock.runFor(60000);
  expect(await pixels()).toBe(paused); expect(await details.textContent()).toBe(counts);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.runFor(10000); expect(await pixels()).toBe(paused);
  await page.getByRole('button', { name: 'Resume', exact: true }).tap();
  await page.clock.runFor(100); expect(await pixels()).not.toBe(paused);
  expect(await page.evaluate(() => scrollY)).toBe(0);
});

test('restart is only in the pause popup and immediately starts a fresh round', async ({ page }) => {
  const { source, target } = await fieldPoints(page);
  for (let round = 0; round < 2; round++) {
    await expect(page.getByRole('button', { name: 'Restart', exact: true })).toHaveCount(0);
    await page.mouse.move(source.x, source.y); await page.mouse.down();
    await page.mouse.move(target.x, target.y); await page.mouse.up();
    await page.clock.runFor(1100);
    const pause = page.getByRole('button', { name: 'Pause', exact: true });
    await expect(pause.locator('svg')).toHaveCount(1);
    await expect(pause).toHaveText('');
    await pause.click();
    await page.getByRole('button', { name: 'Restart', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByText('Ready to grow?')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
    await expect(page.getByRole('listitem').filter({ hasText: /^south:/ })).toHaveText('south: You, 36 units.');
    await expect(page.getByRole('list', { name: 'Unit transfers' }).getByRole('listitem')).toHaveCount(0);
    await page.clock.runFor(1100);
    await expect(page.getByRole('listitem').filter({ hasText: /^south:/ })).toHaveText('south: You, 37 units.');
  }
});
