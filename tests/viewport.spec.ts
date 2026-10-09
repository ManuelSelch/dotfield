import { expect, test } from '@playwright/test';

for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 480 }]) {
  test(`page stays locked at ${viewport.width} × ${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    const app = page.locator('main');
    const before = await app.boundingBox();
    expect(before!.height).toBe(viewport.height);
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(viewport.height);
    await page.mouse.move(viewport.width / 2, viewport.height / 2);
    await page.mouse.wheel(0, 500);
    await page.keyboard.press('PageDown');
    await page.evaluate(() => window.scrollTo(0, 500));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    expect(await app.boundingBox()).toEqual(before);
    await expect(page.getByText('Drag between regions · leave one behind.')).toBeInViewport();
    expect(await page.locator('html').evaluate((el) => getComputedStyle(el).overscrollBehaviorY)).toBe('none');
    expect(await page.getByRole('img', { name: 'Territory board' })
      .evaluate((el) => getComputedStyle(el).touchAction)).toBe('none');
    await page.screenshot({ path: `test-results/locked-${viewport.height}.png` });
  });
}

test('touch swipes cannot move the page or board', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await page.goto('/');
  const canvas = page.getByRole('img', { name: 'Territory board' });
  const before = await canvas.boundingBox();
  const session = await context.newCDPSession(page);
  for (const [start, end] of [[600, 200], [200, 600]]) {
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 195, y: start }] });
    for (let step = 1; step <= 5; step++) {
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchMove', touchPoints: [{ x: 195, y: start + (end - start) * step / 5 }],
      });
    }
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  }
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  expect(await canvas.boundingBox()).toEqual(before);
  await context.close();
});
