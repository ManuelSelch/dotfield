import type { SessionPhase } from './session';
import type { SimulationState } from './types';

/** Frames are throttled; lifecycle boundaries always write the supplied current state. */
export function createSnapshotSaver(
  write: (state: SimulationState, phase: Exclude<SessionPhase, 'ready'>) => void,
  now: () => number = () => performance.now(),
) {
  let lastSavedAt = -Infinity;
  return (state: SimulationState, phase: SessionPhase, force = false) => {
    if (phase === 'ready') return;
    const timestamp = now();
    if (!force && phase === 'running' && timestamp - lastSavedAt < 500) return;
    lastSavedAt = timestamp;
    write(state, phase);
  };
}
