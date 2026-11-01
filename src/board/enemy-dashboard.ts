import type { AiAction } from '@/game/ai/actions';
import type { AiDecisionTrace } from '@/game/ai/trace';
import type { FactionId, SimulationState, Territory, Owner } from '@/game/types';

export interface AiActivity {
  readonly elapsedMs: number;
  readonly nowMs: number;
  readonly phase: 'ready' | 'running' | 'paused';
  readonly hidden: boolean;
  readonly playing: boolean;
  readonly alive: boolean;
  readonly workerAvailable: boolean;
  readonly nextDecisionMs: number;
  readonly pendingSinceMs?: number;
  readonly error?: boolean;
}

export function aiStatusView(
  activity: AiActivity,
  decision?: RecordedAiDecision,
): { status: string; detail: string } {
  if (!activity.playing) return { status: 'Finished', detail: 'No more evaluations expected' };
  if (!activity.alive) return { status: 'Eliminated', detail: 'No remaining cities or troops' };
  if (activity.phase !== 'running' || activity.hidden)
    return {
      status: activity.phase === 'ready' ? 'Ready' : 'Paused',
      detail: 'AI scheduling paused · result age frozen',
    };
  if (activity.error)
    return { status: 'Worker error', detail: 'No new result received since the error' };
  if (!activity.workerAvailable)
    return {
      status: 'Status unavailable',
      detail: 'Synchronous AI · worker diagnostics unavailable',
    };
  if (activity.pendingSinceMs !== undefined)
    return {
      status: 'Evaluating…',
      detail: `Waiting for worker response · ${Math.floor(Math.max(0, activity.nowMs - activity.pendingSinceMs) / 1000)}s elapsed`,
    };
  if (decision && !decision.action)
    return {
      status: 'No action selected',
      detail: `No action selected for ${Math.floor(Math.max(0, activity.elapsedMs - (decision.noActionSinceMs ?? decision.completedAtMs)) / 1000)}s · ${decision.noActionCount} evaluations`,
    };
  return {
    status: 'Waiting for next evaluation',
    detail: `Next check in ${(Math.max(0, activity.nextDecisionMs - activity.elapsedMs) / 1000).toFixed(1)}s`,
  };
}

export interface RecordedAiDecision {
  readonly evaluation: number;
  readonly evaluatedAtMs: number;
  readonly completedAtMs: number;
  readonly outcome: 'applied' | 'rejected' | 'inactive' | 'no-command';
  readonly noActionSinceMs?: number;
  readonly noActionCount: number;
  readonly factionId: FactionId;
  readonly action: AiAction | null;
  readonly trace: AiDecisionTrace;
  readonly ownersAtDecision: Readonly<Record<string, Owner>>;
}

export interface AiDecisionView {
  readonly faction: string;
  readonly action: string;
  readonly route: string | null;
  readonly score: string | null;
}

/** Stable, match-local labels independent of ownership and territory-array mutation. */
export function cityNumbers(territories: readonly Territory[]): ReadonlyMap<string, number> {
  return new Map(
    [...territories]
      .sort((a, b) => a.y - b.y || a.x - b.x || a.id.localeCompare(b.id))
      .map((city, index) => [city.id, index + 1]),
  );
}

export function recordDecision(
  state: SimulationState,
  factionId: FactionId,
  action: AiAction | null,
  trace: AiDecisionTrace,
  result?: Pick<RecordedAiDecision, 'completedAtMs' | 'evaluation' | 'outcome'>,
  previous?: RecordedAiDecision,
): RecordedAiDecision {
  const completion = result ?? {
    completedAtMs: state.elapsedMs,
    evaluation: 0,
    outcome: action ? ('inactive' as const) : ('no-command' as const),
  };
  const actionIds = (candidate: AiAction): string[] =>
    candidate.type === 'convert' ? [candidate.cityId] : [candidate.sourceId, candidate.targetId];
  const cityIds = new Set<string>(action ? actionIds(action) : []);
  for (const alternative of trace.alternatives)
    for (const id of actionIds(alternative.action)) cityIds.add(id);
  for (const blocker of trace.blockers)
    for (const example of blocker.examples) {
      if (example.sourceId) cityIds.add(example.sourceId);
      if (example.targetId) cityIds.add(example.targetId);
      if (example.cityId) cityIds.add(example.cityId);
      if (example.blockerId) cityIds.add(example.blockerId);
    }
  const ownersAtDecision = Object.fromEntries(
    [...cityIds].flatMap((id) => {
      const city = state.territories.find((candidate) => candidate.id === id);
      return city ? [[id, city.owner] as const] : [];
    }),
  );
  return {
    factionId,
    action,
    trace,
    ownersAtDecision,
    ...completion,
    evaluatedAtMs: state.elapsedMs,
    noActionSinceMs: action
      ? undefined
      : previous && !previous.action
        ? previous.noActionSinceMs
        : completion.completedAtMs,
    noActionCount: action ? 0 : (previous && !previous.action ? previous.noActionCount : 0) + 1,
  };
}

const factionLabel = (id: FactionId): string =>
  id === 'player'
    ? 'You'
    : id === 'neutral'
      ? 'Neutral'
      : id === 'enemy'
        ? 'Enemy 1'
        : /^enemy-(\d+)$/.test(id)
          ? `Enemy ${id.slice('enemy-'.length)}`
          : `Faction ${id}`;
const titleCase = (value: string) => value[0].toUpperCase() + value.slice(1);

export function actionView(
  decision: RecordedAiDecision,
  action: AiAction,
  numbers: ReadonlyMap<string, number>,
  relayCityId?: string,
): AiDecisionView {
  const { factionId } = decision;
  const labelCity = (id: string) => {
    const owner = decision.ownersAtDecision[id] ?? factionId;
    const number = numbers.get(id);
    return (
      `${factionLabel(owner)} · City ${number ?? '?'}` + (id === relayCityId ? ' (Relay)' : '')
    );
  };
  if (action.type === 'convert')
    return {
      faction: factionLabel(factionId),
      action: `Build ${titleCase(action.cityType)}`,
      route: `At ${labelCity(action.cityId)}`,
      score: action.score.toFixed(1),
    };
  return {
    faction: factionLabel(factionId),
    action:
      action.type === 'airlift' ? `Airlift · ${titleCase(action.kind)}` : titleCase(action.kind),
    route: `${labelCity(action.sourceId)} → ${labelCity(action.targetId)}`,
    score: action.score.toFixed(1),
  };
}

export function decisionView(
  decision: RecordedAiDecision,
  numbers: ReadonlyMap<string, number>,
  relayCityId?: string,
): AiDecisionView {
  return decision.action
    ? actionView(decision, decision.action, numbers, relayCityId)
    : {
        faction: factionLabel(decision.factionId),
        action: 'No action selected',
        route: null,
        score: null,
      };
}
