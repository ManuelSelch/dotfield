import { ActionIcon, Button, FocusTrap, Paper, Text, Title } from '@mantine/core';
import type { SessionPhase } from '../game/session';

interface Props {
  phase: SessionPhase; onHome?: () => void; onNewMap?: () => void;
  onResume: () => void; onRestart: () => void;
}
export function PauseButton({ onPause }: { onPause: () => void }) {
  return <ActionIcon variant="filled" color="#267c72" radius="xl" size={36} aria-label="Pause" title="Pause" onClick={onPause}>
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  </ActionIcon>;
}

export function SessionControls({ phase, onResume, onRestart, onHome, onNewMap }: Props) {
  return <>
    {phase === 'paused' && <FocusTrap>
      <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[20px] bg-field/85 p-4" role="region" aria-labelledby="session-title">
        <Paper radius="lg" p="lg" withBorder className="w-full max-w-[260px] text-center">
          <Title id="session-title" order={2}>Paused</Title>
          <Text size="sm" c="dimmed" mt="xs">Your field will wait.</Text>
          <Button data-autofocus fullWidth mt="lg" radius="xl" mih={44} onClick={onResume}>Resume</Button>
          <Button fullWidth variant="subtle" radius="xl" mt="xs" mih={44} onClick={onRestart}>Restart</Button>
          {onNewMap && <Button fullWidth variant="subtle" radius="xl" mt="xs" mih={44} onClick={onNewMap}>New map</Button>}
          {onHome && <Button fullWidth variant="subtle" radius="xl" mt="xs" mih={44} onClick={onHome}>Home</Button>}
        </Paper>
      </div>
    </FocusTrap>}
  </>;
}
