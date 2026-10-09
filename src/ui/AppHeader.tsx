import { Badge, Title } from '@mantine/core';

export function AppHeader() {
  return (
    <header className="flex shrink-0 items-center justify-between gap-3 pb-6">
      <Title order={1} className="m-0 flex items-center gap-[9px] text-[24px] leading-[1.2] font-[650] tracking-[-1px] text-ink">
        <span className="size-[11px] rounded-full bg-player shadow-[0_0_0_4px_#e2ebe3]" aria-hidden="true" />
        dotfield
      </Title>
      <Badge variant="outline" radius="xl" classNames={{
        root: 'h-auto border border-border bg-transparent px-[10px] py-[7px] text-[10px] leading-[12px] font-semibold tracking-normal text-[#627067] normal-case',
        label: 'overflow-visible',
      }}>
        Growth preview
      </Badge>
    </header>
  );
}
