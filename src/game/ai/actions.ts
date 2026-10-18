import { launchAircraft } from '../aircraft';
import { cityType, convertCity } from '../cityConversion';
import { dispatchUnits } from '../dispatch';
import { getTerritoryGrowthRate } from '../features/growthRate';
import { shieldRechargeSource } from '../features/networkShields';
import { minimumTravelMultiplier } from '../features/slowZone';
import { remainingTravelBound } from '../route';
import { AIRCRAFT_PREPARATION_MS, AIR_DELIVERY_INTERVAL_MS, BATCH_SIZE, CITY_CONVERSION_COST, DEFENDER_SHIELD_CAPACITY, SIMULATION_STEP_MS, WATCHTOWER_RANGE } from '../settings';
import { artilleryTarget } from '../features/artillery';
import type { CityType, FactionId, SimulationState } from '../types';
import { DEFAULT_AI, type AiConfig } from './config';
import { chooseOrder } from './decision';
import { forecastBattle } from './forecast';
import { frontlineDistances } from './logistics';
import { groundLegal, hasBarrierOpportunity, incomingThreat, keepsHomeReserve, remainingDeliveryMs, safeAirDeparture } from './mobility';
import { evaluateOrder, type AiOrder } from './score';
import { AiDecisionTraceCollector } from './trace';
import { newlyDeniedRoutes } from './defenderStrategy';

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

function chooseFlight(state: SimulationState, config: AiConfig, factionId: string, trace?: AiDecisionTraceCollector): AiAction | null {
  const distances = frontlineDistances(state, factionId);
  let best: AiAction | null = null;
  const baselines = new Map<number, SimulationState>();
  for (const source of state.territories) {
    if (source.owner !== factionId) continue;
    const planeState = state.aircraft?.[source.id];
    if (!planeState) continue;
    if (planeState.phase !== 'ready') { trace?.block('aircraft-not-ready', 'airlift', { cityId: source.id }); continue; }
    if (source.units <= 1) { trace?.block('insufficient-garrison', 'airlift', { cityId: source.id }); continue; }
    if (state.transfers.some(t => t.sourceId === source.id && t.owner === factionId)) {
      trace?.block('source-has-order', 'airlift', { cityId: source.id }); continue;
    }
    for (const target of state.territories) {
      if (target.id === source.id) continue;
      const launched = launchAircraft(state, source.id, target.id, factionId);
      if (launched === state) { trace?.block('no-target', 'airlift', { sourceId: source.id, targetId: target.id }); continue; }
      if (!keepsHomeReserve(state, launched, factionId)) {
        trace?.block('home-reserve', 'airlift', { sourceId: source.id, targetId: target.id }); continue;
      }
      if (!safeAirDeparture(state, launched, source.id, factionId)) {
        trace?.block('unsafe-airlift', 'airlift', { sourceId: source.id, targetId: target.id }); continue;
      }
      const plane = launched.aircraft![source.id];
      const horizon = grid(Math.max(plane.durationMs + Math.ceil(plane.cargo / BATCH_SIZE) * AIR_DELIVERY_INTERVAL_MS,
        knownHorizon(state)));
      let baseline = baselines.get(horizon);
      if (!baseline) { baseline = forecastBattle(state, horizon); baselines.set(horizon, baseline); }
      const proposed = forecastBattle(launched, horizon);
      // Even if the target would fall eventually, losing the home destroys the
      // remaining cargo. Never score a flight as a ground army that survives it.
      if (proposed.territories.find(c => c.id === source.id)?.owner !== factionId
        || !keepsHomeReserve(baseline, proposed, factionId)) {
        trace?.block('home-reserve', 'airlift', { sourceId: source.id, targetId: target.id }); continue;
      }
      const evaluation = evaluateOrder(state, source, target, baseline, proposed, horizon, config, factionId, distances, 0, plane.cargo);
      if (!evaluation.order) {
        if (evaluation.rejection) trace?.block(evaluation.rejection, 'airlift', { sourceId: source.id, targetId: target.id });
        continue;
      }
      const order = { ...evaluation.order, type: 'airlift' as const };
      trace?.consider(order, order.score);
      if (!best || order.score > best.score) best = order;
    }
  }
  return best;
}

