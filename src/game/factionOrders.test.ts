import { describe, expect, it } from 'vitest';
import { createSimulation } from './state';
import { dispatchUnits } from './dispatch';
import { advanceRound } from './round';
import { availableUnits } from './launch';

const nodes = [
  { id: 'player', owner: 'player' as const, units: 21, x: 0, y: 0 },
  { id: 'enemy', owner: 'enemy' as const, units: 21, x: 200, y: 0 },
  { id: 'neutral', owner: 'neutral' as const, units: 8, x: 100, y: 150 },
];

describe('shared faction orders', () => {
  it('gives enemies the identical all-but-one and per-group deduction rules', () => {
    const initial = createSimulation(nodes, { unitsPerSecond: 0 });
    const player = dispatchUnits(initial, 'player', 'neutral');
    const enemy = dispatchUnits(initial, 'enemy', 'neutral', 'enemy');
    expect(enemy.transfers.map(t => t.units)).toEqual(player.transfers.map(t => t.units));
    expect(enemy.transfers.every(t => t.owner === 'enemy')).toBe(true);
    expect(enemy.territories[1].units).toBe(16);
    expect(availableUnits(enemy, 'enemy')).toBe(1);
    expect(advanceRound(enemy, 10000).territories.find(n => n.id === 'neutral')).toMatchObject({ owner: 'enemy', units: 12 });
  });

  it('keeps player input restricted and rejects cross-faction sources', () => {
    const initial = createSimulation(nodes);
    expect(dispatchUnits(initial, 'enemy', 'neutral')).toBe(initial);
    expect(dispatchUnits(initial, 'player', 'neutral', 'enemy')).toBe(initial);
    expect(dispatchUnits(initial, 'neutral', 'player', 'enemy')).toBe(initial);
  });

  it('does not let the enemy double-spend queued groups or act after defeat', () => {
    const initial = createSimulation(nodes);
    const ordered = dispatchUnits(initial, 'enemy', 'player', 'enemy');
    const replaced = dispatchUnits(ordered, 'enemy', 'neutral', 'enemy');
    expect(replaced.transfers[0]).toBe(ordered.transfers[0]);
    expect(replaced.transfers.filter(t => t.targetId === 'neutral').reduce((sum, t) => sum + t.units, 0)).toBe(15);
    const ended = { ...initial, roundStatus: 'defeat' as const };
    expect(dispatchUnits(ended, 'enemy', 'player', 'enemy')).toBe(ended);
  });
});
