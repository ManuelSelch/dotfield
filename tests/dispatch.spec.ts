import { expect, test } from '@playwright/test';

import { BATCH_INTERVAL_MS, TERRITORY_RADIUS, TRAVEL_SPEED } from '../src/game/settings';

import { fieldPoints } from './helpers/fieldPoints';

const firstArrivalMs = Math.ceil(((200 - 2 * TERRITORY_RADIUS) / TRAVEL_SPEED) * 1000) + 100;

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });
test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
  // Isolate player controls/combat from AI orders; actual AI is covered separately.
  await page.goto('/tests/fixtures/round.html?passive');
});

test('drag sends all but one and reduces the target as each real batch arrives', async ({
  page,
}) => {
  const { source, target } = await fieldPoints(page);
  const canvas = page.getByRole('img', { name: 'Territory board' });
  const image = () => canvas.evaluate((el) => (el as HTMLCanvasElement).toDataURL());
  const before = await image();
  await page.mouse.move(source.x, source.y);
  await page.mouse.down();
  await page.mouse.move(target.x, target.y, { steps: 8 });
  expect((await image()) !== before).toBe(true);
  await page.screenshot({ path: 'test-results/drag-highlight.png' });
  await page.mouse.up();
  await expect(page.getByRole('listitem').filter({ hasText: /^south:/ })).toHaveText(
    'south: You, 31 units. Production city.',
  );
  const transfers = page.getByRole('list', { name: 'Unit transfers' });
  await expect(transfers.getByRole('listitem')).toHaveCount(7);
  await expect(transfers).toContainText('5 units: south → centre · travelling');
  const launched = await image();
  await page.clock.runFor(550);
  await expect(page.getByRole('listitem').filter({ hasText: /^south:/ })).toHaveText(
    'south: You, 31 units. Production city.',
  );
  expect((await image()) !== launched).toBe(true);
  await page.screenshot({ path: 'test-results/units-travelling.png' });
  const centre = page.getByRole('listitem').filter({ hasText: /^centre:/ });
  await expect(centre).toHaveText('centre: Neutral, 20 units. Production city.');
  await page.clock.runFor(firstArrivalMs - 550); // First batch has hit the border; six remain in flight.
  await expect(centre).toHaveText('centre: Neutral, 15 units. Production city.');
  await expect(transfers.getByRole('listitem')).toHaveCount(6);
  await page.screenshot({ path: 'test-results/first-batch-arrived.png' });
  await page.clock.runFor(BATCH_INTERVAL_MS);
  await expect(centre).toHaveText('centre: Neutral, 10 units. Production city.');
  await expect(transfers.getByRole('listitem')).toHaveCount(5);
  await page.clock.runFor(5 * BATCH_INTERVAL_MS + 100);
  await expect(centre).toHaveText('centre: You, 16 units. Production city.');
  await expect(transfers.getByRole('listitem')).toHaveCount(0);
  await expect(page.getByText('Growth preview', { exact: true })).toHaveCount(0);
});

test('source units leave one group at a time while normal growth continues', async ({ page }) => {
  const { source, target } = await fieldPoints(page);
  await page.mouse.move(source.x, source.y);
  await page.mouse.down();
  await page.mouse.move(target.x, target.y);
  await page.mouse.up();
  const south = page.getByRole('listitem').filter({ hasText: /^south:/ });
  await expect(south).toHaveText('south: You, 31 units. Production city.');
  await page.clock.runFor(650);
  await expect(south).toHaveText('south: You, 26 units. Production city.');
  await page.clock.runFor(400);
  await expect(south).toHaveText('south: You, 27 units. Production city.');
  await page.clock.runFor(200);
  await expect(south).toHaveText('south: You, 22 units. Production city.');
});

test('replacement drags redirect queued troops and leave old airborne groups travelling', async ({
  page,
}) => {
  const transfers = page.getByRole('list', { name: 'Unit transfers' });
  for (const destinationName of ['target', 'outside', 'source', 'enemy'] as const) {
    // A self-target tap opens management and shrinks the board for the next drag.
    const points = await fieldPoints(page);
    const source = points.source,
      destination = points[destinationName];
    await page.mouse.move(source.x, source.y);
    await page.mouse.down();
    await page.mouse.move(destination.x, destination.y);
    await page.mouse.up();
    if (destinationName !== 'enemy') {
      await expect(transfers.getByRole('listitem')).toHaveCount(7);
      await expect(page.getByRole('listitem').filter({ hasText: /^south:/ })).toHaveText(
        'south: You, 31 units. Production city.',
      );
    }
  }
  await expect(page.getByRole('listitem').filter({ hasText: /^south:/ })).toHaveText(
    'south: You, 26 units. Production city.',
  );
  await expect(transfers.getByRole('listitem').filter({ hasText: 'south → centre' })).toHaveCount(
    1,
  );
  await expect(transfers.getByRole('listitem').filter({ hasText: 'south → north' })).toHaveCount(6);
  await page.clock.runFor(firstArrivalMs);
  await expect(page.getByRole('listitem').filter({ hasText: /^centre:/ })).toHaveText(
    'centre: Neutral, 15 units. Production city.',
  );
});

test('off-board, self-target and non-player region drags spend nothing', async ({ page }) => {
  for (const [fromName, toName] of [
    ['source', 'outside'],
    ['source', 'source'],
    ['enemy', 'target'],
    ['target', 'source'],
  ] as const) {
    const points = await fieldPoints(page);
    const from = points[fromName],
      to = points[toName];
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y);
    await page.mouse.up();
  }
  await expect(page.getByRole('listitem').filter({ hasText: /^south:/ })).toHaveText(
    'south: You, 36 units. Production city.',
  );
  await expect(
    page.getByRole('list', { name: 'Unit transfers' }).getByRole('listitem'),
  ).toHaveCount(0);
});

test('touch drag dispatches once and never scrolls the page', async ({ page, context }) => {
  const { source, target } = await fieldPoints(page);
  const cdp = await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [source] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [target] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(page.getByRole('listitem').filter({ hasText: /^south:/ })).toHaveText(
    'south: You, 31 units. Production city.',
  );
  await expect(
    page.getByRole('list', { name: 'Unit transfers' }).getByRole('listitem'),
  ).toHaveCount(7);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});
