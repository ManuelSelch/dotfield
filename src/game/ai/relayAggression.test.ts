import { expect, it } from 'vitest';
import { createSimulation } from '../state';
import { chooseAction } from './actions';
import { resolveAiBehavior } from './behaviors';

const city = (id: string, owner: string, units: number, x: number, y: number) => ({ id, owner, units, x, y });

it('Aggressive captures an available active Relay before optional Artillery investment', () => {
  const state = createSimulation([
    city('home', 'enemy', 50, 30, 400), city('rear', 'enemy', 50, 70, 350),
    city('plant', 'enemy', 50, 130, 250), city('front', 'enemy', 50, 180, 200),
    city('edge', 'enemy', 50, 100, 170), city('relay', 'neutral', 5, 300, 60),
    city('player', 'player', 8, 230, 180), city('player-home', 'player', 80, 350, 400),
  ], { unitsPerSecond: 0 }, undefined, undefined,
  { cityId: 'relay', activateAtMs: 120_000, targetMs: 180_000 });
  const activeRelay = { ...state, elapsedMs: 120_000 };
  const aggressive = resolveAiBehavior('aggressive');
  expect(chooseAction(activeRelay, aggressive, 'enemy'))
    .toMatchObject({ type: 'ground', kind: 'expand', targetId: 'relay' });
  // Running rounds saved before this policy have the same attack score but no new field.
  const legacyAggressive = { ...aggressive } as typeof aggressive & { roleConversionPenalty?: number };
  delete legacyAggressive.roleConversionPenalty;
  expect(chooseAction(activeRelay, legacyAggressive, 'enemy'))
    .toMatchObject({ type: 'ground', kind: 'expand', targetId: 'relay' });
});

it('still buys useful artillery when no hostile capture is forecastable', () => {
  const state = createSimulation([
    city('home', 'enemy', 50, 30, 400), city('rear', 'enemy', 50, 70, 350),
    city('plant', 'enemy', 50, 130, 250), city('front', 'enemy', 50, 180, 200),
    city('edge', 'enemy', 50, 100, 170), city('relay', 'neutral', 500, 300, 60),
    city('player', 'player', 500, 230, 180), city('player-home', 'player', 800, 350, 400),
  ], { unitsPerSecond: 0 }, undefined, undefined,
  { cityId: 'relay', activateAtMs: 120_000, targetMs: 180_000 });
  const action = chooseAction({ ...state, elapsedMs: 120_000 }, resolveAiBehavior('aggressive'), 'enemy');
  expect(action).toMatchObject({ type: 'convert', cityType: 'artillery' });
});
