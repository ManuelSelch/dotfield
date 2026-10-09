import type { Territory } from '../game/types';

const OWNER_LABELS = { player: 'You', enemy: 'Opponent', neutral: 'Neutral' };

export function TerritoryDetails({ territories }: { territories: readonly Territory[] }) {
  return (
    <ul id="territory-details" className="sr-only" aria-label="Territory details">
      {territories.map((node) => (
        <li key={node.id}>{node.id}: {OWNER_LABELS[node.owner]}, {node.units} units.</li>
      ))}
    </ul>
  );
}
