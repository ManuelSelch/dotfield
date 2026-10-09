import { dotPosition } from './dots';
import { transferPosition } from './movement';
import { DOT_RADIUS, DOT_SPACING } from './settings';
import { sweptContact } from './sweep';
import type { Transfer } from './types';

export interface DotContact { time: number; firstId: number; firstSlot: number; secondId: number; secondSlot: number }

export function groupContacts(first: Transfer, second: Transfer, elapsedMs: number): DotContact[] {
  const start = Math.max(0, -first.elapsedMs, -second.elapsedMs);
  const end = Math.min(elapsedMs, first.durationMs - first.elapsedMs, second.durationMs - second.elapsedMs);
  if (end < start || first.elapsedMs >= first.durationMs || second.elapsedMs >= second.durationMs) return [];
  const bound = 2 * DOT_RADIUS + (first.formationSize + second.formationSize - 2) * DOT_SPACING / 2;
  if (sweptContact(transferPosition(first, first.elapsedMs + start), transferPosition(first, first.elapsedMs + end),
    transferPosition(second, second.elapsedMs + start), transferPosition(second, second.elapsedMs + end), bound) === null) return [];
  const motion = (batch: Transfer) => batch.dotSlots.map(slot => ({ slot,
    from: dotPosition(batch, slot, batch.elapsedMs + start), to: dotPosition(batch, slot, batch.elapsedMs + end),
  }));
  const firstDots = motion(first), secondDots = motion(second), contacts: DotContact[] = [];
  for (const a of firstDots) for (const b of secondDots) {
    const time = sweptContact(a.from, a.to, b.from, b.to, 2 * DOT_RADIUS);
    if (time !== null) contacts.push({ time: start + time * (end - start), firstId: first.id,
      firstSlot: a.slot, secondId: second.id, secondSlot: b.slot });
  }
  return contacts;
}
