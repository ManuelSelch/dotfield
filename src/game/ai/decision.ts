import { dispatchUnits } from '@/game/dispatch';
import { minimumTravelMultiplier } from '@/game/features/slow-zone';
import { groundOrderBlockReason } from '@/game/ground-access';
import { availableUnits } from '@/game/launch';
import { orderDurationMs, remainingTravelBound } from '@/game/route';
import { getFactionRules } from '@/game/rules';
import { SIMULATION_STEP_MS } from '@/game/settings';
import type { SimulationState } from '@/game/types';

import type { DecisionBudget } from './budget';
import { cannotCaptureByNumbers } from './candidates';
import { DEFAULT_AI, PRODUCTION_AI, type AiConfig } from './config';
import { forecastBattle } from './forecast';
import { canRelieveProduction, factionArmyUnits, frontlineDistances } from './logistics';
import {
  airSupplyRoom,
  incomingThreat,
  keepsHomeReserve,
  remainingDeliveryMs,
  usefulAirSupply,
} from './mobility';
import { chooseRelayRecapture } from './relay-recapture';
import { evaluateOrder, type AiOrder } from './score';
import type { AiDecisionTraceCollector } from './trace';

/** Baselines are pure and deterministic for a given state and horizon, so a
 * single decision shares them across ground, flight and conversion branches. */
export type BaselineForecasts = Map<number, SimulationState>;
export function getBaseline(
  baselines: BaselineForecasts,
  state: SimulationState,
  horizon: number,
): SimulationState {
  let baseline = baselines.get(horizon);
  if (!baseline) {
    baseline = forecastBattle(state, horizon);
    baselines.set(horizon, baseline);
  }
  return baseline;
}

