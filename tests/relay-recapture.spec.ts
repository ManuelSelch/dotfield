import { expect, test } from '@playwright/test';
import { createSimulation } from '../src/game/state';
import { resolveAiBehavior } from '../src/game/ai/behaviors';
import { SAVED_GAME_KEY } from '../src/game/persistence';

test('worker sends follow-up waves and retakes a player-held Relay before losing', async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 844 });
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const cities = [
    { id: 'base', owner: 'enemy', units: 50, x: 70, y: 260 },
    { id: 'east', owner: 'enemy', units: 50, x: 290, y: 260 },
    { id: 'rear', owner: 'enemy', units: 50, x: 180, y: 340 },
    { id: 'decoy', owner: 'neutral', units: 3, x: 60, y: 350 },
    { id: 'relay', owner: 'player', units: 85, x: 180, y: 180 },
    { id: 'player-home', owner: 'player', units: 50, x: 180, y: 40 },
  ];
  const initial = createSimulation(cities, undefined, undefined, undefined,
    { cityId: 'relay', activateAtMs: 120000, targetMs: 180000 });
  const state = { ...initial, elapsedMs: 288000,
    relay: { ...initial.relay!, scoresMs: { player: 168000, enemy: 0 } } };
  const game = { territories: cities, state, ai: { enemy: resolveAiBehavior('aggressive') }, phase: 'running' };
  await page.addInitScript(({ key, game }) => {
    localStorage.setItem(key, JSON.stringify(game));
    const observed = window as Window & { aiReplies: number };
    observed.aiReplies = 0;
    const NativeWorker = window.Worker;
    window.Worker = class extends NativeWorker {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        this.addEventListener('message', () => { observed.aiReplies++; });
      }
    };
  }, { key: SAVED_GAME_KEY, game });
  await page.goto('/');
  const transfers = page.getByRole('list', { name: 'Unit transfers' });
  const relay = page.getByRole('list', { name: 'Territory details' })
    .getByRole('listitem').filter({ hasText: /^relay:/ });
  await page.clock.runFor(50);
  await expect(transfers).toContainText('base → relay');
  await page.clock.runFor(1300);
  await expect(transfers).toContainText('east → relay');
  for (let i = 0; i < 10; i++) {
    const replies = await page.evaluate(() => (window as Window & { aiReplies: number }).aiReplies);
    await page.clock.runFor(1300);
    await expect.poll(() => page.evaluate(() => (window as Window & { aiReplies: number }).aiReplies))
      .toBeGreaterThan(replies);
    if ((await relay.textContent())?.includes('Opponent')) break;
  }
  await expect(relay).toContainText('Opponent');
  expect(Number(await page.getByRole('meter', { name: 'You relay holding seconds' }).getAttribute('aria-valuenow')))
    .toBeLessThan(180);
  await expect(page.getByRole('heading', { name: 'Defeat', exact: true })).toHaveCount(0);
  expect(errors).toEqual([]);
});
