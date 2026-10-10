import { Button, Title } from '@mantine/core';
import type { FieldMap } from '../board/maps';
import { MapSelector } from './MapSelector';
import { EnemySettings } from './EnemySettings';
import { UpgradeOptions } from './UpgradeOptions';
import type { UpgradeId } from '../game/upgrades/catalog';
import type { AiBehavior } from '../game/ai/behaviors';
import './home.css';

export function HomeScreen({ map, onSelect, onPlay, upgrades, onUpgrades, aiBehaviors, onAiBehaviors }: {
  map: FieldMap; onSelect: (id: string) => void; onPlay: () => void;
  upgrades: Readonly<Record<string, readonly UpgradeId[]>>; onUpgrades: (value: Readonly<Record<string, readonly UpgradeId[]>>) => void;
  aiBehaviors: Readonly<Record<string, AiBehavior>>; onAiBehaviors: (value: Readonly<Record<string, AiBehavior>>) => void;
}) {
  return <section className="home-screen" aria-labelledby="home-title">
    <Title order={2} id="home-title" className="m-0 text-center text-[23px] font-medium tracking-[-0.7px] text-ink">Choose your field.</Title>
    <div className="home-body">
      <MapSelector map={map} onSelect={onSelect} />
      <div className="home-setup">
        <div className="home-settings">
          <UpgradeOptions factionId="player" selected={upgrades.player ?? []}
            onChange={ids => onUpgrades({ ...upgrades, player: ids })} />
          <EnemySettings map={map} upgrades={upgrades} onUpgrades={onUpgrades}
            aiBehaviors={aiBehaviors} onAiBehaviors={onAiBehaviors} />
        </div>
      </div>
    </div>
    <Button className="home-play" autoFocus fullWidth radius="xl" mih={44} onClick={onPlay}>Play</Button>
  </section>;
}
