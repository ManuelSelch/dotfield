import type { AiAction } from './actions';

export type AiTraceBlockReason =
  | 'below-dispatch-minimum'
  | 'source-has-order'
  | 'river-crossing'
  | 'terrain-blocked'
  | 'defender-blocked'
  | 'home-reserve'
  | 'forecast-loses'
  | 'forecast-cannot-capture'
  | 'already-secured'
  | 'reinforce-no-benefit'
  | 'airfield-full'
  | 'not-frontline'
  | 'source-risk'
  | 'non-positive-score'
  | 'aircraft-not-ready'
  | 'insufficient-garrison'
  | 'unsafe-airlift'
  | 'conversion-economy-guard'
  | 'role-already-built'
  | 'city-is-home'
  | 'city-threatened'
  | 'city-has-pending-order'
  | 'below-conversion-cost'
  | 'conversion-forecast-fails'
  | 'airfield-not-useful'
  | 'artillery-not-useful'
  | 'watchtower-not-useful'
  | 'defender-not-useful'
  | 'relay-recapture-not-feasible'
  | 'round-not-playing'
  | 'no-target'
  | 'decision-budget'
  | 'offense-available'
  | 'assembly-not-feasible';
export type AiTraceScope = 'source' | 'route' | 'airlift' | 'conversion' | 'decision';

export interface AiTraceExample {
  readonly sourceId?: string;
  readonly targetId?: string;
  readonly cityId?: string;
  readonly blockerId?: string;
}
export interface AiTraceBlocker {
  readonly reason: AiTraceBlockReason;
  readonly scope: AiTraceScope;
  readonly count: number;
  readonly examples: readonly AiTraceExample[];
}
export interface AiTraceAlternative {
  readonly action: AiAction;
  readonly priority: number;
  readonly selectionReason: 'lower-priority' | 'stable-tie-break' | 'priority-override';
}
export interface AiDecisionTrace {
  readonly viableCount: number;
  readonly blockedCount: number;
  readonly alternatives: readonly AiTraceAlternative[];
  readonly omittedAlternativeCount: number;
  readonly blockers: readonly AiTraceBlocker[];
}

interface Candidate {
  readonly action: AiAction;
  readonly priority: number;
}
interface BlockBucket {
  count: number;
  readonly examples: AiTraceExample[];
}
const MAX_ALTERNATIVES = 4;
const MAX_EXAMPLES_PER_BLOCKER = 2;

function actionKey(action: AiAction): string {
  return action.type === 'convert'
    ? `${action.type}:${action.cityId}:${action.cityType}`
    : `${action.type}:${action.kind}:${action.sourceId}:${action.targetId}`;
}

/** Captures decision-time outcomes without changing action selection or forecast state. */
export class AiDecisionTraceCollector {
  private readonly candidates = new Map<string, Candidate>();
  private readonly blocked = new Map<string, BlockBucket>();
  private blockedCount = 0;

  consider(action: AiAction, priority = action.score): void {
    const key = actionKey(action),
      previous = this.candidates.get(key);
    if (!previous || priority > previous.priority) this.candidates.set(key, { action, priority });
  }

  block(reason: AiTraceBlockReason, scope: AiTraceScope, example?: AiTraceExample): void {
    this.blockedCount++;
    const key = `${scope}:${reason}`;
    let bucket = this.blocked.get(key);
    if (!bucket) {
      bucket = { count: 0, examples: [] };
      this.blocked.set(key, bucket);
    }
    bucket.count++;
    if (example && bucket.examples.length < MAX_EXAMPLES_PER_BLOCKER) bucket.examples.push(example);
  }

  finish(
    selected: AiAction | null,
    options: { selectedPriority?: number; priorityOverride?: boolean } = {},
  ): AiDecisionTrace {
    const candidates = [...this.candidates.values()];
    const selectedKey = selected ? actionKey(selected) : null;
    const alternatives = candidates
      .filter((candidate) => actionKey(candidate.action) !== selectedKey)
      .sort(
        (a, b) => b.priority - a.priority || actionKey(a.action).localeCompare(actionKey(b.action)),
      );
    const blockers = [...this.blocked.entries()]
      .map(([key, bucket]) => {
        const [scope, reason] = key.split(':') as [AiTraceScope, AiTraceBlockReason];
        return { reason, scope, count: bucket.count, examples: bucket.examples };
      })
      .sort((a, b) => b.count - a.count || a.reason.localeCompare(b.reason));
    const selectedPriority =
      options.selectedPriority ?? selected?.score ?? Number.NEGATIVE_INFINITY;
    return {
      viableCount: candidates.length,
      blockedCount: this.blockedCount,
      alternatives: alternatives.slice(0, MAX_ALTERNATIVES).map(({ action, priority }) => ({
        action,
        priority,
        selectionReason:
          options.priorityOverride || priority > selectedPriority
            ? 'priority-override'
            : priority === selectedPriority
              ? 'stable-tie-break'
              : 'lower-priority',
      })),
      omittedAlternativeCount: Math.max(0, alternatives.length - MAX_ALTERNATIVES),
      blockers,
    };
  }
}
