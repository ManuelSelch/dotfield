import { expect, test } from '@playwright/test';
import { fieldPoints } from './helpers/fieldPoints';
import { TERRITORY_RADIUS, TRAVEL_SPEED, BATCH_INTERVAL_MS } from '../src/game/settings';

test.use({ viewport: { width: 390, height: 844 } });

async function setup(page: import('@playwright/test').Page, query = '') {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
  await page.goto(`/tests/fixtures/round.html${query}`);
}

async function attack(page: import('@playwright/test').Page) {
  const { source, target } = await fieldPoints(page);
  await page.mouse.move(source.x, source.y);
  await page.mouse.down();
  await page.mouse.move(target.x, target.y, { steps: 5 });
  await page.mouse.up();
}

test('victory freezes the board and replay resets units, troops, outcome and clock', async ({ page }) => {
  await setup(page);
  await attack(page);
  await page.clock.runFor(Math.ceil((200 - 2 * TERRITORY_RADIUS) / TRAVEL_SPEED * 1000) + BATCH_INTERVAL_MS + 150);
  const result = page.getByRole('region', { name: 'Victory' });
  await expect(result).toBeVisible();
  const canvas = page.getByRole('img', { name: 'Territory board' });
  const image = () => canvas.evaluate(el => (el as HTMLCanvasElement).toDataURL());
  const finished = await image();
  const details = page.getByRole('list', { name: 'Territory details' });
  const finishedCounts = await details.textContent();
  // Remaining friendly batches are frozen, not allowed to reinforce later.
  await expect(page.getByRole('list', { name: 'Unit transfers' }).getByRole('listitem')).toHaveCount(2);
  await page.screenshot({ path: 'test-results/victory.png' });
  await attack(page);
  await page.clock.runFor(60000);
  expect(await image()).toBe(finished);
  expect(await details.textContent()).toBe(finishedCounts);

  await page.getByRole('button', { name: 'Play again' }).click();
  await expect(result).toHaveCount(0);
  await expect(details.getByRole('listitem').filter({ hasText: /^south:/ })).toHaveText('south: You, 20 units. Production city.');
  await expect(details.getByRole('listitem').filter({ hasText: /^centre:/ })).toHaveText('centre: Opponent, 1 units. Production city.');
  await expect(page.getByRole('list', { name: 'Unit transfers' }).getByRole('listitem')).toHaveCount(0);
  await page.clock.runFor(1100);
  await expect(details.getByRole('listitem').filter({ hasText: /^south:/ })).toHaveText('south: You, 21 units. Production city.');
  await attack(page);
  await expect(page.getByRole('list', { name: 'Unit transfers' }).getByRole('listitem')).toHaveCount(4);
  await page.clock.runFor(6500);
  await expect(result).toBeVisible(); // A second round finishes without duplicate listeners.
});

test('defeat is visible, offers replay and remains frozen', async ({ page }) => {
  await setup(page, '?defeat');
  await expect(page.getByRole('region', { name: 'Defeat' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Play again' })).toBeVisible();
  const details = page.getByRole('list', { name: 'Territory details' });
  const before = await details.textContent();
  await page.clock.runFor(10000);
  expect(await details.textContent()).toBe(before);
  await page.screenshot({ path: 'test-results/defeat.png' });
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight)).toBe(true);
});
