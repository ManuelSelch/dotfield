import { expect, type Page } from '@playwright/test';
import { MAPS } from '../../src/board/maps';
import { compileRoundSetup, type UpgradeSelection } from '../../src/game/upgrades/compile';
import { createSimulation } from '../../src/game/state';
import { SAVED_GAME_KEY } from '../../src/game/persistence';

// Geometry-specific regressions resume an authored scenario through the real
// persistence boundary. Production Home has no hidden legacy-map selector.
export async function openAuthoredMatch(page: Page, mapIndex = 0, upgrades: UpgradeSelection = {}) {
  const map = MAPS[mapIndex];
  const setup = compileRoundSetup(map.territories, upgrades, undefined, {}, map.river);
  const game = { territories: setup.territories, state: createSimulation(setup.territories, setup.rules, setup.river), ai: setup.ai, phase: 'running' };
  // Leave the prior App before writing: its pagehide flush must not overwrite
  // the next scenario. This fixture has no snapshot saver of its own.
  await page.goto('/tests/fixtures/round.html?passive');
  await page.evaluate(({ key, game }) => localStorage.setItem(key, JSON.stringify(game)), { key: SAVED_GAME_KEY, game });
  await page.goto('/');
  await expect(page.getByRole('img', { name: 'Territory board' })).toBeVisible();
}
