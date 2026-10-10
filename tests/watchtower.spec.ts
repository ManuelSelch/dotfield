import { expect, test } from '@playwright/test';

test.use({ hasTouch: true });
for (const viewport of [{ width: 320, height: 480 }, { width: 430, height: 932 }]) {
  test(`Watchtower shows its circle of coverage and retains selection at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
    await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
    await page.goto('/');
    await page.getByText('Your upgrades', { exact: true }).click();
    const towerOption = page.getByRole('checkbox', { name: 'Watchtower', exact: true });
    await expect(towerOption).not.toBeChecked(); await towerOption.scrollIntoViewIfNeeded();
    await towerOption.check(); await page.getByRole('button', { name: 'Play new map', exact: true }).tap();
    const host = page.getByRole('list', { name: 'Territory details' }).getByRole('listitem').filter({ hasText: /Watchtower controlled by player/ });
    await expect(host).toContainText('Watchtower controlled by player, firing within 72 units every 250 ms (up to 4.0 shots/second).');
    await page.screenshot({ path: `test-results/watchtower-board-${viewport.width}.png` });
    await page.getByRole('button', { name: 'Pause', exact: true }).tap();
    await page.getByRole('button', { name: 'Home', exact: true }).tap();
    await page.getByText('Your upgrades', { exact: true }).click();
    await expect(towerOption).toBeChecked();
  });
}

test('round fixture exposes the selected Watchtower to accessible region controls', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
  await page.goto('/tests/fixtures/round.html?watchtower');
  await expect(page.getByRole('list', { name: 'Territory details' }).getByRole('listitem')
    .filter({ hasText: /^south:/ })).toContainText('Watchtower controlled by player');
});
