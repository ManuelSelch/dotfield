import { describe, expect, it, vi } from 'vitest';
import { createSnapshotSaver } from './snapshotSaver';
import { createSimulation } from './state';
import { TERRITORIES } from '../board/map';

function harness() {
  const write = vi.fn();
  const save = createSnapshotSaver(write);
  const state = createSimulation(TERRITORIES);
  return { save, write, state };
}

describe('event-only snapshot save policy', () => {
  it('never writes ordinary snapshots even as simulation time advances', () => {
    const h = harness();
    for (const elapsedMs of [0, 500, 1000, 10000, 60000]) {
      h.save({ ...h.state, elapsedMs }, 'running');
    }
    expect(h.write).not.toHaveBeenCalled();
  });

  it('event flush writes the latest supplied snapshot immediately', () => {
    const h = harness();
    h.save(h.state, 'running', true);
    const latest = { ...h.state, elapsedMs: 100 };
    h.save(latest, 'running');
    expect(h.write).toHaveBeenCalledTimes(1);
    h.save(latest, 'running', true);
    expect(h.write).toHaveBeenLastCalledWith(latest, 'running');
    expect(h.write).toHaveBeenCalledTimes(2);
  });

  it('explicit pause and resume events save their phase', () => {
    const h = harness();
    h.save(h.state, 'paused', true);
    expect(h.write).toHaveBeenLastCalledWith(h.state, 'paused');
    h.save(h.state, 'running', true);
    expect(h.write).toHaveBeenLastCalledWith(h.state, 'running');
  });

  it('repeated lifecycle flushes remain safe without advancing the simulation', () => {
    const h = harness();
    h.save(h.state, 'running', true);
    h.save(h.state, 'running', true);
    expect(h.write.mock.calls).toEqual([[h.state, 'running'], [h.state, 'running']]);
    expect(h.state.elapsedMs).toBe(0);
  });

  it('never saves a ready session, including an event request', () => {
    const h = harness();
    h.save(h.state, 'ready'); h.save(h.state, 'ready', true);
    expect(h.write).not.toHaveBeenCalled();
    h.save(h.state, 'running', true);
    expect(h.write).toHaveBeenCalledTimes(1);
  });
});
