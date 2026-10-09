import { ActionIcon, Button, FocusTrap, Paper, Text, Title } from '@mantine/core';
import type { SessionPhase } from '../game/session';

interface Props {
  phase: SessionPhase; onHome?: () => void;
  onPause: () => void; onResume: () => void; onRestart: () => void;
}
export function SessionControls({ phase, onPause, onResume, onRestart, onHome }: Props) {
  return <>
    {phase === 'running' && <div className="absolute top-2 right-2 z-10">
      <ActionIcon variant="light" radius="xl" size={44} aria-label="Pause" title="Pause" onClick={onPause}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
          <rect x="6" y="4" width="4" height="16" rx="1" />
          <rect x="14" y="4" width="4" height="16" rx="1" />
        </svg>
      </ActionIcon>
    </div>}
    {phase === 'paused' && <FocusTrap>
      <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[20px] bg-field/85 p-4" role="region" aria-labelledby="session-title">
        <Paper radius="lg" p="lg" withBorder className="w-full max-w-[260px] text-center">
          <Title id="session-title" order={2}>Paused</Title>
          <Text size="sm" c="dimmed" mt="xs">Your field will wait.</Text>
          <Button data-autofocus fullWidth mt="lg" radius="xl" mih={44} onClick={onResume}>Resume</Button>
          <Button fullWidth variant="subtle" radius="xl" mt="xs" mih={44} onClick={onRestart}>Restart</Button>
          {onHome && <Button fullWidth variant="subtle" radius="xl" mt="xs" mih={44} onClick={onHome}>Home</Button>}
        </Paper>
      </div>
    </FocusTrap>}
  </>;
}
