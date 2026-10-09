import { describe, expect, it } from 'vitest';
import { advanceRound, evaluateRound } from './round';
import { createSimulation } from './state';
import { DEFAULT_AI } from './ai/config';
import type { Territory } from './types';

const territories: Territory[] = [
  { id: 'player', owner: 'player', units: 30, x: 0, y: 0 },
  { id: 'red', owner: 'enemy', units: 30, x: 180, y: 0 },
  { id: 'purple', owner: 'enemy-2', units: 30, x: 360, y: 0 },
  { id: 'neutral', owner: 'neutral', units: 4, x: 180, y: 200 },
];
const config = { ...DEFAULT_AI, initialDelayMs: 0, decisionIntervalMs: 10000 };

describe('multiple independent AI factions', () => {
  it('creates baseline rules for each non-neutral owner when no setup is supplied', () => {
    const state = createSimulation(territories);
    expect(Object.keys(state.rules.factions).sort()).toEqual(['enemy', 'enemy-2', 'player']);
  });

  it('runs each configured AI on its own schedule and issues only its own orders', () => {
    const state = advanceRound(createSimulation(territories), 50, { enemy: config, 'enemy-2': config });
    expect([...new Set(state.transfers.map(transfer => transfer.owner))].sort()).toEqual(['enemy', 'enemy-2']);
    expect(state.aiDecisionDeadlines).toEqual({ enemy: 10050, 'enemy-2': 10050 });
  });

  it('keeps the player alive while two enemies remain and declares defeat after player elimination', () => {
    expect(evaluateRound(createSimulation(territories)).roundStatus).toBe('playing');
    const defeated = createSimulation(territories.map(city => city.id === 'player' ? { ...city, owner: 'neutral' as const } : city));
    expect(evaluateRound(defeated).roundStatus).toBe('defeat');
  });

  it('declares victory only after the player is the sole surviving faction', () => {
    const won = createSimulation(territories.map(city => city.owner === 'player'
      ? city : { ...city, owner: 'neutral' as const }));
    expect(evaluateRound(won).roundStatus).toBe('victory');
  });
});
