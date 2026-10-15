import { advanceGrowth } from './growth';
import { advanceTravel } from './travel';
import { resolveCombat } from './combat';
import type { SimulationState } from './types';
import { advanceWatchtowers } from './features/watchtower';
import { SIMULATION_STEP_MS } from './settings';
import { hasSlowZones } from './features/slowZone';
import { advanceArtillery } from './features/artillery';
import { advanceNetworkShields, NETWORK_SHIELD_RECHARGE_MS } from './features/networkShields';
import { advanceAircraftClock, nextAircraftEventMs, normalizeAircraft, resolveAircraftEvents } from './aircraft';
import { trajectory } from './trajectory';

function physicalStep(state: SimulationState, elapsedMs: number) {
  const beforeStep = state;
  const clocked = advanceAircraftClock(advanceGrowth(state, elapsedMs), elapsedMs);
  const combat = resolveAircraftEvents(resolveCombat(advanceTravel(clocked, elapsedMs)));
  const shielded = advanceNetworkShields(combat, elapsedMs, beforeStep);
  return advanceArtillery(advanceWatchtowers(shielded, elapsedMs), elapsedMs, state);
}

// Shared physical update for live rounds and forecasts; never issues AI orders.
// Orchestrators retain their existing stepping and round-evaluation semantics.
export function advanceWorldStep(state: SimulationState, elapsedMs: number): SimulationState {
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) throw new RangeError('Elapsed time must be finite and non-negative.');
  if (state.roundStatus !== 'playing' || elapsedMs === 0) return state;
  const newPhysics = state.territories.some(c => c.cityType === 'airfield' || c.cityType === 'defender');
  if (newPhysics) {
    state = normalizeAircraft(state);
    const end = state.elapsedMs + elapsedMs;
    while (state.elapsedMs < end - 1e-7) {
      state = resolveAircraftEvents(state);
      let step = Math.min(end - state.elapsedMs,
        SIMULATION_STEP_MS - state.elapsedMs % SIMULATION_STEP_MS, nextAircraftEventMs(state));
      // Do not move a ground capture past an earlier plane pulse or vice versa.
      for (const t of state.transfers) {
        const arrival = trajectory(t, step, hasSlowZones(state) ? state : undefined).arrivalMs;
        if (arrival !== null && arrival > 1e-7) step = Math.min(step, arrival);
        if (t.elapsedMs < -1e-7) step = Math.min(step, -t.elapsedMs);
      }
      for (const timer of Object.values(state.networkShieldTimers ?? {})) {
        step = Math.min(step, NETWORK_SHIELD_RECHARGE_MS - timer.elapsedMs);
      }
      // Zero-duration routes still transition at this timestamp, without advancing the clock.
      if (step <= 1e-7) { state = resolveAircraftEvents(state); step = Math.min(end - state.elapsedMs, 1e-7); }
      state = physicalStep(state, step);
    }
    return state;
  }
  if ((hasSlowZones(state) || Object.values(state.rules.factions).some(faction => faction.connectedDefense)
    || state.territories.some(city => city.features?.some(feature => feature.kind === 'watchtower' || feature.kind === 'artillery')))
    && elapsedMs > SIMULATION_STEP_MS) {
    for (let remaining = elapsedMs; remaining > 0;) {
      const step = Math.min(remaining, SIMULATION_STEP_MS);
      state = physicalStep(state, step);
      remaining -= step;
    }
    return state;
  }
  return physicalStep(state, elapsedMs);
}
