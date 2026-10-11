import { ActionIcon, Group } from '@mantine/core';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { SessionPhase } from '../game/session';

interface Props {
  phase: SessionPhase; onHome?: () => void;
  onPause: () => void; onResume: () => void; onRestart: () => void;
}

function PlayIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
    <path d="M8 5v14l11-7z" />
  </svg>;
}
function RestartIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d="M20 11a8 8 0 0 0-14.9-3L3 11m0-6v6h6M4 13a8 8 0 0 0 14.9 3L21 13m0 6v-6h-6" />
  </svg>;
}
function HomeIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-6v-7h-4v7H4a1 1 0 0 1-1-1z" />
  </svg>;
}

export function SessionControls({ phase, onPause, onResume, onRestart, onHome }: Props) {
  const paused = phase === 'paused';
  if (!paused && phase !== 'running') return null;
  const toggleLabel = paused ? 'Resume' : 'Pause';
  const [target, setTarget] = useState<HTMLElement | null>(null);
  useEffect(() => setTarget(document.getElementById('game-controls-slot')), []);
  if (!target) return null;
  return createPortal(<Group className="rounded-full border border-ink/15 bg-field/80 p-1.5 shadow-sm" gap={1} wrap="nowrap" role="group" aria-label="Game controls">
    <ActionIcon className="game-action-button" data-autofocus={paused || undefined} variant="filled" color="#303030" radius="xl" size={28} aria-label={toggleLabel} title={toggleLabel} onClick={paused ? onResume : onPause}>
      {paused ? <PlayIcon /> : <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>}
    </ActionIcon>
    <ActionIcon className="game-action-button" variant="filled" color="#303030" radius="xl" size={28} aria-label="Restart" title="Restart" onClick={onRestart}>
      <RestartIcon />
    </ActionIcon>
    {onHome && <ActionIcon className="game-action-button" variant="filled" color="#303030" radius="xl" size={28} aria-label="Home" title="Home" onClick={onHome}>
      <HomeIcon />
    </ActionIcon>}
  </Group>, target);
}
