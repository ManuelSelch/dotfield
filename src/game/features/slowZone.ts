import type { SimulationState, Transfer } from '../types';

export function hasSlowZones(state: SimulationState): boolean {
  return state.territories.some(city => city.features?.some(feature => feature.kind === 'slow-zone'));
}

// Conservative bound includes every zone: known captures can change eligibility later.
export function minimumTravelMultiplier(state: SimulationState): number {
  return Math.min(1, ...state.territories.flatMap(city => (city.features ?? [])
    .flatMap(feature => feature.kind === 'slow-zone' ? [feature.speedMultiplier] : [])));
}

export interface SlowInterval { from: number; to: number; multiplier: number }

// Intersect the entire center route with eligible circles. Fractions are converted
// to base-speed time so motion and formations share one distance coordinate.
export function slowIntervals(state: SimulationState, transfer: Transfer): SlowInterval[] {
  const dx = transfer.to.x - transfer.from.x;
  const dy = transfer.to.y - transfer.from.y;
  const a = dx * dx + dy * dy;
  if (a === 0) return [];
  return state.territories.flatMap(city => {
    if (city.owner === transfer.owner) return [];
    const ox = transfer.from.x - city.x;
    const oy = transfer.from.y - city.y;
    const b = 2 * (ox * dx + oy * dy);
    return (city.features ?? []).flatMap(feature => {
      if (feature.kind !== 'slow-zone') return [];
      const discriminant = b * b - 4 * a * (ox * ox + oy * oy - feature.radius * feature.radius);
      if (discriminant <= 0) return []; // Tangency has no interval of slowed movement.
      const root = Math.sqrt(discriminant);
      const from = Math.max(0, (-b - root) / (2 * a)) * transfer.durationMs;
      const to = Math.min(1, (-b + root) / (2 * a)) * transfer.durationMs;
      return to > from ? [{ from, to, multiplier: feature.speedMultiplier }] : [];
    });
  });
}
