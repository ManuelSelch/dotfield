import { describe, expect, it } from 'vitest';
import type { SimulationState, TerritoryState } from '../game/types';
import type { AiAction } from '../game/ai/actions';
import { AiDecisionTraceCollector } from '../game/ai/trace';
import { cityNumbers, decisionView, recordDecision } from './enemyDashboard';

const territories: readonly TerritoryState[] = [
  { id: 'east', owner: 'neutral', units: 10, x: 250, y: 80, growthRemainder: 0 },
  { id: 'west', owner: 'enemy', units: 20, x: 50, y: 80, growthRemainder: 0 },
  { id: 'south', owner: 'player', units: 30, x: 50, y: 400, growthRemainder: 0 },
];
const state = { territories, elapsedMs: 1800 } as SimulationState;

function view(action: AiAction | null, relayCityId?: string) {
  const decision = recordDecision(state, 'enemy', action, new AiDecisionTraceCollector().finish(action));
  return decisionView(decision, cityNumbers(territories), relayCityId);
}

describe('enemy dashboard decision labels', () => {
  it('numbers cities in stable top-to-bottom, left-to-right order', () => {
    const numbers = cityNumbers(territories);
    expect([...numbers.entries()]).toEqual([['west', 1], ['east', 2], ['south', 3]]);
  });

  it('shows faction and match-local city numbers, including a Relay host', () => {
    const result = view({ type: 'ground', kind: 'attack', sourceId: 'west', targetId: 'east', score: 55.24 }, 'east');
    expect(result).toEqual({
      faction: 'Enemy 1',
      action: 'Attack',
      route: 'Enemy 1 · City 1 → Neutral · City 2 (Relay)',
      score: '55.2',
    });
  });

  it('describes air orders and conversions without inventing a target city', () => {
    expect(view({ type: 'airlift', kind: 'expand', sourceId: 'west', targetId: 'south', score: 18.76 })).toMatchObject({
      action: 'Airlift · Expand', route: 'Enemy 1 · City 1 → You · City 3', score: '18.8',
    });
    expect(view({ type: 'convert', cityId: 'west', cityType: 'defender', score: 24 })).toMatchObject({
      action: 'Build Defender', route: 'At Enemy 1 · City 1', score: '24.0',
    });
  });

  it('reports when the latest decision selected no action', () => {
    expect(view(null)).toMatchObject({ action: 'No action selected', route: null, score: null });
  });

  it('preserves owners from decision time when a target is immediately captured', () => {
    const before = { ...state, territories: territories.map(city => city.id === 'east' ? { ...city, owner: 'neutral' } : city) } as SimulationState;
    const action: AiAction = { type: 'ground', kind: 'expand', sourceId: 'west', targetId: 'east', score: 30 };
    const decision = recordDecision(before, 'enemy', action, new AiDecisionTraceCollector().finish(action));
    const after = { ...before, territories: before.territories.map(city => city.id === 'east' ? { ...city, owner: 'enemy' } : city) } as SimulationState;
    expect(decisionView(decision, cityNumbers(after.territories), 'east').route).toBe('Enemy 1 · City 1 → Neutral · City 2 (Relay)');
  });
});
