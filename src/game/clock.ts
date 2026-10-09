import { SIMULATION_STEP_MS } from './settings';

export function createClock(stepMs = SIMULATION_STEP_MS) {
  if (!Number.isFinite(stepMs) || stepMs <= 0) {
    throw new RangeError('Clock step must be finite and positive.');
  }
  let previous: number | null = null;
  let pendingMs = 0;

  return {
    advance(timestampMs: number): number {
      if (!Number.isFinite(timestampMs) || timestampMs < 0) {
        throw new RangeError('Timestamp must be finite and non-negative.');
      }
      const delta = previous === null ? 0 : Math.max(0, timestampMs - previous);
      previous = timestampMs;
      pendingMs += delta;
      const elapsedMs = Math.floor((pendingMs + 1e-7) / stepMs) * stepMs;
      pendingMs = Math.max(0, pendingMs - elapsedMs);
      return elapsedMs;
    },
    // Keep partial active time, but never include the hidden/background interval.
    reset() { previous = null; },
  };
}
