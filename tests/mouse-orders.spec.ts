import { expect, test, type Page } from '@playwright/test';

import { fieldPoints } from './helpers/fieldPoints';
import { openAuthoredMatch } from './helpers/openAuthoredMatch';

test.use({ viewport: { width: 1440, height: 900 }, hasTouch: true });
test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
  await openAuthoredMatch(page);
});
const transfers = (page: Page) =>
  page.getByRole('list', { name: 'Unit transfers' }).getByRole('listitem');
const image = (page: Page) =>
  page
    .getByRole('img', { name: 'Territory board' })
    .evaluate((el) => (el as HTMLCanvasElement).toDataURL());
type FieldPoint = keyof Awaited<ReturnType<typeof fieldPoints>>;
const source = 'source',
  target = 'target',
  enemy = 'enemy',
  outside = 'outside';
const regionSource = 'regionSource',
  regionTarget = 'regionTarget';
// City management reserves space below the field. Resolve positions for every gesture.
async function click(page: Page, name: FieldPoint) {
  const point = (await fieldPoints(page))[name];
  await page.mouse.click(point.x, point.y);
}
async function drag(page: Page, fromName: FieldPoint, toName: FieldPoint) {
  const points = await fieldPoints(page);
  const from = points[fromName],
    to = points[toName];
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 8 });
  await page.mouse.up();
}

test('mouse clicks select a full region, highlight persistently and issue exactly one order', async ({
  page,
}) => {
  const before = await image(page);
  await click(page, regionSource);
  await expect(transfers(page)).toHaveCount(0);
  expect(await image(page)).not.toBe(before);
  await page.screenshot({ path: 'test-results/mouse-source-selected-desktop.png' });
  await click(page, regionTarget);
  await expect(transfers(page)).toHaveCount(7);
  await expect(page.getByRole('listitem').filter({ hasText: /^south:/ })).toHaveText(
    'south: You, 31 units. Production city.',
  );
  await click(page, enemy);
  await expect(transfers(page)).toHaveCount(7);
});

test('re-click and Escape cancel; jitter does not become a drag', async ({ page }) => {
  const before = await image(page);
  await click(page, source);
  await click(page, source);
  await expect.poll(() => image(page)).toBe(before);
  await click(page, target);
  await expect(transfers(page)).toHaveCount(0);
  await click(page, source);
  await page.keyboard.press('Escape');
  await expect.poll(() => image(page)).toBe(before);
  await click(page, target);
  await expect(transfers(page)).toHaveCount(0);
  const jitterSource = (await fieldPoints(page)).source;
  await page.mouse.move(jitterSource.x, jitterSource.y);
  await page.mouse.down();
  await page.mouse.move(jitterSource.x + 3, jitterSource.y + 2);
  await page.mouse.up();
  await click(page, target);
  await expect(transfers(page)).toHaveCount(7);
});

test('drag after click selection issues one order and replacement clicks preserve airborne groups', async ({
  page,
}) => {
  await click(page, source);
  await drag(page, source, target);
  await expect(transfers(page)).toHaveCount(7);
  // Invalid drag must leave the old queue untouched and must not retain click selection.
  await click(page, source);
  await drag(page, source, outside);
  await click(page, enemy);
  await expect(transfers(page)).toHaveCount(7);
  await click(page, source);
  await click(page, enemy);
  await expect(transfers(page).filter({ hasText: 'south → centre' })).toHaveCount(1);
  await expect(transfers(page).filter({ hasText: 'south → north' })).toHaveCount(6);
  await expect(page.getByRole('listitem').filter({ hasText: /^south:/ })).toHaveText(
    'south: You, 26 units. Production city.',
  );
});

