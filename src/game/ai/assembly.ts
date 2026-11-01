import { dispatchUnits } from '@/game/dispatch';
import { getTerritoryGrowthRate } from '@/game/features/growth-rate';
import { canGroundOrder } from '@/game/ground-access';
import { availableUnits } from '@/game/launch';
import type { SimulationState, TerritoryState } from '@/game/types';

import type { DecisionBudget } from './budget';
import { committedFriendly, maxArtilleryDamage } from './candidates';
import type { AiConfig } from './config';
import { airSupplyRoom, incomingThreat, keepsHomeReserve } from './mobility';
import type { AiOrder } from './score';
import type { AiDecisionTraceCollector } from './trace';

/** Only a handful of high-value objectives are considered; assembly is a
 * fallback for targets no single city can currently take, not a campaign AI. */
const MAX_OBJECTIVES = 3;
/** Damage horizon used by the conservative "could this ever work" bound. */
const ASSEMBLY_HORIZON_MS = 15_000;

function objectiveValue(state: SimulationState, config: AiConfig, target: TerritoryState): number {
  const relay = state.relay;
  if (relay && target.id === relay.cityId)
    return config.attackScore * (state.elapsedMs >= relay.activateAtMs ? 1.6 : 1.2);

  if (target.owner === 'neutral')
    // Economic targets are worth assembling for; faster-growing cities more so.
    return config.expansionScore + Math.max(0, getTerritoryGrowthRate(state, target)) * 10;

  return config.attackScore;
}

/** General assemble-then-attack: pick a valuable objective no single city can
 * capture, choose the closest legal staging city, and pull troops toward it from
 * rear-most donors. Later decisions let normal attack finish the capture. */
export function chooseAssembly(
  state: SimulationState,
  config: AiConfig,
  factionId: string,
  trace?: AiDecisionTraceCollector,
  budget?: DecisionBudget,
): AiOrder | null {
  if (state.roundStatus !== 'playing') return null;
  const owned = state.territories.filter((city) => city.owner === factionId);
  if (owned.length < 2) return null;
  const away = (city: TerritoryState, target: TerritoryState) =>
    Math.hypot(city.x - target.x, city.y - target.y);

  const objectives = state.territories
    .filter((target) => target.owner !== factionId)
    .map((target) => ({ target, value: objectiveValue(state, config, target) }))
    .filter(
      ({ target, value }) =>
        value > 0 &&
        owned.some(
          (city) => city.id !== target.id && canGroundOrder(state, city, target, factionId),
        ),
    )
    .sort((a, b) => b.value - a.value || a.target.id.localeCompare(b.target.id, 'en'))
    .slice(0, MAX_OBJECTIVES);

  for (const { target, value } of objectives) {
    if (budget?.expired()) return null;
    // One stable staging city: the closest owned city that can legally reach the
    // target and can still receive troops. Never pick a full Airfield.
    const staging = owned
      .filter(
        (city) =>
          city.id !== target.id &&
          canGroundOrder(state, city, target, factionId) &&
          !incomingThreat(state, city.id, factionId) &&
          !(city.cityType === 'airfield' && airSupplyRoom(state, city, factionId) <= 0),
      )
      .sort((a, b) => away(a, target) - away(b, target) || a.id.localeCompare(b.id, 'en'))[0];
    if (!staging) {
      trace?.block('assembly-not-feasible', 'decision', { cityId: target.id });
      continue;
    }
    const stagingDistance = away(staging, target);
    // Donors are strictly rear-ward of the staging city, so assembly always
    // pulls toward the objective and can never shuffle troops backwards.
    const donors = owned
      .filter(
        (source) =>
          source.id !== staging.id &&
          away(source, target) > stagingDistance + 1e-6 &&
          !state.transfers.some((t) => t.sourceId === source.id && t.owner === factionId) &&
          availableUnits(state, source.id) - 1 >= config.minDispatchUnits &&
          !incomingThreat(state, source.id, factionId) &&
          canGroundOrder(state, source, staging, factionId),
      )
      .sort((a, b) => away(b, target) - away(a, target) || a.id.localeCompare(b.id, 'en'));
    // Only assemble when the whole faction could eventually outnumber the
    // target; never build an army that can never capture.
    const potential =
      availableUnits(state, staging.id) -
      1 +
      committedFriendly(state, staging.id, factionId) +
      donors.reduce((sum, source) => sum + availableUnits(state, source.id) - 1, 0) +
      maxArtilleryDamage(state, target, ASSEMBLY_HORIZON_MS);
    if (potential + 1 <= target.units) {
      trace?.block('assembly-not-feasible', 'decision', { cityId: target.id });
      continue;
    }
    for (const donor of donors) {
      if (budget?.expired()) return null;
      // Match the normal Airfield rule: a ground order is rejected when the
      // staging Airfield has no room for the whole all-but-one delivery.
      if (
        staging.cityType === 'airfield' &&
        airSupplyRoom(state, staging, factionId) < availableUnits(state, donor.id) - 1
      )
        continue;
      const dispatched = dispatchUnits(state, donor.id, staging.id, factionId);
      if (dispatched === state) continue;
      if (!keepsHomeReserve(state, dispatched, factionId)) continue;
      const progress = Math.min(1, potential / (target.units + 1));
      return {
        sourceId: donor.id,
        targetId: staging.id,
        kind: 'reinforce',
        score: value * progress,
      };
    }
    trace?.block('assembly-not-feasible', 'decision', { cityId: target.id });
  }
  return null;
}
