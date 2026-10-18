import type { AiAction } from '../game/ai/actions';
import type { FactionId, SimulationState, Territory, Owner } from '../game/types';

export interface RecordedAiDecision {
  readonly factionId: FactionId;
  readonly action: AiAction | null;
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

export function recordDecision(state: SimulationState, factionId: FactionId, action: AiAction | null): RecordedAiDecision {
  const cityIds = action ? action.type === 'convert' ? [action.cityId] : [action.sourceId, action.targetId] : [];
  const ownersAtDecision = Object.fromEntries(cityIds.flatMap(id => {
    const city = state.territories.find(candidate => candidate.id === id);
    return city ? [[id, city.owner] as const] : [];
  }));
  return { factionId, action, ownersAtDecision };
}

const factionLabel = (id: FactionId): string => id === 'player' ? 'You'
  : id === 'neutral' ? 'Neutral'
    : id === 'enemy' ? 'Enemy 1'
      : /^enemy-(\d+)$/.test(id) ? `Enemy ${id.slice('enemy-'.length)}` : `Faction ${id}`;
const titleCase = (value: string) => value[0].toUpperCase() + value.slice(1);

export function decisionView(decision: RecordedAiDecision, numbers: ReadonlyMap<string, number>, relayCityId?: string): AiDecisionView {
  const { factionId, action } = decision;
  if (!action) return { faction: factionLabel(factionId), action: 'No action selected', route: null, score: null };
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
