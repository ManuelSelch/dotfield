import { dispatchUnits } from '../dispatch';
import { availableUnits } from '../launch';
import { orderDurationMs, remainingTravelBound } from '../route';
import { minimumTravelMultiplier } from '../features/slowZone';
import { getFactionRules } from '../rules';
import { SIMULATION_STEP_MS } from '../settings';
import type { SimulationState } from '../types';
import { DEFAULT_AI, type AiConfig } from './config';
import { forecastBattle } from './forecast';
import { scoreOrder, type AiOrder } from './score';

export function chooseOrder(state: SimulationState, config: AiConfig = DEFAULT_AI): AiOrder | null {
  if (state.roundStatus !== 'playing') return null;
  let best: AiOrder | null = null;
  const forecasts = new Map<number, SimulationState>();
  const minimumMultiplier = minimumTravelMultiplier(state);
  for (const source of state.territories) {
    const units = availableUnits(state, source.id) - 1;
    if (source.owner !== 'enemy' || units < config.minDispatchUnits
      || state.transfers.some(t => t.sourceId === source.id && t.owner === 'enemy')) continue;
    for (const target of state.territories) {
      if (source.id === target.id) continue;
      const relevantArrivals = state.transfers.filter(t => t.targetId === target.id || t.targetId === source.id)
        .map(t => remainingTravelBound(t, minimumMultiplier));
      const horizon = Math.ceil(Math.max(orderDurationMs(source, target, units, getFactionRules(state, source.owner), minimumMultiplier), ...relevantArrivals)
        / SIMULATION_STEP_MS) * SIMULATION_STEP_MS;
      let baseline = forecasts.get(horizon);
      if (!baseline) { baseline = forecastBattle(state, horizon); forecasts.set(horizon, baseline); }
      const proposed = forecastBattle(dispatchUnits(state, source.id, target.id, 'enemy'), horizon);
      const candidate = scoreOrder(state, source, target, baseline, proposed, horizon, config);
      // Stable map order breaks ties; no random or frame-rate-dependent decisions.
      if (candidate && (!best || candidate.score > best.score)) best = candidate;
    }
  }
  return best;
}
