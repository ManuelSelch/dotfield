import type { SimulationState } from '../game/types';
import { OWNER_LABELS } from './TerritoryDetails';
import { featureLabels } from './featureLabels';

export function RegionControls({ state, disabled = false }: { state: SimulationState; disabled?: boolean }) {
  return (
    <>
      <p id="region-keyboard-help" className="sr-only">
        Focus a region and press Enter or Space to select your source, then focus another region and activate it to dispatch. Escape cancels.
      </p>
      <p id="upgrade-icon-help" className="sr-only">
        A factory silhouette marks a Factory and is dimmed while inactive. A watchtower silhouette is surrounded by its firing-radius circle; captured towers fire for their current owner. An hourglass and dashed circle mark a Slow Zone: hostile groups slow while its city is owned, and all groups slow while neutral. An upward chevron marks boosted faction-wide production.
      </p>
      <div role="group" aria-label="City region controls">
        {state.territories.map(node => (
          <button key={node.id} type="button" data-city-id={node.id} className="sr-only pointer-events-none"
            disabled={disabled || state.roundStatus !== 'playing'} aria-describedby="region-keyboard-help"
            aria-label={`Select ${node.id} region: ${OWNER_LABELS[node.owner]}, ${node.units} units${featureLabels(node)}`}>
            {node.id}
          </button>
        ))}
      </div>
    </>
  );
}
