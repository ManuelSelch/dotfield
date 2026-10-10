import { Button, Paper, Text, Title } from '@mantine/core';
import type { RoundStatus } from '../game/types';

const MESSAGES = {
  victory: { title: 'Victory', detail: 'The field is yours.' },
  defeat: { title: 'Defeat', detail: 'A fresh field. Another chance.' },
  draw: { title: 'Draw', detail: 'Neither side remains.' },
};

export function RoundResult({ status, onReplay, onHome, onNewMap }: { status: RoundStatus; onReplay: () => void; onHome?: () => void; onNewMap?: () => void }) {
  if (status === 'playing') return null;
  const message = MESSAGES[status];
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[20px] bg-field/85 p-4" role="region" aria-labelledby="round-result-title">
      <Paper radius="lg" p="xl" withBorder className="w-full max-w-[280px] text-center">
        <div role="status">
          <Title id="round-result-title" order={2} className="text-ink">{message.title}</Title>
          <Text size="sm" c="dimmed" mt="xs">{message.detail}</Text>
        </div>
        <Button autoFocus fullWidth mt="lg" radius="xl" mih={44} onClick={onReplay}>Play again</Button>
        {onNewMap && <Button fullWidth variant="subtle" radius="xl" mt="xs" mih={44} onClick={onNewMap}>New map</Button>}
        {onHome && <Button fullWidth variant="subtle" radius="xl" mt="xs" mih={44} onClick={onHome}>Home</Button>}
      </Paper>
    </div>
  );
}
