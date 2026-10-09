import { PALETTE } from '../board/palette';
import { getTroopComposition } from '../game/troopComposition';
import type { SimulationState } from '../game/types';

export function TroopCompositionBar({ state }: { state: SimulationState }) {
  const composition = getTroopComposition(state);
  const total = composition.reduce((sum, faction) => sum + faction.units, 0);
  const active = composition.filter(faction => faction.units > 0);

  return (
    <section className="flex h-11 shrink-0 items-center px-1" aria-label="Troop composition">
      <div className="flex h-2 overflow-hidden rounded-full bg-[#e7e9e2]" role="img"
        aria-label={total === 0 ? 'No troops remaining' : `Troop composition across ${total} surviving units`}>
        {active.map(faction => <span key={faction.owner} style={{
          width: `${faction.percentage}%`, backgroundColor: PALETTE[faction.owner].fill,
          borderRight: faction.owner === 'neutral' ? '1px solid #bdc9ba' : undefined,
        }} />)}
      </div>
    </section>
  );
}
