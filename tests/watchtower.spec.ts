import { expect, test } from '@playwright/test';

test.use({ hasTouch: true });
async function tapCity(page: import('@playwright/test').Page, x: number, y: number) {
  const box = (await page.getByRole('img', { name: 'Territory board' }).boundingBox())!;
  const scale = Math.min(box.width / 360, box.height / 480);
  await page.touchscreen.tap(
    box.x + (box.width - 360 * scale) / 2 + x * scale,
    box.y + (box.height - 480 * scale) / 2 + y * scale,
  );
}
for (const viewport of [
  { width: 320, height: 480 },
  { width: 430, height: 932 },
])
  test(`builds a Watchtower role and retains its coverage at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
    await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
    await page.goto('/tests/fixtures/airfield.html?scenario=production');
    await tapCity(page, 180, 430);
    const controls = page.getByRole('region', { name: 'Selected city controls' });
    await controls.getByRole('button', { name: /Build Watchtower for 30 troops/ }).tap();
    const city = page
      .getByRole('list', { name: 'Territory details' })
      .getByRole('listitem')
      .filter({ hasText: /^south:/ });
    await expect(city).toContainText('Watchtower controlled by player');
    await expect(city).toContainText('no troop growth');
    await expect(city).toContainText('up to 4 per second');
    await expect(controls.getByRole('button', { name: /Watchtower, current role/ })).toBeDisabled();
    await page.screenshot({ path: `test-results/watchtower-role-${viewport.width}.png` });
  });

test('legacy attached Watchtower fixtures migrate to accessible city-role descriptions', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
  await page.goto('/tests/fixtures/round.html?watchtower');
  const towers = page
    .getByRole('list', { name: 'Territory details' })
    .getByRole('listitem')
    .filter({ hasText: /Watchtower (controlled by|inactive while neutral)/ });
  await expect(towers).toHaveCount(1);
  await expect(towers).toContainText(
    /Watchtower (controlled by (player|enemy)|inactive while neutral)/,
  );
  await expect(towers).toContainText('no troop growth');
});
