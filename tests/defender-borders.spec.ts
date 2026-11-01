import { expect, test, type Page } from '@playwright/test';

import { SAVED_GAME_KEY } from '../src/game/persistence';
import { createSimulation } from '../src/game/state';
import type { Territory } from '../src/game/types';
import { advanceWorldStep } from '../src/game/world-step';

const cities: Territory[] = [40, 180, 320].flatMap((x, col) =>
  [60, 180, 300, 420].map((y, row) => ({
    id: `city-${col}-${row}`,
    x,
    y,
    owner: col === 0 ? 'player' : col === 1 && row === 0 ? 'neutral' : 'enemy',
    units: col === 0 ? 100 : 10,
    cityType: col === 1 && [1, 2].includes(row) ? 'defender' : 'production',
  })),
);
const city = (page: Page, id: string) =>
  page
    .getByRole('list', { name: 'Territory details' })
    .getByRole('listitem')
    .filter({ hasText: new RegExp(`^${id}:`) });
async function open(page: Page, air = false) {
  await page.clock.install();
  let state = createSimulation(
    cities.map((c) => (air && c.id === 'city-0-1' ? { ...c, cityType: 'airfield' } : c)),
    { unitsPerSecond: 0 },
    undefined,
    undefined,
    { cityId: 'city-1-1', activateAtMs: 120000, targetMs: 180000 },
  );
  if (air) state = advanceWorldStep(state, 20000);
  await page.addInitScript(
    ({ key, value }) => {
      if (!sessionStorage.getItem('defender-fixture')) {
        localStorage.setItem(key, JSON.stringify(value));
        sessionStorage.setItem('defender-fixture', '1');
      }
    },
    { key: SAVED_GAME_KEY, value: { phase: 'paused', territories: cities, ai: null, state } },
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
}
async function point(page: Page, x: number, y: number) {
  const b = (await page.getByRole('img', { name: 'Territory board' }).boundingBox())!,
    s = Math.min(b.width / 360, b.height / 480);
  return { x: b.x + (b.width - 360 * s) / 2 + x * s, y: b.y + (b.height - 480 * s) / 2 + y * s };
}
async function order(page: Page, source: string, target: string) {
  await page.getByRole('button', { name: new RegExp(`Select ${source} region`) }).focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: new RegExp(`Select ${target} region`) }).focus();
  await page.keyboard.press('Enter');
}
for (const width of [320, 430, 1280])
  test(`Defender chain, blocked keyboard/mouse/touch orders and stable strip at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: width === 320 ? 480 : 900 });
    await open(page);
    const canvas = page.getByRole('img', { name: 'Territory board' }),
      box = await canvas.boundingBox(),
      resolution = await canvas.evaluate((c) => ({
        width: (c as HTMLCanvasElement).width,
        height: (c as HTMLCanvasElement).height,
      }));
    await expect(city(page, 'city-1-1')).toContainText(
      'blocks hostile ground transit through its region',
    );
    await expect(city(page, 'city-1-2')).toContainText(
      'blocks hostile ground transit through its region',
    );
    await expect(city(page, 'city-1-1')).toContainText('Relay objective');
    await order(page, 'city-0-1', 'city-2-1');
    await expect(
      page.getByText(
        'Defender city-1-1 blocks enemy ground transit. Attack it or stage around it.',
        { exact: true },
      ),
    ).toBeVisible();
    await expect(city(page, 'city-0-1')).toContainText('100 units');
    const from = await point(page, 40, 180),
      to = await point(page, 320, 180);
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 8 });
    await page.mouse.up();
    await expect(city(page, 'city-0-1')).toContainText('100 units');
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [from] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [to] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await cdp.detach();
    await expect(city(page, 'city-0-1')).toContainText('100 units');
    // The open end permits staging; attacking the frontline Defender is also legal.
    await order(page, 'city-0-0', 'city-1-0');
    await expect(city(page, 'city-0-0')).toContainText('95 units');
    await order(page, 'city-0-1', 'city-1-1');
    await expect(city(page, 'city-0-1')).toContainText('95 units');
    expect(await canvas.boundingBox()).toEqual(box);
    expect(
      await canvas.evaluate((c) => ({
        width: (c as HTMLCanvasElement).width,
        height: (c as HTMLCanvasElement).height,
      })),
    ).toEqual(resolution);
    const strip = page.locator('.city-action-strip');
    expect((await strip.boundingBox())!.height).toBe(66);
    await page.getByRole('button', { name: 'Pause', exact: true }).click();
    expect(await canvas.boundingBox()).toEqual(box);
    await page.reload();
    await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
    await expect(city(page, 'city-1-1')).toContainText('Defender city');
    await page.getByRole('button', { name: 'Restart', exact: true }).click();
    await expect(city(page, 'city-0-1')).toContainText('100 units');
  });

test('a plane delivers behind the fortified border without a ground dispatch', async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 900 });
  await open(page, true);
  await page.getByRole('button', { name: /Select city-0-1 region/ }).focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Fly', exact: true }).click();
  await page.getByRole('button', { name: /Select city-2-1 region/ }).focus();
  await page.keyboard.press('Enter');
  await expect(city(page, 'city-0-1')).toContainText('1 units');
  await page.clock.runFor(9000);
  await expect(city(page, 'city-2-1')).toContainText('You, 89 units');
  await expect(city(page, 'city-1-1')).toContainText('Opponent, 10 units');
});
