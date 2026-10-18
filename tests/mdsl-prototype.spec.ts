import { expect, test } from '@playwright/test';
import { createSimulation } from '../src/game/state';
import { DEFAULT_AI } from '../src/game/ai/config';
import { SAVED_GAME_KEY } from '../src/game/persistence';
import type { MdslEvent } from '../src/game/ai/mdsl/agent';

const cities = [
  { id: 'home', owner: 'enemy', units: 36, x: 60, y: 80 },
  { id: 'near', owner: 'neutral', units: 5, x: 60, y: 190 },
  { id: 'far', owner: 'neutral', units: 5, x: 180, y: 290 },
  { id: 'player', owner: 'player', units: 36, x: 300, y: 400 },
];

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 430, height: 844 });
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
  const game = { territories: cities, state: createSimulation(cities, { unitsPerSecond: 0 }),
    ai: { enemy: DEFAULT_AI }, phase: 'running' };
  await page.addInitScript(({ key, game }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(game));
    const observed = window as Window & { workerCount: number };
    observed.workerCount = 0;
    const NativeWorker = window.Worker;
    window.Worker = class extends NativeWorker {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options); observed.workerCount++;
      }
    };
  }, { key: SAVED_GAME_KEY, game });
});

function observe(page: import('@playwright/test').Page) {
  const events: MdslEvent[] = [], errors: string[] = [];
  page.on('console', async message => {
    if (message.type() === 'debug' && (await message.args()[0]?.jsonValue()) === '[MDSL]') {
      events.push(await message.args()[1].jsonValue());
    }
  });
  page.on('pageerror', error => errors.push(error.message));
  return { events, errors, dispatched: () => events.filter(e => e.outcome === 'dispatched') };
}

test('MDSL captures real neutrals, keeps running plans and restarts from a fresh tree', async ({ page }) => {
  const log = observe(page);
  await page.goto('/?bot=mdsl');
  await page.clock.runFor(2000);
  await expect.poll(log.dispatched).toHaveLength(1);
  expect(log.dispatched()[0]).toMatchObject({ targetId: 'near', sourceId: 'home' });
  expect(await page.evaluate(() => (window as Window & { workerCount: number }).workerCount)).toBe(0);
  const transfers = page.getByRole('list', { name: 'Unit transfers' });
  await expect(transfers).toContainText('home → near');
  const details = page.getByRole('list', { name: 'Territory details' });
  await page.clock.runFor(16000);
  await expect(details.getByRole('listitem').filter({ hasText: /^near:/ })).toContainText('Opponent');
  await expect(details.getByRole('listitem').filter({ hasText: /^far:/ })).toContainText('Opponent');
  await expect.poll(log.dispatched).toHaveLength(2);
  expect(log.dispatched().map(e => e.targetId)).toEqual(['near', 'far']);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await page.clock.runFor(2000);
  await expect.poll(log.dispatched).toHaveLength(3);
  expect(log.dispatched()[2]).toMatchObject({ targetId: 'near', sourceId: 'home' });
  expect(log.errors).toEqual([]);
});

test('pause and reload preserve live orders without a duplicate dispatch', async ({ page }) => {
  const log = observe(page);
  await page.goto('/?bot=mdsl');
  await page.clock.runFor(2000);
  await expect.poll(log.dispatched).toHaveLength(1);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  const before = await page.getByRole('list', { name: 'Unit transfers' }).textContent();
  await page.clock.runFor(20000);
  expect(log.dispatched()).toHaveLength(1);
  expect(await page.getByRole('list', { name: 'Unit transfers' }).textContent()).toBe(before);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
  await page.clock.runFor(20000);
  expect(log.dispatched()).toHaveLength(1);
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.clock.runFor(1800);
  // Existing source/target orders are observed, not overwritten by a fresh tree.
  expect(log.dispatched()).toHaveLength(1);
  await expect(page.getByRole('list', { name: 'Unit transfers' })).toContainText('home → near');
  expect(log.errors).toEqual([]);
});

