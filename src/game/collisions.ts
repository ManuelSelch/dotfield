import { groupContacts } from './contacts';
import type { SimulationState } from './types';

export function hasOpposingTransfers(state: SimulationState): boolean {
  return state.transfers.some(t => t.owner === 'player') && state.transfers.some(t => t.owner === 'enemy');
}

export function resolveTravelCollisions(state: SimulationState, elapsedMs: number): SimulationState {
  if (state.roundStatus !== 'playing' || elapsedMs === 0 || !hasOpposingTransfers(state)) return state;
  const players = state.transfers.filter(t => t.owner === 'player');
  const enemies = state.transfers.filter(t => t.owner === 'enemy');
  const contacts = players.flatMap(player => enemies.flatMap(enemy => groupContacts(player, enemy, elapsedMs)));
  contacts.sort((a, b) => a.time - b.time || a.playerId - b.playerId || a.playerSlot - b.playerSlot
    || a.enemyId - b.enemyId || a.enemySlot - b.enemySlot);
  const destroyed = new Map<number, Set<number>>();
  for (const contact of contacts) {
    if (destroyed.get(contact.playerId)?.has(contact.playerSlot) || destroyed.get(contact.enemyId)?.has(contact.enemySlot)) continue;
    for (const [id, slot] of [[contact.playerId, contact.playerSlot], [contact.enemyId, contact.enemySlot]]) {
      const slots = destroyed.get(id) ?? new Set<number>();
      slots.add(slot);
      destroyed.set(id, slots);
    }
  }
  if (destroyed.size === 0) return state;
  const transfers = state.transfers.flatMap(batch => {
    const removed = destroyed.get(batch.id);
    if (!removed) return [batch];
    const dotSlots = batch.dotSlots.filter(slot => !removed.has(slot));
    return dotSlots.length === 0 ? [] : [{ ...batch, units: dotSlots.length, dotSlots }];
  });
  return { ...state, transfers };
}
