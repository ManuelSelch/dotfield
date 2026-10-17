import { canGroundOrder } from '../groundAccess';
import type { SimulationState } from '../types';

/** Marginal ground routes denied, not arbitrary proximity or a claim of safety.
 * Ignore routes already closed by geography or another Defender. */
export function newlyDeniedRoutes(before: SimulationState, after: SimulationState, faction: string): number {
  let count = 0;
  for (const hostile of before.territories) {
    if (hostile.owner === faction || hostile.owner === 'neutral' || hostile.units < 2) continue;
    for (const target of before.territories) {
      if (target.owner === faction && canGroundOrder(before, hostile, target)
        && !canGroundOrder(after, hostile, target)) count++;
    }
  }
  return count;
}

/** Reward opening reachable ground legs only after the combat forecast succeeds. */
export function breachValue(state: SimulationState, cityId: string, faction: string): number {
  const wall = state.territories.find(c => c.id === cityId);
  if (wall?.cityType !== 'defender' || wall.owner === 'neutral' || wall.owner === faction) return 0;
  const opened = { ...state, territories: state.territories.map(c => c === wall ? { ...c, owner: faction } : c) };
  let count = 0;
  for (const source of state.territories) {
    if (source.owner !== faction || source.units < 2 || !canGroundOrder(state, source, wall, faction)) continue;
    for (const target of state.territories) {
      if (target.id !== wall.id && target.owner !== faction && !canGroundOrder(state, source, target, faction)
        && canGroundOrder(opened, source, target, faction)) count++;
    }
  }
  return count;
}
