import { expect, test } from '@playwright/test';

for (const viewport of [{ width: 320, height: 480 }, { width: 430, height: 932 }]) {
  test(`home waits for Play and supports each map at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
    await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Choose your field.' })).toBeVisible();
    await expect(page.getByRole('img', { name: 'Territory board' })).toHaveCount(0);
    await page.clock.runFor(60000);
    for (const [name, cities] of [['Meadow', 13], ['Forks', 11], ['Ridge', 9]] as const) {
      await page.getByRole('radio', { name, exact: true }).check();
      await expect(page.getByRole('img', { name: `${name} map preview` })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeInViewport();
      expect(await page.evaluate(() => ({ x: scrollX, y: scrollY }))).toEqual({ x: 0, y: 0 });
      await page.getByRole('button', { name: 'Play', exact: true }).click();
      await expect(page.getByText(name, { exact: true })).toBeVisible();
      const details = page.getByRole('list', { name: 'Territory details' });
      await expect(details.getByRole('listitem')).toHaveCount(cities);
      await expect(details.getByRole('listitem').filter({ hasText: /^south:/ })).toHaveText('south: You, 36 units.');
      // Keyboard whole-region dispatch on every selected map.
      await page.getByRole('button', { name: /^Select south region: You/ }).focus();
      await page.keyboard.press('Enter'); await page.getByRole('button', { name: /^Select centre region: Neutral/ }).focus();
      await page.keyboard.press('Enter');
      await expect(page.getByRole('list', { name: 'Unit transfers' })).toContainText('south → centre');
      await page.clock.runFor(1100);
      await page.getByRole('button', { name: 'Pause', exact: true }).click();
      await page.getByRole('button', { name: 'Restart', exact: true }).click();
      await expect(details.getByRole('listitem')).toHaveCount(cities);
      await expect(details.getByRole('listitem').filter({ hasText: /^south:/ })).toHaveText('south: You, 36 units.');
      await page.getByRole('button', { name: 'Pause', exact: true }).click();
      await page.getByRole('button', { name: 'Home', exact: true }).click();
      await expect(page.getByRole('radio', { name, exact: true })).toBeChecked();
      await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeFocused();
      await expect(page.getByRole('list', { name: 'Unit transfers' })).toHaveCount(0);
      await page.clock.runFor(10000);
    }
    expect(errors).toEqual([]);
  });
}

test('home map selection supports keyboard Play and resets on page reload', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('radio', { name: 'Forks', exact: true }).focus();
  await page.keyboard.press('Space');
  await page.getByRole('button', { name: 'Play', exact: true }).focus(); await page.keyboard.press('Enter');
  await expect(page.getByRole('list', { name: 'Territory details' }).getByRole('listitem')).toHaveCount(11);
  await page.reload();
  await expect(page.getByRole('radio', { name: 'Meadow', exact: true })).toBeChecked();
  await expect(page.getByRole('img', { name: 'Territory board' })).toHaveCount(0);
});
