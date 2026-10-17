import { expect, test } from '@playwright/test';

test('the existing real AI expands on the Courtyard terrain', async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 844 });
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Courtyard', exact: true }).click();
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  const details = page.getByRole('list', { name: 'Territory details' });
  await expect(details.getByRole('listitem').filter({ hasText: /: Opponent,/ })).toHaveCount(1);
  for (let i = 0; i < 8; i++) {
    await page.clock.runFor(2000);
    // Worker results arrive asynchronously, outside the virtual animation clock.
    await page.waitForTimeout(20);
  }
  await expect.poll(async () => details.getByRole('listitem').filter({ hasText: /: Opponent,/ }).count()).toBeGreaterThan(1);
  expect(errors).toEqual([]);
});
