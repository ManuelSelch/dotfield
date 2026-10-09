import { Checkbox } from '@mantine/core';
import { UPGRADES, type UpgradeId } from '../game/upgrades/catalog';

export function UpgradeOptions({ factionId, selected, onChange }: {
  factionId: string; selected: readonly UpgradeId[]; onChange: (ids: readonly UpgradeId[]) => void;
}) {
  const label = factionId === 'player' ? 'Your upgrades' : `${factionId} upgrades`;
  return <div role="group" aria-label={label}>
    {Object.values(UPGRADES).map(upgrade => <Checkbox key={upgrade.id}
      label={upgrade.name} description={factionId === 'player' ? upgrade.description
        : upgrade.description.replace(' · You only', ' · This enemy only')} checked={selected.includes(upgrade.id)}
      styles={{ body: { minHeight: 44, alignItems: 'center' } }}
      onChange={event => onChange(event.currentTarget.checked
        ? [...selected, upgrade.id] : selected.filter(id => id !== upgrade.id))} />)}
  </div>;
}
