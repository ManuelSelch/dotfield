import { BehaviourTree } from 'mistreevous';
import expansion from './expansion.mdsl?raw';
import type { SimulationState } from '../../types';
import { CaptureAgent, type ApplyBotAction, type BotObserver } from './agent';

export { CaptureAgent } from './agent';
export type { MdslEvent } from './agent';

export function createMdslBot(factionId: string, read: () => SimulationState,
  apply: ApplyBotAction, observe?: BotObserver, definition = expansion, decisionIntervalMs = 1000) {
  const agent = new CaptureAgent(factionId, read, apply, observe, decisionIntervalMs);
  let previousElapsedMs = read().elapsedMs;
  let deltaSeconds = 0;
  const tree = new BehaviourTree(definition, {
    SelectCity: agent.SelectCity.bind(agent),
    SelectSources: agent.SelectSources.bind(agent),
    NextCity: agent.NextCity.bind(agent),
    ClearSet: agent.ClearSet.bind(agent),
    AddToSet: agent.AddToSet.bind(agent),
    PlanCapture: agent.PlanCapture.bind(agent),
    ExecutePlan: agent.ExecutePlan.bind(agent),
    ReleasePlan: agent.ReleasePlan.bind(agent),
  }, { getDeltaTime: () => deltaSeconds });
  let disposed = false;
  return {
    step() {
      if (!disposed) {
        const elapsedMs = read().elapsedMs;
        deltaSeconds = Math.max(0, elapsedMs - previousElapsedMs) / 1000;
        previousElapsedMs = elapsedMs;
        tree.step();
      }
      return tree.getState();
    },
    dispose() { disposed = true; agent.clear(); tree.reset(); },
  };
}
