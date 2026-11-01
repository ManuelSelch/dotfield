import { expect, test } from '@playwright/test';

import { resolveAiBehavior } from '../src/game/ai/behaviors';
import { SAVED_GAME_KEY } from '../src/game/persistence';
import { createSimulation } from '../src/game/state';

test('real worker resumes production and attacks after its preferred Airfield fills', async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 430, height: 844 });
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const cities = [
    { id: 'rear', owner: 'enemy', units: 50, x: 60, y: 350 },
    { id: 'rear-right', owner: 'enemy', units: 50, x: 300, y: 350 },
    { id: 'staging', owner: 'enemy', units: 50, x: 180, y: 330 },
    { id: 'airfield', owner: 'enemy', units: 101, x: 180, y: 300, cityType: 'airfield' as const },
    // The initial coalition cannot win without resumed production.
    { id: 'relay', owner: 'player', units: 350, x: 180, y: 40 },
  ];
  const initial = createSimulation(cities, undefined, undefined, undefined, {
    cityId: 'relay',
    activateAtMs: 120000,
    targetMs: 180000,
  });
  const game = {
    territories: cities,
    state: { ...initial, elapsedMs: 120000 },
    ai: { enemy: resolveAiBehavior('aggressive') },
    phase: 'running',
  };
  await page.addInitScript(
    ({ key, game }) => {
      localStorage.setItem(key, JSON.stringify(game));
      // Observe real replies so virtual time cannot outrun the worker and apply
      // commands tens of simulated seconds after their snapshot was evaluated.
      const observed = window as Window & { aiReplies: number };
      observed.aiReplies = 0;
      const NativeWorker = window.Worker;
      window.Worker = class extends NativeWorker {
        constructor(url: string | URL, options?: WorkerOptions) {
          super(url, options);
          this.addEventListener('message', () => {
            observed.aiReplies++;
          });
        }
      };
    },
    { key: SAVED_GAME_KEY, game },
  );
  await page.goto('/');
  const details = page.getByRole('list', { name: 'Territory details' });
  const staging = details.getByRole('listitem').filter({ hasText: /^staging:/ });
  const rear = details.getByRole('listitem').filter({ hasText: /^rear:/ });
  const relay = details.getByRole('listitem').filter({ hasText: /^relay:/ });
  let maxStaging = 50,
    sourceFreed = false;
  for (let i = 0; i < 120; i++) {
    const replies = await page.evaluate(() => (window as Window & { aiReplies: number }).aiReplies);
    await page.clock.runFor(1300);
    await expect
      .poll(() => page.evaluate(() => (window as Window & { aiReplies: number }).aiReplies))
      .toBeGreaterThan(replies);
    const units = Number((await staging.textContent())?.match(/(\d+) units/)?.[1]);
    maxStaging = Math.max(maxStaging, units);
    sourceFreed ||= Number((await rear.textContent())?.match(/(\d+) units/)?.[1]) < 50;
    if ((await relay.textContent())?.includes('Opponent')) break;
  }
  expect(sourceFreed).toBe(true);
  expect(maxStaging).toBeGreaterThan(100);
  await expect(relay).toContainText('Opponent');
  expect(errors).toEqual([]);
});
