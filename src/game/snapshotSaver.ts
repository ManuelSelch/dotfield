import type { SessionPhase } from './session';
import type { SimulationState } from './types';

/** Save only explicit events; there are no periodic writes or pending timers. */
export function createSnapshotSaver(
  write: (state: SimulationState, phase: Exclude<SessionPhase, 'ready'>) => void,
) {
  return (state: SimulationState, phase: SessionPhase, force = false) => {
    if (!force || phase === 'ready') return;
    write(state, phase);
  };
}
