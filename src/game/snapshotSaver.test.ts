import { describe, expect, it, vi } from 'vitest';
import { createSnapshotSaver } from './snapshotSaver';
import { createSimulation } from './state';
import { TERRITORIES } from '../board/map';

function harness() {
  let time = 0;
  const write = vi.fn();
  const save = createSnapshotSaver(write, () => time);
  const state = createSimulation(TERRITORIES);
  return { save, write, state, time: (next: number) => { time = next; } };
}

describe('snapshot save policy', () => {
  it('writes the initial state immediately and throttles ordinary frames to 500ms', () => {
    const h = harness();
    h.save(h.state, 'running');
    h.time(499); h.save(h.state, 'running');
    expect(h.write).toHaveBeenCalledTimes(1);
    h.time(500); h.save(h.state, 'running');
    expect(h.write).toHaveBeenCalledTimes(2);
  });

  it('forced flush writes the latest snapshot inside the throttle window', () => {
    const h = harness();
    h.save(h.state, 'running');
    const latest = { ...h.state, elapsedMs: 100 };
    h.time(100); h.save(latest, 'running');
    expect(h.write).toHaveBeenCalledTimes(1);
    h.save(latest, 'running', true);
    expect(h.write).toHaveBeenLastCalledWith(latest, 'running');
    h.time(599); h.save(latest, 'running');
    expect(h.write).toHaveBeenCalledTimes(2);
    h.time(600); h.save(latest, 'running');
    expect(h.write).toHaveBeenCalledTimes(3);
  });

  it('paused snapshots bypass the throttle and forced resume records running phase', () => {
    const h = harness();
    h.save(h.state, 'running');
    h.save(h.state, 'paused');
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

  it('never saves a ready session, including a forced request', () => {
    const h = harness();
    h.save(h.state, 'ready'); h.save(h.state, 'ready', true);
    expect(h.write).not.toHaveBeenCalled();
    h.save(h.state, 'running');
    expect(h.write).toHaveBeenCalledTimes(1);
  });
});
