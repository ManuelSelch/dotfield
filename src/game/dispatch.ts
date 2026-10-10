import { BATCH_SIZE } from './settings';
import { getFactionRules } from './rules';
import type { Faction, SimulationState, Transfer } from './types';
import { createRoute } from './route';
import { planTerrainRoute } from './terrain/routes';
import type { Terrain } from './terrain/types';
import { canRiverOrder } from './river';

export function dispatchUnits(state: SimulationState, sourceId: string, targetId: string, faction: Faction = 'player',
  terrain?: Terrain): SimulationState {
  if (state.roundStatus !== 'playing') return state;
  const source = state.territories.find((node) => node.id === sourceId);
  const target = state.territories.find((node) => node.id === targetId);
  if (!source || !target || source === target || source.owner !== faction || source.units < 2) return state;

  if (!canRiverOrder(source, target, state.river)) return state;
  const rules = getFactionRules(state, faction);
  const route = createRoute(source, target, rules);
  if (terrain) {
    const planned = planTerrainRoute(source, target, terrain, rules);
    // Slice 1 exposes route queries, not bent-path physics. Never launch a straight
    // transfer through a barrier; slice 2 will consume the complete planned path.
    if (!planned || planned.points.length !== 2 || planned.crossingIds.length !== 0
      || planned.points[0].x !== route.from.x || planned.points[0].y !== route.from.y
      || planned.points[1].x !== route.to.x || planned.points[1].y !== route.to.y) return state;
  }

  // Queued troops are still inside the city: replace their order, never airborne groups.
  const transfers = state.transfers.filter(t => t.sourceId !== sourceId || t.owner !== faction || t.elapsedMs >= 0);
  const units = source.units - 1;
  if (units <= 0) return state;
  const batches: Transfer[] = [];
  for (let sent = 0; sent < units; sent += BATCH_SIZE) {
    const index = batches.length;
    const count = Math.min(BATCH_SIZE, units - sent);
    batches.push({
      id: state.nextTransferId + index, sourceId, targetId, owner: faction,
      units: count, formationSize: count, dotSlots: Array.from({ length: count }, (_, slot) => slot),
      ...route,
      // Negative elapsed time reserves a batch until its launch time.
      elapsedMs: index === 0 ? 0 : -index * rules.batchIntervalMs,
    });
  }
  return {
    ...state,
    territories: state.territories.map((node) => node === source ? { ...node, units: node.units - batches[0].units } : node),
    transfers: [...transfers, ...batches],
    nextTransferId: state.nextTransferId + batches.length,
  };
}
