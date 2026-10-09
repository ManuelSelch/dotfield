import { dotPosition } from './dots';
import { transferPosition } from './movement';
import { DOT_RADIUS, DOT_SPACING } from './settings';
import { sweptContact } from './sweep';
import type { Transfer } from './types';

export interface DotContact { time: number; playerId: number; playerSlot: number; enemyId: number; enemySlot: number }

export function groupContacts(player: Transfer, enemy: Transfer, elapsedMs: number): DotContact[] {
  const start = Math.max(0, -player.elapsedMs, -enemy.elapsedMs);
  const end = Math.min(elapsedMs, player.durationMs - player.elapsedMs, enemy.durationMs - enemy.elapsedMs);
  if (end <= start) return [];
  // Cheap broad-phase rejection only. Destruction is always decided per dot below.
  const bound = 2 * DOT_RADIUS + (player.formationSize + enemy.formationSize - 2) * DOT_SPACING / 2;
  if (sweptContact(transferPosition(player, player.elapsedMs + start), transferPosition(player, player.elapsedMs + end),
    transferPosition(enemy, enemy.elapsedMs + start), transferPosition(enemy, enemy.elapsedMs + end), bound) === null) return [];
  const motion = (batch: Transfer) => batch.dotSlots.map(slot => ({ slot,
    from: dotPosition(batch, slot, batch.elapsedMs + start),
    to: dotPosition(batch, slot, batch.elapsedMs + end),
  }));
  const players = motion(player);
  const enemies = motion(enemy);
  const contacts: DotContact[] = [];
  for (const p of players) {
    for (const e of enemies) {
      const time = sweptContact(p.from, p.to, e.from, e.to, 2 * DOT_RADIUS);
      if (time !== null) contacts.push({ time: start + time * (end - start),
        playerId: player.id, playerSlot: p.slot, enemyId: enemy.id, enemySlot: e.slot });
    }
  }
  return contacts;
}
