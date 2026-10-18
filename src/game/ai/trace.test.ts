import { describe, expect, it } from 'vitest';
import type { AiAction } from './actions';
import { AiDecisionTraceCollector } from './trace';

const order = (sourceId: string, score: number): AiAction => ({ type: 'ground', kind: 'attack', sourceId, targetId: 'target', score });

describe('AI decision trace aggregation', () => {
  it('groups real blockers and retains a bounded set of example routes', () => {
    const trace = new AiDecisionTraceCollector();
    for (const sourceId of ['a', 'b', 'c', 'd']) trace.block('terrain-blocked', 'route', { sourceId, targetId: 'target' });
    const result = trace.finish(null);
    expect(result.blockedCount).toBe(4);
    expect(result.blockers).toEqual([{ reason: 'terrain-blocked', scope: 'route', count: 4,
      examples: [{ sourceId: 'a', targetId: 'target' }, { sourceId: 'b', targetId: 'target' }] }]);
    expect(result.alternatives).toEqual([]);
  });

  it('returns the strongest alternatives, excluding the selected action', () => {
    const trace = new AiDecisionTraceCollector();
    const actions = [order('first', 8), order('second', 30), order('selected', 40), order('fourth', 20), order('fifth', 10), order('sixth', 5)];
    actions.forEach(action => trace.consider(action, action.score));
    const result = trace.finish(actions[2], { selectedPriority: 40 });
    expect(result.viableCount).toBe(6);
    expect(result.alternatives.map(item => item.action.type === 'convert' ? item.action.cityId : item.action.sourceId))
      .toEqual(['second', 'fourth', 'fifth', 'first']);
    expect(result.alternatives[0].priority).toBe(30);
    expect(result.omittedAlternativeCount).toBe(1);
    expect(result.alternatives.every(item => item.selectionReason === 'lower-priority')).toBe(true);
  });

  it('records when a priority rule selects an action over a higher-scoring candidate', () => {
    const trace = new AiDecisionTraceCollector();
    const selected = order('rescue', 20), higher = order('attack', 80);
    trace.consider(selected, 20); trace.consider(higher, 80);
    expect(trace.finish(selected, { selectedPriority: 20, priorityOverride: true }).alternatives[0].selectionReason)
      .toBe('priority-override');
  });
});
