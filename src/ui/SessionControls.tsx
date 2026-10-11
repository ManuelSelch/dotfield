import { ActionIcon, Group } from '@mantine/core';
import type { SessionPhase } from '../game/session';

interface Props {
  phase: SessionPhase; onHome?: () => void;
  onResume: () => void; onRestart: () => void;
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

export function PauseButton({ onPause }: { onPause: () => void }) {
  return <ActionIcon variant="filled" color="#267c72" radius="xl" size={36} aria-label="Pause" title="Pause" onClick={onPause}>
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  </ActionIcon>;
}

export function SessionControls({ phase, onResume, onRestart, onHome }: Props) {
  if (phase !== 'paused') return null;
  return <Group className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full border border-white/20 bg-field/85 p-2 shadow-lg backdrop-blur-sm" gap="sm" role="group" aria-label="Paused game controls">
    <ActionIcon data-autofocus variant="filled" color="#267c72" radius="xl" size={42} aria-label="Resume" title="Resume" onClick={onResume}>
      <PlayIcon />
    </ActionIcon>
    <ActionIcon variant="filled" color="gray" radius="xl" size={42} aria-label="Restart" title="Restart" onClick={onRestart}>
      <RestartIcon />
    </ActionIcon>
    {onHome && <ActionIcon variant="filled" color="gray" radius="xl" size={42} aria-label="Home" title="Home" onClick={onHome}>
      <HomeIcon />
    </ActionIcon>}
  </Group>;
}
