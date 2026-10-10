import { expect, test, type Page } from '@playwright/test';
import { MAPS } from '../src/board/maps';

async function assertHome(page: Page, wide: boolean) {
  const preview = (await page.getByRole('img', { name: /Map \d preview/ }).boundingBox())!;
  const settings = (await page.locator('.home-setup').boundingBox())!;
  const play = (await page.getByRole('button', { name: 'Play', exact: true }).boundingBox())!;
  const title = (await page.getByRole('heading', { name: 'Choose your field.' }).boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(Math.abs(preview.width / preview.height - .75)).toBeLessThan(.005);
  expect(Math.abs(play.x + play.width / 2 - (title.x + title.width / 2))).toBeLessThan(1);
  expect(play.y).toBeGreaterThan(preview.y + preview.height);
  expect(play.y + play.height).toBeLessThanOrEqual(viewport.height - 15);
  expect(play.height).toBeGreaterThanOrEqual(44);
  expect(preview.y).toBeGreaterThan(title.y + title.height);
  if (wide) {
    expect(settings.x).toBeGreaterThan(preview.x + preview.width);
    expect(preview.width).toBeGreaterThan(280);
  } else {
    expect(settings.y).toBeGreaterThan(preview.y + preview.height);
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
  test(`Home fits all maps and expanded settings at ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    for (let i = 0; i < MAPS.length; i++) {
      await expect(page.getByRole('img', { name: `Map ${i + 1} preview` })).toBeVisible();
      await assertHome(page, viewport.width >= 900 && viewport.height >= 600);
      if (i < MAPS.length - 1) await page.getByRole('button', { name: 'Next map' }).click();
    }
    // Return from the last map to the two-enemy Crossfire map (preview 5).
    for (let i = MAPS.length; i > 5; i--) await page.getByRole('button', { name: 'Previous map' }).click();
    await expect(page.getByRole('img', { name: 'Map 5 preview' })).toBeVisible();
    await page.locator('details summary').click();
    await assertHome(page, viewport.width >= 900 && viewport.height >= 600);
    await page.getByRole('group', { name: 'enemy-2 upgrades' }).getByRole('checkbox', { name: 'Watchtower' }).check();
    await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeInViewport();
    await page.screenshot({ path: `test-results/desktop-home-${viewport.width}x${viewport.height}.png` });
  });
}

test('roomy desktop centers settings without unnecessary two-enemy scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  const settings = page.locator('.home-settings');
  const body = page.locator('.home-body');
  const center = async () => {
    const content = (await settings.boundingBox())!;
    const area = (await body.boundingBox())!;
    expect(Math.abs(content.y + content.height / 2 - (area.y + area.height / 2))).toBeLessThan(1);
    expect(await settings.evaluate(el => el.scrollHeight <= el.clientHeight)).toBe(true);
  };
  await center();
  for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Next map' }).click();
  await page.locator('details summary').click();
  await center();
});

test('resizing preserves map, independent choices and keyboard navigation through Play and Home', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Previous map' }).focus();
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByRole('img', { name: `Map ${MAPS.length} preview` })).toBeVisible();
  for (let i = MAPS.length; i > 5; i--) await page.keyboard.press('ArrowLeft');
  const player = page.getByRole('group', { name: 'Your upgrades' }).getByRole('checkbox', { name: 'Industry' });
  await player.check();
  await page.locator('details summary').click();
  await page.getByLabel('enemy AI behavior').selectOption('aggressive');
  await page.getByLabel('enemy-2 AI behavior').selectOption('defensive');
  const factory = page.getByRole('group', { name: 'enemy-2 upgrades' }).getByRole('checkbox', { name: 'Factory' });
  await factory.check();
  for (const viewport of [{ width: 320, height: 480 }, { width: 1280, height: 480 }, { width: 1440, height: 1000 }]) {
    await page.setViewportSize(viewport);
    await expect(page.getByRole('img', { name: 'Map 5 preview' })).toBeVisible();
    await expect(player).toBeChecked(); await expect(factory).toBeChecked();
    await expect(page.getByLabel('enemy AI behavior')).toHaveValue('aggressive');
    await expect(page.getByLabel('enemy-2 AI behavior')).toHaveValue('defensive');
    await expect(page.locator('details')).toHaveAttribute('open', '');
  }
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(page.getByRole('list', { name: 'Territory details' }).getByRole('listitem')).toHaveCount(23);
  await expect(page.getByRole('listitem').filter({ hasText: /^enemy-east:/ })).toContainText('Factory');
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeFocused();
  await expect(page.getByRole('img', { name: 'Map 5 preview' })).toBeVisible();
  await expect(player).toBeChecked();
  await page.locator('details summary').click();
  await expect(factory).toBeChecked();
});
