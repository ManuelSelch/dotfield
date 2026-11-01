import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createDefaultProject } from './default-project';
import { bindInput, findBlock, insertStep } from './editing';
import { StepControls, stepName } from './step-controls';
import type { BlockState, BotProject } from './types';

describe('step control presentation', () => {
  let project: BotProject;
  const render = (selected: string) =>
    renderToStaticMarkup(
      createElement(StepControls, {
        project,
        selected,
        select: vi.fn(),
        edit: vi.fn(),
        error: vi.fn(),
      }),
    );

  beforeEach(() => {
    project = createDefaultProject();
  });

  it('protects the entry block from moving or deletion while offering the library', () => {
    const html = render('main-entry');

    expect(html).toContain('aria-label="Block library"');
    expect(html).toContain('Add Select city');
    expect(html).toMatch(/disabled="">Move up/);
    expect(html).toMatch(/disabled="">Move down/);
    expect(html).toMatch(/disabled="">Delete step/);
    expect(html).toContain('Call Capture(neutral)');
  });

  it('offers literal query bindings and movement for a selected call', () => {
    const html = render('neutral-call');

    expect(html).toContain('kind · query');
    expect(html).toContain('aria-label="kind binding"');
    expect(html).toContain('value="literal" selected=""');
    expect(html).toContain('value="neutral" selected=""');
    expect(html).toMatch(/<button type="button">Move down/);
    expect(html).toMatch(/<button type="button">Delete step/);
  });

  it('shows cleanup policy and only compatible slots for a sequence', () => {
    project.editor.activeTab = 'capture';

    const html = render('capture-body');

    expect(html).toContain('aria-label="Cleanup"');
    expect(html).toContain('value="release-plan" selected=""');
    expect(html).toContain('aria-label="plan capture-plan slot"');
    expect(html).toContain('value="plan" selected=""');
  });

  it('binds a tactic input to a matching parameter without pretending it is a literal', () => {
    project.editor.activeTab = 'capture';

    const html = render('select-target');

    expect(html).toContain('value="parameter:kind" selected=""');
    expect(html).toContain('Input: kind');
    expect(html).toContain('aria-label="ranking value"');
    expect(html).not.toContain('aria-label="target class value"');
  });

  it('shows bounded numeric input for retry attempts', () => {
    insertStep(project, 'main', 'main-priority', 'df_retry', 'retry');

    const html = render('retry');

    expect(html).toContain('aria-label="retry attempts value"');
    expect(html).toContain('min="1" max="8" step="1" value="4"');
  });

  it('asks for an explicit replacement for missing or incompatible inputs', () => {
    const call = findBlock(project, 'neutral-call')!;
    delete call.inputs!.ARG_kind;

    expect(render('neutral-call')).toContain('Choose binding');

    bindInput(project, 'neutral-call', 'ARG_kind', 'army', 6);

    expect(render('neutral-call')).toContain('Incompatible input — replace explicitly');
  });

  it('keeps obsolete call arguments visible for explicit removal', () => {
    project.procedures[0].parameters = [];

    const html = render('neutral-call');

    expect(html).toContain('Remove obsolete argument kind');
    expect(html).not.toContain('aria-label="kind binding"');
  });

  it('disables editing for a missing selection and handles a project without tactics', () => {
    project.procedures = [];

    const html = render('missing');

    expect(html).toMatch(/disabled="">\+ Call tactic/);
    expect(html).toMatch(/disabled="">Delete step/);
    expect(html).toContain('Call tactic(');
  });

  it('labels entries, scalars, references and unknown blocks without losing their identity', () => {
    const label = (block: BlockState) => stepName(project, block);

    expect(label({ type: 'df_main' })).toBe('Main');
    expect(label({ type: 'df_tactic', extraState: { tacticId: 'capture' } })).toBe(
      'Define Capture',
    );
    expect(label({ type: 'df_tactic', extraState: { tacticId: 'missing' } })).toBe('Define tactic');
    expect(label({ type: 'df_parameter', extraState: { parameterId: 'kind' } })).toBe(
      'Input reference kind',
    );
    expect(label({ type: 'df_army', fields: { VALUE: 8 } })).toBe('minimum army: 8');
    expect(label({ type: 'unknown' })).toBe('unknown');
    expect(label({ type: 'df_sequence' })).toBe('Sequence');

    bindInput(project, 'neutral-call', 'ARG_kind', 'query', 'neutral', 'kind');
    expect(label(findBlock(project, 'neutral-call')!)).toBe('Call Capture(input)');
    delete findBlock(project, 'neutral-call')!.inputs!.ARG_kind;
    expect(label(findBlock(project, 'neutral-call')!)).toBe('Call Capture(?)');
  });
});
