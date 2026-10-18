import type { AiAction } from '../game/ai/actions';
import type { AiDecisionTrace } from '../game/ai/trace';
import type { FactionId, SimulationState, Territory, Owner } from '../game/types';

export interface RecordedAiDecision {
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
  return new Map([...territories]
    .sort((a, b) => a.y - b.y || a.x - b.x || a.id.localeCompare(b.id))
    .map((city, index) => [city.id, index + 1]));
}

export function recordDecision(state: SimulationState, factionId: FactionId, action: AiAction | null,
  trace: AiDecisionTrace): RecordedAiDecision {
  const actionIds = (candidate: AiAction): string[] => candidate.type === 'convert'
    ? [candidate.cityId] : [candidate.sourceId, candidate.targetId];
  const cityIds = new Set<string>(action ? actionIds(action) : []);
  for (const alternative of trace.alternatives) for (const id of actionIds(alternative.action)) cityIds.add(id);
  for (const blocker of trace.blockers) for (const example of blocker.examples) {
    if (example.sourceId) cityIds.add(example.sourceId);
    if (example.targetId) cityIds.add(example.targetId);
    if (example.cityId) cityIds.add(example.cityId);
    if (example.blockerId) cityIds.add(example.blockerId);
  }
  const ownersAtDecision = Object.fromEntries([...cityIds].flatMap(id => {
    const city = state.territories.find(candidate => candidate.id === id);
    return city ? [[id, city.owner] as const] : [];
  }));
  return { factionId, action, trace, ownersAtDecision };
}

const factionLabel = (id: FactionId): string => id === 'player' ? 'You'
  : id === 'neutral' ? 'Neutral'
    : id === 'enemy' ? 'Enemy 1'
      : /^enemy-(\d+)$/.test(id) ? `Enemy ${id.slice('enemy-'.length)}` : `Faction ${id}`;
const titleCase = (value: string) => value[0].toUpperCase() + value.slice(1);

export function actionView(decision: RecordedAiDecision, action: AiAction, numbers: ReadonlyMap<string, number>, relayCityId?: string): AiDecisionView {
  const { factionId } = decision;
  const labelCity = (id: string) => {
    const owner = decision.ownersAtDecision[id] ?? factionId;
    const number = numbers.get(id);
    return `${factionLabel(owner)} · City ${number ?? '?'}` + (id === relayCityId ? ' (Relay)' : '');
  };
  if (action.type === 'convert') return {
    faction: factionLabel(factionId), action: `Build ${titleCase(action.cityType)}`,
    route: `At ${labelCity(action.cityId)}`, score: action.score.toFixed(1),
  };
  return {
    faction: factionLabel(factionId),
    action: action.type === 'airlift' ? `Airlift · ${titleCase(action.kind)}` : titleCase(action.kind),
    route: `${labelCity(action.sourceId)} → ${labelCity(action.targetId)}`,
    score: action.score.toFixed(1),
  };
}

export function decisionView(decision: RecordedAiDecision, numbers: ReadonlyMap<string, number>, relayCityId?: string): AiDecisionView {
  return decision.action ? actionView(decision, decision.action, numbers, relayCityId)
    : { faction: factionLabel(decision.factionId), action: 'No action selected', route: null, score: null };
}
