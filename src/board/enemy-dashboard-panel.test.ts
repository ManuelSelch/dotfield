import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AiAction } from '@/game/ai/actions';
import { AiDecisionTraceCollector } from '@/game/ai/trace';
import type { AiTraceExample } from '@/game/ai/trace';
import { createSimulation } from '@/game/state';

import type { AiActivity, RecordedAiDecision } from './enemy-dashboard';
import { cityNumbers, recordDecision } from './enemy-dashboard';
import { EnemyDashboard } from './enemy-dashboard-panel';

const state = createSimulation([
  { id: 'home', owner: 'enemy', x: 50, y: 50, units: 40 },
  { id: 'target', owner: 'neutral', x: 200, y: 200, units: 10 },
  { id: 'blocker', owner: 'player', x: 100, y: 100, units: 10 },
]);
const attack: AiAction = {
  type: 'ground',
  kind: 'attack',
  sourceId: 'home',
  targetId: 'target',
  score: 20,
};

describe('enemy dashboard presentation', () => {
  let activity: Record<string, AiActivity>;
  let decisions: Record<string, RecordedAiDecision>;
  const render = (factions = ['enemy']) =>
    renderToStaticMarkup(
      createElement(EnemyDashboard, {
        factions,
        activity,
        decisions,
        numbers: cityNumbers(state.territories),
        relayCityId: 'target',
        onHighlight: vi.fn(),
        onClose: vi.fn(),
      }),
    );

  beforeEach(() => {
    activity = {
      enemy: {
        elapsedMs: 10000,
        nowMs: 20000,
        phase: 'running',
        hidden: false,
        playing: true,
        alive: true,
        workerAvailable: true,
        nextDecisionMs: 11000,
      },
    };
    decisions = {};
  });

  it('distinguishes connecting factions from factions with no completed evaluation', () => {
    const html = render(['enemy', 'enemy-2', 'custom']);

    expect(html).toContain('Enemy 1');
    expect(html).toContain('Enemy 2');
    expect(html).toContain('Enemy · custom');
    expect(html).toContain('Connecting…');
    expect(html).toContain('Waiting for next evaluation');
    expect(html).toContain('No completed evaluation yet.');
  });

  it.each([
    ['applied', 'Applied · command accepted at that time'],
    ['rejected', 'Rejected · command no longer valid'],
    ['inactive', 'Not applied · session inactive'],
  ] as const)('describes the %s outcome and snapshot age', (outcome, label) => {
    decisions.enemy = recordDecision(
      state,
      'enemy',
      attack,
      new AiDecisionTraceCollector().finish(attack),
      {
        completedAtMs: 1000,
        evaluation: 3,
        outcome,
      },
    );

    const html = render();

    expect(html).toContain(label);
    expect(html).toContain('Evaluation #3');
    expect(html).toContain('10s ago');
    expect(html).toContain('AI score');
    expect(html).toContain('20.0');
    expect(html).toContain('(Relay)');
    expect(html).not.toContain('Why no action?');
  });

  it('explains an empty no-command evaluation rather than inventing blockers', () => {
    decisions.enemy = recordDecision(
      state,
      'enemy',
      null,
      new AiDecisionTraceCollector().finish(null),
    );

    const html = render();

    expect(html).toContain('No command issued');
    expect(html).toContain('No action selected');
    expect(html).toContain('No legal candidates were evaluated.');
    expect(html).not.toContain('AI score');
  });

  it('explains alternative priority, ties, overrides and omitted candidates', () => {
    const trace = new AiDecisionTraceCollector();
    trace.consider(attack);
    for (let i = 0; i < 6; i++)
      trace.consider({ ...attack, targetId: `other-${i}`, score: 20 - i });
    decisions.enemy = recordDecision(state, 'enemy', attack, trace.finish(attack));

    const html = render();

    expect(html).toContain('Other viable actions (6)');
    expect(html).toContain('Tied; stable order chose another action');
    expect(html).toContain('Lower priority');
    expect(html).toContain('2 more viable actions');
    expect(html).toContain('City ?');

    trace.consider({ type: 'convert', cityId: 'home', cityType: 'defender', score: 30 }, 40);
    decisions.enemy = recordDecision(
      state,
      'enemy',
      attack,
      trace.finish(attack, { priorityOverride: true }),
    );

    expect(render()).toContain('Priority rule chose another action');
    expect(render()).toContain('Effective priority 40.0 after behavior weighting');
    expect(render()).toContain('Build Defender');
  });

  it.each([
    [
      { sourceId: 'home', targetId: 'target', blockerId: 'blocker' },
      'blocked by Enemy · player · City 2',
    ],
    [{ cityId: 'target' }, 'Relay'],
    [{ targetId: 'target' }, 'Relay'],
    [{ sourceId: 'unknown' }, 'City ?'],
    [{}, 'Map'],
  ] satisfies [AiTraceExample, string][])(
    'shows decision-time blocker examples %j',
    (example, expected) => {
      const trace = new AiDecisionTraceCollector();
      trace.block('terrain-blocked', 'route', example);
      decisions.enemy = recordDecision(state, 'enemy', null, trace.finish(null));

      const html = render();

      expect(html).toContain('Why no action? (1)');
      expect(html).toContain('1 routes · Terrain blocks a direct route');
      expect(html).toContain(expected);
      expect(html).not.toContain('No legal candidates were evaluated.');
    },
  );

  it('labels blockers of alternatives separately from an accepted action', () => {
    const trace = new AiDecisionTraceCollector();
    trace.block('below-dispatch-minimum', 'source', { sourceId: 'home' });
    decisions.enemy = recordDecision(state, 'enemy', attack, trace.finish(attack));
    delete activity.enemy;

    const html = render();

    expect(html).toContain('Why others were blocked (1)');
    expect(html).toContain('Too few dispatchable troops');
    expect(html).toContain('0s ago');
  });
});
