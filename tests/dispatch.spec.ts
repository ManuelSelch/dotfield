import { expect, test } from '@playwright/test';
import { fieldPoints } from './helpers/fieldPoints';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });
test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
  await page.goto('/');
});

test('drag sends half and reduces the target as each real batch arrives', async ({ page }) => {
  const { source, target } = await fieldPoints(page);
  const canvas = page.getByRole('img', { name: 'Territory board' });
  const image = () => canvas.evaluate((el) => (el as HTMLCanvasElement).toDataURL());
  const before = await image();
  await page.mouse.move(source.x, source.y);
  await page.mouse.down();
  await page.mouse.move(target.x, target.y, { steps: 8 });
  expect(await image() !== before).toBe(true);
  await page.screenshot({ path: 'test-results/drag-highlight.png' });
  await page.mouse.up();
  await expect(page.getByRole('listitem').filter({ hasText: /^south:/ })).toHaveText('south: You, 18 units.');
  const transfers = page.getByRole('list', { name: 'Unit transfers' });
  await expect(transfers.getByRole('listitem')).toHaveCount(4);
  await expect(transfers).toContainText('5 units: south → centre · travelling');
  const launched = await image();
  await page.clock.runFor(550);
  expect(await image() !== launched).toBe(true);
  await page.screenshot({ path: 'test-results/units-travelling.png' });
  const centre = page.getByRole('listitem').filter({ hasText: /^centre:/ });
  await expect(centre).toHaveText('centre: Neutral, 20 units.');
  await page.clock.runFor(3500); // 4050ms: first batch hit the border, three still in flight.
  await expect(centre).toHaveText('centre: Neutral, 15 units.');
  await expect(transfers.getByRole('listitem')).toHaveCount(3);
  await page.screenshot({ path: 'test-results/first-batch-arrived.png' });
  await page.clock.runFor(300);
  await expect(centre).toHaveText('centre: Neutral, 10 units.');
  await expect(transfers.getByRole('listitem')).toHaveCount(2);
  await page.clock.runFor(700);
  await expect(centre).toHaveText('centre: Neutral, 2 units.');
  await expect(transfers.getByRole('listitem')).toHaveCount(0);
  await expect(page.getByText('Growth preview', { exact: true })).toHaveCount(0);
});

test('off-circle, self-target and non-player drags spend nothing', async ({ page }) => {
  const { source, target, outside, enemy } = await fieldPoints(page);
  for (const [from, to] of [[source, outside], [source, source], [enemy, target], [target, source]]) {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y);
    await page.mouse.up();
  }
  await expect(page.getByRole('listitem').filter({ hasText: /^south:/ })).toHaveText('south: You, 36 units.');
  await expect(page.getByRole('list', { name: 'Unit transfers' }).getByRole('listitem')).toHaveCount(0);
});

test('touch drag dispatches once and never scrolls the page', async ({ page, context }) => {
  const { source, target } = await fieldPoints(page);
  const cdp = await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [source] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [target] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(page.getByRole('listitem').filter({ hasText: /^south:/ })).toHaveText('south: You, 18 units.');
  await expect(page.getByRole('list', { name: 'Unit transfers' }).getByRole('listitem')).toHaveCount(4);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});
