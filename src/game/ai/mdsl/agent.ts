import { State } from 'mistreevous';
import { dispatchUnits } from '../../dispatch';
import { availableUnits } from '../../launch';
import { canGroundOrder } from '../../groundAccess';
import { minimumTravelMultiplier } from '../../features/slowZone';
import { orderDurationMs } from '../../route';
import { getFactionRules } from '../../rules';
import { SIMULATION_STEP_MS } from '../../settings';
import type { SimulationState, TerritoryState } from '../../types';
import type { AiAction } from '../actions';
import { forecastBattle } from '../forecast';

export interface MdslEvent {
  readonly factionId: string;
  readonly elapsedMs: number;
  readonly method: string;
  readonly outcome: string;
  readonly targetId?: string;
  readonly sourceId?: string;
}
export type ApplyBotAction = (action: AiAction) => SimulationState;
export type BotObserver = (event: MdslEvent) => void;
interface Sources { readonly targetId: string; readonly ids: readonly string[] }
interface CapturePlan {
  readonly sourceId: string;
  readonly targetId: string;
  readonly maxDurationMs: number;
  issuedIds?: readonly number[];
  deadlineMs?: number;
}
type Slot = string | Sources | CapturePlan;
interface ExitResult { readonly succeeded: boolean; readonly aborted: boolean }
const distance = (a: TerritoryState, b: TerritoryState) => Math.hypot(a.x - b.x, a.y - b.y);
const isPlan = (value: Slot | undefined): value is CapturePlan => typeof value === 'object' && 'sourceId' in value;

/** Trusted prototype capabilities. The tree receives only the five bound methods. */
export class CaptureAgent {
  private readonly memory = new Map<string, Slot>();
  constructor(private readonly factionId: string, private readonly read: () => SimulationState,
    private readonly apply: ApplyBotAction, private readonly observe: BotObserver = () => {}) {}

