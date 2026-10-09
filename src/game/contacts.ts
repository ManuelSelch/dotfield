import { dotPosition } from './dots';
import { transferPosition } from './movement';
import { DOT_RADIUS, DOT_SPACING } from './settings';
import { sweptContact } from './sweep';
import { progressAt, trajectory, type Trajectory } from './trajectory';
import type { Transfer } from './types';

export interface DotContact { time: number; firstId: number; firstSlot: number; secondId: number; secondSlot: number }

export function groupContacts(first: Transfer, second: Transfer, elapsedMs: number,
  firstMotion: Trajectory = trajectory(first, elapsedMs), secondMotion: Trajectory = trajectory(second, elapsedMs)): DotContact[] {
  const contacts: DotContact[] = [];
  for (const firstSegment of firstMotion.segments) for (const secondSegment of secondMotion.segments) {
    const start = Math.max(firstSegment.start, secondSegment.start);
    const end = Math.min(firstSegment.end, secondSegment.end);
    if (end < start) continue;
    const firstFrom = progressAt(firstSegment, start), firstTo = progressAt(firstSegment, end);
    const secondFrom = progressAt(secondSegment, start), secondTo = progressAt(secondSegment, end);
    const bound = 2 * DOT_RADIUS + (first.formationSize + second.formationSize - 2) * DOT_SPACING / 2;
    if (sweptContact(transferPosition(first, firstFrom), transferPosition(first, firstTo),
      transferPosition(second, secondFrom), transferPosition(second, secondTo), bound) === null) continue;
    for (const firstSlot of first.dotSlots) for (const secondSlot of second.dotSlots) {
      const time = sweptContact(dotPosition(first, firstSlot, firstFrom), dotPosition(first, firstSlot, firstTo),
        dotPosition(second, secondSlot, secondFrom), dotPosition(second, secondSlot, secondTo), 2 * DOT_RADIUS);
      if (time !== null) contacts.push({ time: start + time * (end - start),
        firstId: first.id, firstSlot, secondId: second.id, secondSlot });
    }
  }
  return contacts;
}
