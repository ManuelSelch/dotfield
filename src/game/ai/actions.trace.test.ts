import { describe, expect, it } from 'vitest';

import { createSimulation } from '@/game/state';
import type { Territory } from '@/game/types';

import { chooseAction, chooseActionWithTrace } from './actions';

const city = (
  id: string,
  owner: string,
  units: number,
  x: number,
  y: number,
  cityType?: Territory['cityType'],
): Territory => ({ id, owner, units, x, y, cityType });

describe('AI action evaluation trace', () => {
  it('preserves the chosen command while exposing lower-ranked viable actions and failed forecasts', () => {
    const state = createSimulation(
      [
        city('base', 'enemy', 40, 30, 240),
        city('west', 'neutral', 6, 120, 180),
        city('east', 'neutral', 6, 120, 300),
        city('player', 'player', 90, 320, 240),
      ],
      { unitsPerSecond: 0 },
    );
    const traced = chooseActionWithTrace(state);
    expect(traced.action).toEqual(chooseAction(state));
    expect(traced.action).toMatchObject({ type: 'ground', kind: 'expand' });
    expect(traced.trace.viableCount).toBeGreaterThan(1);
    expect(traced.trace.alternatives.length).toBeGreaterThan(0);
    expect(
      traced.trace.alternatives.every((item) => item.selectionReason !== 'priority-override'),
    ).toBe(true);
    expect(traced.trace.blockers.some((item) => item.reason === 'forecast-cannot-capture')).toBe(
      true,
    );
  });

  it('explains a no-action decision instead of returning an empty trace', () => {
    const state = createSimulation(
      [city('weak', 'enemy', 4, 30, 240), city('player', 'player', 50, 320, 240)],
      { unitsPerSecond: 0 },
    );
    const traced = chooseActionWithTrace(state);
    expect(traced.action).toBeNull();
    expect(traced.trace.viableCount).toBe(0);
    expect(traced.trace.blockers.length).toBeGreaterThan(0);
    expect(traced.trace.blockers.some((item) => item.reason === 'below-dispatch-minimum')).toBe(
      true,
    );
  });

  it('reports hard Defender transit blocks with the blocking city ID', () => {
    const state = createSimulation(
      [
        city('home', 'enemy', 30, 30, 240),
        city('wall', 'player', 80, 150, 240, 'defender'),
        city('behind-wall', 'neutral', 5, 300, 240),
      ],
      { unitsPerSecond: 0 },
    );
    const trace = chooseActionWithTrace(state).trace;
    expect(
      trace.blockers.some(
        (item) =>
          item.reason === 'defender-blocked' &&
          item.examples.some((example) => example.blockerId === 'wall'),
      ),
    ).toBe(true);
  });
});
