import { firstDefenderBlocker } from '../game/defenderBorders';
import { canRiverOrder } from '../game/river';
import { canDirectTerrainOrder } from '../game/terrain/directOrder';
import { getFactionRules } from '../game/rules';
import type { SimulationState, Territory } from '../game/types';

export function groundOrderFeedback(state: SimulationState, source?: Territory, target?: Territory): string | null {
  if (!source || !target || source.id === target.id) return null;
  if (!canRiverOrder(source, target, state.river)) return 'Cross only between the paired bridge cities.';
  if (!canDirectTerrainOrder(source, target, state.terrain, getFactionRules(state, source.owner))) {
    return 'Mountains block direct orders. Stage troops around the ridge.';
  }
  const blocker = firstDefenderBlocker(state.territories, source, target, state.river);
  return blocker ? `Defender ${blocker.id} blocks enemy ground transit. Attack it or stage around it.` : null;
}
