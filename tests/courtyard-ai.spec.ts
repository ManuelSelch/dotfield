import { expect, test } from '@playwright/test';

for (const network of [false, true]) test(`real aggressive AI expands on Courtyard with Defensive Network ${network ? 'on' : 'off'}`, async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 844 });
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Courtyard', exact: true }).click();
  await page.getByText('Enemy settings', { exact: true }).click();
  await page.getByLabel('Enemy 1 behavior').selectOption('aggressive');
  if (network) {
    await page.getByRole('group', { name: 'enemy upgrades', exact: true })
      .getByRole('button', { name: 'Defensive Network', exact: true }).click();
  }
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
