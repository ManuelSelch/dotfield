import type { RegisterSWOptions } from 'vite-plugin-pwa/types';
import { describe, expect, it, vi } from 'vitest';

import { createAppUpdates } from './app-updates';

function fixture() {
  const events = new EventTarget();
  let online = true;
  const reload = vi.fn();
  const apply = vi.fn(async () => {});
  let callbacks!: RegisterSWOptions;
  const store = createAppUpdates({ events, isOnline: () => online, reload });
  store.start((options) => {
    callbacks = options;
    return apply;
  });
  const worker = Object.assign(new EventTarget(), { state: 'installing' });
  const registration = Object.assign(new EventTarget(), {
    installing: worker,
    waiting: worker,
    update: vi.fn(async () => registration),
  });
  return {
    store,
    callbacks,
    apply,
    reload,
    worker,
    registration,
    events,
    goOffline() {
      online = false;
      events.dispatchEvent(new Event('offline'));
    },
    goOnline() {
      online = true;
      events.dispatchEvent(new Event('online'));
    },
  };
}

describe('application updates', () => {
  it('downloads without applying or reloading, even if another tab activates an update', () => {
    const f = fixture();
    f.callbacks.onRegisteredSW?.('/sw.js', f.registration as unknown as ServiceWorkerRegistration);
    expect(f.store.getSnapshot().updating).toBe(true);
    f.callbacks.onNeedRefresh?.();
    expect(f.store.getSnapshot()).toMatchObject({ ready: true, updating: false });
    f.callbacks.onNeedReload?.();
    expect(f.apply).not.toHaveBeenCalled();
    expect(f.reload).not.toHaveBeenCalled();
  });

  it('applies only on explicit request, and reloads only after activation', async () => {
    const f = fixture();
    f.callbacks.onRegisteredSW?.('/sw.js', f.registration as unknown as ServiceWorkerRegistration);
    f.callbacks.onNeedRefresh?.();
    await f.store.applyUpdate();
    expect(f.apply).toHaveBeenCalledExactlyOnceWith(true);
    expect(f.reload).not.toHaveBeenCalled();
    f.callbacks.onNeedReload?.();
    expect(f.reload).toHaveBeenCalledOnce();
  });

  it('keeps a ready update offline and checks again on reconnection', async () => {
    const f = fixture();
    f.callbacks.onRegisteredSW?.('/sw.js', f.registration as unknown as ServiceWorkerRegistration);
    f.callbacks.onNeedRefresh?.();
    f.goOffline();
    expect(f.store.getSnapshot()).toMatchObject({ online: false, ready: true });
    f.goOnline();
    expect(f.registration.update).toHaveBeenCalledOnce();
    await Promise.resolve();
  });

  it('clears download status on failed installation and allows retry after application failure', async () => {
    const f = fixture();
    f.callbacks.onRegisteredSW?.('/sw.js', f.registration as unknown as ServiceWorkerRegistration);
    f.worker.state = 'redundant';
    f.worker.dispatchEvent(new Event('statechange'));
    expect(f.store.getSnapshot()).toMatchObject({ updating: false, error: true });
    f.callbacks.onNeedRefresh?.();
    f.apply.mockRejectedValueOnce(new Error('failed'));
    await f.store.applyUpdate();
    expect(f.store.getSnapshot()).toMatchObject({ ready: true, applying: false, error: true });
    f.callbacks.onNeedReload?.();
    expect(f.reload).not.toHaveBeenCalled();
  });

  it('reports connectivity persistently without a service worker and notifies subscribers', () => {
    const f = fixture();
    const listener = vi.fn();
    const unsubscribe = f.store.subscribe(listener);
    f.goOffline();
    expect(f.store.getSnapshot().online).toBe(false);
    expect(listener).toHaveBeenCalledOnce();
    unsubscribe();
    f.goOnline();
    expect(listener).toHaveBeenCalledOnce();
  });
});
