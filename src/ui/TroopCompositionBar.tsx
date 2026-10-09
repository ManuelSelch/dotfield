import { PALETTE } from '../board/palette';
import { getTroopComposition } from '../game/troopComposition';
import type { SimulationState } from '../game/types';

const LABELS = { player: 'Green', neutral: 'White', enemy: 'Red' } as const;

export function TroopCompositionBar({ state }: { state: SimulationState }) {
  const composition = getTroopComposition(state);
  const total = composition.reduce((sum, faction) => sum + faction.units, 0);
  const active = composition.filter(faction => faction.units > 0);

  return (
    <section className="shrink-0 px-1 pb-3" aria-label="Troop composition">
      <div className="flex h-2 overflow-hidden rounded-full bg-[#e7e9e2]" role="img"
        aria-label={total === 0 ? 'No troops remaining' : active.map(faction => `${LABELS[faction.owner]} ${faction.units}, ${Math.round(faction.percentage)}%`).join('; ')}>
        {active.map(faction => <span key={faction.owner} style={{
          width: `${faction.percentage}%`, backgroundColor: PALETTE[faction.owner].fill,
          borderRight: faction.owner === 'neutral' ? '1px solid #bdc9ba' : undefined,
        }} />)}
      </div>
      <ul className="mt-2 flex flex-wrap justify-between gap-x-3 gap-y-1 p-0 text-[10px] leading-none text-[#68756d]" aria-label="Troop counts">
        {composition.map(faction => <li key={faction.owner} className="flex items-center gap-1.5 tabular-nums">
          <span className="size-2 rounded-full border border-[#bdc9ba]" style={{ backgroundColor: PALETTE[faction.owner].fill }} aria-hidden="true" />
          <span>{LABELS[faction.owner]}</span>
          <span>{faction.units}</span>
          <span className="text-[#929b91]">{Math.round(faction.percentage)}%</span>
        </li>)}
      </ul>
    </section>
  );
}