function distanceToTransfer(city: { x: number; y: number }, transfer: SimulationState['transfers'][number]): number {
  const dx = transfer.to.x - transfer.from.x, dy = transfer.to.y - transfer.from.y;
  const length2 = dx * dx + dy * dy;
  const progress = length2 ? Math.max(0, Math.min(1, ((city.x - transfer.from.x) * dx + (city.y - transfer.from.y) * dy) / length2)) : 0;
  return Math.hypot(city.x - (transfer.from.x + progress * dx), city.y - (transfer.from.y + progress * dy));
}

function chooseConversion(state: SimulationState, config: AiConfig, factionId: string,
  trace?: AiDecisionTraceCollector, conversionPenalty = 0): AiAction | null {
  const owned = state.territories.filter(c => c.owner === factionId);
  const producers = owned.filter(c => cityType(c) === 'production');
  // Keep at least two producers and at least two thirds of the economy intact.
  // Only assign roles to Production, never switch an assigned role back/forth.
  if (producers.length < 3 || owned.length - producers.length >= Math.floor(owned.length / 3)) {
    trace?.block('conversion-economy-guard', 'decision'); return null;
  }
  let best: AiAction | null = null;
  const hasWatchtower = owned.some(city => cityType(city) === 'watchtower');
  const hasArtillery = owned.some(city => cityType(city) === 'artillery');
  const hasAirfield = owned.find(city => cityType(city) === 'airfield');
  if (hasAirfield) trace?.block('role-already-built', 'conversion', { cityId: hasAirfield.id });
  const artilleryRole = owned.find(city => cityType(city) === 'artillery');
  if (artilleryRole) trace?.block('role-already-built', 'conversion', { cityId: artilleryRole.id });
  const watchtowerRole = owned.find(city => cityType(city) === 'watchtower');
  if (watchtowerRole) trace?.block('role-already-built', 'conversion', { cityId: watchtowerRole.id });
  for (const city of producers) {
    if (city.id === state.homeCityIds?.[factionId]) { trace?.block('city-is-home', 'conversion', { cityId: city.id }); continue; }
    if (incomingThreat(state, city.id, factionId)) { trace?.block('city-threatened', 'conversion', { cityId: city.id }); continue; }
    if (state.transfers.some(t => t.sourceId === city.id || t.targetId === city.id)) {
      trace?.block('city-has-pending-order', 'conversion', { cityId: city.id }); continue;
    }
    const economicCost = getTerritoryGrowthRate(state, city) * 5;
    if (!hasAirfield && hasBarrierOpportunity(state, city, factionId)) {
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
          if (score > 0) {
            const action: AiAction = { type: 'convert', cityId: city.id, cityType: 'airfield', score };
            trace?.consider(action, score - conversionPenalty);
            if (!best || score > best.score) best = action;
          } else trace?.block('airfield-not-useful', 'conversion', { cityId: city.id });
        } else trace?.block('airfield-not-useful', 'conversion', { cityId: city.id });
      } else trace?.block('airfield-not-useful', 'conversion', { cityId: city.id });
    } else if (!hasAirfield) trace?.block('airfield-not-useful', 'conversion', { cityId: city.id });
    const hasArtilleryRole = hasArtillery;
    const canArtilleryHit = artilleryTarget(state, { ...city, cityType: 'artillery' });
    if (!hasArtilleryRole && city.units > CITY_CONVERSION_COST.artillery && canArtilleryHit) {
      const converted = convertCity(state, city.id, 'artillery', factionId);
      if (converted !== state) {
        const horizon = grid(Math.max(10_000, knownHorizon(state)));
        const baseline = forecastBattle(state, horizon), proposed = forecastBattle(converted, horizon);
        const damage = baseline.territories.reduce((sum, target) => {
          if (target.owner === factionId || target.owner === 'neutral') return sum;
          const after = proposed.territories.find(city => city.id === target.id)!;
          return sum + Math.max(0, target.units - after.units);
        }, 0);
        const score = config.attackScore + Math.min(30, damage * 2) - economicCost;
        if (proposed.territories.find(c => c.id === city.id)?.owner !== factionId) {
          trace?.block('conversion-forecast-fails', 'conversion', { cityId: city.id });
        } else if (!keepsHomeReserve(state, proposed, factionId)) {
          trace?.block('home-reserve', 'conversion', { cityId: city.id });
        } else if (score <= 0) trace?.block('artillery-not-useful', 'conversion', { cityId: city.id });
        else {
          const action: AiAction = { type: 'convert', cityId: city.id, cityType: 'artillery', score };
          trace?.consider(action, score - conversionPenalty);
          if (!best || score > best.score) best = action;
        }
      }
    } else if (!hasArtilleryRole && !canArtilleryHit) trace?.block('artillery-not-useful', 'conversion', { cityId: city.id });
    else if (!hasArtilleryRole) trace?.block('below-conversion-cost', 'conversion', { cityId: city.id });
    const canBuildWatchtower = !hasWatchtower && city.units > CITY_CONVERSION_COST.watchtower;
    if (canBuildWatchtower) {
      const threats = state.transfers.filter(transfer => transfer.owner !== factionId
        && distanceToTransfer(city, transfer) <= WATCHTOWER_RANGE);
      if (threats.length) {
        const converted = convertCity(state, city.id, 'watchtower', factionId);
        const horizon = grid(Math.max(5_000, Math.min(10_000, knownHorizon(state))));
        const baseline = forecastBattle(state, horizon), proposed = forecastBattle(converted, horizon);
        const before = baseline.transfers.filter(transfer => transfer.owner !== factionId).reduce((sum, transfer) => sum + transfer.units, 0);
        const after = proposed.transfers.filter(transfer => transfer.owner !== factionId).reduce((sum, transfer) => sum + transfer.units, 0);
        const protectedUnits = Math.max(0, before - after);
        const score = config.defenceScore + Math.min(40, protectedUnits * 2) - economicCost;
        if (proposed.territories.find(c => c.id === city.id)?.owner !== factionId) {
          trace?.block('conversion-forecast-fails', 'conversion', { cityId: city.id });
        } else if (!keepsHomeReserve(state, proposed, factionId)) {
          trace?.block('home-reserve', 'conversion', { cityId: city.id });
        } else if (converted === state || protectedUnits <= 0 || score <= 0) {
          trace?.block('watchtower-not-useful', 'conversion', { cityId: city.id });
        } else {
          const action: AiAction = { type: 'convert', cityId: city.id, cityType: 'watchtower', score };
          trace?.consider(action, score - conversionPenalty);
          if (!best || score > best.score) best = action;
        }
      } else trace?.block('watchtower-not-useful', 'conversion', { cityId: city.id });
    } else if (!hasWatchtower) trace?.block('below-conversion-cost', 'conversion', { cityId: city.id });
    const converted = convertCity(state, city.id, 'defender', factionId);
    if (converted === state || converted.territories.find(c => c.id === city.id)!.units < 20) {
      trace?.block('below-conversion-cost', 'conversion', { cityId: city.id }); continue;
    }
    const denied = newlyDeniedRoutes(state, converted, factionId);
    // Extra Defenders must add real transit denial; do not buy redundant shields.
    if (!denied && (owned.some(c => cityType(c) === 'defender')
      || shieldRechargeSource(state, city.id).capacity >= DEFENDER_SHIELD_CAPACITY)) {
      trace?.block('defender-not-useful', 'conversion', { cityId: city.id }); continue;
    }
    // A held, exposed front facing an army it cannot cheaply attack. Shield
    // recharge is long-term denial, never a fictional immediate free shield.
    const exposed = state.territories.some(hostile => hostile.owner !== factionId && hostile.owner !== 'neutral'
      && hostile.units > city.units && groundLegal(state, hostile, city)
      && Math.hypot(hostile.x - city.x, hostile.y - city.y) <= 180);
    if (!exposed) { trace?.block('defender-not-useful', 'conversion', { cityId: city.id }); continue; }
    const horizon = grid(Math.max(30_000, knownHorizon(state)));
    const proposed = forecastBattle(converted, horizon);
    if (proposed.territories.find(c => c.id === city.id)?.owner !== factionId) {
      trace?.block('conversion-forecast-fails', 'conversion', { cityId: city.id }); continue;
    }
    if (!keepsHomeReserve(state, proposed, factionId)) {
      trace?.block('home-reserve', 'conversion', { cityId: city.id }); continue;
    }
    const score = config.frontlineScore + 5 + Math.min(12, denied * 4) - economicCost;
    if (score > 0) {
      const action: AiAction = { type: 'convert', cityId: city.id, cityType: 'defender', score };
      trace?.consider(action, score - conversionPenalty);
      if (!best || score > best.score) best = action;
    } else trace?.block('non-positive-score', 'conversion', { cityId: city.id });
  }
  return best;
}

