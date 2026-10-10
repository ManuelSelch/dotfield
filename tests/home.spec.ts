import { expect, test } from '@playwright/test';

const mapCounts = [13, 11, 9, 21, 23, 10, 8];
for (const viewport of [{ width: 320, height: 480 }, { width: 430, height: 932 }]) {
  test(`home uses visual arrow selection and supports every map at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
    await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Choose your field.' })).toBeVisible();
    await expect(page.getByRole('img', { name: 'Territory board' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Previous map' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Next map' })).toBeVisible();
    await expect(page.getByText(/Meadow|Forks|Ridge/)).toHaveCount(0);
    await page.clock.runFor(60000);
    for (let index = 0; index < mapCounts.length; index++) {
      if (index > 0) await page.getByRole('button', { name: 'Next map' }).click();
      const preview = page.getByRole('img', { name: `Map ${index + 1} preview` });
      await expect(preview).toBeVisible();
      await expect(preview.locator('circle[cx]')).toHaveCount(mapCounts[index]);
      for (const circle of await preview.locator('circle[cx]').all()) await expect(circle).toHaveAttribute('r', '17');
      await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeInViewport();
      expect(await page.evaluate(() => ({ x: scrollX, y: scrollY }))).toEqual({ x: 0, y: 0 });
      await page.getByRole('button', { name: 'Play', exact: true }).click();
      await expect(page.getByRole('img', { name: 'Territory board' })).toBeVisible();
      const details = page.getByRole('list', { name: 'Territory details' });
      await expect(details.getByRole('listitem')).toHaveCount(mapCounts[index]);
      await expect(details.getByRole('listitem').filter({ hasText: /^south:/ })).toHaveText('south: You, 36 units.');
      await page.getByRole('button', { name: /^Select south region: You/ }).focus();
      const targetId = index < 5 ? 'centre' : index === 5 ? 'west-south' : 'west-north';
      await page.keyboard.press('Enter'); await page.getByRole('button', { name: new RegExp(`^Select ${targetId} region:`) }).focus();
      await page.keyboard.press('Enter');
      await expect(page.getByRole('list', { name: 'Unit transfers' })).toContainText(`south → ${targetId}`);
      await page.clock.runFor(1100);
      await page.getByRole('button', { name: 'Pause', exact: true }).click();
      await page.getByRole('button', { name: 'Restart', exact: true }).click();
      await expect(details.getByRole('listitem')).toHaveCount(mapCounts[index]);
      await page.clock.runFor(2000);
      await expect(page.getByRole('list', { name: 'Unit transfers' }))
        .toContainText(index === 5 ? 'north-east → east-north' : index === 4 ? 'enemy-west →' : 'north →');
      await page.getByRole('button', { name: 'Pause', exact: true }).click();
      await page.getByRole('button', { name: 'Home', exact: true }).click();
      await expect(page.getByRole('img', { name: `Map ${index + 1} preview` })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeFocused();
      await expect(page.getByRole('list', { name: 'Unit transfers' })).toHaveCount(0);
      await page.clock.runFor(10000);
    }
    expect(errors).toEqual([]);
  });
}

test('configures one enemy AI behavior and upgrade independently from player settings', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('group', { name: 'Your upgrades' }).getByRole('checkbox', { name: 'Industry' }).check();
  const enemySettings = page.locator('details');
  await enemySettings.locator('summary').click();
  await expect(page.getByLabel('enemy AI behavior')).toBeVisible();
  await page.getByLabel('enemy AI behavior').selectOption('aggressive');
  const enemyUpgrades = page.getByRole('group', { name: 'enemy upgrades' });
  await enemyUpgrades.getByRole('checkbox', { name: 'Factory' }).check();
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  const details = page.getByRole('list', { name: 'Territory details' });
  await expect(details.getByRole('listitem').filter({ hasText: /^north:/ })).toContainText('Factory');
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await expect(details.getByRole('listitem').filter({ hasText: /^north:/ })).toContainText('Factory');
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await expect(page.getByRole('group', { name: 'Your upgrades' }).getByRole('checkbox', { name: 'Industry' })).toBeChecked();
  await page.locator('details summary').click();
  await expect(enemyUpgrades.getByRole('checkbox', { name: 'Factory' })).toBeChecked();
  await expect(page.getByLabel('enemy AI behavior')).toHaveValue('aggressive');
});

test('two-enemy map exposes and retains separate AI behaviors and upgrades', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 480 });
  await page.goto('/');
  for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Next map' }).click();
  await expect(page.getByRole('img', { name: 'Map 5 preview' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeInViewport();
  await page.locator('details summary').click();
  const enemy = page.getByRole('group', { name: 'enemy upgrades' });
  const enemy2 = page.getByRole('group', { name: 'enemy-2 upgrades' });
  await expect(page.getByLabel('enemy AI behavior')).toBeVisible();
  await expect(page.getByLabel('enemy-2 AI behavior')).toBeVisible();
  await page.getByLabel('enemy AI behavior').selectOption('aggressive');
  await page.getByLabel('enemy-2 AI behavior').selectOption('defensive');
  await enemy.getByRole('checkbox', { name: 'Industry' }).check();
  await enemy2.getByRole('checkbox', { name: 'Factory' }).check();
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  const cities = page.getByRole('list', { name: 'Territory details' });
  await expect(cities.getByRole('listitem').filter({ hasText: /^enemy-west: / })).toBeVisible();
  await expect(cities.getByRole('listitem').filter({ hasText: /^enemy-east:/ })).toContainText('Factory');
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await page.locator('details summary').click();
  await expect(page.getByLabel('enemy AI behavior')).toHaveValue('aggressive');
  await expect(page.getByLabel('enemy-2 AI behavior')).toHaveValue('defensive');
  await expect(enemy.getByRole('checkbox', { name: 'Industry' })).toBeChecked();
  await expect(enemy2.getByRole('checkbox', { name: 'Factory' })).toBeChecked();
});

test('home arrow selection supports keyboard and resets on page reload', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Next map' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('img', { name: 'Map 2 preview' })).toBeVisible();
  await page.getByRole('button', { name: 'Play', exact: true }).focus(); await page.keyboard.press('Enter');
  await expect(page.getByRole('list', { name: 'Territory details' }).getByRole('listitem')).toHaveCount(11);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await expect(page.getByRole('img', { name: 'Map 2 preview' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('img', { name: 'Map 1 preview' })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Territory board' })).toHaveCount(0);
});
