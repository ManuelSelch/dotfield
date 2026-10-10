import type { FieldMap } from '../board/maps';
import type { AiBehavior } from '../game/ai/behaviors';
import type { UpgradeId } from '../game/upgrades/catalog';
import { UpgradeOptions } from './UpgradeOptions';

export function EnemySettings({ map, upgrades, onUpgrades, aiBehaviors, onAiBehaviors }: {
  map: FieldMap;
  upgrades: Readonly<Record<string, readonly UpgradeId[]>>;
  onUpgrades: (value: Readonly<Record<string, readonly UpgradeId[]>>) => void;
  aiBehaviors: Readonly<Record<string, AiBehavior>>;
  onAiBehaviors: (value: Readonly<Record<string, AiBehavior>>) => void;
}) {
  const enemies = [...new Set(map.territories.map(city => city.owner)
    .filter(owner => owner !== 'neutral' && owner !== 'player'))];
  if (!enemies.length) return null;
  return <details className="mt-2 rounded-xl border border-[#d5ddd3] px-3 py-2">
    <summary className="cursor-pointer text-sm font-medium">Enemy settings</summary>
    {enemies.map(factionId => <section key={factionId} className="mt-2 border-t border-[#e5e9e2] pt-2">
      <label className="flex items-center justify-between gap-2 text-sm">{factionId} behavior
        <select aria-label={`${factionId} AI behavior`} value={aiBehaviors[factionId] ?? 'balanced'}
          className="rounded-lg border border-[#c8d0c7] bg-white px-2 py-1"
          onChange={event => onAiBehaviors({ ...aiBehaviors, [factionId]: event.currentTarget.value as AiBehavior })}>
          <option value="balanced">Balanced</option><option value="aggressive">Aggressive</option><option value="defensive">Defensive</option>
        </select>
      </label>
      <UpgradeOptions factionId={factionId} selected={upgrades[factionId] ?? []}
        onChange={ids => onUpgrades({ ...upgrades, [factionId]: ids })} />
    </section>)}
  </details>;
}
