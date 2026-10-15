import { expect, test } from '@playwright/test';

for (const width of [320, 430]) {
  test(`neutral Factory captures with real crossing batches at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
    await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
    await page.goto('/tests/fixtures/round.html?foundry&industry');
    const details = page.getByRole('list', { name: 'Territory details' });
    const plant = details.getByRole('listitem').filter({ hasText: /^west-north:/ });
    await expect(plant).toContainText('Factory inactive (2× production)');
    await page.getByRole('button', { name: /^Select south region: You/ }).focus();
    await page.keyboard.press('Enter');
    await page.getByRole('button', { name: /^Select west-north region: Neutral/ }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('list', { name: 'Unit transfers' })).toContainText('south → west-north');
    await page.clock.runFor(8000);
    await expect(plant).toContainText('west-north: You');
    await expect(plant).toContainText('Factory active (2× production)');
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    const before = await plant.textContent();
    await page.clock.runFor(10000);
    await expect(plant).toHaveText(before!);
    await page.getByRole('button', { name: 'Restart', exact: true }).click();
    await expect(plant).toContainText('west-north: Neutral, 14 units. Production city. Factory inactive');
  });
}

test('home previews generated Factories and restores its exact river round after reload', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
  await page.goto('/');
  const preview = page.getByRole('img', { name: 'Generated map preview' });
  await expect(preview).toBeVisible();
  await expect(preview.locator('[aria-label="Factory"]')).toHaveCount(2);
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(page.getByRole('list', { name: 'Territory details' }).getByRole('listitem')).toHaveCount(14);
  const starting = await page.evaluate(() => JSON.parse(localStorage.getItem('dotfield.saved-game.v1')!).territories);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
  await expect(page.getByRole('list', { name: 'Territory details' })).toContainText('Factory inactive (2× production)');
  await expect(page.getByRole('status').filter({ hasText: 'River crossings require paired bridge-city orders' })).toContainText('River crossings require paired bridge-city orders');
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  const restored = await page.evaluate(() => JSON.parse(localStorage.getItem('dotfield.saved-game.v1')!).territories);
  expect(restored).toEqual(starting);
});
