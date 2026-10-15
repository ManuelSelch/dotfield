import { expect, test } from '@playwright/test';
import { openAuthoredMatch } from './helpers/openAuthoredMatch';

for (const width of [320, 430]) {
  test(`three hostile batches are blocked before garrison damage at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
    await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
    await page.goto('/tests/fixtures/round.html?shield-battle');
    const target = page.getByRole('list', { name: 'Territory details' }).getByRole('listitem').filter({ hasText: /^target:/ });
    await expect(target).toContainText('12 units. Production city. Shields: 3 active charges');
    await page.clock.runFor(2400);
    await expect(target).toContainText('12 units. Production city. Shields: 2 active charges');
    await expect(page.getByRole('button', { name: /^Select target region/ })).toHaveAttribute('aria-label', /Shields: 2 active charges; each blocks one hostile troop-arrival batch/);
    await page.screenshot({ path: `test-results/capture-shield-${width}.png` });
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    const paused = await target.textContent();
    await page.clock.runFor(10000);
    await expect(target).toHaveText(paused!);
    // Resume the fixture's saved partial shield in the real application.
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
    await expect(target).toHaveText(paused!);
    await page.getByRole('button', { name: 'Resume', exact: true }).click();
    await page.clock.runFor(650);
    await expect(target).toContainText('12 units. Production city. Shields: 1 active charge');
    await page.clock.runFor(600);
    await expect(target).toContainText('12 units. Production city. Shields depleted');
    await page.clock.runFor(650);
    await expect(target).toContainText('7 units. Production city. Shields depleted');
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    await page.reload();
    await expect(target).toContainText('7 units. Production city. Shields depleted');
    await page.getByRole('button', { name: 'Restart', exact: true }).click();
    await expect(target).toHaveText('target: Neutral, 2 units. Production city.');
  });
}

test('Home selection, real capture, reload and restart retain rules without granting starting shields', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
  await page.goto('/');
  await page.getByText('Your upgrades', { exact: true }).click();
  const shield = page.getByRole('group', { name: 'Your upgrades', exact: true }).getByRole('button', { name: 'Capture shield', exact: true });
  await shield.click();
  await openAuthoredMatch(page, 0, { player: ['capture-shield'] });
  const details = page.getByRole('list', { name: 'Territory details' });
  await expect(details).not.toContainText('Shields:');
  await page.getByRole('button', { name: /^Select south region/ }).focus(); await page.keyboard.press('Enter');
  await page.getByRole('button', { name: /^Select south-west region/ }).focus(); await page.keyboard.press('Enter');
  await page.clock.runFor(5500);
  await expect(details).toContainText('Shields: 3 active charges');
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  const before = await details.textContent();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
  await expect(details).toHaveText(before!);
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await expect(details).not.toContainText('Shields:');
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await page.getByText('Your upgrades', { exact: true }).click();
  // Generated match preferences now persist across reloads.
  await expect(shield).toHaveAttribute('aria-pressed', 'true');
});
