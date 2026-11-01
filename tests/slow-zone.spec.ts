import { expect, test } from '@playwright/test';

test.use({ hasTouch: true });
for (const viewport of [
  { width: 320, height: 480 },
  { width: 430, height: 932 },
])
  test(`Slow Zone is a field setting and renders its 150-unit coverage at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
    await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
    await page.goto('/');
    const option = page.getByRole('button', { name: 'Slow Zone' });
    await expect(option).toHaveAttribute('aria-pressed', 'false');
    await option.scrollIntoViewIfNeeded();
    await expect(option).toBeInViewport();
    await option.tap();
    await page.getByRole('button', { name: 'Play', exact: true }).tap();
    const details = page.getByRole('list', { name: 'Territory details' });
    await expect(
      details.getByRole('listitem').filter({ hasText: 'Slow Zone controlled by' }),
    ).toHaveCount(1);
    await expect(
      details.getByRole('listitem').filter({ hasText: 'Slow Zone controlled by' }),
    ).toContainText('150 units');
    await page.getByRole('button', { name: 'Pause', exact: true }).tap();
    await page.getByRole('button', { name: 'Home', exact: true }).tap();
    await expect(page.getByRole('button', { name: 'Slow Zone' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

test('fixture exposes a random-city Slow Zone without rerolling during forecast-free play', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
  await page.goto('/tests/fixtures/round.html?slow-zone&no-growth');
  const zones = page
    .getByRole('list', { name: 'Territory details' })
    .getByRole('listitem')
    .filter({ hasText: 'Slow Zone controlled by' });
  await expect(zones).toHaveCount(1);
  const before = await zones.textContent();
  await page.clock.runFor(2000);
  await expect(zones).toHaveText(before!);
});
