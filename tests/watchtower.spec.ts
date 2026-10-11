import { expect, test } from '@playwright/test';

test.use({ hasTouch: true });
for (const viewport of [{ width: 320, height: 480 }, { width: 430, height: 932 }]) {
  test(`Watchtower shows its circle of coverage and retains selection at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
    await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
    await page.goto('/');
    const towerOption = page.getByRole('button', { name: 'Watchtower' });
    await expect(towerOption).toHaveAttribute('aria-pressed', 'false');
    await towerOption.scrollIntoViewIfNeeded();
    await towerOption.tap(); await page.getByRole('button', { name: 'Play', exact: true }).tap();
    const towers = page.getByRole('list', { name: 'Territory details' }).getByRole('listitem').filter({ hasText: /Watchtower controlled by/ });
    await expect(towers).toHaveCount(1);
    await expect(towers).toContainText(/Watchtower controlled by [^,]+, firing within 150 units every 250 ms \(up to 4.0 shots\/second\)\./);
    await page.screenshot({ path: `test-results/watchtower-board-${viewport.width}.png` });
    await page.getByRole('button', { name: 'Pause', exact: true }).tap();
    await page.getByRole('button', { name: 'Home', exact: true }).tap();
    await expect(towerOption).toHaveAttribute('aria-pressed', 'true');
  });
}

test('round fixture exposes the selected Watchtower to accessible region controls', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
  await page.goto('/tests/fixtures/round.html?watchtower');
  const towers = page.getByRole('list', { name: 'Territory details' }).getByRole('listitem').filter({ hasText: /Watchtower controlled by/ });
  await expect(towers).toHaveCount(1);
  await expect(towers).toContainText(/Watchtower controlled by (player|enemy|neutral)/);
});
