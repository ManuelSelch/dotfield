import { groupContacts } from './contacts';
import type { SimulationState } from './types';

export function hasOpposingTransfers(state: SimulationState): boolean {
  return new Set(state.transfers.map(t => t.owner)).size > 1;
}

export function resolveTravelCollisions(state: SimulationState, elapsedMs: number): SimulationState {
  if (state.roundStatus !== 'playing' || elapsedMs === 0 || !hasOpposingTransfers(state)) return state;
  const groups = new Map<string, typeof state.transfers>();
  for (const transfer of state.transfers) groups.set(transfer.owner, [...(groups.get(transfer.owner) ?? []), transfer]);
  const factionIds = [...groups.keys()].sort();
  const contacts = [] as ReturnType<typeof groupContacts>;
  for (let i = 0; i < factionIds.length; i++) for (let j = i + 1; j < factionIds.length; j++) {
    for (const first of groups.get(factionIds[i])!) for (const second of groups.get(factionIds[j])!) {
      contacts.push(...groupContacts(first, second, elapsedMs));
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