export function chooseOrder(
  state: SimulationState,
  config: AiConfig = DEFAULT_AI,
  factionId = 'enemy',
  trace?: AiDecisionTraceCollector,
  baselines: BaselineForecasts = new Map(),
  budget?: DecisionBudget,
): AiOrder | null {
  if (state.roundStatus !== 'playing') {
    trace?.block('round-not-playing', 'decision');
    return null;
  }
  let best: AiOrder | null = null;
  const distances = frontlineDistances(state, factionId);
  const minimumMultiplier = minimumTravelMultiplier(state);
  for (const source of state.territories) {
    if (budget?.expired()) break;
    if (source.owner !== factionId) continue;
    const units = availableUnits(state, source.id) - 1;
    if (units < config.minDispatchUnits) {
      trace?.block('below-dispatch-minimum', 'source', { cityId: source.id });
      continue;
    }
    if (state.transfers.some((t) => t.sourceId === source.id && t.owner === factionId)) {
      trace?.block('source-has-order', 'source', { cityId: source.id });
      continue;
    }
    for (const target of state.territories) {
      if (budget?.expired()) break;
      const routeBlock = groundOrderBlockReason(state, source, target, factionId);
      if (routeBlock) {
        if (routeBlock.reason !== 'same-city')
          trace?.block(
            routeBlock.reason === 'river'
              ? 'river-crossing'
              : routeBlock.reason === 'terrain'
                ? 'terrain-blocked'
                : 'defender-blocked',
            'route',
            {
              sourceId: source.id,
              targetId: target.id,
              ...(routeBlock.reason === 'defender' ? { blockerId: routeBlock.blockerId } : {}),
            },
          );
        continue;
      }
      const productionRelief = canRelieveProduction(
        state,
        source,
        target,
        distances,
        config,
        factionId,
      );
      // Cheap necessary checks first: a candidate rejected here can never win, so
      // skipping its full forecast preserves the chosen action while avoiding work.
      if (target.owner === factionId && !incomingThreat(state, target.id, factionId)) {
        if (target.cityType === 'airfield' && airSupplyRoom(state, target, factionId) < units) {
          trace?.block('airfield-full', 'route', { sourceId: source.id, targetId: target.id });
          continue;
        }
        const advance = distances.get(source.id)! - distances.get(target.id)!;
        if (
          !(advance >= config.frontlineAdvance) &&
          !productionRelief &&
          !usefulAirSupply(state, source, target, factionId)
        ) {
          trace?.block('not-frontline', 'route', { sourceId: source.id, targetId: target.id });
          continue;
        }
      }
      const relevantArrivals = state.transfers
        .filter((t) => t.targetId === target.id || t.targetId === source.id)
        .map((t) => remainingTravelBound(t, minimumMultiplier));
      const orderHorizon =
        Math.ceil(
          Math.max(
            orderDurationMs(
              source,
              target,
              units,
              getFactionRules(state, source.owner),
              minimumMultiplier,
            ),
            ...relevantArrivals,
            ...Object.values(state.aircraft ?? {})
              .filter((p) => p.targetId === target.id || p.targetId === source.id)
              .map(remainingDeliveryMs),
          ) / SIMULATION_STEP_MS,
        ) * SIMULATION_STEP_MS;
      const horizon = Math.max(orderHorizon, productionRelief ? PRODUCTION_AI.lookAheadMs : 0);
      if (
        target.owner !== factionId &&
        cannotCaptureByNumbers(state, target, factionId, units, horizon)
      ) {
        trace?.block('forecast-cannot-capture', 'route', {
          sourceId: source.id,
          targetId: target.id,
        });
        continue;
      }
      const baseline = getBaseline(baselines, state, horizon);
      if (
        target.owner !== factionId &&
        baseline.territories.find((node) => node.id === target.id)?.owner === factionId
      ) {
        trace?.block('already-secured', 'route', { sourceId: source.id, targetId: target.id });
        continue;
      }
      const dispatched = dispatchUnits(state, source.id, target.id, factionId);
      if (dispatched === state) {
        trace?.block('below-dispatch-minimum', 'route', {
          sourceId: source.id,
          targetId: target.id,
        });
        continue;
      }
      if (!keepsHomeReserve(state, dispatched, factionId)) {
        trace?.block('home-reserve', 'route', { sourceId: source.id, targetId: target.id });
        continue;
      }
      const proposed = forecastBattle(dispatched, horizon);
      if (!keepsHomeReserve(baseline, proposed, factionId)) {
        trace?.block('home-reserve', 'route', { sourceId: source.id, targetId: target.id });
        continue;
      }
      // Compare the whole faction, not just the freed source: filling the sink
      // can sacrifice its production. Real forecasts include queues, incoming
      // armies, growth multipliers and losses; a transfer itself creates no units.
      const productionGain =
        productionRelief &&
        baseline.territories.find((city) => city.id === source.id)?.owner === factionId &&
        proposed.territories.find((city) => city.id === source.id)?.owner === factionId
          ? Math.max(
              0,
              factionArmyUnits(proposed, factionId) - factionArmyUnits(baseline, factionId),
            )
          : 0;
      const evaluation = evaluateOrder(
        state,
        source,
        target,
        baseline,
        proposed,
        orderHorizon,
        config,
        factionId,
        distances,
        productionGain,
      );
      const candidate = evaluation.order;
      if (!candidate) {
        if (evaluation.rejection)
          trace?.block(evaluation.rejection, 'route', { sourceId: source.id, targetId: target.id });
        continue;
      }
      trace?.consider({ ...candidate, type: 'ground' }, candidate.score);
      // Stable map order breaks ties; no random or frame-rate-dependent decisions.
      const emergency = (order: AiOrder) =>
        !!state.relay &&
        order.kind === 'reinforce' &&
        incomingThreat(state, order.targetId, factionId);
      if (
        candidate &&
        (!best ||
          (emergency(candidate) && !emergency(best)) ||
          (emergency(candidate) === emergency(best) && candidate.score > best.score))
      )
        best = candidate;
    }
  }
  const recapture = chooseRelayRecapture(state, config, factionId, distances, budget);
  if (recapture) trace?.consider({ ...recapture, type: 'ground' }, recapture.score);
  else if (
    state.relay &&
    state.elapsedMs >= state.relay.activateAtMs &&
    state.territories.some(
      (city) =>
        city.id === state.relay!.cityId && city.owner !== factionId && city.owner !== 'neutral',
    )
  )
    trace?.block('relay-recapture-not-feasible', 'decision', { cityId: state.relay.cityId });

  const emergencyDefense =
    best?.kind === 'reinforce' && incomingThreat(state, best.targetId, factionId);
  if (recapture && !emergencyDefense) return recapture;
  return best;
}
