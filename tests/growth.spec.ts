import { expect, test, type Page } from '@playwright/test';
import { openAuthoredMatch } from './helpers/openAuthoredMatch';

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
  await openAuthoredMatch(page);
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
  await expect(territories.getByText('north: Opponent, 36 units. Production city.', { exact: true })).toBeAttached();
  await page.clock.runFor(1100);
  await expect(territories.getByText('north: Opponent, 37 units. Production city.', { exact: true })).toBeAttached();
  await expect(territories.getByText('south: You, 37 units. Production city.', { exact: true })).toBeAttached();
  expect(await canvas.evaluate((el) => (el as HTMLCanvasElement).toDataURL())).not.toBe(initialImage);
  await page.clock.runFor(2000);
  await expect(territories.getByText('south: You, 39 units. Production city.', { exact: true })).toBeAttached();
  await expect(territories.getByText('north-west: Neutral, 8 units. Production city.', { exact: true })).toBeAttached();
  await expect(territories.getByText('centre: Neutral, 20 units. Production city.', { exact: true })).toBeAttached();
  await expect(page.getByText('Drag between regions · leave one behind.')).toHaveCount(0);
  expect(errors).toEqual([]);
  await page.screenshot({ path: 'test-results/growth.png' });
});

test('backgrounding freezes growth and resuming never catches up hidden time', async ({ page }) => {
  const player = page.getByRole('listitem').filter({ hasText: /^south:/ });
  await page.clock.runFor(1100);
  await expect(player).toHaveText('south: You, 37 units. Production city.');
  await setHidden(page, true);
  await page.clock.runFor(60000);
  await expect(player).toHaveText('south: You, 37 units. Production city.');
  await setHidden(page, false);
  await expect(player).toHaveText('south: You, 37 units. Production city.');
  await page.clock.runFor(1100);
  await expect(player).toHaveText('south: You, 38 units. Production city.');
});

test('city counters stop at 50 and production resumes after sending troops', async ({ page }) => {
  await page.goto('/tests/fixtures/round.html?passive&industry&factory');
  const player = page.getByRole('listitem').filter({ hasText: /^south:/ });
  const enemy = page.getByRole('listitem').filter({ hasText: /^north:/ });
  await page.clock.runFor(15100);
  await expect(player).toContainText('south: You, 50 units.');
  await expect(enemy).toHaveText('north: Opponent, 50 units. Production city.');
  await page.clock.runFor(30000);
  await expect(player).toContainText('south: You, 50 units.');
  await expect(enemy).toHaveText('north: Opponent, 50 units. Production city.');

  await page.getByRole('button', { name: /^Select south region:/ }).press('Enter');
  await page.getByRole('button', { name: /^Select centre region:/ }).press('Enter');
  await expect(player).toContainText('south: You, 45 units.');
  await page.clock.runFor(450);
  await expect(player).toContainText('south: You, 46 units.');
});

test('Home abandons the saved round and Play starts fresh armies', async ({ page }) => {
  await page.clock.runFor(3100);
  await expect(page.getByRole('listitem').filter({ hasText: /^south:/ })).toHaveText('south: You, 39 units. Production city.');
  expect(await page.evaluate(() => localStorage.getItem('dotfield.saved-game.v1'))).not.toBeNull();
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  expect(await page.evaluate(() => localStorage.getItem('dotfield.saved-game.v1'))).toBeNull();
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  const game = await page.evaluate(() => JSON.parse(localStorage.getItem('dotfield.saved-game.v1')!));
  expect(game.territories.find((city: { owner: string }) => city.owner === 'player').units).toBe(36);
});
