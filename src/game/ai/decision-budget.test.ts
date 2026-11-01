import { expect, it } from 'vitest';

import { createSimulation } from '@/game/state';
import type { SimulationState, Territory } from '@/game/types';

import { chooseActionWithTrace } from './actions';
import { DEFAULT_AI } from './config';
import { resetForecastCalls, forecastCallCount } from './forecast';

const city = (id: string, owner: string, units: number, x: number, y: number): Territory => ({
  id,
  owner,
  units,
  x,
  y,
});

function board(): SimulationState {
  const nodes: Territory[] = [];
  for (let row = 0; row < 3; row++)
    for (let col = 0; col < 3; col++)
      nodes.push(
        city(`c${row}${col}`, row === 0 ? 'enemy' : 'player', 30, 50 + col * 110, 50 + row * 130),
      );

  return createSimulation(nodes, undefined, undefined, undefined, {
    cityId: 'c20',
    activateAtMs: 0,
    targetMs: 600_000,
  });
}

it('an unlimited or generous budget selects exactly the unbudgeted action', () => {
  const base = chooseActionWithTrace(board(), DEFAULT_AI, 'enemy');
  expect(
    chooseActionWithTrace(board(), DEFAULT_AI, 'enemy', { budgetMs: Infinity, now: () => 0 })
      .action,
  ).toEqual(base.action);
  expect(
    chooseActionWithTrace(board(), DEFAULT_AI, 'enemy', { budgetMs: 100_000, now: () => 0 }).action,
  ).toEqual(base.action);
});

it('an expired budget completes with no forecasts and records the truncation', () => {
  resetForecastCalls();
  const result = chooseActionWithTrace(board(), DEFAULT_AI, 'enemy', { budgetMs: 0, now: () => 0 });
  expect(forecastCallCount()).toBe(0);
  expect(result.trace.blockers.some((blocker) => blocker.reason === 'decision-budget')).toBe(true);
});

it('a budgeted decision never runs more forecasts than an unbudgeted one', () => {
  resetForecastCalls();
  chooseActionWithTrace(board(), DEFAULT_AI, 'enemy');
  const full = forecastCallCount();
  resetForecastCalls();
  chooseActionWithTrace(board(), DEFAULT_AI, 'enemy', { budgetMs: 0, now: () => 0 });
  expect(forecastCallCount()).toBeLessThan(full);
});
