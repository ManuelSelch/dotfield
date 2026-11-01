import { ARTILLERY_FIRE_INTERVAL_MS, ARTILLERY_RANGE } from '@/game/settings';
import type { SimulationState, TerritoryState } from '@/game/types';

export function hasArtillery(state: SimulationState): boolean {
  return state.territories.some((city) => city.cityType === 'artillery');
}

/** Friendly ground and airborne troops already committed toward a city. */
export function committedFriendly(
  state: SimulationState,
  targetId: string,
  factionId: string,
): number {
  const ground = [...state.transfers, ...state.arrivals]
    .filter((batch) => batch.targetId === targetId && batch.owner === factionId)
    .reduce((sum, batch) => sum + batch.units, 0);
  const air = Object.values(state.aircraft ?? {})
    .filter(
      (plane) =>
        plane.targetId === targetId &&
        plane.owner === factionId &&
        (plane.phase === 'outbound' || plane.phase === 'unloading'),
    )
    .reduce((sum, plane) => sum + plane.cargo, 0);
  return ground + air;
}

/** Upper bound on garrison damage any in-range artillery could deal to a city
 * over the horizon. Range, terrain and target selection only reduce this, so
 * counting every in-range gun stays a safe over-estimate; ignoring ownership
 * covers a gun that changes hands mid-forecast. */
export function maxArtilleryDamage(
  state: SimulationState,
  target: TerritoryState,
  horizonMs: number,
): number {
  const shots = Math.floor(Math.max(0, horizonMs) / ARTILLERY_FIRE_INTERVAL_MS) + 1;
  const guns = state.territories.filter(
    (city) =>
      city.cityType === 'artillery' &&
      city.id !== target.id &&
      Math.hypot(city.x - target.x, city.y - target.y) <= ARTILLERY_RANGE,
  ).length;
  return guns * shots;
}

/** Necessary, conservative capture test used only to skip guaranteed-failing
 * forecasts. Combat trades troops 1:1, growth/reinforcements only add defenders,
 * and shields/weapons only remove attackers, so if even the best possible case
 * (all committed troops plus every in-range artillery shot) cannot outnumber the
 * current garrison, no forecast for this order can capture the city. */
export function cannotCaptureByNumbers(
  state: SimulationState,
  target: TerritoryState,
  factionId: string,
  sentUnits: number,
  horizonMs: number,
): boolean {
  return (
    sentUnits +
      committedFriendly(state, target.id, factionId) +
      maxArtilleryDamage(state, target, horizonMs) <=
    target.units
  );
}
