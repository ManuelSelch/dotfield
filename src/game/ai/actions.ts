import { launchAircraft } from '../aircraft';
import { cityType, convertCity } from '../cityConversion';
import { dispatchUnits } from '../dispatch';
import { getTerritoryGrowthRate } from '../features/growthRate';
import { shieldRechargeSource } from '../features/networkShields';
import { minimumTravelMultiplier } from '../features/slowZone';
import { remainingTravelBound } from '../route';
import { AIRCRAFT_PREPARATION_MS, AIR_DELIVERY_INTERVAL_MS, BATCH_SIZE, DEFENDER_SHIELD_CAPACITY, SIMULATION_STEP_MS } from '../settings';
import type { CityType, FactionId, SimulationState } from '../types';
import { DEFAULT_AI, type AiConfig } from './config';
import { chooseOrder } from './decision';
import { forecastBattle } from './forecast';
import { frontlineDistances } from './logistics';
import { groundLegal, hasBarrierOpportunity, incomingThreat, keepsHomeReserve, remainingDeliveryMs, safeAirDeparture } from './mobility';
import { scoreOrder, type AiOrder } from './score';

// AiOrder.kind remains the tactical reason, never a command discriminator.
export type AiAction = (AiOrder & { readonly type: 'ground' | 'airlift' })
  | { readonly type: 'convert'; readonly cityId: string; readonly cityType: CityType; readonly score: number };

/** Revalidate stale worker decisions through the exact public player commands. */
export function applyAiAction(state: SimulationState, action: AiAction, factionId: FactionId): SimulationState {
  switch (action.type) {
    case 'ground': return dispatchUnits(state, action.sourceId, action.targetId, factionId);
    case 'airlift': return launchAircraft(state, action.sourceId, action.targetId, factionId);
    case 'convert': return convertCity(state, action.cityId, action.cityType, factionId);
  }
}

function knownHorizon(state: SimulationState): number {
  const multiplier = minimumTravelMultiplier(state);
  return Math.max(0, ...state.transfers.map(t => remainingTravelBound(t, multiplier)),
    ...Object.values(state.aircraft ?? {}).map(remainingDeliveryMs));
}
function grid(ms: number): number { return Math.ceil(ms / SIMULATION_STEP_MS) * SIMULATION_STEP_MS; }

function chooseFlight(state: SimulationState, config: AiConfig, factionId: string): AiAction | null {
  const distances = frontlineDistances(state, factionId);
  let best: AiAction | null = null;
  const baselines = new Map<number, SimulationState>();
  for (const source of state.territories) {
    if (source.owner !== factionId || state.aircraft?.[source.id]?.phase !== 'ready' || source.units <= 1
      || state.transfers.some(t => t.sourceId === source.id && t.owner === factionId)) continue;
    for (const target of state.territories) {
      const launched = launchAircraft(state, source.id, target.id, factionId);
      if (launched === state || !keepsHomeReserve(state, launched, factionId)
        || !safeAirDeparture(state, launched, source.id, factionId)) continue;
      const plane = launched.aircraft![source.id];
      const horizon = grid(Math.max(plane.durationMs + Math.ceil(plane.cargo / BATCH_SIZE) * AIR_DELIVERY_INTERVAL_MS,
        knownHorizon(state)));
      let baseline = baselines.get(horizon);
      if (!baseline) { baseline = forecastBattle(state, horizon); baselines.set(horizon, baseline); }
      const proposed = forecastBattle(launched, horizon);
      // Even if the target would fall eventually, losing the home destroys the
      // remaining cargo. Never score a flight as a ground army that survives it.
      if (proposed.territories.find(c => c.id === source.id)?.owner !== factionId
        || !keepsHomeReserve(baseline, proposed, factionId)) continue;
      const order = scoreOrder(state, source, target, baseline, proposed, horizon, config, factionId, distances, 0, plane.cargo);
      if (order && (!best || order.score > best.score)) best = { ...order, type: 'airlift' };
    }
  }
  return best;
}

