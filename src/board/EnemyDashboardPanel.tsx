import { useEffect, useRef } from 'react';
import type { AiTraceBlockReason } from '../game/ai/trace';
import type { AiTraceExample } from '../game/ai/trace';
import type { AiActivity, RecordedAiDecision } from './enemyDashboard';
import { actionView, aiStatusView, decisionView } from './enemyDashboard';

interface Props {
  readonly factions: readonly string[];
  readonly decisions: Readonly<Record<string, RecordedAiDecision>>;
  readonly activity: Readonly<Record<string, AiActivity>>;
  readonly numbers: ReadonlyMap<string, number>;
  readonly relayCityId?: string;
  readonly onHighlight: (cityIds: readonly string[]) => void;
  readonly onClose: () => void;
}

const factionLabel = (id: string) => id === 'enemy' ? 'Enemy 1'
  : /^enemy-(\d+)$/.test(id) ? `Enemy ${id.slice('enemy-'.length)}` : `Enemy · ${id}`;

const BLOCKER_LABELS: Record<AiTraceBlockReason, string> = {
  'below-dispatch-minimum': 'Too few dispatchable troops',
  'source-has-order': 'Source already has an order queued',
  'river-crossing': 'No legal direct river crossing',
  'terrain-blocked': 'Terrain blocks a direct route',
  'defender-blocked': 'Enemy Defender blocks transit',
  'home-reserve': 'Would risk the original home reserve',
  'forecast-loses': 'Forecast predicts a losing outcome',
  'forecast-cannot-capture': 'Forecast cannot capture and hold the target',
  'already-secured': 'Incoming troops already secure the target',
  'reinforce-no-benefit': 'Reinforcement would not improve the defense',
  'airfield-full': 'Airfield has no room for the delivery',
  'not-frontline': 'No frontline progress or production relief',
  'source-risk': 'Would sacrifice the source city',
  'non-positive-score': 'Candidate score was not positive',
  'aircraft-not-ready': 'Aircraft is not ready',
  'insufficient-garrison': 'Not enough troops to load an aircraft',
  'unsafe-airlift': 'Airlift would leave its home exposed',
  'conversion-economy-guard': 'Production reserve guard prevents another conversion',
  'role-already-built': 'That exclusive city role is already built',
  'city-is-home': 'The original home cannot be converted',
  'city-threatened': 'City is already under threat',
  'city-has-pending-order': 'City has a pending order',
  'below-conversion-cost': 'Not enough troops for the conversion',
  'conversion-forecast-fails': 'Forecast cannot safely hold the converted city',
  'airfield-not-useful': 'No successful barrier-crossing airlift found',
  'artillery-not-useful': 'No useful Artillery target or damage found',
  'watchtower-not-useful': 'No useful Watchtower intercept or protection found',
  'defender-not-useful': 'No exposed front or new route to block',
  'relay-recapture-not-feasible': 'Relay cannot be safely retaken in time',
  'round-not-playing': 'Round is not active',
  'no-target': 'No valid delivery target',
};

const SCOPE_LABELS = { source: 'sources', route: 'routes', airlift: 'airlifts', conversion: 'conversions', decision: 'checks' } as const;

function cityLabel(decision: RecordedAiDecision, numbers: ReadonlyMap<string, number>, id?: string): string | null {
  if (!id) return null;
  const owner = decision.ownersAtDecision[id] ?? decision.factionId;
  return `${factionLabel(owner)} · City ${numbers.get(id) ?? '?'}`;
}

function exampleCityIds(example: AiTraceExample): string[] {
  return [...new Set([example.sourceId, example.targetId, example.cityId, example.blockerId].filter((id): id is string => !!id))];
}

function actionCityIds(action: RecordedAiDecision['action']): string[] {
  if (!action) return [];
  return action.type === 'convert' ? [action.cityId] : [action.sourceId, action.targetId];
}

function blockerExample(decision: RecordedAiDecision, example: AiTraceExample, numbers: ReadonlyMap<string, number>, relayCityId?: string): string {
  const source = cityLabel(decision, numbers, example.sourceId ?? example.cityId);
  const target = cityLabel(decision, numbers, example.targetId);
  const blocker = cityLabel(decision, numbers, example.blockerId);
  const route = source && target ? `${source} → ${target}` : source ?? target;
  return `${route ?? 'Map'}${blocker ? ` · blocked by ${blocker}` : ''}${relayCityId && (example.targetId === relayCityId || example.cityId === relayCityId) ? ' · Relay' : ''}`;
}

