import { ActionIcon, Group } from '@mantine/core';
import { IconHome, IconPlayerPause, IconPlayerPlay, IconRefresh } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { SessionPhase } from '../game/session';

interface Props {
  phase: SessionPhase; onHome?: () => void;
  onPause: () => void; onResume: () => void; onRestart: () => void;
}

export function SessionControls({ phase, onPause, onResume, onRestart, onHome }: Props) {
  const paused = phase === 'paused';
  if (!paused && phase !== 'running') return null;
  const toggleLabel = paused ? 'Resume' : 'Pause';
  const [target, setTarget] = useState<HTMLElement | null>(null);
  useEffect(() => setTarget(document.getElementById('game-controls-slot')), []);
  if (!target) return null;
  return createPortal(<Group className="rounded-full border border-ink/15 bg-field/80 p-1.5 shadow-sm" gap={1} wrap="nowrap" role="group" aria-label="Game controls">
    <ActionIcon className="game-action-button game-action-button--primary" data-autofocus={paused || undefined} variant="filled" color="#303030" radius="xl" size={28} aria-label={toggleLabel} title={toggleLabel} onClick={paused ? onResume : onPause}>
      {paused ? <IconPlayerPlay size={18} aria-hidden="true" /> : <IconPlayerPause size={18} aria-hidden="true" />}
    </ActionIcon>
    <ActionIcon className="game-action-button" variant="filled" color="#303030" radius="xl" size={28} aria-label="Restart" title="Restart" onClick={onRestart}>
      <IconRefresh size={18} aria-hidden="true" />
    </ActionIcon>
    {onHome && <ActionIcon className="game-action-button" variant="filled" color="#303030" radius="xl" size={28} aria-label="Home" title="Home" onClick={onHome}>
      <IconHome size={18} aria-hidden="true" />
    </ActionIcon>}
  </Group>, target);
}
