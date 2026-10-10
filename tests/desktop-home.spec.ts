import { expect, test, type Page } from '@playwright/test';

async function assertHome(page: Page, wide: boolean) {
  const preview = (await page.getByRole('img', { name: 'Generated map preview' }).boundingBox())!;
  const settings = (await page.locator('.home-settings').boundingBox())!;
  const play = (await page.getByRole('button', { name: 'Play', exact: true }).boundingBox())!;
  const reroll = (await page.getByRole('button', { name: 'Reroll' }).boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(Math.abs(preview.width / preview.height - .75)).toBeLessThan(.005);
  expect(play.height).toBeGreaterThanOrEqual(44);
  expect(Math.abs(reroll.y - play.y)).toBeLessThan(1);
  expect(reroll.x + reroll.width).toBeLessThanOrEqual(play.x);
  if (wide) {
    expect(preview.x).toBeGreaterThan(settings.x + settings.width);
    expect(preview.width).toBeGreaterThan(250);
  } else {
    expect(preview.y).toBeGreaterThan(settings.y + settings.height);
    expect(play.y + play.height).toBeLessThanOrEqual(viewport.height);
  }
  expect(await page.evaluate(() => ({ x: scrollX, y: scrollY,
    width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight })))
    .toEqual({ x: 0, y: 0, width: viewport.width, height: viewport.height });
}

for (const viewport of [
  { width: 320, height: 480 }, { width: 430, height: 932 },
  { width: 768, height: 1024 }, { width: 1280, height: 720 },
  { width: 1440, height: 900 }, { width: 1280, height: 480 },
]) {
  test(`Home has responsive ordering and reachable expanded settings at ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await assertHome(page, viewport.width > 760);
    await page.getByRole('group', { name: 'Number of enemy factions' }).getByRole('button', { name: '4', exact: true }).click();
    await page.getByText('Enemy settings', { exact: true }).click();
    await page.getByRole('group', { name: 'enemy-4 upgrades' }).getByRole('checkbox', { name: 'Watchtower' }).check();
    await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Reroll' }).scrollIntoViewIfNeeded();
    await page.getByRole('button', { name: 'Reroll' }).click();
    await assertHome(page, viewport.width > 760);
    await page.screenshot({ path: `test-results/generated-home-${viewport.width}x${viewport.height}.png` });
  });
}

test('resizing preserves map preview and independent choices through Play and Home', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await page.getByText('Your upgrades', { exact: true }).click();
  const player = page.getByRole('group', { name: 'Your upgrades' }).getByRole('checkbox', { name: 'Industry' });
  await player.check();
  await page.getByText('Enemy settings', { exact: true }).click();
  await page.getByLabel('Enemy 1 behavior').selectOption('aggressive');
  await page.getByLabel('Enemy 2 behavior').selectOption('defensive');
  const factory = page.getByRole('group', { name: 'enemy-2 upgrades' }).getByRole('checkbox', { name: 'Factory' });
  await factory.check();
  const coordinates = await page.getByRole('img', { name: 'Generated map preview' }).innerHTML();
  for (const viewport of [{ width: 320, height: 480 }, { width: 1280, height: 480 }, { width: 1440, height: 1000 }]) {
    await page.setViewportSize(viewport);
    expect(await page.getByRole('img', { name: 'Generated map preview' }).innerHTML()).toBe(coordinates);
    await expect(player).toBeChecked(); await expect(factory).toBeChecked();
    await expect(page.getByLabel('Enemy 1 behavior')).toHaveValue('aggressive');
    await expect(page.getByLabel('Enemy 2 behavior')).toHaveValue('defensive');
  }
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(page.getByRole('list', { name: 'Territory details' }).getByRole('listitem')).toHaveCount(14);
  await expect(page.getByRole('listitem').filter({ hasText: /Factory active/ })).toContainText('Faction enemy-2');
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeFocused();
  await page.getByText('Your upgrades', { exact: true }).click();
  await expect(player).toBeChecked();
  await page.getByText('Enemy settings', { exact: true }).click();
  await expect(factory).toBeChecked();
});
