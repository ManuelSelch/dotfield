import { ActionIcon, Paper, Title } from '@mantine/core';
import type { RoundStatus } from '../game/types';

const TITLES: Record<Exclude<RoundStatus, 'playing'>, string> = {
  victory: 'Victory',
  defeat: 'Defeat',
  draw: 'Draw',
};

export function RoundResult({ status, onReplay, onHome }: { status: RoundStatus; onReplay: () => void; onHome?: () => void }) {
  if (status === 'playing') return null;
  const title = TITLES[status];
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[20px] bg-field/85 p-4" role="region" aria-labelledby="round-result-title">
      <Paper radius="lg" p="xl" withBorder className="w-full max-w-[280px] text-center">
        <div role="status">
          <Title id="round-result-title" order={2} className="text-ink">{title}</Title>
        </div>
        <div className="mt-5 flex justify-center gap-3">
          <ActionIcon autoFocus aria-label="Play again" title="Play again" size={48} radius="xl" color="#267c72" onClick={onReplay}>
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M20 7v5h-5M19 12a7.5 7.5 0 1 1-2.2-5.3L20 10" /></svg>
          </ActionIcon>
          {onHome && <ActionIcon aria-label="Home" title="Home" size={48} radius="xl" variant="default" onClick={onHome}>
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z" /></svg>
          </ActionIcon>}
        </div>
      </Paper>
    </div>
  );
}
