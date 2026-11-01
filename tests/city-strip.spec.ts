import { expect, test, type Page } from '@playwright/test';

import { openAuthoredMatch } from './helpers/openAuthoredMatch';

async function tapCity(page: Page, x: number, y: number) {
  const box = (await page.getByRole('img', { name: 'Territory board' }).boundingBox())!;
  const scale = Math.min(box.width / 360, box.height / 480);
  await page.touchscreen.tap(
    box.x + (box.width - 360 * scale) / 2 + x * scale,
    box.y + (box.height - 480 * scale) / 2 + y * scale,
  );
}
for (const viewport of [
  { width: 320, height: 480 },
  { width: 430, height: 844 },
  { width: 1280, height: 720 },
  { width: 1280, height: 480 },
])
  test.describe(`permanent city strip ${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport, hasTouch: true });
    test('selection, conversion, targeting, close and pause never move or resize the map', async ({
      page,
    }) => {
      await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
      await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
      await openAuthoredMatch(page);
      const board = page.getByRole('img', { name: 'Territory board' });
      const strip = page.locator('.city-action-strip');
      await expect(strip).toContainText('Tap a city to convert');
      const original = { board: await board.boundingBox(), strip: await strip.boundingBox() };
      const backing = await board.evaluate((el: HTMLCanvasElement) => ({
        width: el.width,
        height: el.height,
      }));
      const unchanged = async () => {
        await expect
          .poll(async () => ({
            board: await board.boundingBox(),
            strip: await strip.boundingBox(),
          }))
          .toEqual(original);
        expect(
          await board.evaluate((el: HTMLCanvasElement) => ({ width: el.width, height: el.height })),
        ).toEqual(backing);
        const box = (await strip.boundingBox())!;
        expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
        expect(box.height).toBe(66);
        expect(box.y - (original.board!.y + original.board!.height)).toBeCloseTo(12, 1);
        expect(await page.getByRole('button', { name: 'Ground…', exact: true }).count()).toBe(0);
        expect(
          await page.evaluate(() => [
            document.documentElement.scrollWidth,
            document.documentElement.scrollHeight,
          ]),
        ).toEqual([viewport.width, viewport.height]);
        for (const button of await strip.getByRole('button').all()) {
          const rect = (await button.boundingBox())!;
          expect(rect.height).toBeGreaterThanOrEqual(44);
          expect(rect.width).toBeGreaterThanOrEqual(44);
          expect(rect.x).toBeGreaterThanOrEqual(box.x);
          expect(rect.x + rect.width).toBeLessThanOrEqual(box.x + box.width);
          expect(rect.y).toBeGreaterThanOrEqual(box.y);
          expect(rect.y + rect.height).toBeLessThanOrEqual(box.y + box.height);
        }
      };
      await tapCity(page, 180, 440);
      const controls = page.getByRole('region', { name: 'Selected city controls' });
      await expect(controls).toBeVisible();
      await expect(controls).not.toContainText('garrison troops');
      await expect(controls).not.toContainText('Production · troop growth');
      await unchanged();
      await controls.getByRole('button', { name: /Airfield/ }).click();
      await expect(controls).toContainText('Preparing plane');
      await unchanged();
      await page.keyboard.press('Escape');
      await expect(strip).toContainText('Tap a city to convert');
      await unchanged();
      await page.getByRole('button', { name: 'Pause', exact: true }).click();
      await expect(strip).toContainText('Resume to manage cities');
      await unchanged();
      await page.getByRole('button', { name: 'Resume', exact: true }).click();
      await unchanged();
    });
    test('builds Watchtower and Artillery as mutually-exclusive nonproducing city roles', async ({
      page,
    }) => {
      await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
      await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
      await page.goto('/tests/fixtures/airfield.html?scenario=production');
      const board = page.getByRole('img', { name: 'Territory board' });
      const strip = page.locator('.city-action-strip');
      const original = { board: await board.boundingBox(), strip: await strip.boundingBox() };
      await tapCity(page, 180, 430);
      const controls = page.getByRole('region', { name: 'Selected city controls' });
      const south = page
        .getByRole('list', { name: 'Territory details' })
        .getByRole('listitem')
        .filter({ hasText: /^south:/ });
      await expect(
        controls.getByRole('group', { name: 'Build or convert city role' }).getByRole('button'),
      ).toHaveCount(5);
      await expect(
        controls.getByRole('button', { name: /Build Watchtower for 30 troops/ }),
      ).toBeEnabled();
      await expect(
        controls.getByRole('button', { name: /Build Artillery for 40 troops/ }),
      ).toBeEnabled();
      await expect(controls.getByRole('button', { name: 'Close city controls' })).toHaveCount(0);
      await expect(controls.getByRole('button', { name: /Watchtower/ })).toHaveAttribute(
        'title',
        /Watchtower/,
      );
      await controls.getByRole('button', { name: /Build Watchtower for 30 troops/ }).click();
      await expect(
        controls.getByRole('button', { name: /Watchtower, current role/ }),
      ).toBeDisabled();
      await expect(
        controls.getByRole('button', { name: /Watchtower, current role/ }),
      ).toContainText('4/s');
      await expect(south).toContainText('You, 101 units');
      await controls.getByRole('button', { name: /Build Artillery for 40 troops/ }).click();
      await expect(controls.getByRole('button', { name: /Artillery, current role/ })).toContainText(
        '3/s',
      );
      await expect(south).toContainText('You, 61 units');
      await expect
        .poll(async () => ({ board: await board.boundingBox(), strip: await strip.boundingBox() }))
        .toEqual(original);
      for (const button of await controls.getByRole('button').all()) {
        const box = (await button.boundingBox())!;
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
      await page.reload();
      await expect(south).toContainText('Artillery controlled by player');
      await tapCity(page, 180, 430);
      await expect(
        page
          .getByRole('region', { name: 'Selected city controls' })
          .getByRole('button', { name: /Artillery, current role/ }),
      ).toContainText('3/s');
    });
    test('ready, targeting, cancelled and away flight states keep the same reserved geometry', async ({
      page,
    }) => {
      await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
      await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
      await page.goto('/tests/fixtures/airfield.html');
      const board = page.getByRole('img', { name: 'Territory board' });
      const strip = page.locator('.city-action-strip');
      const original = { board: await board.boundingBox(), strip: await strip.boundingBox() };
      const unchanged = async () => {
        expect({ board: await board.boundingBox(), strip: await strip.boundingBox() }).toEqual(
          original,
        );
        const box = (await strip.boundingBox())!;
        expect(box.height).toBe(66);
        expect(box.y - (original.board!.y + original.board!.height)).toBeCloseTo(12, 1);
        const buttons = await strip.getByRole('button').all();
        const rows = [];
        for (const button of buttons) {
          const rect = (await button.boundingBox())!;
          expect(rect.width).toBeGreaterThanOrEqual(44);
          expect(rect.height).toBeGreaterThanOrEqual(44);
          expect(rect.x).toBeGreaterThanOrEqual(box.x);
          expect(rect.x + rect.width).toBeLessThanOrEqual(box.x + box.width);
          expect(rect.y + rect.height).toBeLessThanOrEqual(box.y + box.height);
          rows.push(rect.y + rect.height / 2);
          expect(await button.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
        }
        if (rows.length) expect(Math.max(...rows) - Math.min(...rows)).toBeLessThan(1);
      };
      await tapCity(page, 180, 430);
      const controls = page.getByRole('region', { name: 'Selected city controls' });
      await expect(controls).toContainText('Plane ready');
      await unchanged();
      await controls.getByRole('button', { name: 'Fly', exact: true }).click();
      await expect(controls).toContainText('Tap any other city to fly');
      await unchanged();
      await controls.getByRole('button', { name: 'Cancel', exact: true }).click();
      await unchanged();
      await controls.getByRole('button', { name: 'Fly', exact: true }).click();
      await tapCity(page, 180, 50);
      await expect(controls).toContainText('100 aboard');
      await unchanged();
      await page.clock.runFor(8000);
      await unchanged();
      await page.keyboard.press('Escape');
      await unchanged();
    });
  });
