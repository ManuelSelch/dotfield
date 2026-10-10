import { expect, test } from '@playwright/test';
import { fieldPoints } from './helpers/fieldPoints';
import { openAuthoredMatch } from './helpers/openAuthoredMatch';

test.use({ viewport: { width: 320, height: 568 }, hasTouch: true });

test('restores the active round instead of returning to Home after reload', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
  await openAuthoredMatch(page);
  await page.clock.runFor(1200);
  const { source, target } = await fieldPoints(page);
  await page.mouse.move(source.x, source.y); await page.mouse.down();
  await page.mouse.move(target.x, target.y); await page.mouse.up();
  const before = await page.getByRole('list', { name: 'Territory details' }).textContent();
  const transfersBefore = await page.getByRole('list', { name: 'Unit transfers' }).textContent();
  const eventSave = await page.evaluate(() => JSON.parse(localStorage.getItem('dotfield.saved-game.v1')!));
  expect(eventSave.state.elapsedMs).toBe(0);
  expect(eventSave.state.transfers).toHaveLength(0);
  await test.info().attach('event-save-before-reload', { body: JSON.stringify(eventSave), contentType: 'application/json' });
  await expect(page.getByRole('listitem').filter({ hasText: /^south:/ })).toHaveText('south: You, 32 units.');

  // No periodic save: actual reload must flush the unsaved growth and order.
  await page.reload();

  await expect(page.getByRole('img', { name: 'Territory board' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toHaveCount(0);
  expect(await page.getByRole('list', { name: 'Territory details' }).textContent()).toBe(before);
  expect(await page.getByRole('list', { name: 'Unit transfers' }).textContent()).toBe(transfersBefore);
});
