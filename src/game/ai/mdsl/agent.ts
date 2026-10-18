import { State } from 'mistreevous';
import { dispatchUnits } from '../../dispatch';
import { availableUnits } from '../../launch';
import { canGroundOrder } from '../../groundAccess';
import { SIMULATION_STEP_MS } from '../../settings';
import type { SimulationState, TerritoryState } from '../../types';
import type { AiAction } from '../actions';
import { forecastBattle } from '../forecast';
import type { ExecutionBudget } from '../program/budget';

export interface MdslEvent {
  readonly factionId: string;
  readonly elapsedMs: number;
  readonly method: string;
  readonly outcome: string;
  readonly targetId?: string;
  readonly sourceId?: string;
  readonly sourceIds?: readonly string[];
  readonly query?: string;
  readonly planSlot?: string;
}
export type ApplyBotAction = (action: AiAction) => SimulationState;
export type BotObserver = (event: MdslEvent) => void;
interface Sources { readonly targetId: string; readonly ids: readonly string[]; cursor: number }
interface CitySet { readonly ids: string[] }
interface CapturePlan {
  readonly sourceId: string;
  readonly targetId: string;
  readonly maxDurationMs: number;
  readonly sourceIds: readonly string[];
  readonly orders: { sourceId: string; issuedIds?: readonly number[] }[];
  lastIssuedAtMs?: number;
  deadlineMs?: number;
}
type Slot = string | Sources | CitySet | CapturePlan;
interface ExitResult { readonly succeeded: boolean; readonly aborted: boolean }
const distance = (a: TerritoryState, b: TerritoryState) => Math.hypot(a.x - b.x, a.y - b.y);
const isPlan = (value: Slot | undefined): value is CapturePlan => typeof value === 'object' && 'sourceId' in value;

/** Trusted prototype capabilities; source-combination policy lives in the tree. */
export class CaptureAgent {
  private readonly memory = new Map<string, Slot>();
  constructor(private readonly factionId: string, private readonly read: () => SimulationState,
    private readonly apply: ApplyBotAction, private readonly observe: BotObserver = () => {},
    private readonly decisionIntervalMs = 1000, private readonly budget?: ExecutionBudget) {
    if (!Number.isFinite(decisionIntervalMs) || decisionIntervalMs <= 0) throw new RangeError('Decision interval must be positive.');
  }

