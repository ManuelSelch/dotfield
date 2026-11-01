import type { RegisterSWOptions } from 'vite-plugin-pwa/types';

type Register = (options: RegisterSWOptions) => (reloadPage?: boolean) => Promise<void>;
interface UpdateState {
  online: boolean;
  updating: boolean;
  ready: boolean;
  applying: boolean;
  error: boolean;
}
interface Environment {
  events: EventTarget;
  isOnline: () => boolean;
  reload: () => void;
}

export function createAppUpdates(environment: Environment) {
  let state: UpdateState = {
    online: environment.isOnline(),
    updating: false,
    ready: false,
    applying: false,
    error: false,
  };
  const listeners = new Set<() => void>();
  const publish = (changes: Partial<UpdateState>) => {
    state = { ...state, ...changes };
    listeners.forEach((listener) => listener());
  };
  let registration: ServiceWorkerRegistration | undefined;
  let apply: ReturnType<Register> | undefined;
  let started = false;
  const check = () => {
    if (environment.isOnline())
      void registration?.update().catch(() => publish({ updating: false, error: true }));
  };
  const watchInstallation = () => {
    const worker = registration?.installing;
    if (!worker) return;
    publish({ updating: true, error: false });
    const changed = () => {
      if (
        worker.state === 'installed' ||
        worker.state === 'activated' ||
        worker.state === 'redundant'
      ) {
        publish({ updating: false, error: worker.state === 'redundant' });
        worker.removeEventListener('statechange', changed);
      }
    };
    worker.addEventListener('statechange', changed);
    changed();
  };
  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    start(register?: Register) {
      if (started) return;
      started = true;
      environment.events.addEventListener('online', () => {
        publish({ online: true });
        check();
      });
      environment.events.addEventListener('offline', () => publish({ online: false }));
      environment.events.addEventListener('focus', check);
      apply = register?.({
        immediate: true,
        onRegisteredSW(_url, value) {
          registration = value;
          registration?.addEventListener('updatefound', watchInstallation);
          watchInstallation();
        },
        onNeedRefresh: () => publish({ ready: true, updating: false, error: false }),
        onOfflineReady: () => publish({ updating: false, error: false }),
        onRegisterError: () => publish({ updating: false, error: true }),
        // Another tab may activate a worker. Never let that interrupt this game.
        onNeedReload: () => {
          if (state.applying) environment.reload();
          else publish({ ready: true, updating: false });
        },
      });
    },
    async applyUpdate() {
      if (!state.ready || state.applying || !apply) return;
      publish({ applying: true, error: false });
      try {
        // An update activated by another tab only needs an explicit page reload.
        if (registration && !registration.waiting) environment.reload();
        else await apply(true);
      } catch {
        publish({ applying: false, error: true });
      }
    },
  };
}

export type AppUpdates = ReturnType<typeof createAppUpdates>;
