import type { Owner, SimulationState } from './types';

export interface TroopShare {
  readonly owner: Owner;
  readonly units: number;
  readonly percentage: number;
}

/** Counts garrisons and troops that have launched, without counting queued reservations twice. */
export function getTroopComposition(state: SimulationState): readonly TroopShare[] {
  const owners = new Set<Owner>(['player', 'neutral', 'enemy']);
  for (const faction of Object.keys(state.rules.factions)) owners.add(faction);
  for (const territory of state.territories) owners.add(territory.owner);
  for (const transfer of state.transfers) owners.add(transfer.owner);
  for (const arrival of state.arrivals) owners.add(arrival.owner);
  for (const plane of Object.values(state.aircraft ?? {})) owners.add(plane.owner);

  const orderedOwners = [...owners];
  const totals: Record<string, number> = Object.fromEntries(
    orderedOwners.map((owner) => [owner, 0]),
  );
  for (const territory of state.territories) totals[territory.owner] += territory.units;
  for (const transfer of state.transfers)
    if (transfer.elapsedMs >= 0) totals[transfer.owner] += transfer.units;

  for (const arrival of state.arrivals) totals[arrival.owner] += arrival.units;

  for (const plane of Object.values(state.aircraft ?? {}))
    if (plane.phase === 'outbound' || plane.phase === 'unloading')
      totals[plane.owner] += plane.cargo;

  const total = orderedOwners.reduce((sum, owner) => sum + totals[owner], 0);
  return orderedOwners.map((owner) => ({
    owner,
    units: totals[owner],
    percentage: total === 0 ? 0 : (totals[owner] / total) * 100,
  }));
}