test('expands first, then captures an enemy city using the same persistent plan capabilities', async ({ page }) => {
  const log = observe(page);
  const opening = [
    { id: 'home', owner: 'enemy', units: 50, x: 60, y: 80 },
    { id: 'neutral', owner: 'neutral', units: 5, x: 60, y: 180 },
    { id: 'victim', owner: 'player', units: 6, x: 60, y: 280 },
    { id: 'player-home', owner: 'player', units: 50, x: 300, y: 400 },
  ];
  await page.goto('/tests/fixtures/round.html?passive');
  const game = { territories: opening, state: createSimulation(opening, { unitsPerSecond: 0 }),
    ai: { enemy: DEFAULT_AI }, phase: 'running' };
  await page.evaluate(({ key, game }) => localStorage.setItem(key, JSON.stringify(game)), { key: SAVED_GAME_KEY, game });
  await page.goto('/?bot=mdsl');
  await page.clock.runFor(18000);
  const details = page.getByRole('list', { name: 'Territory details' });
  await expect(details.getByRole('listitem').filter({ hasText: /^neutral:/ })).toContainText('Opponent');
  await expect(details.getByRole('listitem').filter({ hasText: /^victim:/ })).toContainText('Opponent');
  await expect.poll(log.dispatched).toHaveLength(2);
  expect(log.dispatched().map(e => e.targetId)).toEqual(['neutral', 'victim']);
  expect(log.errors).toEqual([]);
});

test('a feasible enemy attack can win by capturing the last player city', async ({ page }) => {
  const log = observe(page);
  const opening = [
    { id: 'home', owner: 'enemy', units: 36, x: 60, y: 80 },
    { id: 'victim', owner: 'player', units: 5, x: 60, y: 190 },
  ];
  await page.goto('/tests/fixtures/round.html?passive');
  const game = { territories: opening, state: createSimulation(opening, { unitsPerSecond: 0 }),
    ai: { enemy: DEFAULT_AI }, phase: 'running' };
  await page.evaluate(({ key, game }) => localStorage.setItem(key, JSON.stringify(game)), { key: SAVED_GAME_KEY, game });
  await page.goto('/?bot=mdsl');
  await page.clock.runFor(10000);
  await expect(page.getByRole('heading', { name: 'Defeat', exact: true })).toBeVisible();
  await expect.poll(log.dispatched).toHaveLength(1);
  expect(log.dispatched()[0]).toMatchObject({ targetId: 'victim', sourceId: 'home' });
  expect(log.errors).toEqual([]);
});

test('tree-authored source accumulation captures a target neither source can take alone', async ({ page }) => {
  const log = observe(page);
  const opening = [
    { id: 'a', owner: 'enemy', units: 30, x: 60, y: 80 },
    { id: 'b', owner: 'enemy', units: 30, x: 120, y: 80 },
    { id: 'target', owner: 'player', units: 45, x: 60, y: 190 },
    { id: 'other', owner: 'player', units: 100, x: 300, y: 400 },
  ];
  await page.goto('/tests/fixtures/round.html?passive');
  const game = { territories: opening, state: createSimulation(opening, { unitsPerSecond: 0 }),
    ai: { enemy: { ...DEFAULT_AI, decisionIntervalMs: 1800 } }, phase: 'running' };
  await page.evaluate(({ key, game }) => localStorage.setItem(key, JSON.stringify(game)), { key: SAVED_GAME_KEY, game });
  await page.goto('/?bot=mdsl');
  await page.clock.runFor(4000);
  await expect.poll(log.dispatched).toHaveLength(1);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.clock.runFor(20000);
  expect(log.dispatched()).toHaveLength(1);
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.clock.runFor(18000);
  await expect(page.getByRole('list', { name: 'Territory details' }).getByRole('listitem')
    .filter({ hasText: /^target:/ })).toContainText('Opponent');
  await expect.poll(log.dispatched).toHaveLength(2);
  expect(log.dispatched().map(e => e.sourceId)).toEqual(['a', 'b']);
  expect(log.dispatched()[1].elapsedMs - log.dispatched()[0].elapsedMs).toBe(1800);
  expect(log.events).toContainEqual(expect.objectContaining({ method: 'PlanCapture', outcome: 'infeasible',
    planSlot: 'attackPlan', sourceIds: ['a'] }));
  expect(log.events).toContainEqual(expect.objectContaining({ method: 'PlanCapture', outcome: 'planned',
    planSlot: 'attackPlan', sourceIds: ['a', 'b'] }));
  expect(log.errors).toEqual([]);
});

test('without the URL flag the default worker still controls the same real board', async ({ page }) => {
  const log = observe(page);
  await page.goto('/');
  await page.clock.runFor(2000);
  await expect(page.getByRole('list', { name: 'Unit transfers' })).toContainText('home → near');
  expect(await page.evaluate(() => (window as Window & { workerCount: number }).workerCount)).toBeGreaterThan(0);
  expect(log.events).toEqual([]);
  expect(log.errors).toEqual([]);
});
