import type { Owner, SimulationState } from './types';

export interface TroopShare {
  readonly owner: Owner;
  readonly units: number;
  readonly percentage: number;
}

const OWNERS: readonly Owner[] = ['player', 'neutral', 'enemy'];

/** Counts garrisons and troops that have launched, without counting queued reservations twice. */
export function getTroopComposition(state: SimulationState): readonly TroopShare[] {
  const totals: Record<Owner, number> = { player: 0, neutral: 0, enemy: 0 };
  for (const territory of state.territories) totals[territory.owner] += territory.units;
  for (const transfer of state.transfers) {
    if (transfer.elapsedMs >= 0) totals[transfer.owner] += transfer.units;
  }
  for (const arrival of state.arrivals) totals[arrival.owner] += arrival.units;

  const total = OWNERS.reduce((sum, owner) => sum + totals[owner], 0);
  return OWNERS.map(owner => ({
    owner,
    units: totals[owner],
    percentage: total === 0 ? 0 : totals[owner] / total * 100,
  }));
}
