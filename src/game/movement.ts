import type { Transfer } from './types';

export function traveledTime(transfer: Transfer): number {
  return transfer.traveledMs ?? Math.max(0, transfer.elapsedMs);
}

// An explicit argument is distance in base-speed milliseconds, not flight age.
export function transferPosition(transfer: Transfer, traveledMs = traveledTime(transfer)) {
  const progress = Math.max(0, Math.min(1, traveledMs / transfer.durationMs));
  return {
    x: transfer.from.x + (transfer.to.x - transfer.from.x) * progress,
    y: transfer.from.y + (transfer.to.y - transfer.from.y) * progress,
  };
}
