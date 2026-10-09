import type { Transfer } from './types';

export function transferPosition(transfer: Transfer, elapsedMs = transfer.elapsedMs) {
  const progress = Math.max(0, Math.min(1, elapsedMs / transfer.durationMs));
  return {
    x: transfer.from.x + (transfer.to.x - transfer.from.x) * progress,
    y: transfer.from.y + (transfer.to.y - transfer.from.y) * progress,
  };
}