  private event(method: string, outcome: string, details: Partial<Omit<MdslEvent, 'factionId' | 'elapsedMs' | 'method' | 'outcome'>> = {}) {
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
    if (!['neutral', 'enemy'].includes(query) || ranking !== 'nearest-reachable') throw new Error('Unsupported prototype city query/ranking.');
    const state = this.read(), sources = this.sources(state, 1);
    const candidates = state.territories.filter(c => (query === 'neutral' ? c.owner === 'neutral'
      : c.owner !== 'neutral' && c.owner !== this.factionId)
      && !state.transfers.some(t => t.owner === this.factionId && t.targetId === c.id))
      .map(city => ({ city, distance: Math.min(...sources.filter(s => canGroundOrder(state, s, city, this.factionId))
        .map(s => distance(s, city))) }))
      .filter(candidate => Number.isFinite(candidate.distance))
      .sort((a, b) => a.distance - b.distance || a.city.id.localeCompare(b.city.id));
    const target = candidates[0]?.city;
    if (target) this.memory.set(output, target.id);
    this.event('SelectCity', target ? 'selected' : 'no-target', { targetId: target?.id, query });
    return target ? State.SUCCEEDED : State.FAILED;
  }
  SelectSources(targetSlot: string, minimumArmy: number, output: string) {
    this.memory.delete(output);
    if (!Number.isFinite(minimumArmy) || minimumArmy < 1) throw new RangeError('Minimum army must be positive.');
    const target = this.target(targetSlot), state = this.read();
    const sources = target ? this.sources(state, minimumArmy)
      .filter(s => canGroundOrder(state, s, target, this.factionId))
      .sort((a, b) => distance(a, target) - distance(b, target) || a.id.localeCompare(b.id)) : [];
    if (target && sources.length) this.memory.set(output, { targetId: target.id, ids: sources.map(c => c.id), cursor: 0 });
    this.event('SelectSources', sources.length ? 'selected' : 'no-sources', { targetId: target?.id });
    return sources.length ? State.SUCCEEDED : State.FAILED;
  }
  NextCity(listSlot: string, output: string) {
    if (listSlot === output) throw new Error('Iterator output must differ from its list.');
    this.memory.delete(output);
    const list = this.memory.get(listSlot);
    const id = typeof list === 'object' && 'cursor' in list ? list.ids[list.cursor++] : undefined;
    if (id) this.memory.set(output, id);
    this.event('NextCity', id ? 'selected' : 'exhausted', { sourceId: id });
    return id ? State.SUCCEEDED : State.FAILED;
  }
  ClearSet(output: string) {
    this.memory.set(output, { ids: [] });
    return State.SUCCEEDED;
  }
  AddToSet(setSlot: string, citySlot: string) {
    const set = this.memory.get(setSlot), id = this.memory.get(citySlot);
    if (typeof set !== 'object' || !('ids' in set) || 'cursor' in set || typeof id !== 'string') return State.FAILED;
    if (!set.ids.includes(id)) {
      this.budget?.chosen(set.ids.length + 1);
      set.ids.push(id);
    }
    return State.SUCCEEDED;
  }
  private get cadenceMs() { return Math.ceil(this.decisionIntervalMs / SIMULATION_STEP_MS) * SIMULATION_STEP_MS; }
  /** Replay exactly the supplied sources, at host cadence, against known orders. */
  private feasible(plan: CapturePlan): boolean {
    this.budget?.forecast();
    const state = this.read(), deadline = plan.deadlineMs ?? state.elapsedMs + plan.maxDurationMs;
    if (state.roundStatus !== 'playing' || state.elapsedMs >= deadline) return false;
    const target = state.territories.find(c => c.id === plan.targetId);
    if (!target || target.owner === this.factionId) return false;
    if (plan.orders.some(order => !state.territories.some(c => c.id === order.sourceId && c.owner === this.factionId)
      || (!order.issuedIds && !this.sources(state, 1).some(c => c.id === order.sourceId
        && canGroundOrder(state, c, target, this.factionId))))) return false;
    let proposed = state;
    let due = Math.max(state.elapsedMs, (plan.lastIssuedAtMs ?? state.elapsedMs - this.cadenceMs) + this.cadenceMs);
    for (const order of plan.orders.filter(o => !o.issuedIds)) {
      if (due >= deadline) break;
      proposed = forecastBattle(proposed, due - proposed.elapsedMs, this.budget?.worldStep);
      if (proposed.territories.find(c => c.id === plan.targetId)?.owner === this.factionId) break;
      if (proposed.roundStatus !== 'playing') return false;
      this.budget?.dispatch(proposed, order.sourceId);
      const next = dispatchUnits(proposed, order.sourceId, plan.targetId, this.factionId);
      if (next === proposed) return false;
      proposed = next;
      due += this.cadenceMs;
    }
    const result = forecastBattle(proposed, Math.max(0, deadline - proposed.elapsedMs), this.budget?.worldStep);
    return result.territories.find(c => c.id === plan.targetId)?.owner === this.factionId
      && plan.orders.every(o => result.territories.find(c => c.id === o.sourceId)?.owner === this.factionId)
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
    if (target && typeof sources === 'object' && 'ids' in sources && sources.ids.length
      && (!('targetId' in sources) || sources.targetId === target.id)) {
      this.budget?.chosen(sources.ids.length);
      const sourceIds = [...sources.ids];
      const plan: CapturePlan = { sourceId: sourceIds[0], sourceIds, targetId: target.id, maxDurationMs,
        orders: sourceIds.map(sourceId => ({ sourceId })) };
      if (this.feasible(plan)) {
        this.memory.set(output, plan);
        this.event('PlanCapture', 'planned', { ...plan, planSlot: output });
        return State.SUCCEEDED;
      }
    }
    this.event('PlanCapture', 'infeasible', { targetId: target?.id, planSlot: output,
      sourceIds: typeof sources === 'object' && 'ids' in sources ? [...sources.ids] : [] });
    return State.FAILED;
  }
  ExecutePlan(slot: string) {
    const plan = this.memory.get(slot);
    if (!isPlan(plan)) return State.FAILED;
    const state = this.read();
    const fail = (reason: string) => {
      this.memory.delete(slot); this.event('ExecutePlan', reason, plan); return State.FAILED;
    };
    if (state.territories.find(c => c.id === plan.targetId)?.owner === this.factionId) {
      this.event('ExecutePlan', 'captured', { ...plan, planSlot: slot }); return State.SUCCEEDED;
    }
    if (state.roundStatus !== 'playing') return fail('round-ended');
    if (plan.orders.some(o => !state.territories.some(c => c.id === o.sourceId && c.owner === this.factionId))) return fail('source-lost');
    if (plan.deadlineMs !== undefined && state.elapsedMs >= plan.deadlineMs) return fail('timeout');
    const order = plan.orders.find(o => !o.issuedIds);
    if (!order) {
      if (!state.transfers.some(t => plan.orders.some(o => o.issuedIds?.includes(t.id)))) return fail('orders-exhausted');
      return State.RUNNING;
    }
    if (plan.lastIssuedAtMs !== undefined && state.elapsedMs < plan.lastIssuedAtMs + this.cadenceMs) return State.RUNNING;
    if (!this.feasible(plan)) return fail('invalidated');
    // No callback can step this agent again until the synchronous command boundary
    // reports acceptance. No worker-issued command is optimistically marked sent.
    const kind = state.territories.find(c => c.id === plan.targetId)!.owner === 'neutral' ? 'expand' : 'attack';
    this.budget?.dispatch(state, order.sourceId, true);
    const next = this.apply({ type: 'ground', sourceId: order.sourceId, targetId: plan.targetId, kind, score: 0 });
    if (next === state) return fail('rejected');
    order.issuedIds = next.transfers.filter(t => t.id >= state.nextTransferId && t.owner === this.factionId
      && t.sourceId === order.sourceId && t.targetId === plan.targetId).map(t => t.id);
    if (!order.issuedIds.length) return fail('rejected');
    plan.deadlineMs ??= state.elapsedMs + plan.maxDurationMs;
    plan.lastIssuedAtMs = state.elapsedMs;
    this.event('ExecutePlan', 'dispatched', { targetId: plan.targetId, sourceId: order.sourceId, planSlot: slot });
    return State.RUNNING;
  }
  ReleasePlan(result: ExitResult, slot: string) {
    const plan = this.memory.get(slot);
    if (!isPlan(plan)) return;
    this.memory.delete(slot);
    this.event('ReleasePlan', result.aborted ? 'aborted' : result.succeeded ? 'completed' : 'failed', { ...plan, planSlot: slot });
  }
  clear(abortPlans = false) {
    let error: unknown;
    try {
      for (const [slot, value] of this.memory) if (abortPlans && isPlan(value)) {
        try { this.ReleasePlan({ succeeded: false, aborted: true }, slot); } catch (cause) { error ??= cause; }
      }
    } finally { this.memory.clear(); }
    if (error) throw error;
  }
}
