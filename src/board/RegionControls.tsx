import type { SimulationState } from '../game/types';
import { OWNER_LABELS } from './TerritoryDetails';

export function RegionControls({ state }: { state: SimulationState }) {
  return (
    <>
      <p id="region-keyboard-help" className="sr-only">
        Focus a region and press Enter or Space to select your source, then focus another region and activate it to dispatch. Escape cancels.
      </p>
      <div role="group" aria-label="City region controls">
        {state.territories.map(node => (
          <button key={node.id} type="button" data-city-id={node.id} className="sr-only pointer-events-none"
            disabled={state.roundStatus !== 'playing'} aria-describedby="region-keyboard-help"
            aria-label={`Select ${node.id} region: ${OWNER_LABELS[node.owner]}, ${node.units} units`}>
            {node.id}
          </button>
        ))}
      </div>
    </>
  );
}
