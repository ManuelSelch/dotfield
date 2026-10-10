import { expect, test } from '@playwright/test';
import { MAPS } from '../src/board/maps';
import { openAuthoredMatch } from './helpers/openAuthoredMatch';

test.use({ hasTouch: true });
for (const viewport of [{ width: 320, height: 480 }, { width: 430, height: 932 }]) {
  test(`Factory doubles only the starting city and stacks with Industry at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
    await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    const city = (id: string) => page.getByRole('list', { name: 'Territory details' })
      .getByRole('listitem').filter({ hasText: new RegExp(`^${id}:`) });
    for (const stack of [false, true]) for (let mapIndex = 0; mapIndex < MAPS.length; mapIndex++) {
      await openAuthoredMatch(page, mapIndex, { player: stack ? ['factory', 'industry'] : ['factory'] });
      await expect(city('south')).toHaveText('south: You, 36 units. Factory active (2× production).');
      await expect(page.getByRole('button', { name: /^Select south region:.*Factory active/ })).toHaveCount(1);
      await page.clock.runFor(1700);
      await expect(city('south')).toContainText(`You, ${stack ? 40 : 39} units.`);
      const enemyId = mapIndex === 4 ? 'enemy-west' : 'north';
      await expect(city(enemyId)).toHaveText(`${enemyId}: Opponent, ${mapIndex === 4 ? 31 : 37} units.`);
      for (const node of MAPS[mapIndex].territories.filter(node => node.owner === 'neutral')) {
        const factory = node.features?.find(feature => feature.kind === 'factory');
        const label = factory ? ` Factory inactive (${factory.productionMultiplier}× production).` : '';
        await expect(city(node.id)).toHaveText(`${node.id}: Neutral, ${node.units} units.${label}`);
      }
      for (const node of MAPS[mapIndex].territories.filter(node => node.owner === 'player' && node.id !== 'south')) {
        await expect(city(node.id)).toContainText(`You, ${node.units + Math.floor(1.7 * (stack ? 1.25 : 1))} units.`);
        await expect(city(node.id)).not.toContainText('Factory');
      }
      await page.getByRole('button', { name: 'Pause', exact: true }).tap();
      await page.clock.runFor(60000);
      await expect(city('south')).toContainText(`You, ${stack ? 40 : 39} units.`);
      await page.getByRole('button', { name: 'Restart', exact: true }).tap();
      await expect(city('south')).toContainText('You, 36 units. Factory active');
      await page.clock.runFor(1700);
      await expect(city('south')).toContainText(`You, ${stack ? 40 : 39} units.`);
    }
    await openAuthoredMatch(page);
    await page.clock.runFor(1700); await expect(city('south')).toHaveText('south: You, 37 units.');
    await page.getByRole('button', { name: 'Pause', exact: true }).tap();
    await page.reload();
    await expect(city('south')).toHaveText('south: You, 37 units.');
    await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test('terminal replay recreates a single Factory and retained Industry multiplier', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
  await page.goto('/tests/fixtures/round.html?factory&industry');
  await page.getByRole('button', { name: /^Select south region/ }).focus(); await page.keyboard.press('Enter');
  await page.getByRole('button', { name: /^Select centre region/ }).focus(); await page.keyboard.press('Enter');
  await page.clock.runFor(12000);
  await expect(page.getByRole('heading', { name: 'Victory' })).toBeVisible();
  await page.getByRole('button', { name: 'Play again', exact: true }).click();
  const host = page.getByRole('list', { name: 'Territory details' }).getByRole('listitem').filter({ hasText: /^south:/ });
  await expect(host).toHaveText('south: You, 20 units. Factory active (2× production).');
  await page.clock.runFor(850);
  await expect(host).toHaveText('south: You, 22 units. Factory active (2× production).');
});
