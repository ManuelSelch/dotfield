import { connectedDefenseTierForSize } from '../connectedDefense';
import { connectedTerritoryIds } from '../connectedTerritories';
import type { CaptureShieldState, NetworkShieldTimer, SimulationState } from '../types';

export const NETWORK_SHIELD_RECHARGE_MS = 10_000;

export function restoreNetworkShieldTimers(state: SimulationState): NonNullable<SimulationState['networkShieldTimers']> {
  const runtime = state.networkShieldTimers ?? {};
  if (typeof runtime !== 'object' || runtime === null || Array.isArray(runtime)) {
    throw new RangeError('Invalid Defensive Network shield timers.');
  }
  for (const [id, timer] of Object.entries(runtime)) {
    const city = state.territories.find(candidate => candidate.id === id);
    if (!city || city.owner === 'neutral' || !state.rules.factions[city.owner]?.connectedDefense
      || !timer || typeof timer !== 'object' || timer.owner !== city.owner
      || !Number.isFinite(timer.elapsedMs) || timer.elapsedMs < 0 || timer.elapsedMs >= NETWORK_SHIELD_RECHARGE_MS) {
      throw new RangeError('Invalid Defensive Network shield timers.');
    }
  }
  return Object.fromEntries(Object.entries(runtime).map(([id, timer]) => [id, { ...timer }]));
}

type Network = { readonly ids: ReadonlySet<string>; readonly tier: 0 | 1 | 2 | 3 };
function networks(state: SimulationState): ReadonlyMap<string, Network> {
  return new Map(Object.entries(state.rules.factions).flatMap(([factionId, rules]) => {
    if (!rules.connectedDefense) return [];
    const ids = connectedTerritoryIds(state.territories, factionId, state.homeCityIds?.[factionId], state.river);
    return [[factionId, { ids, tier: connectedDefenseTierForSize(ids.size) }] as const];
  }));
}

function sameOwners(first: SimulationState, second: SimulationState): boolean {
  return first.territories.length === second.territories.length
    && first.territories.every((city, index) => city.id === second.territories[index].id
      && city.owner === second.territories[index].owner);
}

/** Add one batch-blocking shield every 10 seconds to connected cities, up to their current tier. */
export function advanceNetworkShields(state: SimulationState, elapsedMs: number,
  beforeStep: SimulationState = state): SimulationState {
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) throw new RangeError('Elapsed time must be finite and non-negative.');
  if (elapsedMs === 0 || state.roundStatus !== 'playing') return state;
  const currentNetworks = networks(state);
  const beforeNetworks = sameOwners(state, beforeStep) ? currentNetworks : networks(beforeStep);
  const timers: Record<string, NetworkShieldTimer> = { ...(state.networkShieldTimers ?? {}) };
  let timersChanged = false;
  let shields: Readonly<Record<string, CaptureShieldState>> = state.captureShields ?? {};
  let shieldsChanged = false;

  const setTimer = (cityId: string, timer?: NetworkShieldTimer) => {
    const existing = timers[cityId];
    if (!timer) {
      if (existing) { delete timers[cityId]; timersChanged = true; }
    } else if (!existing || existing.owner !== timer.owner || existing.elapsedMs !== timer.elapsedMs) {
      timers[cityId] = timer;
      timersChanged = true;
    }
  };
  const setShield = (cityId: string, shield: CaptureShieldState) => {
    shields = { ...shields, [cityId]: shield };
    shieldsChanged = true;
  };

  for (const city of state.territories) {
    const network = city.owner === 'neutral' ? undefined : currentNetworks.get(city.owner);
    const tier = network?.ids.has(city.id) ? network.tier : 0;
    if (!network || tier === 0) { setTimer(city.id); continue; }

    const currentShields = shields[city.id];
    const remaining = currentShields?.remaining ?? 0;
    if (remaining >= tier) { setTimer(city.id); continue; }

    const previousNetwork = beforeNetworks.get(city.owner);
    const previousConnected = city.owner !== 'neutral'
      && beforeStep.territories.find(previous => previous.id === city.id)?.owner === city.owner
      && previousNetwork?.ids.has(city.id) === true;
    const previousTier = previousConnected ? previousNetwork?.tier ?? 0 : 0;
    const previousTimer = timers[city.id];
    const sameRechargeWindow = previousConnected && previousTier === tier
      && (!previousTimer || previousTimer.owner === city.owner);
    const blockedThisStep = currentShields?.blockedAt === state.elapsedMs;
    if (!sameRechargeWindow || blockedThisStep) {
      setTimer(city.id, { owner: city.owner, elapsedMs: 0 });
      continue;
    }

    const total = (previousTimer?.elapsedMs ?? 0) + elapsedMs;
    const earned = Math.floor((total + 1e-7) / NETWORK_SHIELD_RECHARGE_MS);
    if (earned > 0) {
      const nextRemaining = Math.min(tier, remaining + earned);
      setShield(city.id, { remaining: nextRemaining });
      if (nextRemaining >= tier) setTimer(city.id);
      else setTimer(city.id, { owner: city.owner, elapsedMs: total - earned * NETWORK_SHIELD_RECHARGE_MS });
    } else {
      setTimer(city.id, { owner: city.owner, elapsedMs: total });
    }
  }

  if (!timersChanged && !shieldsChanged) return state;
  return { ...state, ...(timersChanged ? { networkShieldTimers: timers } : {}), ...(shieldsChanged ? { captureShields: shields } : {}) };
}
