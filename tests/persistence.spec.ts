import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 320, height: 568 }, hasTouch: true });

test('restores the active round instead of returning to Home after reload', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.goto('/');
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page.clock.runFor(1200);
  const before = await page.getByRole('list', { name: 'Territory details' }).textContent();

  await page.reload();

  await expect(page.getByRole('img', { name: 'Territory board' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toHaveCount(0);
  expect(await page.getByRole('list', { name: 'Territory details' }).textContent()).toBe(before);
});
