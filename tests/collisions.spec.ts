import { expect, test, type Page } from '@playwright/test';
import { createCrossingBattle } from './helpers/crossingBattle';
import { dotPosition } from '../src/game/dots';
import type { Point } from '../src/game/types';

async function pixelAt(page: Page, point: Point) {
  return page.getByRole('img', { name: 'Territory board' }).evaluate((el, p) => {
    const canvas = el as HTMLCanvasElement;
    const bounds = canvas.getBoundingClientRect();
    const scale = Math.min(bounds.width / 360, bounds.height / 480);
    const x = (bounds.width - 360 * scale) / 2 + p.x * scale;
    const y = (bounds.height - 480 * scale) / 2 + p.y * scale;
    return Array.from(canvas.getContext('2d')!.getImageData(
      Math.floor(x * devicePixelRatio), Math.floor(y * devicePixelRatio), 1, 1).data).slice(0, 3);
  }, point);
}

for (const [width, height, dpr] of [[320, 568, 1], [430, 932, 3]]) {
  test.describe(`crossing groups at ${width}px, DPR ${dpr}`, () => {
    test.use({ viewport: { width, height }, deviceScaleFactor: dpr });
    test('opposing dots vanish individually and only surviving dots hit the region', async ({ page }) => {
      await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
      await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
      await page.goto('/tests/fixtures/collisions.html');
      const initial = createCrossingBattle();
      const player = initial.transfers[0];
      const enemy = initial.transfers[1];
      const elapsed = async () => Number(await page.getByTestId('elapsed').textContent());
      const transfers = page.getByRole('list', { name: 'Unit transfers' });
      await page.clock.runFor(1400);
      await expect(transfers.getByRole('listitem')).toHaveCount(2);
      expect(await pixelAt(page, dotPosition(enemy, 0, await elapsed()))).toEqual([189, 98, 78]);
      await page.clock.runFor(Math.ceil(player.durationMs / 2 + 100) - 1400);
      await expect(transfers.getByRole('listitem')).toHaveCount(1);
      await expect(transfers).toContainText('4 units: player-source → enemy-source');
      const time = await elapsed();
      expect(await pixelAt(page, dotPosition(player, 0, time))).toEqual([38, 124, 114]);
      const hole = await pixelAt(page, dotPosition(player, 2, time));
      expect(hole).not.toEqual([38, 124, 114]);
      expect(hole).not.toEqual([189, 98, 78]);
      await expect(page.getByRole('listitem').filter({ hasText: /^enemy-source:/ })).toHaveText('enemy-source: Opponent, 1 units. Production city.');
      await page.screenshot({ path: `test-results/dot-collision-${width}.png` });
      await page.clock.runFor(2500);
      await expect(transfers.getByRole('listitem')).toHaveCount(0);
      await expect(page.getByRole('listitem').filter({ hasText: /^enemy-source:/ })).toHaveText('enemy-source: You, 3 units. Production city.');
    });
  });
}
