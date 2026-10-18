import { groundOrderBlockReason } from '../groundAccess';
import { dispatchUnits } from '../dispatch';
import { availableUnits } from '../launch';
import { orderDurationMs, remainingTravelBound } from '../route';
import { minimumTravelMultiplier } from '../features/slowZone';
import { getFactionRules } from '../rules';
import { SIMULATION_STEP_MS } from '../settings';
import type { SimulationState } from '../types';
import { DEFAULT_AI, PRODUCTION_AI, type AiConfig } from './config';
import { forecastBattle } from './forecast';
import { evaluateOrder, type AiOrder } from './score';
import type { AiDecisionTraceCollector } from './trace';
import { canRelieveProduction, factionArmyUnits, frontlineDistances } from './logistics';
import { incomingThreat, keepsHomeReserve, remainingDeliveryMs } from './mobility';
import { chooseRelayRecapture } from './relayRecapture';

export function chooseOrder(state: SimulationState, config: AiConfig = DEFAULT_AI, factionId = 'enemy', trace?: AiDecisionTraceCollector): AiOrder | null {
  if (state.roundStatus !== 'playing') { trace?.block('round-not-playing', 'decision'); return null; }
  let best: AiOrder | null = null;
  const forecasts = new Map<number, SimulationState>();
  const distances = frontlineDistances(state, factionId);
  const minimumMultiplier = minimumTravelMultiplier(state);
  for (const source of state.territories) {
    if (source.owner !== factionId) continue;
    const units = availableUnits(state, source.id) - 1;
    if (units < config.minDispatchUnits) { trace?.block('below-dispatch-minimum', 'source', { cityId: source.id }); continue; }
    if (state.transfers.some(t => t.sourceId === source.id && t.owner === factionId)) {
      trace?.block('source-has-order', 'source', { cityId: source.id }); continue;
    }
    for (const target of state.territories) {
      const routeBlock = groundOrderBlockReason(state, source, target, factionId);
      if (routeBlock) {
        if (routeBlock.reason !== 'same-city') trace?.block(routeBlock.reason === 'river' ? 'river-crossing'
          : routeBlock.reason === 'terrain' ? 'terrain-blocked' : 'defender-blocked', 'route', {
          sourceId: source.id, targetId: target.id, ...(routeBlock.reason === 'defender' ? { blockerId: routeBlock.blockerId } : {}),
        });
        continue;
      }
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
      if (dispatched === state) { trace?.block('below-dispatch-minimum', 'route', { sourceId: source.id, targetId: target.id }); continue; }
      if (!keepsHomeReserve(state, dispatched, factionId)) {
        trace?.block('home-reserve', 'route', { sourceId: source.id, targetId: target.id }); continue;
      }
      const proposed = forecastBattle(dispatched, horizon);
      if (!keepsHomeReserve(baseline, proposed, factionId)) {
        trace?.block('home-reserve', 'route', { sourceId: source.id, targetId: target.id }); continue;
      }
      // Compare the whole faction, not just the freed source: filling the sink
      // can sacrifice its production. Real forecasts include queues, incoming
      // armies, growth multipliers and losses; a transfer itself creates no units.
      const productionGain = productionRelief && baseline.territories.find(city => city.id === source.id)?.owner === factionId
        && proposed.territories.find(city => city.id === source.id)?.owner === factionId
        ? Math.max(0, factionArmyUnits(proposed, factionId) - factionArmyUnits(baseline, factionId)) : 0;
      const evaluation = evaluateOrder(state, source, target, baseline, proposed, orderHorizon, config, factionId, distances, productionGain);
      const candidate = evaluation.order;
      if (!candidate) { if (evaluation.rejection) trace?.block(evaluation.rejection, 'route', { sourceId: source.id, targetId: target.id }); continue; }
      trace?.consider({ ...candidate, type: 'ground' }, candidate.score);
      // Stable map order breaks ties; no random or frame-rate-dependent decisions.
      const emergency = (order: AiOrder) => !!state.relay && order.kind === 'reinforce' && incomingThreat(state, order.targetId, factionId);
      if (candidate && (!best || (emergency(candidate) && !emergency(best))
        || (emergency(candidate) === emergency(best) && candidate.score > best.score))) best = candidate;
    }
  }
  const recapture = chooseRelayRecapture(state, config, factionId, distances);
  if (recapture) trace?.consider({ ...recapture, type: 'ground' }, recapture.score);
  else if (state.relay && state.elapsedMs >= state.relay.activateAtMs
    && state.territories.some(city => city.id === state.relay!.cityId && city.owner !== factionId && city.owner !== 'neutral')) {
    trace?.block('relay-recapture-not-feasible', 'decision', { cityId: state.relay.cityId });
  }
  const emergencyDefense = best?.kind === 'reinforce' && incomingThreat(state, best.targetId, factionId);
  if (recapture && !emergencyDefense) return recapture;
  return best;
}
