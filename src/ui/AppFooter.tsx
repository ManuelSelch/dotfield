import { Text } from '@mantine/core';

const FACTIONS = [
  { label: 'You', marker: 'size-[7px] rounded-full bg-player' },
  { label: 'Neutral', marker: 'h-[2px] w-[7px] bg-[#808b80]' },
  { label: 'Opponent', marker: 'size-[7px] bg-enemy' },
];

export function AppFooter() {
  return (
    <footer className="shrink-0 px-2 pt-5">
      <ul className="m-0 flex list-none justify-center gap-[25px] p-0" aria-label="Factions">
        {FACTIONS.map(({ label, marker }) => (
          <li key={label} className="flex items-center gap-[7px] text-[11px] leading-normal font-medium text-[#47564d]">
            <span className={`inline-block ${marker}`} aria-hidden="true" />{label}
          </li>
        ))}
      </ul>
      <Text className="mt-4 text-center text-[11px] leading-normal text-muted">Drag to send half · capture the field.</Text>
    </footer>
  );
}
