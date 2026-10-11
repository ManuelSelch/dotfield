import type { Territory, SimulationState } from '../game/types';
import { featureLabels } from './featureLabels';

export const OWNER_LABELS: Record<string, string> = { player: 'You', enemy: 'Opponent', neutral: 'Neutral' };

export function TerritoryDetails({ territories, captureShields = {}, shieldCapacities }: { territories: readonly Territory[]; captureShields?: SimulationState['captureShields']; shieldCapacities?: ReadonlyMap<string, number> }) {
  return (
    <ul id="territory-details" className="sr-only" aria-label="Territory details">
      {territories.map((node) => (
        <li key={node.id}>{node.id}: {OWNER_LABELS[node.owner] ?? `Faction ${node.owner}`}, {node.units} units.{featureLabels(node, captureShields[node.id], shieldCapacities?.get(node.id))}</li>
      ))}
    </ul>
  );
}
