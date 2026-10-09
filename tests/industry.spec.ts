import { expect, test } from '@playwright/test';

test('terminal Play again retains Industry and clears the finished round', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
  await page.goto('/tests/fixtures/round.html?industry');
  const south = page.getByRole('list', { name: 'Territory details' }).getByRole('listitem').filter({ hasText: /^south:/ });
  await page.getByRole('button', { name: /^Select south region/ }).focus(); await page.keyboard.press('Enter');
  await page.getByRole('button', { name: /^Select centre region/ }).focus(); await page.keyboard.press('Enter');
  await page.clock.runFor(12000);
  await expect(page.getByRole('heading', { name: 'Victory' })).toBeVisible();
  await page.getByRole('button', { name: 'Play again', exact: true }).click();
  await expect(south).toHaveText('south: You, 20 units.');
  await expect(page.getByRole('list', { name: 'Unit transfers' }).getByRole('listitem')).toHaveCount(0);
  await page.clock.runFor(850);
  await expect(south).toHaveText('south: You, 21 units.');
});

for (const viewport of [{ width: 320, height: 480 }, { width: 430, height: 932 }]) {
  test(`Industry is player-only and retains setup through pause/restart at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
    await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto('/');
    const industry = page.getByRole('checkbox', { name: 'Industry', exact: true });
    await expect(industry).not.toBeChecked(); await expect(industry).toBeInViewport();
    await industry.focus(); await page.keyboard.press('Space');
    await expect(page.getByText('+25% production · You only')).toBeVisible();
    await page.screenshot({ path: `test-results/industry-home-${viewport.width}.png` });
    const city = (id: string) => page.getByRole('list', { name: 'Territory details' })
      .getByRole('listitem').filter({ hasText: new RegExp(`^${id}:`) });
    for (const map of ['Meadow', 'Forks', 'Ridge']) {
      await page.getByRole('radio', { name: map, exact: true }).check();
      await page.getByRole('button', { name: 'Play', exact: true }).click();
      await expect(city('south')).toHaveText('south: You, 36 units.');
      // Before the opponent's first dispatch: faction production is independently observable.
      await page.clock.runFor(1700);
      await expect(city('south')).toHaveText('south: You, 38 units.');
      await expect(city('north')).toHaveText('north: Opponent, 37 units.');
      await expect(city('centre')).toHaveText('centre: Neutral, 20 units.');
      await page.getByRole('button', { name: 'Pause', exact: true }).click();
      await page.clock.runFor(60000);
      await expect(city('south')).toHaveText('south: You, 38 units.');
      await page.getByRole('button', { name: 'Resume', exact: true }).click();
      await page.clock.runFor(200);
      await expect(city('south')).toHaveText('south: You, 38 units.');
      await page.getByRole('button', { name: 'Pause', exact: true }).click();
      await page.getByRole('button', { name: 'Restart', exact: true }).click();
      await expect(city('south')).toHaveText('south: You, 36 units.');
      await page.clock.runFor(1700);
      await expect(city('south')).toHaveText('south: You, 38 units.');
      await expect(city('north')).toHaveText('north: Opponent, 37 units.');
      await page.getByRole('button', { name: 'Pause', exact: true }).click();
      await page.getByRole('button', { name: 'Home', exact: true }).click();
      await expect(industry).toBeChecked();
    }
    await industry.uncheck(); await page.getByRole('button', { name: 'Play', exact: true }).click();
    await page.clock.runFor(1700);
    await expect(city('south')).toHaveText('south: You, 37 units.');
    await expect(city('north')).toHaveText('north: Opponent, 37 units.');
    expect(await page.evaluate(() => ({ x: scrollX, y: scrollY }))).toEqual({ x: 0, y: 0 });
    await page.reload(); await expect(industry).not.toBeChecked();
    expect(errors).toEqual([]);
  });
}
