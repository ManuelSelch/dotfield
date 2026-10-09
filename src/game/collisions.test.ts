import { describe, expect, it } from 'vitest';
import { createSimulation } from './state';
import { mayContact, resolveTravelCollisions } from './collisions';
import type { Faction, Point, Transfer } from './types';

function batch(id: number, owner: Faction, from: Point, to: Point, units = 1, elapsedMs = 400): Transfer {
  return { id, owner, sourceId: `${id}-source`, targetId: `${id}-target`, from, to,
    units, formationSize: units, dotSlots: Array.from({ length: units }, (_, i) => i), durationMs: 1000, elapsedMs };
}
const forward = (units = 5) => batch(1, 'player', { x: 0, y: 100 }, { x: 100, y: 100 }, units);
const backward = (units = 5) => batch(2, 'enemy', { x: 100, y: 100 }, { x: 0, y: 100 }, units);
const game = (...transfers: Transfer[]) => ({ ...createSimulation([]), transfers });

describe('individual opposing dot collisions', () => {
  it('rejects distant paths before dot-level collision checks', () => {
    expect(mayContact(
      { minX: 0, minY: 0, maxX: 10, maxY: 10 },
      { minX: 20, minY: 0, maxX: 30, maxY: 10 },
    )).toBe(false);
    expect(mayContact(
      { minX: 0, minY: 0, maxX: 10, maxY: 10 },
      { minX: 10, minY: 10, maxX: 20, maxY: 20 },
    )).toBe(true);
  });
  it('destroys matching dots in two head-on groups', () => {
    expect(resolveTravelCollisions(game(forward(), backward()), 100).transfers).toEqual([]);
  });
  it('removes only the touching dot, preserving surviving slots and integer counts', () => {
    const original = game(forward(), backward(1));
    const next = resolveTravelCollisions(original, 100);
    expect(next.transfers).toHaveLength(1);
    expect(next.transfers[0]).toMatchObject({ id: 1, units: 4, formationSize: 5, dotSlots: [0, 1, 3, 4] });
    expect(original.transfers[0].dotSlots).toEqual([0, 1, 2, 3, 4]);
    expect(next.territories).toBe(original.territories);
  });
  it('annihilates hostile dots between two non-player factions', () => {
    const first = batch(1, 'enemy', { x: 0, y: 100 }, { x: 100, y: 100 }, 1);
    const second = batch(2, 'enemy-2', { x: 100, y: 100 }, { x: 0, y: 100 }, 1);
    expect(resolveTravelCollisions(game(first, second), 100).transfers).toEqual([]);
  });
  it('lets friendly dots pass through, even when they overlap', () => {
    const state = game(forward(), { ...backward(), owner: 'player' });
    expect(resolveTravelCollisions(state, 100)).toBe(state);
  });
  it('detects crossing paths even if endpoint samples never overlap', () => {
    const player = batch(1, 'player', { x: -100, y: 0 }, { x: 100, y: 0 }, 1, 0);
    const enemy = batch(2, 'enemy', { x: 0, y: -100 }, { x: 0, y: 100 }, 1, 0);
    expect(resolveTravelCollisions(game(player, enemy), 1000).transfers).toEqual([]);
  });
  it('does not collide paths that cross at different times', () => {
    const player = batch(1, 'player', { x: -100, y: 0 }, { x: 100, y: 0 }, 1, 0);
    const enemy = batch(2, 'enemy', { x: 0, y: -100 }, { x: 0, y: 100 }, 1, 400);
    expect(resolveTravelCollisions(game(player, enemy), 600).transfers).toHaveLength(2);
  });
  it('never destroys queued groups before their launch time', () => {
    const state = game(forward(), { ...backward(), elapsedMs: -1000 });
    expect(resolveTravelCollisions(state, 100)).toBe(state);
  });
  it('does not collide a dot after it has already reached its target border', () => {
    const player = { ...forward(1), durationMs: 100, elapsedMs: 90 };
    const enemy = { ...backward(1), from: { x: 200, y: 100 }, durationMs: 100, elapsedMs: 0 };
    expect(resolveTravelCollisions(game(player, enemy), 100).transfers).toHaveLength(2);
  });
  it('handles a group launching exactly when an opposing dot reaches the same border', () => {
    const player = batch(1, 'player', { x: 0, y: 0 }, { x: 100, y: 0 }, 1, -50);
    const enemy = { ...batch(2, 'enemy', { x: 100, y: 0 }, { x: 0, y: 0 }, 1, 0), durationMs: 50 };
    expect(resolveTravelCollisions(game(player, enemy), 50).transfers).toEqual([]);
  });
  it('a dot destroys only one opponent even when several dots overlap', () => {
    const player = batch(1, 'player', { x: 0, y: 0 }, { x: 100, y: 0 }, 2, 0);
    const enemy = batch(2, 'enemy', { x: 0, y: 0 }, { x: -100, y: 0 }, 1, 0);
    const next = resolveTravelCollisions(game(player, enemy), 50);
    expect(next.transfers).toHaveLength(1);
    expect(next.transfers[0]).toMatchObject({ units: 1, dotSlots: [1], formationSize: 2 });
  });
  it('breaks simultaneous contacts deterministically, independent of array order', () => {
    const player = batch(1, 'player', { x: 0, y: 0 }, { x: 100, y: 0 }, 2, 0);
    const enemy = batch(2, 'enemy', { x: 0, y: 0 }, { x: -100, y: 0 }, 1, 0);
    expect(resolveTravelCollisions(game(player, enemy), 50).transfers)
      .toEqual(resolveTravelCollisions(game(enemy, player), 50).transfers);
  });
});
