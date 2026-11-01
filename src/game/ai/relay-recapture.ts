import { dispatchUnits } from '@/game/dispatch';
import { minimumTravelMultiplier } from '@/game/features/slow-zone';
import { canGroundOrder } from '@/game/ground-access';
import { availableUnits } from '@/game/launch';
import { orderDurationMs, remainingTravelBound } from '@/game/route';
import { getFactionRules } from '@/game/rules';
import { SIMULATION_STEP_MS } from '@/game/settings';
import type { SimulationState } from '@/game/types';

import type { DecisionBudget } from './budget';
import { committedFriendly, hasArtillery } from './candidates';
import type { AiConfig } from './config';
import { forecastBattle } from './forecast';
import { incomingThreat, keepsHomeReserve, remainingDeliveryMs } from './mobility';
import { scoreOrder, type AiOrder } from './score';

/** Consider our own follow-up orders, not fictional reinforcements or future
 * enemy commands. Only the first order is issued; every decision replans from
 * the live state, including waves already committed to the Relay. */
export function chooseRelayRecapture(
  state: SimulationState,
  config: AiConfig,
  factionId: string,
  distances: ReadonlyMap<string, number>,
  budget?: DecisionBudget,
): AiOrder | null {
  const relay = state.relay;
  if (!relay || state.elapsedMs < relay.activateAtMs) return null;
  const target = state.territories.find((city) => city.id === relay.cityId)!;
  if (target.owner === factionId || target.owner === 'neutral') return null;
  const multiplier = minimumTravelMultiplier(state);
  const duration = (source: SimulationState['territories'][number]) =>
    orderDurationMs(
      source,
      target,
      availableUnits(state, source.id) - 1,
      getFactionRules(state, factionId),
      multiplier,
    );
  const sources = state.territories
    .filter(
      (source) =>
        source.owner === factionId &&
        availableUnits(state, source.id) - 1 >= config.minDispatchUnits &&
        !state.transfers.some((t) => t.sourceId === source.id && t.owner === factionId) &&
        !incomingThreat(state, source.id, factionId) &&
        canGroundOrder(state, source, target, factionId),
    )
    .sort((a, b) => duration(a) - duration(b) || a.id.localeCompare(b.id, 'en'));
  // No prefix of donors can outnumber the holder through symmetric combat, so a
  // hopeless recapture returns without forecasting every donor prefix.
  const totalAttackers = sources.reduce(
    (sum, source) => sum + availableUnits(state, source.id) - 1,
    0,
  );
  if (
    !hasArtillery(state) &&
    totalAttackers + committedFriendly(state, target.id, factionId) <= target.units
  )
    return null;
  let plan = state;
  const donors = new Set<string>();
  let firstSource: (typeof sources)[number] | undefined;
  for (const original of sources) {
    if (budget?.expired()) return null;
    if (plan.roundStatus !== 'playing') break;
    const source = plan.territories.find((city) => city.id === original.id)!;
    if (
      source.owner !== factionId ||
      availableUnits(plan, source.id) - 1 < config.minDispatchUnits ||
      !canGroundOrder(plan, source, target, factionId)
    )
      continue;
    const dispatched = dispatchUnits(plan, source.id, target.id, factionId);
    if (dispatched === plan || !keepsHomeReserve(plan, dispatched, factionId)) continue;
    firstSource ??= original;
    donors.add(source.id);
    plan = dispatched;
    const relevant = (id: string) => id === target.id || donors.has(id);
    const horizon =
      Math.ceil(
        Math.max(
          SIMULATION_STEP_MS,
          ...plan.transfers
            .filter((t) => relevant(t.targetId))
            .map((t) => remainingTravelBound(t, multiplier)),
          ...Object.values(plan.aircraft ?? {})
            .filter((p) => p.targetId && relevant(p.targetId))
            .map(remainingDeliveryMs),
        ) / SIMULATION_STEP_MS,
      ) * SIMULATION_STEP_MS;
    const proposed = forecastBattle(plan, horizon);
    const baseline = forecastBattle(state, plan.elapsedMs - state.elapsedMs + horizon);
    if (baseline.territories.find((city) => city.id === target.id)?.owner === factionId)
      return null;
    if (
      proposed.territories.find((city) => city.id === target.id)?.owner === factionId &&
      keepsHomeReserve(baseline, proposed, factionId) &&
      [...donors].every(
        (id) => proposed.territories.find((city) => city.id === id)?.owner === factionId,
      )
    ) {
      const order = scoreOrder(
        state,
        firstSource,
        target,
        baseline,
        proposed,
        plan.elapsedMs - state.elapsedMs + horizon,
        config,
        factionId,
        distances,
      );
      if (order) return order;
    }
    // Follow-ups cost actual decision time. A plan that arrives after the
    // holder's winning threshold is rejected by the same terminal physics.
    plan = forecastBattle(plan, config.decisionIntervalMs);
  }
  return null;
}
