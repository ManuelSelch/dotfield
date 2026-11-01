import type { Page } from '@playwright/test';

export async function fieldPoints(page: Page) {
  const box = (await page.getByRole('img', { name: 'Territory board' }).boundingBox())!;
  const scale = Math.min(box.width / 360, box.height / 480);
  const point = (x: number, y: number) => ({
    x: box.x + (box.width - 360 * scale) / 2 + x * scale,
    y: box.y + (box.height - 480 * scale) / 2 + y * scale,
  });
  return {
    source: point(180, 440),
    target: point(180, 240),
    enemy: point(180, 40),
    regionSource: point(100, 470),
    regionTarget: point(177, 185),
    outside: { x: box.x - 8, y: box.y + 4 },
  };
}
