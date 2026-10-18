import { BehaviourTree, State } from 'mistreevous';
import type { RootNodeDefinition } from 'mistreevous/dist/BehaviourTreeDefinition';
import expansion from './expansion.mdsl?raw';
import type { SimulationState } from '../../types';
import { CaptureAgent, type ApplyBotAction, type BotObserver } from './agent';
import { validateProgramDefinition } from '../program/validation';
import { ExecutionBudget } from '../program/budget';
import { ProgramBudgetError } from '../program/limits';

export { CaptureAgent } from './agent';
export type { MdslEvent } from './agent';
export interface BotFault { readonly code: 'budget' | 'runtime'; readonly message: string; readonly method?: string }
export interface BotRuntimeOptions { onFault?: (fault: BotFault) => void }
export interface ProgramRuntimeOptions extends BotRuntimeOptions { observe?: BotObserver; decisionIntervalMs?: number }

/** Required boundary for untrusted runtime snapshots; strings cannot select the
 * separate trusted-MDSL compatibility path by accident.
 */
export function createProgramBot(factionId: string, read: () => SimulationState, apply: ApplyBotAction,
  definition: unknown, options: ProgramRuntimeOptions = {}) {
  if (!definition || typeof definition !== 'object' || Array.isArray(definition)) throw new Error('Expected one native program root object.');
  return createMdslBot(factionId, read, apply, options.observe, definition as RootNodeDefinition, options.decisionIntervalMs ?? 1000, options);
}

/** Trusted handwritten MDSL remains compatible. Native custom programs always
 * go through strict admission, cloning and per-decision/work budgets.
 */
export function createMdslBot(factionId: string, read: () => SimulationState,
  apply: ApplyBotAction, observe?: BotObserver, definition: string | RootNodeDefinition = expansion,
  decisionIntervalMs = 1000, options: BotRuntimeOptions = {}) {
  const native = typeof definition !== 'string';
  if (native) {
    const checked = validateProgramDefinition(definition);
    if (!checked.ok) throw new Error(`Invalid native program: ${checked.diagnostics.map(d => `${d.path}: ${d.message}`).join('; ')}`);
    definition = checked.definition;
  }
  const budget = native ? new ExecutionBudget() : undefined;
  const agent = new CaptureAgent(factionId, read, apply, observe, decisionIntervalMs, budget);
  let previousElapsedMs = read().elapsedMs;
  let deltaSeconds = 0, stopped = false;
  let fault: BotFault | null = null;
  let capabilityError: unknown, currentMethod: string | undefined;
  const methods = {
    SelectCity: agent.SelectCity.bind(agent), SelectSources: agent.SelectSources.bind(agent),
    NextCity: agent.NextCity.bind(agent), ClearSet: agent.ClearSet.bind(agent), AddToSet: agent.AddToSet.bind(agent),
    PlanCapture: agent.PlanCapture.bind(agent), ExecutePlan: agent.ExecutePlan.bind(agent), ReleasePlan: agent.ReleasePlan.bind(agent),
  };
  const capabilities = Object.fromEntries(Object.entries(methods).map(([method, fn]) => [method, (...args: unknown[]) => {
    currentMethod = method;
    try { budget?.capability(read()); return Reflect.apply(fn, undefined, args); }
    catch (error) { capabilityError = error; throw error; }
  }]));
  const tree = new BehaviourTree(definition, capabilities, { getDeltaTime: () => deltaSeconds });
  function cleanup() {
    try { agent.clear(native); } finally { tree.reset(); }
  }
  return {
    get fault() { return fault; },
    step() {
      if (stopped) return fault ? State.FAILED : tree.getState();
      capabilityError = undefined;currentMethod = undefined;budget?.reset();
      try {
        const elapsedMs = read().elapsedMs;
        deltaSeconds = Math.max(0, elapsedMs - previousElapsedMs) / 1000;
        previousElapsedMs = elapsedMs;
        tree.step();
      } catch (wrapped) {
        if (!native) throw wrapped; // Preserve the separate trusted prototype contract.
        const cause = capabilityError ?? wrapped;
        fault = Object.freeze({ code: cause instanceof ProgramBudgetError ? 'budget' : 'runtime',
          message: cause instanceof Error ? cause.message : String(cause), ...(currentMethod ? { method: currentMethod } : {}) });
        stopped = true;
        // Cleanup/reporters must not replace the primary fault or keep the bot alive.
        try { cleanup(); } catch { /* all agent memory is cleared in finally */ }
        try { options.onFault?.(fault); } catch { /* reporter is not a controller */ }
        return State.FAILED;
      }
      return tree.getState();
    },
    dispose() {
      if (stopped) return;
      stopped = true;cleanup();
    },
  };
}
