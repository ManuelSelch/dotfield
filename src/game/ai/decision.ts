import { dispatchUnits } from '../dispatch';
import { availableUnits } from '../launch';
import { orderDurationMs } from '../route';
import { getFactionRules } from '../rules';
import { SIMULATION_STEP_MS } from '../settings';
import type { SimulationState } from '../types';
import { DEFAULT_AI, type AiConfig } from './config';
import { forecastBattle } from './forecast';
import { scoreOrder, type AiOrder } from './score';

export function chooseOrder(state: SimulationState, config: AiConfig = DEFAULT_AI, factionId = 'enemy'): AiOrder | null {
  if (state.roundStatus !== 'playing') return null;
  let best: AiOrder | null = null;
  const forecasts = new Map<number, SimulationState>();
  for (const source of state.territories) {
    const units = availableUnits(state, source.id) - 1;
    if (source.owner !== factionId || units < config.minDispatchUnits
      || state.transfers.some(t => t.sourceId === source.id && t.owner === factionId)) continue;
    for (const target of state.territories) {
      if (source.id === target.id) continue;
      const relevantArrivals = state.transfers.filter(t => t.targetId === target.id || t.targetId === source.id)
        .map(t => t.durationMs - t.elapsedMs);
      const horizon = Math.ceil(Math.max(orderDurationMs(source, target, units, getFactionRules(state, source.owner)), ...relevantArrivals)
        / SIMULATION_STEP_MS) * SIMULATION_STEP_MS;
      let baseline = forecasts.get(horizon);
      if (!baseline) { baseline = forecastBattle(state, horizon); forecasts.set(horizon, baseline); }
      const proposed = forecastBattle(dispatchUnits(state, source.id, target.id, factionId), horizon);
      const candidate = scoreOrder(state, source, target, baseline, proposed, horizon, config, factionId);
      // Stable map order breaks ties; no random or frame-rate-dependent decisions.
      if (candidate && (!best || candidate.score > best.score)) best = candidate;
    }
  }
  return best;
}
