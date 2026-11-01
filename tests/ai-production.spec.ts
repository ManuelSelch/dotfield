import { expect, test } from '@playwright/test';

import { SAVED_GAME_KEY } from '../src/game/persistence';
import { createSimulation } from '../src/game/state';
import { compileRoundSetup } from '../src/game/upgrades/compile';

for (const width of [320, 1280])
  test(`AI worker consolidates capped rear cities at a single staging city at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
    await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const setup = compileRoundSetup(
      [
        { id: 'rear-left', owner: 'enemy', units: 48, x: 60, y: 350 },
        { id: 'rear-right', owner: 'enemy', units: 48, x: 300, y: 350 },
        { id: 'staging', owner: 'enemy', units: 50, x: 180, y: 330 },
        { id: 'home', owner: 'player', units: 300, x: 180, y: 40 },
      ],
      {},
    );
    const game = {
      territories: setup.territories,
      state: createSimulation(setup.territories, setup.rules),
      ai: setup.ai,
      phase: 'running',
    };
    await page.goto('/tests/fixtures/round.html?passive');
    await page.evaluate(({ key, game }) => localStorage.setItem(key, JSON.stringify(game)), {
      key: SAVED_GAME_KEY,
      game,
    });
    await page.goto('/');
    const transfers = page.getByRole('list', { name: 'Unit transfers' });
    await page.clock.runFor(2_000);
    await expect(transfers).toContainText('rear-left → staging');
    await page.clock.runFor(2_000);
    await expect(transfers).toContainText('rear-right → staging');
    await page.clock.runFor(12_000);
    const details = page.getByRole('list', { name: 'Territory details' });
    const army = await details
      .getByRole('listitem')
      .filter({ hasText: /^staging:/ })
      .textContent();
    expect(Number(army?.match(/(\d+) units/)?.[1])).toBeGreaterThan(100);
    for (const id of ['rear-left', 'rear-right']) {
      const text = await details
        .getByRole('listitem')
        .filter({ hasText: new RegExp(`^${id}:`) })
        .textContent();
      expect(Number(text?.match(/(\d+) units/)?.[1])).toBeLessThan(50);
    }
    expect(errors).toEqual([]);
  });
