import { UPGRADES, type UpgradeId } from '@/game/upgrades/catalog';

import { TogglePill } from './toggle-pill';

export function UpgradeOptions({
  factionId,
  selected,
  onChange,
}: {
  factionId: string;
  selected: readonly UpgradeId[];
  onChange: (ids: readonly UpgradeId[]) => void;
}) {
  const label = factionId === 'player' ? 'Your upgrades' : `${factionId} upgrades`;
  const available = Object.values(UPGRADES).filter((upgrade) => upgrade.id !== 'factory');
  return (
    <div role="group" aria-label={label} className="home-upgrade-toggles">
      {available.map((upgrade) => (
        <TogglePill
          key={upgrade.id}
          label={upgrade.name}
          pressed={selected.includes(upgrade.id)}
          onClick={() =>
            onChange(
              selected.includes(upgrade.id)
                ? selected.filter((id) => id !== upgrade.id)
                : [...selected, upgrade.id],
            )
          }
        />
      ))}
    </div>
  );
}
