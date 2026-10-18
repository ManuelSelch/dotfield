import { useEffect, useRef } from 'react';
import type { RecordedAiDecision } from './enemyDashboard';
import { decisionView } from './enemyDashboard';

interface Props {
  readonly factions: readonly string[];
  readonly decisions: Readonly<Record<string, RecordedAiDecision>>;
  readonly numbers: ReadonlyMap<string, number>;
  readonly relayCityId?: string;
  readonly onClose: () => void;
}

const factionLabel = (id: string) => id === 'enemy' ? 'Enemy 1'
  : /^enemy-(\d+)$/.test(id) ? `Enemy ${id.slice('enemy-'.length)}` : `Enemy · ${id}`;

export function EnemyDashboard({ factions, decisions, numbers, relayCityId, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onCloseRef.current(); }
    };
    document.addEventListener('keydown', onKeyDown);
    if (window.matchMedia('(max-width: 899px)').matches) closeRef.current?.focus();
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);
  return <>
    <button type="button" className="enemy-dashboard-backdrop" aria-label="Close enemy dashboard" onClick={onClose} />
    <aside className="enemy-dashboard" id="enemy-dashboard" aria-labelledby="enemy-dashboard-title">
      <header className="enemy-dashboard__header">
        <div>
          <small>Live AI decisions</small>
          <h2 id="enemy-dashboard-title">Enemy dashboard</h2>
        </div>
        <button ref={closeRef} type="button" className="enemy-dashboard__close" aria-label="Close enemy dashboard" onClick={onClose}>×</button>
      </header>
      <div className="enemy-dashboard__list">
        {factions.map(factionId => {
          const decision = decisions[factionId];
          const view = decision ? decisionView(decision, numbers, relayCityId) : undefined;
          return <section className="enemy-dashboard__card" key={factionId} aria-label={view?.faction ?? factionLabel(factionId)}>
            <h3>{view?.faction ?? factionLabel(factionId)}</h3>
            {view ? <>
              <p className="enemy-dashboard__action">{view.action}</p>
              {view.route && <p className="enemy-dashboard__route">{view.route}</p>}
              {view.score && <p className="enemy-dashboard__score"><span>AI score</span><strong>{view.score}</strong></p>}
            </> : <p className="enemy-dashboard__waiting">Waiting for first decision…</p>}
          </section>;
        })}
      </div>
      <p className="enemy-dashboard__footnote">City numbers stay fixed for this match. Highlighted map markers match these decisions.</p>
    </aside>
  </>;
}
