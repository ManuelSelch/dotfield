import { expect, test } from '@playwright/test';

test.use({ hasTouch: true });
for (const viewport of [{ width: 320, height: 480 }, { width: 430, height: 932 }]) {
  test(`Slow Zone is selectable and renders its 90-unit coverage at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
    await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
    await page.goto('/');
    await page.getByText('Your upgrades', { exact: true }).click();
    const upgrades = page.getByRole('group', { name: 'Your upgrades', exact: true });
    const option = upgrades.getByRole('checkbox', { name: 'Slow Zone', exact: true });
    await expect(option).not.toBeChecked();
    await option.scrollIntoViewIfNeeded();
    await expect(option).toBeInViewport();
    await expect(upgrades.getByText('50% hostile speed within 90 units')).toBeVisible();
    await option.check();
    await page.getByRole('button', { name: 'Play new map', exact: true }).tap();
    const details = page.getByRole('list', { name: 'Territory details' });
    await expect(details.getByRole('listitem').filter({ hasText: 'Slow Zone controlled by' })).toHaveCount(1);
    await expect(details.getByRole('listitem').filter({ hasText: 'Slow Zone controlled by' })).toContainText('90 units');
    await page.getByRole('button', { name: 'Pause', exact: true }).tap();
    await page.getByRole('button', { name: 'Home', exact: true }).tap();
    await page.getByText('Your upgrades', { exact: true }).click();
    await expect(option).toBeChecked();
  });
}

test('fixture exposes a random-city Slow Zone without rerolling during forecast-free play', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
  await page.goto('/tests/fixtures/round.html?slow-zone');
  const zones = page.getByRole('list', { name: 'Territory details' }).getByRole('listitem').filter({ hasText: 'Slow Zone controlled by' });
  await expect(zones).toHaveCount(1);
  const before = await zones.textContent();
  await page.clock.runFor(2000);
  await expect(zones).toHaveText(before!);
});
