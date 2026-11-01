import { ARTILLERY_FIRE_INTERVAL_MS, ARTILLERY_RANGE } from '@/game/settings';
import { entersInterior } from '@/game/terrain/geometry';
import type { SimulationState, Territory } from '@/game/types';

export const ARTILLERY_FEEDBACK_MS = 300;

export function artilleryTarget(state: SimulationState, source: Territory): Territory | undefined {
  if (source.owner === 'neutral') return undefined;
  const distance = (city: Territory) => Math.hypot(city.x - source.x, city.y - source.y);
  return state.territories
    .filter(
      (city) =>
        city.id !== source.id &&
        city.owner !== source.owner &&
        city.owner !== 'neutral' &&
        city.units > 0 &&
        distance(city) <= ARTILLERY_RANGE &&
        !state.terrain?.barriers.some(
          (barrier) => barrier.kind === 'mountain' && entersInterior(source, city, barrier.bounds),
        ),
    )
    .sort((a, b) => distance(a) - distance(b) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))[0];
}

// Called after arrivals/combat on the shared physical grid. Ownership changes reset cadence.
// Firing order is stable city ID, then feature ID; idle cadence boundaries never bank shots.
export function advanceArtillery(
  state: SimulationState,
  elapsedMs: number,
  beforeStep: SimulationState = state,
): SimulationState {
  const guns = state.territories
    .filter((city) => city.cityType === 'artillery')
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  if (!guns.length) return state;
  const timers = { ...state.weaponTimers };
  let next = state;
  const shots = (state.artilleryShots ?? []).filter(
    (shot) => state.elapsedMs - shot.firedAtMs < ARTILLERY_FEEDBACK_MS,
  );
  for (const city of guns) {
    const previous = timers[city.id];
    // Combat replaces the timer on EVERY capture, including capture-recapture.
    // Reference identity marks an event in this physical step without adding saved
    // runtime fields; do not credit the pre-capture interval to that fresh timer.
    const capturedThisStep =
      beforeStep.territories.find((c) => c.id === city.id)?.owner !== city.owner ||
      previous !== beforeStep.weaponTimers?.[city.id];
    const total =
      (previous?.owner === city.owner ? previous.elapsedMs : 0) +
      (capturedThisStep ? 0 : elapsedMs);
    const count = Math.floor((total + 1e-7) / ARTILLERY_FIRE_INTERVAL_MS);
    timers[city.id] = {
      owner: city.owner,
      elapsedMs: Math.max(0, total - count * ARTILLERY_FIRE_INTERVAL_MS),
    };
    for (let n = 0; n < count; n++) {
      const target = artilleryTarget(next, city);
      if (!target) continue;
      next = {
        ...next,
        territories: next.territories.map((c) =>
          c.id === target.id ? { ...c, units: c.units - 1 } : c,
        ),
      };
      shots.push({
        sourceId: city.id,
        targetId: target.id,
        owner: city.owner,
        firedAtMs: state.elapsedMs,
      });
    }
  }
  return { ...next, weaponTimers: timers, artilleryShots: shots };
}
