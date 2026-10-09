import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 } });
test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
  await page.goto('/'); // Real app, with default opponent enabled.
});

test('the opponent dispatches real groups and captures a neutral region', async ({ page }) => {
  const transfers = page.getByRole('list', { name: 'Unit transfers' });
  await page.clock.runFor(1700);
  await expect(transfers.getByRole('listitem')).toHaveCount(0);
  await page.clock.runFor(250);
  await expect(transfers).toContainText('5 units: north → north-east · travelling');
  await expect(page.getByRole('listitem').filter({ hasText: /^north:/ })).toHaveText('north: Opponent, 32 units.');
  await page.clock.runFor(6000);
  await expect(page.getByRole('listitem').filter({ hasText: /^north-east:/ })).toHaveText(/north-east: Opponent, \d+ units\./);
  await page.screenshot({ path: 'test-results/ai-expansion.png' });
});

test('backgrounding pauses AI decisions, not just growth', async ({ page }) => {
  const transfers = page.getByRole('list', { name: 'Unit transfers' });
  await page.clock.runFor(1700);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.runFor(60000);
  await expect(transfers.getByRole('listitem')).toHaveCount(0);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(transfers.getByRole('listitem')).toHaveCount(0);
  await page.clock.runFor(300);
  await expect(transfers).toContainText('north → north-east');
});

test('an idle player can lose a real round and replay restarts the opponent', async ({ page }) => {
  test.setTimeout(60000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.clock.runFor(125000);
  await expect(page.getByRole('region', { name: 'Defeat' })).toBeVisible();
  const details = page.getByRole('list', { name: 'Territory details' });
  const finished = await details.textContent();
  await page.screenshot({ path: 'test-results/ai-defeat.png' });
  await page.clock.runFor(20000);
  expect(await details.textContent()).toBe(finished);
  await page.getByRole('button', { name: 'Play again' }).click();
  await expect(page.getByRole('region', { name: 'Defeat' })).toHaveCount(0);
  await expect(details.getByRole('listitem').filter({ hasText: /^north:/ })).toHaveText('north: Opponent, 36 units.');
  await expect(details.getByRole('listitem').filter({ hasText: /^south:/ })).toHaveText('south: You, 36 units.');
  const transfers = page.getByRole('list', { name: 'Unit transfers' });
  await expect(transfers.getByRole('listitem')).toHaveCount(0);
  await page.clock.runFor(1700);
  await expect(transfers.getByRole('listitem')).toHaveCount(0);
  await page.clock.runFor(300);
  await expect(transfers).toContainText('north → north-east');
  expect(errors).toEqual([]);
});
