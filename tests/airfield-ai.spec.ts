import { expect, test } from '@playwright/test';
test.use({ viewport: { width: 390, height: 844 } });
for (const conversion of [false, true])
  test(`real AI worker ${conversion ? 'converts and prepares an airfield' : 'launches across mountains'} through faction commands`, async ({
    page,
  }) => {
    await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
    await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
    await page.goto(`/tests/fixtures/airfield-ai.html${conversion ? '?conversion' : ''}`);
    const launch = page
      .getByRole('list', { name: 'Territory details' })
      .getByRole('listitem')
      .filter({ hasText: /^launch:/ });
    await page.clock.runFor(2_000);
    if (conversion) {
      await expect(launch).toContainText('Airfield city');
      await expect(launch).toContainText('60 units');
      await expect(launch).toContainText('Plane preparing');
    } else {
      await expect(launch).toContainText('Plane outbound');
      await expect(launch).toContainText('40 troops aboard');
      await expect(launch).toContainText('1 units');
      const target = page
        .getByRole('list', { name: 'Territory details' })
        .getByRole('listitem')
        .filter({ hasText: /^target:/ });
      for (let i = 0; i < 30 && !(await target.innerText()).includes('Opponent, 5 units'); i++)
        await page.clock.runFor(500);

      await expect(target).toContainText('Opponent, 5 units');
      // Capturing the last hostile city ends the round immediately; the remaining
      // 30 cargo freezes aboard rather than fast-forwarding delivery after defeat.
      await expect(launch).toContainText('30 troops aboard');
      await expect(page.getByRole('heading', { name: 'Defeat' })).toBeVisible();
    }
  });
