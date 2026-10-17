import { canGroundOrder } from '../groundAccess';
import { dispatchUnits } from '../dispatch';
import { availableUnits } from '../launch';
import { orderDurationMs, remainingTravelBound } from '../route';
import { minimumTravelMultiplier } from '../features/slowZone';
import { getFactionRules } from '../rules';
import { SIMULATION_STEP_MS } from '../settings';
import type { SimulationState } from '../types';
import { DEFAULT_AI, PRODUCTION_AI, type AiConfig } from './config';
import { forecastBattle } from './forecast';
import { scoreOrder, type AiOrder } from './score';
import { canRelieveProduction, factionArmyUnits, frontlineDistances } from './logistics';
import { incomingThreat, keepsHomeReserve, remainingDeliveryMs } from './mobility';

export function chooseOrder(state: SimulationState, config: AiConfig = DEFAULT_AI, factionId = 'enemy'): AiOrder | null {
  if (state.roundStatus !== 'playing') return null;
  let best: AiOrder | null = null;
  const forecasts = new Map<number, SimulationState>();
  const distances = frontlineDistances(state, factionId);
  const minimumMultiplier = minimumTravelMultiplier(state);
  for (const source of state.territories) {
    const units = availableUnits(state, source.id) - 1;
    if (source.owner !== factionId || units < config.minDispatchUnits
      || state.transfers.some(t => t.sourceId === source.id && t.owner === factionId)) continue;
    for (const target of state.territories) {
      if (!canGroundOrder(state, source, target, factionId)) continue;
      const relevantArrivals = state.transfers.filter(t => t.targetId === target.id || t.targetId === source.id)
        .map(t => remainingTravelBound(t, minimumMultiplier));
      const productionRelief = canRelieveProduction(state, source, target, distances, config, factionId);
      const orderHorizon = Math.ceil(Math.max(orderDurationMs(source, target, units, getFactionRules(state, source.owner), minimumMultiplier),
        ...relevantArrivals, ...Object.values(state.aircraft ?? {}).filter(p => p.targetId === target.id || p.targetId === source.id)
          .map(remainingDeliveryMs)) / SIMULATION_STEP_MS) * SIMULATION_STEP_MS;
      const horizon = Math.max(orderHorizon, productionRelief ? PRODUCTION_AI.lookAheadMs : 0);
      let baseline = forecasts.get(horizon);
      if (!baseline) { baseline = forecastBattle(state, horizon); forecasts.set(horizon, baseline); }
      const dispatched = dispatchUnits(state, source.id, target.id, factionId);
      if (!keepsHomeReserve(state, dispatched, factionId)) continue;
      const proposed = forecastBattle(dispatched, horizon);
      if (!keepsHomeReserve(baseline, proposed, factionId)) continue;
      // Compare the whole faction, not just the freed source: filling the sink
      // can sacrifice its production. Real forecasts include queues, incoming
      // armies, growth multipliers and losses; a transfer itself creates no units.
      const productionGain = productionRelief && baseline.territories.find(city => city.id === source.id)?.owner === factionId
        && proposed.territories.find(city => city.id === source.id)?.owner === factionId
        ? Math.max(0, factionArmyUnits(proposed, factionId) - factionArmyUnits(baseline, factionId)) : 0;
      const candidate = scoreOrder(state, source, target, baseline, proposed, orderHorizon, config, factionId, distances, productionGain);
      // Stable map order breaks ties; no random or frame-rate-dependent decisions.
      const emergency = (order: AiOrder) => !!state.relay && order.kind === 'reinforce' && incomingThreat(state, order.targetId, factionId);
      if (candidate && (!best || (emergency(candidate) && !emergency(best))
        || (emergency(candidate) === emergency(best) && candidate.score > best.score))) best = candidate;
    }
  }
  return best;
}
