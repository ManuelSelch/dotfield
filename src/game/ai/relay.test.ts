import { describe, expect, it } from 'vitest';

import { dispatchUnits } from '@/game/dispatch';
import { createSimulation } from '@/game/state';
import { createTerrain } from '@/game/terrain/terrain';
import type { Territory } from '@/game/types';

import { chooseAction, applyAiAction } from './actions';
import { resolveAiBehavior } from './behaviors';
import { forecastBattle } from './forecast';

const city = (id: string, owner: string, units: number, x: number, y = 100): Territory => ({
  id,
  owner,
  units,
  x,
  y,
});
const relay = { cityId: 'relay', activateAtMs: 120000, targetMs: 180000 };

describe('relay-aware AI', () => {
  it.each(['balanced', 'aggressive', 'defensive'] as const)(
    '%s chooses the objective instead of an equivalent irrelevant neutral',
    (behavior) => {
      const state = {
        ...createSimulation(
          [
            city('base', 'enemy', 40, 180),
            city('ordinary', 'neutral', 5, 80),
            city('relay', 'neutral', 5, 280),
            city('player', 'player', 80, 180, 450),
          ],
          undefined,
          undefined,
          undefined,
          relay,
        ),
        elapsedMs: 120000,
      };
      expect(chooseAction(state, resolveAiBehavior(behavior))).toMatchObject({
        targetId: 'relay',
        kind: 'expand',
      });
    },
  );
  it('stages around a blocking ridge and then captures the relay through legal commands', () => {
    const terrain = createTerrain({
      bounds: { minX: 0, minY: 0, maxX: 500, maxY: 500 },
      crossings: [],
      barriers: [
        { id: 'ridge', kind: 'mountain', bounds: { minX: 150, minY: 50, maxX: 190, maxY: 200 } },
      ],
    });
    let state = createSimulation(
      [
        city('base', 'enemy', 40, 80, 100),
        city('decoy', 'neutral', 5, 80, 30),
        city('stage', 'neutral', 5, 170, 260),
        city('relay', 'neutral', 5, 280, 100),
        city('player', 'player', 80, 400, 450),
      ],
      undefined,
      undefined,
      terrain,
      relay,
    );
    const first = chooseAction(state)!;
    expect(first).toMatchObject({ type: 'ground', targetId: 'stage' });
    state = forecastBattle(applyAiAction(state, first, 'enemy'), 20000);
    expect(state.territories.find((c) => c.id === 'stage')?.owner).toBe('enemy');
    // A prepared staging garrison can make the next legal leg.
    state = {
      ...state,
      territories: state.territories.map((c) => (c.id === 'base' ? { ...c, units: 1 } : c)),
    };
    expect(chooseAction(state)).toMatchObject({
      type: 'ground',
      sourceId: 'stage',
      targetId: 'relay',
    });
  });
  it('does not export the held relay garrison toward the old enemy front', () => {
    const state = createSimulation(
      [
        city('relay', 'enemy', 50, 100),
        city('front', 'enemy', 5, 250),
        city('player', 'player', 100, 400),
      ],
      undefined,
      undefined,
      undefined,
      relay,
    );
    const action = chooseAction(state);
    expect(action && 'sourceId' in action ? action.sourceId : null).not.toBe('relay');
  });
  it('reinforces a relay under a real known attack', () => {
    let state = createSimulation(
      [
        city('base', 'enemy', 40, 80),
        city('relay', 'enemy', 3, 180),
        city('player', 'player', 30, 480),
      ],
      undefined,
      undefined,
      undefined,
      relay,
    );
    state = dispatchUnits(state, 'player', 'relay', 'player');
    expect(chooseAction(state)).toMatchObject({
      type: 'ground',
      targetId: 'relay',
      kind: 'reinforce',
    });
  });
  it('rejects attacks whose forecast ends after another faction has already won', () => {
    const initial = createSimulation(
      [
        city('base', 'enemy', 40, 100),
        city('ordinary', 'neutral', 1, 200),
        city('relay', 'player', 100, 400),
      ],
      undefined,
      undefined,
      undefined,
      relay,
    );
    const state = {
      ...initial,
      elapsedMs: 299999,
      relay: { ...initial.relay!, scoresMs: { player: 179999, enemy: 0 } },
    };
    expect(chooseAction(state)).toBeNull();
  });
});
