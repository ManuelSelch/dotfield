import type { SimulationState } from '../game/types';
import { OWNER_LABELS } from './TerritoryDetails';
import { featureLabels } from './featureLabels';
import { pairedCityId } from '../game/river';
import { connectedDefenseCapacities } from '../game/connectedDefense';

export function RegionControls({ state, disabled = false, shieldCapacities = connectedDefenseCapacities(state) }: {
  state: SimulationState; disabled?: boolean; shieldCapacities?: ReadonlyMap<string, number>;
}) {
  return (
    <>
      <p id="region-keyboard-help" className="sr-only">
        Focus a region and press Enter or Space to select your source, then focus another region and activate it to dispatch. Escape cancels.
      </p>
      <p id="upgrade-icon-help" className="sr-only">
        A factory silhouette marks a Factory and is dimmed while inactive. A watchtower silhouette is surrounded by its firing-radius circle; captured towers fire for their current owner. An hourglass and dashed circle mark a Slow Zone: hostile groups slow while its city is owned, and all groups slow while neutral. An upward chevron marks boosted faction-wide production. Shield arcs show stored charges; each blocks one hostile troop-arrival batch. Capture Shield grants three charges after a qualifying capture. Defensive Network cities recharge one shield every 10 seconds while connected, up to their numbered badge capacity.
      </p>
      <div role="group" aria-label="City region controls">
        {state.territories.map(node => (
          <button key={node.id} type="button" data-city-id={node.id} className="sr-only pointer-events-none"
            disabled={disabled || state.roundStatus !== 'playing'} aria-describedby="region-keyboard-help"
            aria-label={`Select ${node.id} region: ${OWNER_LABELS[node.owner] ?? `Faction ${node.owner}`}, ${node.units} units${featureLabels(node, state.captureShields[node.id], shieldCapacities.get(node.id))}${pairedCityId(node.id, state.river) ? `; bridge linked to ${pairedCityId(node.id, state.river)}` : ''}`}>
            {node.id}
          </button>
        ))}
      </div>
    </>
  );
}
