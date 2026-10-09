import { groupContacts } from './contacts';
import { DOT_RADIUS, DOT_SPACING } from './settings';
import { progressAt, trajectory, type Trajectory } from './trajectory';
import { transferPosition } from './movement';
import type { SimulationState, Transfer } from './types';

export function hasOpposingTransfers(state: SimulationState): boolean {
  return new Set(state.transfers.map(t => t.owner)).size > 1;
}

interface Bounds { minX: number; minY: number; maxX: number; maxY: number }

function transferBounds(transfer: Transfer, motion: Trajectory): Bounds {
  const padding = DOT_RADIUS + Math.max(0, transfer.formationSize - 1) * DOT_SPACING / 2;
  const points = motion.segments.flatMap(segment => [
    transferPosition(transfer, progressAt(segment, segment.start)),
    transferPosition(transfer, progressAt(segment, segment.end)),
  ]);
  return {
    minX: Math.min(...points.map(point => point.x)) - padding,
    minY: Math.min(...points.map(point => point.y)) - padding,
    maxX: Math.max(...points.map(point => point.x)) + padding,
    maxY: Math.max(...points.map(point => point.y)) + padding,
  };
}

/** Conservative path broad-phase used to avoid dot-level work for distant groups. */
export function mayContact(first: Bounds, second: Bounds): boolean {
  return first.minX <= second.maxX && first.maxX >= second.minX
    && first.minY <= second.maxY && first.maxY >= second.minY;
}

export function resolveTravelCollisions(state: SimulationState, elapsedMs: number,
  motions?: ReadonlyMap<number, Trajectory>): SimulationState {
  if (state.roundStatus !== 'playing' || elapsedMs === 0 || !hasOpposingTransfers(state)) return state;
  const groups = new Map<string, typeof state.transfers>();
  for (const transfer of state.transfers) groups.set(transfer.owner, [...(groups.get(transfer.owner) ?? []), transfer]);
  const factionIds = [...groups.keys()].sort();
  const resolvedMotions = new Map(state.transfers.map(transfer => [
    transfer.id, motions?.get(transfer.id) ?? trajectory(transfer, elapsedMs),
  ]));
  const bounds = new Map(state.transfers.map(transfer => [
    transfer.id, transferBounds(transfer, resolvedMotions.get(transfer.id)!),
  ]));
  const contacts = [] as ReturnType<typeof groupContacts>;
  for (let i = 0; i < factionIds.length; i++) for (let j = i + 1; j < factionIds.length; j++) {
    for (const first of groups.get(factionIds[i])!) for (const second of groups.get(factionIds[j])!) {
      if (!mayContact(bounds.get(first.id)!, bounds.get(second.id)!)) continue;
      contacts.push(...groupContacts(first, second, elapsedMs, resolvedMotions.get(first.id), resolvedMotions.get(second.id)));
    }
  }
  contacts.sort((a, b) => a.time - b.time || a.firstId - b.firstId || a.firstSlot - b.firstSlot
    || a.secondId - b.secondId || a.secondSlot - b.secondSlot);
  const destroyed = new Map<number, Set<number>>();
  for (const contact of contacts) {
    if (destroyed.get(contact.firstId)?.has(contact.firstSlot) || destroyed.get(contact.secondId)?.has(contact.secondSlot)) continue;
    for (const [id, slot] of [[contact.firstId, contact.firstSlot], [contact.secondId, contact.secondSlot]]) {
      const slots = destroyed.get(id) ?? new Set<number>(); slots.add(slot); destroyed.set(id, slots);
    }
  }
  if (!destroyed.size) return state;
  const transfers = state.transfers.flatMap(batch => {
    const removed = destroyed.get(batch.id); if (!removed) return [batch];
    const dotSlots = batch.dotSlots.filter(slot => !removed.has(slot));
    return dotSlots.length ? [{ ...batch, units: dotSlots.length, dotSlots }] : [];
  });
  return { ...state, transfers };
}