  private event(method: string, outcome: string, details: Pick<MdslEvent, 'targetId' | 'sourceId'> = {}) {
    this.observe({ factionId: this.factionId, elapsedMs: this.read().elapsedMs, method, outcome, ...details });
  }
  private sources(state: SimulationState, minimum: number) {
    return state.territories.filter(c => c.owner === this.factionId && availableUnits(state, c.id) - 1 >= minimum
      && !state.transfers.some(t => t.owner === this.factionId && t.sourceId === c.id));
  }
  private target(slot: string) {
    const id = this.memory.get(slot);
    return typeof id === 'string' ? this.read().territories.find(c => c.id === id) : undefined;
  }
  SelectCity(query: string, ranking: string, output: string) {
    this.memory.delete(output);
    if (query !== 'neutral' || ranking !== 'nearest-reachable') throw new Error('Unsupported prototype city query/ranking.');
    const state = this.read(), sources = this.sources(state, 1);
    const candidates = state.territories.filter(c => c.owner === 'neutral'
      && !state.transfers.some(t => t.owner === this.factionId && t.targetId === c.id))
      .map(city => ({ city, distance: Math.min(...sources.filter(s => canGroundOrder(state, s, city, this.factionId))
        .map(s => distance(s, city))) }))
      .filter(candidate => Number.isFinite(candidate.distance))
      .sort((a, b) => a.distance - b.distance || a.city.id.localeCompare(b.city.id));
    const target = candidates[0]?.city;
    if (target) this.memory.set(output, target.id);
    this.event('SelectCity', target ? 'selected' : 'no-target', { targetId: target?.id });
    return target ? State.SUCCEEDED : State.FAILED;
  }
  SelectSources(targetSlot: string, minimumArmy: number, output: string) {
    this.memory.delete(output);
    if (!Number.isFinite(minimumArmy) || minimumArmy < 1) throw new RangeError('Minimum army must be positive.');
    const target = this.target(targetSlot), state = this.read();
    const sources = target ? this.sources(state, minimumArmy)
      .filter(s => canGroundOrder(state, s, target, this.factionId))
      .sort((a, b) => distance(a, target) - distance(b, target) || a.id.localeCompare(b.id)) : [];
    if (target && sources.length) this.memory.set(output, { targetId: target.id, ids: sources.map(c => c.id) });
    this.event('SelectSources', sources.length ? 'selected' : 'no-sources', { targetId: target?.id });
    return sources.length ? State.SUCCEEDED : State.FAILED;
  }
  /** Forecast real all-but-one commands, never an invented troop amount. */
  private feasible(plan: CapturePlan): boolean {
    const state = this.read();
    if (state.roundStatus !== 'playing') return false;
    const source = state.territories.find(c => c.id === plan.sourceId);
    const target = state.territories.find(c => c.id === plan.targetId);
    if (!source || !target || source.owner !== this.factionId || target.owner !== 'neutral'
      || this.sources(state, 1).every(c => c.id !== source.id)) return false;
    const proposed = dispatchUnits(state, source.id, target.id, this.factionId);
    if (proposed === state) return false;
    const duration = Math.ceil(orderDurationMs(source, target, source.units - 1, getFactionRules(state, this.factionId),
      minimumTravelMultiplier(state)) / SIMULATION_STEP_MS) * SIMULATION_STEP_MS + SIMULATION_STEP_MS;
    if (duration > plan.maxDurationMs) return false;
    const result = forecastBattle(proposed, duration);
    return result.territories.find(c => c.id === target.id)?.owner === this.factionId
      && result.territories.find(c => c.id === source.id)?.owner === this.factionId
      // RoundStatus is player-relative; 'defeat' can mean this bot won.
      && (!result.outcome?.winner || result.outcome.winner === this.factionId);
  }
  PlanCapture(targetSlot: string, sourcesSlot: string, maxDurationMs: number, output: string) {
    this.memory.delete(output);
    // Bound source-authored experiments; accepting arbitrary unbounded horizons
    // would allow accidental main-thread hangs. This is not an upload API.
    if (!Number.isFinite(maxDurationMs) || maxDurationMs <= 0 || maxDurationMs > 60000) {
      throw new RangeError('Prototype capture horizon must be between 0 and 60000 ms.');
    }
    const target = this.target(targetSlot), sources = this.memory.get(sourcesSlot);
    if (target && typeof sources === 'object' && 'ids' in sources && sources.targetId === target.id) {
      for (const sourceId of sources.ids) {
        const plan: CapturePlan = { sourceId, targetId: target.id, maxDurationMs };
        if (this.feasible(plan)) {
          this.memory.set(output, plan);
          this.event('PlanCapture', 'planned', plan);
          return State.SUCCEEDED;
        }
      }
    }
    this.event('PlanCapture', 'infeasible', { targetId: target?.id });
    return State.FAILED;
  }
  ExecutePlan(slot: string) {
    const plan = this.memory.get(slot);
    if (!isPlan(plan)) return State.FAILED;
    const state = this.read();
    const fail = (reason: string) => {
      this.memory.delete(slot); this.event('ExecutePlan', reason, plan); return State.FAILED;
    };
    if (state.roundStatus !== 'playing') return fail('round-ended');
    if (state.territories.find(c => c.id === plan.targetId)?.owner === this.factionId) {
      this.event('ExecutePlan', 'captured', plan); return State.SUCCEEDED;
    }
    if (plan.issuedIds) {
      if (state.territories.find(c => c.id === plan.sourceId)?.owner !== this.factionId) return fail('source-lost');
      if (state.elapsedMs > plan.deadlineMs!) return fail('timeout');
      if (!state.transfers.some(t => plan.issuedIds!.includes(t.id))) return fail('orders-exhausted');
      return State.RUNNING;
    }
    if (!this.feasible(plan)) return fail('invalidated');
    // No callback can step this agent again until the synchronous command boundary
    // reports acceptance. No worker-issued command is optimistically marked sent.
    const next = this.apply({ type: 'ground', sourceId: plan.sourceId, targetId: plan.targetId, kind: 'expand', score: 0 });
    if (next === state) return fail('rejected');
    plan.issuedIds = next.transfers.filter(t => t.id >= state.nextTransferId && t.owner === this.factionId
      && t.sourceId === plan.sourceId && t.targetId === plan.targetId).map(t => t.id);
    if (!plan.issuedIds.length) return fail('rejected');
    plan.deadlineMs = state.elapsedMs + plan.maxDurationMs;
    this.event('ExecutePlan', 'dispatched', plan);
    return State.RUNNING;
  }
  ReleasePlan(result: ExitResult, slot: string) {
    const plan = this.memory.get(slot);
    if (!isPlan(plan)) return;
    this.memory.delete(slot);
    this.event('ReleasePlan', result.aborted ? 'aborted' : result.succeeded ? 'completed' : 'failed', plan);
  }
  clear() { this.memory.clear(); }
}
