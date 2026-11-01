import { ActionIcon, Paper, Title } from '@mantine/core';
import { IconHome, IconRefresh } from '@tabler/icons-react';

import type { RoundStatus } from '@/game/types';

const TITLES: Record<Exclude<RoundStatus, 'playing'>, string> = {
  victory: 'Victory',
  defeat: 'Defeat',
  draw: 'Draw',
};

export function RoundResult({
  status,
  onReplay,
  onHome,
}: {
  status: RoundStatus;
  onReplay: () => void;
  onHome?: () => void;
}) {
  if (status === 'playing') return null;
  const title = TITLES[status];
  return (
    <div
      className="absolute inset-0 z-10 flex items-center justify-center rounded-[20px] bg-field/85 p-4"
      role="region"
      aria-labelledby="round-result-title"
    >
      <Paper radius="lg" p="xl" withBorder className="w-full max-w-[280px] text-center">
        <div role="status">
          <Title id="round-result-title" order={2} className="text-ink">
            {title}
          </Title>
        </div>
        <div className="mt-5 flex justify-center gap-3">
          <ActionIcon
            // Move keyboard focus to replay when the round finishes.
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            aria-label="Play again"
            title="Play again"
            size={48}
            radius="xl"
            color="#267c72"
            onClick={onReplay}
          >
            <IconRefresh size={20} stroke={1.9} aria-hidden="true" />
          </ActionIcon>
          {onHome && (
            <ActionIcon
              aria-label="Home"
              title="Home"
              size={48}
              radius="xl"
              variant="default"
              onClick={onHome}
            >
              <IconHome size={20} stroke={1.9} aria-hidden="true" />
            </ActionIcon>
          )}
        </div>
      </Paper>
    </div>
  );
}
