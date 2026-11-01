import {
  advanceAircraftClock,
  nextAircraftEventMs,
  normalizeAircraft,
  resolveAircraftEvents,
} from './aircraft';
import { resolveCombat } from './combat';
import { advanceArtillery } from './features/artillery';
import { advanceNetworkShields, NETWORK_SHIELD_RECHARGE_MS } from './features/network-shields';
import { hasSlowZones } from './features/slow-zone';
import { advanceWatchtowers } from './features/watchtower';
import { advanceGrowth } from './growth';
import { evaluateRound } from './outcome';
import { advanceRelay, nextRelayEventMs } from './relay';
import {
  ARTILLERY_FIRE_INTERVAL_MS,
  SIMULATION_STEP_MS,
  WATCHTOWER_FIRE_INTERVAL_MS,
} from './settings';
import { trajectory } from './trajectory';
import { advanceTravel } from './travel';
import type { SimulationState } from './types';

function physicalStep(state: SimulationState, elapsedMs: number) {
  const beforeStep = state;
  const clocked = advanceAircraftClock(advanceGrowth(state, elapsedMs), elapsedMs);
  const combat = resolveAircraftEvents(resolveCombat(advanceTravel(clocked, elapsedMs)));
  const shielded = advanceNetworkShields(combat, elapsedMs, beforeStep);
  const physical = advanceArtillery(
    advanceWatchtowers(shielded, elapsedMs, beforeStep),
    elapsedMs,
    state,
  );
  return state.relay ? evaluateRound(advanceRelay(beforeStep, physical)) : physical;
}

// Shared physical update for live rounds and forecasts; never issues AI orders.
// Orchestrators retain their existing stepping and round-evaluation semantics.
export function advanceWorldStep(
  state: SimulationState,
  elapsedMs: number,
  beforeStep?: (state: SimulationState) => void,
): SimulationState {
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0)
    throw new RangeError('Elapsed time must be finite and non-negative.');
  if (state.roundStatus !== 'playing' || elapsedMs === 0) return state;
  beforeStep?.(state);
  const newPhysics =
    !!state.relay ||
    state.territories.some((c) =>
      ['airfield', 'defender', 'watchtower', 'artillery'].includes(c.cityType ?? 'production'),
    );
  if (newPhysics) {
    state = normalizeAircraft(state);
    const end = state.elapsedMs + elapsedMs;
    while (state.elapsedMs < end - 1e-7 && state.roundStatus === 'playing') {
      beforeStep?.(state);
      state = resolveAircraftEvents(state.relay ? evaluateRound(resolveCombat(state)) : state);
      if (state.roundStatus !== 'playing') break;
      let step = Math.min(
        end - state.elapsedMs,
        SIMULATION_STEP_MS - (state.elapsedMs % SIMULATION_STEP_MS),
        nextAircraftEventMs(state),
        nextRelayEventMs(state),
      );
      // Do not move a ground capture past an earlier plane pulse or vice versa.
      for (const t of state.transfers) {
        const arrival = trajectory(t, step, hasSlowZones(state) ? state : undefined).arrivalMs;
        if (arrival !== null && arrival > 1e-7) step = Math.min(step, arrival);
        if (t.elapsedMs < -1e-7) step = Math.min(step, -t.elapsedMs);
      }
      for (const timer of Object.values(state.networkShieldTimers ?? {}))
        step = Math.min(step, NETWORK_SHIELD_RECHARGE_MS - timer.elapsedMs);

      // Feature cadence boundaries are physical events too: do not defer a shot
      // past a later capture simply because aircraft shifted its cadence off-grid.
      for (const city of state.territories) {
        if (city.cityType !== 'artillery' && city.cityType !== 'watchtower') continue;
        const timer = state.weaponTimers?.[city.id];
        const elapsed = timer?.owner === city.owner ? timer.elapsedMs : 0;
        const interval =
          city.cityType === 'artillery' ? ARTILLERY_FIRE_INTERVAL_MS : WATCHTOWER_FIRE_INTERVAL_MS;
        step = Math.min(step, interval - elapsed);
      }
      // Zero-duration routes still transition at this timestamp, without advancing the clock.
      if (step <= 1e-7) {
        state = resolveAircraftEvents(state);
        step = Math.min(end - state.elapsedMs, 1e-7);
      }
      state = physicalStep(state, step);
    }
    return state;
  }
  if (
    (hasSlowZones(state) ||
      Object.values(state.rules.factions).some((faction) => faction.connectedDefense) ||
      state.territories.some(
        (city) => city.cityType === 'watchtower' || city.cityType === 'artillery',
      )) &&
    elapsedMs > SIMULATION_STEP_MS
  ) {
    for (let remaining = elapsedMs; remaining > 0;) {
      beforeStep?.(state);
      const step = Math.min(remaining, SIMULATION_STEP_MS);
      state = physicalStep(state, step);
      remaining -= step;
    }
    return state;
  }
  return physicalStep(state, elapsedMs);
}