function chooseConversion(state: SimulationState, config: AiConfig, factionId: string): AiAction | null {
  const owned = state.territories.filter(c => c.owner === factionId);
  const producers = owned.filter(c => cityType(c) === 'production');
  // Keep at least two producers and at least two thirds of the economy intact.
  // Only assign roles to Production, never switch an assigned role back/forth.
  if (producers.length < 3 || owned.length - producers.length >= Math.floor(owned.length / 3)) return null;
  let best: AiAction | null = null;
  for (const city of producers) {
    if (city.id === state.homeCityIds?.[factionId] || incomingThreat(state, city.id, factionId)
      || state.transfers.some(t => t.sourceId === city.id || t.targetId === city.id)) continue;
    const economicCost = getTerritoryGrowthRate(state, city) * 5;
    if (!owned.some(c => cityType(c) === 'airfield') && hasBarrierOpportunity(state, city, factionId)) {
      const converted = convertCity(state, city.id, 'airfield', factionId);
      if (converted !== state && converted.territories.find(c => c.id === city.id)!.units >= 2) {
        // Consider the same legal supply order the next decision would choose.
        // Replay its real launch cadence/garrison cost during preparation; never
        // pretend that a nonproducer manufactures its own 100-troop cargo.
        const supply = chooseOrder(converted, config, factionId);
        const supplied = supply?.kind === 'reinforce' && supply.targetId === city.id
          ? dispatchUnits(converted, supply.sourceId, supply.targetId, factionId) : converted;
        const prepared = forecastBattle(supplied, AIRCRAFT_PREPARATION_MS);
        // A conversion must enable an actual successful flight, not merely see a
        // mountain. This includes preparation, target growth and home-loss risk.
        const flight = chooseFlight(prepared, config, factionId);
        if (flight?.type === 'airlift' && flight.sourceId === city.id) {
          const score = flight.score * 0.7 - economicCost;
          if (score > 0 && (!best || score > best.score)) best = { type: 'convert', cityId: city.id, cityType: 'airfield', score };
        }
      }
    }
    if (owned.some(c => cityType(c) === 'defender')
      || shieldRechargeSource(state, city.id).capacity >= DEFENDER_SHIELD_CAPACITY) continue;
    // A held, exposed front facing an army it cannot cheaply attack. Shield
    // recharge is long-term denial, never a fictional immediate free shield.
    const exposed = state.territories.some(hostile => hostile.owner !== factionId && hostile.owner !== 'neutral'
      && hostile.units > city.units && groundLegal(state, hostile, city)
      && Math.hypot(hostile.x - city.x, hostile.y - city.y) <= 180);
    if (!exposed) continue;
    const converted = convertCity(state, city.id, 'defender', factionId);
    if (converted === state || converted.territories.find(c => c.id === city.id)!.units < 20) continue;
    const horizon = grid(Math.max(30_000, knownHorizon(state)));
    const proposed = forecastBattle(converted, horizon);
    if (proposed.territories.find(c => c.id === city.id)?.owner !== factionId || !keepsHomeReserve(state, proposed, factionId)) continue;
    const score = config.frontlineScore + 5 - economicCost;
    if (score > 0 && (!best || score > best.score)) best = { type: 'convert', cityId: city.id, cityType: 'defender', score };
  }
  return best;
}

/** One deterministic command per decision; legacy chooseOrder remains ground-only. */
export function chooseAction(state: SimulationState, config: AiConfig = DEFAULT_AI, factionId: FactionId = 'enemy'): AiAction | null {
  if (state.roundStatus !== 'playing' || !state.rules.factions[factionId] || factionId === 'neutral') return null;
  const ground = chooseOrder(state, config, factionId);
  // Known emergency rescue/interception takes priority over construction.
  if (ground && (incomingThreat(state, ground.sourceId, factionId)
    || ground.kind === 'reinforce' && incomingThreat(state, ground.targetId, factionId))) return { ...ground, type: 'ground' };
  let best: AiAction | null = ground ? { ...ground, type: 'ground' } : null;
  const flight = chooseFlight(state, config, factionId);
  if (flight && (!best || flight.score > best.score)) best = flight;
  const conversion = chooseConversion(state, config, factionId);
  if (conversion && (!best || conversion.score > best.score)) best = conversion;
  return best;
}