/** One deterministic command per decision; legacy chooseOrder remains ground-only. */
function selectAction(state: SimulationState, config: AiConfig, factionId: FactionId, trace?: AiDecisionTraceCollector) {
  if (state.roundStatus !== 'playing' || !state.rules.factions[factionId] || factionId === 'neutral') {
    trace?.block('round-not-playing', 'decision');
    return { action: null, priority: Number.NEGATIVE_INFINITY, priorityOverride: false } as const;
  }
  const ground = chooseOrder(state, config, factionId, trace);
  // Stop an active hostile holding clock before optional purchases or side
  // objectives. Ground recapture plans already pass real forecasts/home safety.
  if (ground?.kind === 'attack' && state.relay && state.elapsedMs >= state.relay.activateAtMs
    && ground.targetId === state.relay.cityId) {
    return { action: { ...ground, type: 'ground' as const }, priority: ground.score, priorityOverride: true };
  }
  // Known emergency rescue/interception takes priority over construction.
  if (ground && (incomingThreat(state, ground.sourceId, factionId)
    || ground.kind === 'reinforce' && incomingThreat(state, ground.targetId, factionId))) {
    return { action: { ...ground, type: 'ground' as const }, priority: ground.score, priorityOverride: true };
  }
  let best: AiAction | null = ground ? { ...ground, type: 'ground' } : null;
  let bestPriority = ground?.score ?? Number.NEGATIVE_INFINITY;
  const flight = chooseFlight(state, config, factionId, trace);
  if (flight && (!best || flight.score > bestPriority)) { best = flight; bestPriority = flight.score; }
  // Existing saved aggressive profiles predate roleConversionPenalty. Infer the
  // same modest bias from their stable attackScore so loaded rounds get the fix.
  const conversionPenalty = config.roleConversionPenalty
    ?? Math.max(0, (config.attackScore - DEFAULT_AI.attackScore) * 0.9);
  const conversion = chooseConversion(state, config, factionId, trace, conversionPenalty);
  const conversionPriority = conversion ? conversion.score - conversionPenalty : Number.NEGATIVE_INFINITY;
  if (conversion && (!best || conversionPriority > bestPriority)) { best = conversion; bestPriority = conversionPriority; }
  return { action: best, priority: bestPriority, priorityOverride: false } as const;
}

export function chooseAction(state: SimulationState, config: AiConfig = DEFAULT_AI, factionId: FactionId = 'enemy'): AiAction | null {
  return selectAction(state, config, factionId).action;
}

export function chooseActionWithTrace(state: SimulationState, config: AiConfig = DEFAULT_AI, factionId: FactionId = 'enemy') {
  const trace = new AiDecisionTraceCollector();
  const result = selectAction(state, config, factionId, trace);
  return { action: result.action, trace: trace.finish(result.action, {
    selectedPriority: result.priority, priorityOverride: result.priorityOverride,
  }) };
}