test('pause, resize, interruption and restart clear selection without dispatch', async ({
  page,
}) => {
  const playerTransfers = () => transfers(page).filter({ hasText: /^south →/ });
  await click(page, source);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await click(page, target);
  await expect(playerTransfers()).toHaveCount(0);
  await click(page, source);
  await page.setViewportSize({ width: 430, height: 932 });
  // Deliver ResizeObserver callbacks while the test clock is paused.
  await page.clock.runFor(50);
  await click(page, target);
  await expect(playerTransfers()).toHaveCount(0);
  for (const event of ['visibilitychange', 'pagehide']) {
    await click(page, source);
    await page.evaluate(
      (name) => (name === 'pagehide' ? window : document).dispatchEvent(new Event(name)),
      event,
    );
    await click(page, target);
    await expect(playerTransfers()).toHaveCount(0);
  }
  await click(page, source);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await click(page, target);
  await expect(playerTransfers()).toHaveCount(0);
  await click(page, source);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await openAuthoredMatch(page);
  await click(page, target);
  await expect(playerTransfers()).toHaveCount(0);
});

test('keyboard and mouse selection replace one another', async ({ page }) => {
  const keyboardSource = page.getByRole('button', { name: /^Select south region:/ });
  const keyboardTarget = page.getByRole('button', { name: /^Select centre region:/ });
  await keyboardSource.focus();
  await keyboardSource.press('Enter');
  await click(page, source);
  await click(page, target);
  await expect(transfers(page)).toHaveCount(7);
  await keyboardTarget.focus();
  await keyboardTarget.press('Enter');
  await expect(transfers(page)).toHaveCount(7);
  await click(page, source);
  await keyboardTarget.focus();
  await keyboardTarget.press('Enter');
  await click(page, target); // Keyboard activation clears mouse selection even if focus was already here.
  await expect(transfers(page)).toHaveCount(7);
  await expect(page.getByRole('listitem').filter({ hasText: /^south:/ })).toHaveText(
    'south: You, 31 units. Production city.',
  );
  await keyboardSource.focus();
  await keyboardSource.press('Enter');
  await keyboardTarget.focus();
  await keyboardTarget.press('Space');
  await expect(transfers(page).filter({ hasText: 'south → centre' })).toHaveCount(7);
  await expect(page.getByRole('listitem').filter({ hasText: /^south:/ })).toHaveText(
    'south: You, 26 units. Production city.',
  );
});

test('touch taps manage owned cities without dispatch, even following mouse selection; touch dragging still works', async ({
  page,
  context,
}) => {
  const controls = page.getByRole('region', { name: 'Selected city controls' });
  const tap = async (name: FieldPoint) => {
    const point = (await fieldPoints(page))[name];
    await page.touchscreen.tap(point.x, point.y);
  };
  await tap(source);
  await expect(controls).toBeVisible();
  await expect(transfers(page)).toHaveCount(0);
  await tap(source); // Same-city tap toggles management closed, not ground selection.
  await expect(controls).toHaveCount(0);
  await tap(source);
  await tap(target);
  await expect(controls).toHaveCount(0);
  await expect(transfers(page)).toHaveCount(0);
  await click(page, source);
  await tap(target);
  await click(page, target);
  await expect(transfers(page)).toHaveCount(0);
  const points = await fieldPoints(page);
  const cdp = await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [points.source] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [points.target] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(transfers(page)).toHaveCount(7);
  expect(await page.evaluate(() => ({ x: scrollX, y: scrollY }))).toEqual({ x: 0, y: 0 });
});

test('mouse reinforcement uses the same all-but-one dispatch', async ({ page }) => {
  await page.goto('/tests/fixtures/round.html?passive');
  await click(page, source);
  await click(page, target);
  await page.clock.runFor(7800); // Existing deterministic passive capture scenario.
  await expect(page.getByRole('listitem').filter({ hasText: /^centre:/ })).toHaveText(
    /centre: You, \d+ units\./,
  );
  const before = await transfers(page).count();
  const centre = page.getByRole('listitem').filter({ hasText: /^centre:/ });
  const units = Number((await centre.innerText()).match(/(\d+) units/)![1]);
  await click(page, target);
  await click(page, source);
  await expect(transfers(page).filter({ hasText: 'centre → south' })).toHaveCount(
    Math.ceil((units - 1) / 5),
  );
  await expect(centre).toHaveText(
    `centre: You, ${units - Math.min(5, units - 1)} units. Production city.`,
  );
  await expect(transfers(page).filter({ hasText: 'south → centre' })).toHaveCount(before);
});
