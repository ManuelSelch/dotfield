import { Button } from '@mantine/core';
import type { GeneratedMap } from '../board/generateMap';
import type { MatchPreferences } from '../game/matchPreferences';
import { MapPreview } from './MapPreview';
import { MapOptions } from './MapOptions';
import { EnemySettings } from './EnemySettings';
import { UpgradeOptions } from './UpgradeOptions';
import './home.css';

export function HomeScreen({ map, preferences, onChange, onReroll, onPlay }: {
  map: GeneratedMap;
  preferences: MatchPreferences;
  onChange: (value: MatchPreferences) => void;
  onReroll: () => void;
  onPlay: () => void;
}) {
  const selected = preferences.upgrades.player ?? [];
  return <section className="home-screen" aria-labelledby="home-title">
    <div className="home-scroll">
      <div className="home-body">
        <section className="home-settings" aria-label="Match settings">
          <MapOptions settings={preferences.map} onChange={value => onChange({ ...preferences, map: value })} />
          <div className="home-advanced-settings">
            <details className="home-settings-section">
              <summary><span>Your upgrades</span><span className="home-summary-count">{selected.length ? `${selected.length} enabled` : 'None enabled'}</span></summary>
              <div className="home-upgrade-list"><UpgradeOptions factionId="player" selected={selected}
                onChange={ids => onChange({ ...preferences, upgrades: { ...preferences.upgrades, player: ids } })} /></div>
            </details>
            <EnemySettings map={map} upgrades={preferences.upgrades} onUpgrades={value => onChange({ ...preferences, upgrades: value })}
              aiBehaviors={preferences.aiBehaviors} onAiBehaviors={value => onChange({ ...preferences, aiBehaviors: value })} />
          </div>
          <div className="home-play-slot">
            <Button className="home-reroll" variant="outline" color="#267c72" radius="xl" mih={44} onClick={onReroll} aria-label="Reroll">↻ Reroll</Button>
            <Button className="home-play" color="#267c72" autoFocus fullWidth radius="xl" mih={44} onClick={onPlay}>Play <span className="home-play-arrow" aria-hidden="true">↗</span></Button>
          </div>
        </section>
        <section className="home-preview" aria-label="Map preview">
          <div className="home-preview-heading home-section-label">A possible field</div>
          <div className="home-map-frame"><MapPreview map={map} /></div>
          <div className="home-badges" aria-live="polite">
            <span>{map.territories.length} cities</span><span>{preferences.map.enemies} {preferences.map.enemies === 1 ? 'enemy' : 'enemies'}</span>
            <span>{map.settings.industry ? 'Industry' : 'No industry'}</span><span>{map.river ? `${map.river.bridges.length} bridges` : 'No river'}</span>
            <span>{map.settings.artillery ? 'Artillery' : 'No artillery'}</span>
          </div>
        </section>
      </div>
    </div>
  </section>;
}
