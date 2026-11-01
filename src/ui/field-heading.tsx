import { Text, Title } from '@mantine/core';

export function FieldHeading({
  name = 'FIRST FIELD',
  number = 1,
}: {
  name?: string;
  number?: number;
}) {
  return (
    <div className="flex shrink-0 items-center justify-between px-2 pb-[14px]">
      <div>
        <Text className="mb-[5px] text-[9px] leading-normal font-[650] tracking-[1.8px] text-[#68756d]">
          {name}
        </Text>
        <Title
          order={2}
          id="field-title"
          className="m-0 text-[23px] leading-[1.2] font-medium tracking-[-0.7px] text-ink"
        >
          Room to grow.
        </Title>
      </div>
      <Text component="span" className="text-[13px] text-[#a9b4a9] tabular-nums" aria-hidden="true">
        {String(number).padStart(2, '0')}
      </Text>
    </div>
  );
}
