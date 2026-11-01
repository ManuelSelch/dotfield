import { expect, test, type Page } from '@playwright/test';

import { fieldPoints } from './helpers/fieldPoints';

async function setup(page: Page) {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
  await page.goto('/tests/fixtures/round.html?passive');
}
async function pixel(page: Page, point: { x: number; y: number }) {
  return page.getByRole('img', { name: 'Territory board' }).evaluate((el, p) => {
    const canvas = el as HTMLCanvasElement,
      box = canvas.getBoundingClientRect();
    return Array.from(
      canvas
        .getContext('2d')!
        .getImageData(
          Math.floor((p.x - box.x) * devicePixelRatio),
          Math.floor((p.y - box.y) * devicePixelRatio),
          1,
          1,
        ).data,
    ).slice(0, 3);
  }, point);
}

for (const [width, height, dpr] of [
  [320, 568, 1],
  [430, 932, 3],
])
  test.describe(`whole regions at ${width}px / DPR ${dpr}`, () => {
    test.use({ viewport: { width, height }, deviceScaleFactor: dpr });
    test('selects far outside circles, highlights full regions, and recolors on capture', async ({
      page,
    }) => {
      await setup(page);
      const { regionSource, regionTarget } = await fieldPoints(page);
      expect(await pixel(page, regionSource)).toEqual([220, 236, 227]);
      expect(await pixel(page, regionTarget)).toEqual([237, 240, 231]);
      await page.mouse.move(regionSource.x, regionSource.y);
      await page.mouse.down();
      await page.mouse.move(regionTarget.x, regionTarget.y);
      // Sample away from the drag line, which legitimately overlays its pointer endpoint.
      expect(await pixel(page, regionSource)).toEqual([196, 224, 209]);
      expect(await pixel(page, regionTarget)).toEqual([213, 227, 210]);
      await page.screenshot({ path: `test-results/city-region-selection-${width}.png` });
      await page.mouse.up();
      await expect(page.getByRole('listitem').filter({ hasText: /^south:/ })).toHaveText(
        'south: You, 31 units. Production city.',
      );
      await expect(
        page.getByRole('list', { name: 'Unit transfers' }).getByRole('listitem'),
      ).toHaveCount(7);
      await page.clock.runFor(7800);
      await expect(page.getByRole('listitem').filter({ hasText: /^centre:/ })).toHaveText(
        /centre: You, \d+ units\./,
      );
      expect(await pixel(page, regionTarget)).toEqual([220, 236, 227]);
      await page.screenshot({ path: `test-results/city-region-captured-${width}.png` });
    });
  });

test.describe('region touch and keyboard controls', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });
  test('touch dispatches from region edges without moving the page', async ({ page, context }) => {
    await setup(page);
    const { regionSource, regionTarget } = await fieldPoints(page);
    const cdp = await context.newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [regionSource] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [regionTarget] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect(
      page.getByRole('list', { name: 'Unit transfers' }).getByRole('listitem'),
    ).toHaveCount(7);
    expect(await page.evaluate(() => scrollY)).toBe(0);
  });
  test('keyboard region selection supports cancellation and Enter/Space dispatch', async ({
    page,
  }) => {
    await setup(page);
    const source = page.getByRole('button', { name: /^Select south region:/ });
    const target = page.getByRole('button', { name: /^Select centre region:/ });
    const transfers = page.getByRole('list', { name: 'Unit transfers' });
    await source.focus();
    await source.press('Enter');
    await target.focus();
    await target.press('Escape');
    await target.press('Enter');
    await expect(transfers.getByRole('listitem')).toHaveCount(0);
    await source.focus();
    await source.press('Enter');
    await target.focus();
    await target.press('Space');
    await expect(transfers.getByRole('listitem')).toHaveCount(7);
    // Reserved defenders remain selectable for a replacement keyboard order.
    await source.focus();
    await source.press('Enter');
    const nextTarget = page.getByRole('button', { name: /^Select north region:/ });
    await nextTarget.focus();
    await nextTarget.press('Enter');
    await expect(transfers.getByRole('listitem').filter({ hasText: 'south → centre' })).toHaveCount(
      1,
    );
    await expect(transfers.getByRole('listitem').filter({ hasText: 'south → north' })).toHaveCount(
      6,
    );
  });
});
