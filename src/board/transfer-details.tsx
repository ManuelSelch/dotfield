import type { SimulationState } from '@/game/types';

import { aircraftLabel } from './feature-labels';

export function TransferDetails({ state }: { state: SimulationState }) {
  return (
    <ul className="sr-only" aria-label="Unit transfers">
      {state.transfers.map((transfer) => (
        <li key={transfer.id}>
          {transfer.units} units: {transfer.sourceId} → {transfer.targetId} · travelling
        </li>
      ))}
      {Object.values(state.aircraft ?? {}).map((plane) => (
        <li key={`aircraft:${plane.homeId}`}>
          {plane.homeId}: {aircraftLabel(plane)}
        </li>
      ))}
      {state.arrivals.map((transfer) => (
        <li key={transfer.id}>
          {transfer.units} units: {transfer.sourceId} → {transfer.targetId} · awaiting combat
        </li>
      ))}
    </ul>
  );
}
