import { dotPosition } from './dots';
import { transferPosition } from './movement';
import { DOT_RADIUS, DOT_SPACING } from './settings';
import { sweptContact } from './sweep';
import { progressAt, trajectory, type Trajectory } from './trajectory';
import type { Transfer } from './types';

export interface DotContact { time: number; playerId: number; playerSlot: number; enemyId: number; enemySlot: number }

export function groupContacts(player: Transfer, enemy: Transfer, elapsedMs: number,
  playerMotion: Trajectory = trajectory(player, elapsedMs), enemyMotion: Trajectory = trajectory(enemy, elapsedMs)): DotContact[] {
  const contacts: DotContact[] = [];
  for (const pSegment of playerMotion.segments) for (const eSegment of enemyMotion.segments) {
    const start = Math.max(pSegment.start, eSegment.start);
    const end = Math.min(pSegment.end, eSegment.end);
    if (end < start) continue;
    const pFrom = progressAt(pSegment, start), pTo = progressAt(pSegment, end);
    const eFrom = progressAt(eSegment, start), eTo = progressAt(eSegment, end);
    // Cheap broad-phase rejection only. Destruction is always decided per dot.
    const bound = 2 * DOT_RADIUS + (player.formationSize + enemy.formationSize - 2) * DOT_SPACING / 2;
    if (sweptContact(transferPosition(player, pFrom), transferPosition(player, pTo),
      transferPosition(enemy, eFrom), transferPosition(enemy, eTo), bound) === null) continue;
    for (const playerSlot of player.dotSlots) for (const enemySlot of enemy.dotSlots) {
      const time = sweptContact(dotPosition(player, playerSlot, pFrom), dotPosition(player, playerSlot, pTo),
        dotPosition(enemy, enemySlot, eFrom), dotPosition(enemy, enemySlot, eTo), 2 * DOT_RADIUS);
      if (time !== null) contacts.push({ time: start + time * (end - start),
        playerId: player.id, playerSlot, enemyId: enemy.id, enemySlot });
    }
  }
  return contacts;
}