export function EnemyDashboard({ factions, decisions, activity, numbers, relayCityId, onHighlight, onClose }: Props) {
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
          const current = activity[factionId];
          const status = current ? aiStatusView(current, decision) : { status: 'Connecting…', detail: 'Waiting for lifecycle status' };
          const age = (time: number) => `${Math.floor(Math.max(0, (current?.elapsedMs ?? time) - time) / 1000)}s ago`;
          const selected = decision ? decisionView(decision, numbers, relayCityId) : undefined;
          const trace = decision?.trace;
          const otherCount = Math.max(0, (trace?.viableCount ?? 0) - (decision?.action ? 1 : 0));
          return <section className="enemy-dashboard__card" key={factionId} aria-label={selected?.faction ?? factionLabel(factionId)}>
            <h3>{selected?.faction ?? factionLabel(factionId)}</h3>
            <div className="enemy-dashboard__current" aria-label="Current status">
              <span className="enemy-dashboard__label">Current status</span>
              <strong>{status.status}</strong>
              <small>{status.detail}</small>
            </div>
            <div className="enemy-dashboard__result-label"><span>Last result</span>{decision && <span>{age(decision.completedAtMs)}</span>}</div>
            {selected ? <>
              <p className="enemy-dashboard__action">{selected.action}</p>
              {selected.route && <p className="enemy-dashboard__route">{selected.route}</p>}
              <p className="enemy-dashboard__outcome">{{ applied: 'Applied · command accepted at that time', rejected: 'Rejected · command no longer valid', inactive: 'Not applied · session inactive', 'no-command': 'No command issued' }[decision.outcome]}</p>
              <p className="enemy-dashboard__waiting">Evaluation #{decision.evaluation} · board snapshot {age(decision.evaluatedAtMs)}</p>
              <details className="enemy-dashboard__evaluation" open={!decision.action}>
              <summary>Last evaluation details</summary>
              <p className="enemy-dashboard__waiting">Details describe the evaluated board snapshot, not the current board.</p>
              {selected.score && <p className="enemy-dashboard__score"><span>AI score</span><strong>{selected.score}</strong></p>}
              {!decision?.action && <p className="enemy-dashboard__empty">No candidate passed feasibility and priority checks this decision.</p>}
              {trace && otherCount > 0 && <details className="enemy-dashboard__details">
                <summary>Other viable actions ({otherCount})</summary>
                <ol className="enemy-dashboard__trace-list">
                  {trace.alternatives.map((alternative, index) => {
                    const view = actionView(decision, alternative.action, numbers, relayCityId);
                    const note = alternative.selectionReason === 'lower-priority' ? 'Lower priority'
                      : alternative.selectionReason === 'stable-tie-break' ? 'Tied; stable order chose another action'
                        : 'Priority rule chose another action';
                    return <li key={`${alternative.action.type}-${index}`}>
                      <button type="button" className="enemy-dashboard__candidate" onClick={() => onHighlight(actionCityIds(alternative.action))}>
                        <strong>{view.action} · {view.score}</strong>
                        {Math.abs(alternative.priority - alternative.action.score) > 0.001
                          && <small>Effective priority {alternative.priority.toFixed(1)} after behavior weighting</small>}
                        {view.route && <span>{view.route}</span>}
                        <small>{note} · highlight route</small>
                      </button>
                    </li>;
                  })}
                  {trace.omittedAlternativeCount > 0 && <li className="enemy-dashboard__omitted">{trace.omittedAlternativeCount} more viable actions; grouped as lower priority.</li>}
                </ol>
              </details>}
              {trace && trace.blockers.length > 0 && <details className="enemy-dashboard__details" open={!decision.action}>
                <summary>{decision.action ? `Why others were blocked (${trace.blockedCount})` : `Why no action? (${trace.blockedCount})`}</summary>
                <ul className="enemy-dashboard__trace-list">
                  {trace.blockers.map(blocker => <li key={`${blocker.scope}-${blocker.reason}`}>
                    <strong>{blocker.count} {SCOPE_LABELS[blocker.scope]} · {BLOCKER_LABELS[blocker.reason]}</strong>
                    {blocker.examples.map((example, index) => <button type="button" className="enemy-dashboard__example" key={index}
                      onClick={() => onHighlight(exampleCityIds(example))}>{blockerExample(decision, example, numbers, relayCityId)} · highlight</button>)}
                  </li>)}
                </ul>
              </details>}
              {trace && !decision.action && trace.blockers.length === 0 && <p className="enemy-dashboard__empty">No legal candidates were evaluated.</p>}
              </details>
            </> : <p className="enemy-dashboard__waiting">No completed evaluation yet.</p>}
          </section>;
        })}
      </div>
      <p className="enemy-dashboard__footnote">City numbers stay fixed for this match. Select an alternative or blocker example to highlight it on the map.</p>
    </aside>
  </>;
}
