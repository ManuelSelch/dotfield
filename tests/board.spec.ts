import { expect, test } from '@playwright/test';

for (const viewport of [
  { width: 320, height: 568 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 1440, height: 900 },
]) {
  test(`live field fits ${viewport.width} × ${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'dotfield', exact: true })).toBeVisible();
    await expect(page.getByText('Drag between regions · leave one behind.')).toBeVisible();
    const canvas = page.getByRole('img', { name: 'Territory board' });
    await expect(canvas).toBeVisible();
    await expect(page.getByRole('list', { name: 'Territory details' }).getByRole('listitem')).toHaveCount(7);
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(280);
    expect(box!.height).toBeGreaterThanOrEqual(300);
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
    expect(await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
    }))).toEqual(viewport);
    await expect.poll(() => canvas.evaluate((element) => {
      const ctx = (element as HTMLCanvasElement).getContext('2d')!;
      return Array.from(ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height).data)
        .filter((_, index) => index % 4 === 3).some((alpha) => alpha > 0);
    })).toBe(true);
    expect(errors).toEqual([]);
    await page.screenshot({ path: `test-results/field-${viewport.width}.png` });
  });
}

test('resizes the backing canvas for high-density displays and viewport changes', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
  const page = await context.newPage();
  await page.goto('/');
  const canvas = page.getByRole('img', { name: 'Territory board' });
  for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 568 }]) {
    await page.setViewportSize(viewport);
    await expect.poll(() => canvas.evaluate((element) => {
      const canvas = element as HTMLCanvasElement;
      const bounds = canvas.getBoundingClientRect();
      return canvas.width === Math.round(bounds.width * devicePixelRatio)
        && canvas.height === Math.round(bounds.height * devicePixelRatio);
    })).toBe(true);
  }
  await context.close();
});
