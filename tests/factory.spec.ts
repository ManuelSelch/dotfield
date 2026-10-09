import { expect, test } from '@playwright/test';

test.use({ hasTouch: true });
for (const viewport of [{ width: 320, height: 480 }, { width: 430, height: 932 }]) {
  test(`Factory doubles only the starting city and stacks with Industry at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
    await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto('/');
    const factory = page.getByRole('checkbox', { name: 'Factory', exact: true });
    const industry = page.getByRole('checkbox', { name: 'Industry', exact: true });
    await expect(factory).not.toBeChecked(); await expect(factory).toBeInViewport();
    await factory.focus(); await page.keyboard.press('Space');
    const city = (id: string) => page.getByRole('list', { name: 'Territory details' })
      .getByRole('listitem').filter({ hasText: new RegExp(`^${id}:`) });
    let currentMap = 0;
    for (const stack of [false, true]) {
      await industry.setChecked(stack);
      for (let mapIndex = 0; mapIndex < 4; mapIndex++) {
        while (currentMap !== mapIndex) {
          await page.getByRole('button', { name: 'Next map' }).click();
          currentMap = (currentMap + 1) % 4;
        }
        await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeInViewport();
        await page.screenshot({ path: `test-results/factory-home-${viewport.width}.png` });
        await page.getByRole('button', { name: 'Play', exact: true }).tap();
        await expect(city('south')).toHaveText('south: You, 36 units. Factory active (2× production).');
        await expect(page.getByRole('button', { name: /^Select south region:.*Factory active/ })).toHaveCount(1);
        await page.clock.runFor(1700);
        await expect(city('south')).toContainText(`You, ${stack ? 40 : 39} units.`);
        await expect(city('north')).toHaveText('north: Opponent, 37 units.');
        await expect(city('centre')).toHaveText('centre: Neutral, 20 units.');
        await page.screenshot({ path: `test-results/factory-board-map-${mapIndex + 1}-${viewport.width}.png` });
        await page.getByRole('button', { name: 'Pause', exact: true }).tap();
        await page.clock.runFor(60000);
        await expect(city('south')).toContainText(`You, ${stack ? 40 : 39} units.`);
        await page.getByRole('button', { name: 'Restart', exact: true }).tap();
        await expect(city('south')).toContainText('You, 36 units. Factory active');
        await page.clock.runFor(1700);
        await expect(city('south')).toContainText(`You, ${stack ? 40 : 39} units.`);
        await page.getByRole('button', { name: 'Pause', exact: true }).tap();
        await page.getByRole('button', { name: 'Home', exact: true }).tap();
        await expect(factory).toBeChecked();
      }
    }
    await factory.uncheck(); await industry.uncheck();
    await page.getByRole('button', { name: 'Play', exact: true }).tap();
    await page.clock.runFor(1700); await expect(city('south')).toHaveText('south: You, 37 units.');
    expect(await page.evaluate(() => ({ x: scrollX, y: scrollY }))).toEqual({ x: 0, y: 0 });
    await page.reload(); await expect(factory).not.toBeChecked();
    expect(errors).toEqual([]);
  });
}

test('terminal replay recreates a single Factory and retained Industry multiplier', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
  await page.goto('/tests/fixtures/round.html?factory&industry');
  await page.getByRole('button', { name: /^Select south region/ }).focus(); await page.keyboard.press('Enter');
  await page.getByRole('button', { name: /^Select centre region/ }).focus(); await page.keyboard.press('Enter');
  await page.clock.runFor(12000);
  await expect(page.getByRole('heading', { name: 'Victory' })).toBeVisible();
  await page.getByRole('button', { name: 'Play again', exact: true }).click();
  const host = page.getByRole('list', { name: 'Territory details' }).getByRole('listitem').filter({ hasText: /^south:/ });
  await expect(host).toHaveText('south: You, 20 units. Factory active (2× production).');
  await page.clock.runFor(850);
  await expect(host).toHaveText('south: You, 22 units. Factory active (2× production).');
});
