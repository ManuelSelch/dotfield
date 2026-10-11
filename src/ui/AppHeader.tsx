import { Title } from '@mantine/core';
import type { ReactNode } from 'react';

export function AppHeader({ children }: { children?: ReactNode }) {
  return (
    <header className="flex shrink-0 items-center justify-between gap-3 pb-2">
      <div className="flex min-w-0 items-center gap-3">
        <Title order={1} className="m-0 flex items-center gap-[9px] text-[24px] leading-[1.2] font-[650] tracking-[-1px] text-ink">
          <span className="size-[11px] rounded-full bg-player shadow-[0_0_0_4px_#e2ebe3]" aria-hidden="true" />
          dotfield
        </Title>
        <div id="game-controls-slot" className="flex items-center" />
      </div>
      {children}
    </header>
  );
}
