import type { FieldMap } from '@/board/maps';
import { factionPalette } from '@/board/palette';
import type { AiBehavior } from '@/game/ai/behaviors';
import type { UpgradeId } from '@/game/upgrades/catalog';

import { UpgradeOptions } from './upgrade-options';

export function EnemySettings({
  map,
  upgrades,
  onUpgrades,
  aiBehaviors,
  onAiBehaviors,
  onEditLogic,
}: {
  onEditLogic: (enemy: string, name: string) => void;
  map: FieldMap;
  upgrades: Readonly<Record<string, readonly UpgradeId[]>>;
  onUpgrades: (value: Readonly<Record<string, readonly UpgradeId[]>>) => void;
  aiBehaviors: Readonly<Record<string, AiBehavior>>;
  onAiBehaviors: (value: Readonly<Record<string, AiBehavior>>) => void;
}) {
  const enemies = [
    ...new Set(
      map.territories
        .map((city) => city.owner)
        .filter((owner) => owner !== 'neutral' && owner !== 'player'),
    ),
  ].sort();
  if (!enemies.length) return null;
  const total = enemies.reduce((sum, id) => sum + (upgrades[id]?.length ?? 0), 0);
  const custom = enemies.some((id) => aiBehaviors[id] && aiBehaviors[id] !== 'balanced');
  return (
    <details className="home-settings-section">
      <summary>
        <span>Enemy settings</span>
        <span className="home-summary-count">
          {enemies.length} {enemies.length === 1 ? 'enemy' : 'enemies'} ·{' '}
          {total ? `${total} upgrades` : custom ? 'Custom behavior' : 'Balanced'}
        </span>
      </summary>
      {enemies.map((factionId, index) => {
        const name = `Enemy ${index + 1}`,
          selected = upgrades[factionId] ?? [];
        return (
          <section key={factionId} className="home-enemy-option">
            <h3>
              <span
                className="home-faction-dot"
                style={{ background: factionPalette(factionId).fill }}
              />
              {name}
              <span className="home-summary-count">
                {selected.length ? `${selected.length} upgrades` : 'No upgrades'}
              </span>
            </h3>
            <label className="home-behavior-option">
              Logic
              <select
                aria-label={`${name} logic`}
                value="normal"
                onChange={() => {}}
                aria-describedby={`${factionId}-logic-gate`}
              >
                <option value="normal">Normal</option>
                <option value="custom" disabled>
                  Custom — not enabled yet
                </option>
              </select>
            </label>
            <button
              type="button"
              className="home-edit-logic"
              aria-label={`Edit ${name} logic`}
              onClick={() => onEditLogic(factionId, name)}
            >
              Edit logic
            </button>
            <p id={`${factionId}-logic-gate`} className="home-logic-note">
              Save custom drafts now. Custom matches are not enabled yet; Normal AI stays active.
            </p>
            <label className="home-behavior-option">
              Behavior
              <select
                aria-label={`${name} behavior`}
                value={aiBehaviors[factionId] ?? 'balanced'}
                onChange={(event) =>
                  onAiBehaviors({
                    ...aiBehaviors,
                    [factionId]: event.currentTarget.value as AiBehavior,
                  })
                }
              >
                <option value="balanced">Balanced</option>
                <option value="aggressive">Aggressive</option>
                <option value="defensive">Defensive</option>
              </select>
            </label>
            <div className="home-upgrade-list">
              <UpgradeOptions
                factionId={factionId}
                selected={selected}
                onChange={(ids) => onUpgrades({ ...upgrades, [factionId]: ids })}
              />
            </div>
          </section>
        );
      })}
    </details>
  );
}
