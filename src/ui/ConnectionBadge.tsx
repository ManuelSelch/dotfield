import { useSyncExternalStore } from 'react';
import type { AppUpdates } from '../pwa/appUpdates';

export function ConnectionBadge({ updates, playing }: { updates: AppUpdates; playing: boolean }) {
  const state = useSyncExternalStore(updates.subscribe, updates.getSnapshot);
  const kind = !state.online ? 'offline' : state.applying || state.updating ? 'updating' : state.ready ? 'ready' : state.error ? 'error' : 'online';
  const label = { offline: 'Offline', updating: 'Updating', ready: 'Update ready', error: 'Update failed', online: 'Online' }[kind];
  const hint = state.ready
    ? playing ? 'Update ready. Return Home to apply it without interrupting your round.' : 'Update ready. Update now reloads the app.'
    : kind === 'offline' ? 'Offline. Gameplay and round saves stay on this device.'
    : kind === 'error' ? 'Could not update the app. Gameplay is unaffected; retry on reconnection or when returning to the app.'
    : kind === 'updating' ? 'Updating app files. Your game will not reload automatically.'
    : 'Network connection available. Game progress stays on this device.';
  return (
    <div className={`connection-badge connection-badge--${kind}`}>
      <span role="status" aria-live="polite" title={hint}>
        <span className="connection-badge__dot" aria-hidden="true" />
        {state.ready && !playing && !state.applying ? <span className="sr-only">{label}</span> : label}
      </span>
      {state.ready && !playing && !state.applying && (
        <button className="connection-badge__action" type="button" aria-label="Update now" onClick={() => void updates.applyUpdate()} title="Apply downloaded update and reload the app">Update</button>
      )}
    </div>
  );
}
