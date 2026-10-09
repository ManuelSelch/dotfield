import type { SimulationState } from '../game/types';

export function TransferDetails({ state }: { state: SimulationState }) {
  return (
    <ul className="sr-only" aria-label="Unit transfers">
      {state.transfers.map((transfer) => (
        <li key={transfer.id}>{transfer.units} units: {transfer.sourceId} → {transfer.targetId} · travelling</li>
      ))}
      {state.arrivals.map((transfer) => (
        <li key={transfer.id}>{transfer.units} units: {transfer.sourceId} → {transfer.targetId} · awaiting combat</li>
      ))}
    </ul>
  );
}
