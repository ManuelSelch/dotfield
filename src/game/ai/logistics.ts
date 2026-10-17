import { getTerritoryGrowthRate } from '../features/growthRate';
import { availableUnits } from '../launch';
import { canRiverOrder } from '../river';
import { createRoute } from '../route';
import { getFactionRules } from '../rules';
import { CITY_PRODUCTION_LIMIT } from '../settings';
import { canDirectTerrainOrder } from '../terrain/directOrder';
import type { SimulationState, TerritoryState } from '../types';
import { PRODUCTION_AI, type AiConfig } from './config';
import { airSupplyRoom, incomingThreat } from './mobility';

// Strategic distances use legal straight legs, including manual staging around
// mountains and through paired bridges. They never create automatic troop routes.
export function frontlineDistances(state: SimulationState, factionId: string): ReadonlyMap<string, number> {
  const rules = getFactionRules(state, factionId);
  const distances = new Map(state.territories.map(city => [city.id,
    city.owner !== factionId && city.owner !== 'neutral' ? 0 : Infinity]));
  const remaining = [...state.territories];
  while (remaining.length) {
    remaining.sort((a, b) => distances.get(a.id)! - distances.get(b.id)!);
    const nearest = remaining.shift()!;
    const distance = distances.get(nearest.id)!;
    if (!Number.isFinite(distance)) break;
    for (const next of remaining) {
      if (!canRiverOrder(next, nearest, state.river)
        || !canDirectTerrainOrder(next, nearest, state.terrain, rules)) continue;
      const proposed = distance + Math.hypot(next.x - nearest.x, next.y - nearest.y);
      if (proposed < distances.get(next.id)!) distances.set(next.id, proposed);
    }
  }
  return distances;
}

function stagingPriority(state: SimulationState, a: TerritoryState, b: TerritoryState,
  distances: ReadonlyMap<string, number>, config: AiConfig): number {
  const aDistance = distances.get(a.id)!, bDistance = distances.get(b.id)!;
  const bandWidth = Math.max(1, config.frontlineAdvance);
  const bandDifference = Math.floor(aDistance / bandWidth) - Math.floor(bDistance / bandWidth);
  if (bandDifference !== 0) return bandDifference;
  const rateDifference = getTerritoryGrowthRate(state, a) - getTerritoryGrowthRate(state, b);
  if (rateDifference !== 0) return rateDifference;
  if (Math.abs(aDistance - bDistance) > 1e-6) return aDistance - bDistance;
  return a.id < b.id ? -1 : a.id === b.id ? 0 : 1;
}

export function canRelieveProduction(state: SimulationState, source: TerritoryState, target: TerritoryState,
  distances: ReadonlyMap<string, number>, config: AiConfig, factionId: string): boolean {
  if (target.owner !== factionId || source.id === target.id) return false;
  if (target.cityType === 'airfield' && airSupplyRoom(state, target, factionId) < availableUnits(state, source.id) - 1) return false;
  const rate = getTerritoryGrowthRate(state, source);
  if (rate <= 0) return false;
  const timeToCap = Math.max(0, (CITY_PRODUCTION_LIMIT - source.units) * 1000 - source.growthRemainder) / rate;
  if (timeToCap > PRODUCTION_AI.capLeadMs) return false;

  // Never evacuate a known threatened city or use economic redistribution as a
  // substitute for defending the destination. Defence has its own scoring path.
  if (incomingThreat(state, source.id, factionId) || incomingThreat(state, target.id, factionId)) return false;
  // Also hold exposed strongholds against nearby armies which have not launched
  // yet. This is deliberately conservative, not a prediction of future orders.
  if (state.territories.some(hostile => hostile.owner !== factionId && hostile.owner !== 'neutral'
    && availableUnits(state, hostile.id) - 1 >= config.minDispatchUnits
    && canRiverOrder(hostile, source, state.river)
    && canDirectTerrainOrder(hostile, source, state.terrain, getFactionRules(state, hostile.owner))
    && createRoute(hostile, source, getFactionRules(state, hostile.owner)).durationMs
      <= (config.productionThreatTravelMs ?? PRODUCTION_AI.threatTravelMs))) return false;

  const sourceDistance = distances.get(source.id)!;
  const targetDistance = distances.get(target.id)!;
  if (!Number.isFinite(sourceDistance) || !Number.isFinite(targetDistance)) return false;
  // A stable ordering, independent of troop counts/incoming friendly armies,
  // makes equal-front consolidation one-way instead of a cap-driven ping-pong.
  // Within a front band prefer ordinary cities as sinks, freeing Factories.
  if (stagingPriority(state, target, source, distances, config) >= 0) return false;
  // Feed the best legally reachable local sink, not every slightly better city.
  // This keeps the number of sacrificed production sites small and stable.
  const rules = getFactionRules(state, factionId);
  return !state.territories.some(other => other.id !== source.id && other.id !== target.id
    && other.owner === factionId && Number.isFinite(distances.get(other.id))
    && stagingPriority(state, other, target, distances, config) < 0
    && !state.transfers.some(batch => batch.owner !== factionId && batch.targetId === other.id)
    && canRiverOrder(source, other, state.river)
    && canDirectTerrainOrder(source, other, state.terrain, rules));
}

export function factionArmyUnits(state: SimulationState, factionId: string): number {
  // Unlaunched batches are still inside their source garrison: count them once.
  return state.territories.reduce((sum, city) => sum + (city.owner === factionId ? city.units : 0), 0)
    + state.transfers.reduce((sum, batch) => sum + (batch.owner === factionId && batch.elapsedMs >= 0 ? batch.units : 0), 0)
    + state.arrivals.reduce((sum, batch) => sum + (batch.owner === factionId ? batch.units : 0), 0)
    + Object.values(state.aircraft ?? {}).reduce((sum, plane) => sum + (plane.owner === factionId
      && (plane.phase === 'outbound' || plane.phase === 'unloading') ? plane.cargo : 0), 0);
}
