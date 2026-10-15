import { expect, test, type Page } from '@playwright/test';
import { openAuthoredMatch } from './helpers/openAuthoredMatch';

const city = (page: Page, id: string) => page.getByRole('list', { name: 'Territory details' }).getByRole('listitem').filter({ hasText: new RegExp(`^${id}:`) });
async function tap(page: Page, x: number, y: number) {
  const box = (await page.getByRole('img', { name: 'Territory board' }).boundingBox())!;
  const scale = Math.min(box.width / 360, box.height / 480);
  await page.touchscreen.tap(box.x + (box.width - 360 * scale) / 2 + x * scale,
    box.y + (box.height - 480 * scale) / 2 + y * scale);
}
async function open(page: Page, scenario = 'ready') {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
  await page.goto(`/tests/fixtures/airfield.html?scenario=${scenario}`);
}
for (const width of [320, 430]) {
  test.describe(`city conversion and flights ${width}px`, () => {
    test.use({ viewport: { width, height: 844 }, hasTouch: true });
    test('production app keeps management actions and board inside the mobile viewport', async ({ page }) => {
      await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
      await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
      await openAuthoredMatch(page);
      await tap(page, 180, 440);
      const controls = page.getByRole('region', { name: 'Selected city controls' });
      await expect(controls).toBeVisible();
      const box = (await controls.boundingBox())!;
      expect(box.y + box.height).toBeLessThanOrEqual(844);
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.width).toBeLessThanOrEqual(width);
      const board = (await page.getByRole('img', { name: 'Territory board' }).boundingBox())!;
      expect(board.y + board.height).toBeLessThanOrEqual(box.y + 1);
      for (const button of await controls.getByRole('button').all()) expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      await controls.getByRole('button', { name: /Airfield/ }).click();
      await expect(controls).toContainText('Preparing plane');
      await expect(city(page, 'south')).toContainText('6 units');
      await expect(controls.getByRole('button', { name: 'Fly', exact: true })).toBeDisabled();
    });
    test('tap conversion spends troops once, stops growth and recharges Defender shields', async ({ page }) => {
      await open(page, 'production');
      await tap(page, 180, 430);
      const controls = page.getByRole('region', { name: 'Selected city controls' });
      await expect(controls).toBeVisible();
      await controls.getByRole('button', { name: /Defender/ }).click();
      await expect(city(page, 'south')).toContainText('111 units');
      await expect(controls.getByRole('button', { name: /Defender/ })).toBeDisabled();
      await page.clock.runFor(10_100);
      await expect(city(page, 'south')).toContainText('111 units');
      await expect(controls).toContainText('1/3 shields');
      expect(await page.evaluate(() => ({ x: scrollX, y: scrollY }))).toEqual({ x: 0, y: 0 });
    });
    test('100 troop airlift crosses river and mountain, unloads through three shields, then returns', async ({ page }) => {
      await open(page);
      await tap(page, 180, 430);
      const controls = page.getByRole('region', { name: 'Selected city controls' });
      await controls.getByRole('button', { name: 'Fly', exact: true }).click();
      await tap(page, 180, 50);
      await expect(city(page, 'south')).toContainText('31 units');
      await expect(controls).toContainText('100 aboard');
      await expect(controls.getByRole('button', { name: /Production/ })).toBeDisabled();
      await expect(page.getByRole('list', { name: 'Unit transfers' }).getByRole('listitem').filter({ hasText: /^\d+ units:/ })).toHaveCount(0);
      for (let i = 0; i < 40 && !(await city(page, 'north').innerText()).includes('You, 65 units'); i++) {
        await page.clock.runFor(500);
      }
      await expect(city(page, 'north')).toContainText('You, 65 units');
      await expect(controls).toContainText('Returning empty');
      await page.clock.runFor(6_000);
      await expect(controls).toContainText('Turnaround');
      await page.clock.runFor(10_000);
      await expect(controls.getByRole('button', { name: 'Fly', exact: true })).toBeEnabled();
      await expect(city(page, 'south')).toContainText('31 units');
    });
    test('cancel boards nothing; friendly delivery reinforces and reload retains a paused trip', async ({ page }) => {
      await open(page);
      await tap(page, 180, 430);
      const controls = page.getByRole('region', { name: 'Selected city controls' });
      await controls.getByRole('button', { name: 'Fly', exact: true }).click();
      await controls.getByRole('button', { name: 'Cancel', exact: true }).click();
      await expect(city(page, 'south')).toContainText('131 units');
      await controls.getByRole('button', { name: 'Fly', exact: true }).click();
      await tap(page, 80, 290);
      await page.clock.runFor(500);
      await page.getByRole('button', { name: 'Pause', exact: true }).click();
      await page.reload();
      await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
      await expect(city(page, 'south')).toContainText('31 units');
      await page.clock.runFor(30_000);
      await expect(city(page, 'west-south')).toContainText('18 units');
      await page.getByRole('button', { name: 'Resume', exact: true }).click();
      await page.clock.runFor(9_000);
      await expect(city(page, 'west-south')).toContainText('118 units');
      await page.getByRole('button', { name: 'Pause', exact: true }).click();
      await page.getByRole('button', { name: 'Restart', exact: true }).click();
      await expect(city(page, 'south')).toContainText('131 units');
      await expect(city(page, 'west-south')).toContainText('18 units');
    });
  });
}
