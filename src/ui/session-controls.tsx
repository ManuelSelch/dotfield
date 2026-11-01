import { ActionIcon, Group } from '@mantine/core';
import {
  IconHome,
  IconListDetails,
  IconPlayerPause,
  IconPlayerPlay,
  IconRefresh,
} from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import type { SessionPhase } from '@/game/session';

interface Props {
  phase: SessionPhase;
  onHome?: () => void;
  onPause: () => void;
  onResume: () => void;
  onRestart: () => void;
  dashboardOpen?: boolean;
  onToggleDashboard?: () => void;
}

export function SessionControls({
  phase,
  onPause,
  onResume,
  dashboardOpen = false,
  onToggleDashboard,
}: Props) {
  const paused = phase === 'paused';
  const toggleLabel = paused ? 'Resume' : 'Pause';
  const [target, setTarget] = useState<HTMLElement | null>(null);
  useEffect(() => setTarget(document.getElementById('game-pause-slot')), []);
  if (!target || (!paused && phase !== 'running')) return null;
  return createPortal(
    <Group gap={1} wrap="nowrap" role="group" aria-label="Game controls">
      {onToggleDashboard && (
        <ActionIcon
          id="enemy-dashboard-toggle"
          className="game-action-button enemy-dashboard-toggle"
          variant="filled"
          color="#303030"
          radius="xl"
          size={32}
          aria-label={`${dashboardOpen ? 'Hide' : 'Show'} enemy dashboard`}
          aria-expanded={dashboardOpen}
          aria-controls={dashboardOpen ? 'enemy-dashboard' : undefined}
          title="Enemy dashboard"
          onClick={onToggleDashboard}
        >
          <IconListDetails size={17} aria-hidden="true" />
        </ActionIcon>
      )}
      <ActionIcon
        className="game-action-button game-action-button--primary"
        data-autofocus={paused || undefined}
        variant="filled"
        color="#303030"
        radius="xl"
        size={28}
        aria-label={toggleLabel}
        title={toggleLabel}
        onClick={paused ? onResume : onPause}
      >
        {paused ? (
          <IconPlayerPlay size={18} aria-hidden="true" />
        ) : (
          <IconPlayerPause size={18} aria-hidden="true" />
        )}
      </ActionIcon>
    </Group>,
    target,
  );
}

export function SessionNavigationControls({
  onRestart,
  onHome,
}: Pick<Props, 'onRestart' | 'onHome'>) {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  useEffect(() => setTarget(document.getElementById('game-controls-slot')), []);
  if (!target) return null;
  return createPortal(
    <Group
      className="items-center"
      gap={4}
      wrap="nowrap"
      role="group"
      aria-label="Navigation controls"
    >
      <ActionIcon
        className="game-action-button"
        variant="filled"
        color="#303030"
        radius="xl"
        size={28}
        aria-label="Restart"
        title="Restart"
        onClick={onRestart}
      >
        <IconRefresh size={18} aria-hidden="true" />
      </ActionIcon>
      {onHome && (
        <ActionIcon
          className="game-action-button"
          variant="filled"
          color="#303030"
          radius="xl"
          size={28}
          aria-label="Home"
          title="Home"
          onClick={onHome}
        >
          <IconHome size={18} aria-hidden="true" />
        </ActionIcon>
      )}
    </Group>,
    target,
  );
}
