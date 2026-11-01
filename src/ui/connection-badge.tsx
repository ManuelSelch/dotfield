import { useSyncExternalStore } from 'react';

import type { AppUpdates } from '@/pwa/app-updates';

export function ConnectionBadge({
  updates,
  playing,
  editing = false,
}: {
  updates: AppUpdates;
  playing: boolean;
  editing?: boolean;
}) {
  const busy = playing || editing;
  const state = useSyncExternalStore(updates.subscribe, updates.getSnapshot);
  const kind = !state.online
    ? 'offline'
    : state.applying || state.updating
      ? 'updating'
      : state.ready
        ? 'ready'
        : state.error
          ? 'error'
          : 'online';
  const label = {
    offline: 'Offline',
    updating: 'Updating',
    ready: 'Update ready',
    error: 'Update failed',
    online: 'Online',
  }[kind];
  const hint = state.ready
    ? busy
      ? editing
        ? 'Update ready. Return Home after saving or discarding your draft to apply it.'
        : 'Update ready. Return Home to apply it without interrupting your round.'
      : 'Update ready. Update now reloads the app.'
    : kind === 'offline'
      ? 'Offline. Gameplay and round saves stay on this device.'
      : kind === 'error'
        ? 'Could not update the app. Gameplay is unaffected; retry on reconnection or when returning to the app.'
        : kind === 'updating'
          ? 'Updating app files. Your game will not reload automatically.'
          : 'Network connection available. Game progress stays on this device.';
  return (
    <div className={`connection-badge connection-badge--${kind}`}>
      <span role="status" aria-live="polite" title={hint}>
        <span className="connection-badge__dot" aria-hidden="true" />
        {state.ready && !busy && !state.applying ? <span className="sr-only">{label}</span> : label}
      </span>
      {state.ready && !busy && !state.applying && (
        <button
          className="connection-badge__action"
          type="button"
          aria-label="Update now"
          onClick={() => void updates.applyUpdate()}
          title="Apply downloaded update and reload the app"
        >
          Update
        </button>
      )}
    </div>
  );
}
