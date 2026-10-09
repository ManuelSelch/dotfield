import { expect, test, type Page } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 } });

async function setHidden(page: Page, hidden: boolean) {
  // Simulated lifecycle event; real iPhone backgrounding still needs device testing.
  await page.evaluate((value) => {
    Object.defineProperty(document, 'hidden', { configurable: true, value });
    document.dispatchEvent(new Event('visibilitychange'));
  }, hidden);
}

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
  await page.goto('/');
});

test('whole-unit counts and Canvas grow together; neutrals remain unchanged', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  const territories = page.getByRole('list', { name: 'Territory details' });
  const canvas = page.getByRole('img', { name: 'Territory board' });
  const initialImage = await canvas.evaluate((el) => (el as HTMLCanvasElement).toDataURL());
  await expect(territories.getByText('north: Opponent, 36 units.', { exact: true })).toBeAttached();
  await page.clock.runFor(1100);
  await expect(territories.getByText('north: Opponent, 37 units.', { exact: true })).toBeAttached();
  await expect(territories.getByText('south: You, 37 units.', { exact: true })).toBeAttached();
  expect(await canvas.evaluate((el) => (el as HTMLCanvasElement).toDataURL())).not.toBe(initialImage);
  await page.clock.runFor(2000);
  await expect(territories.getByText('south: You, 39 units.', { exact: true })).toBeAttached();
  await expect(territories.getByText('north-west: Neutral, 8 units.', { exact: true })).toBeAttached();
  await expect(territories.getByText('centre: Neutral, 20 units.', { exact: true })).toBeAttached();
  await expect(page.getByText('Drag to send half · combat comes next.')).toBeVisible();
  expect(errors).toEqual([]);
  await page.screenshot({ path: 'test-results/growth.png' });
});

test('backgrounding freezes growth and resuming never catches up hidden time', async ({ page }) => {
  const player = page.getByRole('listitem').filter({ hasText: /^south:/ });
  await page.clock.runFor(1100);
  await expect(player).toHaveText('south: You, 37 units.');
  await setHidden(page, true);
  await page.clock.runFor(60000);
  await expect(player).toHaveText('south: You, 37 units.');
  await setHidden(page, false);
  await expect(player).toHaveText('south: You, 37 units.');
  await page.clock.runFor(1100);
  await expect(player).toHaveText('south: You, 38 units.');
});

test('a fresh page starts from the initial map rather than previous live state', async ({ page }) => {
  await page.clock.runFor(3100);
  await expect(page.getByRole('listitem').filter({ hasText: /^south:/ })).toHaveText('south: You, 39 units.');
  await page.reload();
  await expect(page.getByRole('listitem').filter({ hasText: /^south:/ })).toHaveText('south: You, 36 units.');
});
