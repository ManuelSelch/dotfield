import type { ArtilleryFeature } from './types';
import type { SimulationState, Territory } from '../types';
import { entersInterior } from '../terrain/geometry';

export const ARTILLERY_FEEDBACK_MS = 300;

export function artilleryTarget(state: SimulationState, source: Territory, feature: ArtilleryFeature): Territory | undefined {
  if (source.owner === 'neutral') return undefined;
  const distance = (city: Territory) => Math.hypot(city.x - source.x, city.y - source.y);
  return state.territories.filter(city => city.id !== source.id && city.owner !== source.owner
    && city.owner !== 'neutral' && city.units > 0 && distance(city) <= feature.range
    && !state.terrain?.barriers.some(barrier => barrier.kind === 'mountain'
      && entersInterior(source, city, barrier.bounds)))
    .sort((a, b) => distance(a) - distance(b) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))[0];
}

// Called after arrivals/combat on the shared physical grid. Ownership changes reset cadence.
// Firing order is stable city ID, then feature ID; idle cadence boundaries never bank shots.
export function advanceArtillery(state: SimulationState, elapsedMs: number, beforeStep: SimulationState = state): SimulationState {
  const guns = state.territories.flatMap(city => (city.features ?? [])
    .filter((feature): feature is ArtilleryFeature => feature.kind === 'artillery')
    .map(feature => ({ city, feature })))
    .sort((a, b) => a.city.id < b.city.id ? -1 : a.city.id > b.city.id ? 1 : a.feature.id < b.feature.id ? -1 : 1);
  if (!guns.length) return state;
  const timers = { ...state.artilleryTimers };
  let next = state;
  const shots = (state.artilleryShots ?? []).filter(shot => state.elapsedMs - shot.firedAtMs < ARTILLERY_FEEDBACK_MS);
  for (const { city, feature } of guns) {
    const previous = timers[feature.id];
    // Combat replaces the timer on EVERY capture, including capture-recapture.
    // Reference identity marks an event in this physical step without adding saved
    // runtime fields; do not credit the pre-capture interval to that fresh timer.
    const capturedThisStep = beforeStep.territories.find(c => c.id === city.id)?.owner !== city.owner
      || previous !== beforeStep.artilleryTimers?.[feature.id];
    const total = (previous?.owner === city.owner ? previous.elapsedMs : 0) + (capturedThisStep ? 0 : elapsedMs);
    const count = Math.floor((total + 1e-7) / feature.fireIntervalMs);
    timers[feature.id] = { owner: city.owner, elapsedMs: Math.max(0, total - count * feature.fireIntervalMs) };
    for (let n = 0; n < count; n++) {
      const target = artilleryTarget(next, city, feature);
      if (!target) continue;
      next = { ...next, territories: next.territories.map(c => c.id === target.id ? { ...c, units: c.units - 1 } : c) };
      shots.push({ sourceId: city.id, targetId: target.id, owner: city.owner, firedAtMs: state.elapsedMs });
    }
  }
  return { ...next, artilleryTimers: timers, artilleryShots: shots };
}
