import { ActionIcon, Button, Title } from '@mantine/core';
import { MAPS, type FieldMap } from '../board/maps';
import { MapPreview } from './MapPreview';
import { UpgradeOptions } from './UpgradeOptions';
import type { UpgradeId } from '../game/upgrades/catalog';

export function HomeScreen({ map, onSelect, onPlay, upgrades, onUpgrades }: {
  map: FieldMap; onSelect: (id: string) => void; onPlay: () => void;
  upgrades: readonly UpgradeId[]; onUpgrades: (ids: readonly UpgradeId[]) => void;
}) {
  const selectedIndex = MAPS.findIndex(field => field.id === map.id);
  const selectOffset = (offset: number) => {
    const nextIndex = (selectedIndex + offset + MAPS.length) % MAPS.length;
    onSelect(MAPS[nextIndex].id);
  };
  return <section className="flex min-h-0 flex-1 flex-col gap-3" aria-labelledby="home-title">
    <Title order={2} id="home-title" className="m-0 text-center text-[23px] font-medium tracking-[-0.7px] text-ink">Choose your field.</Title>
    <div className="flex min-h-[120px] min-w-0 flex-1 items-center justify-center gap-2" role="group" aria-label="Map selection"
      onKeyDown={event => {
        if (event.key === 'ArrowLeft') { event.preventDefault(); selectOffset(-1); }
        if (event.key === 'ArrowRight') { event.preventDefault(); selectOffset(1); }
      }}>
      <ActionIcon variant="subtle" color="teal" size={44} radius="xl" aria-label="Previous map" onClick={() => selectOffset(-1)}>
        <Chevron direction="left" />
      </ActionIcon>
      <div className="aspect-[3/4] h-full max-h-full w-auto max-w-[280px] flex-none overflow-hidden rounded-[20px] border-2 border-teal-700 bg-field">
        <MapPreview map={map} index={selectedIndex} />
      </div>
      <ActionIcon variant="subtle" color="teal" size={44} radius="xl" aria-label="Next map" onClick={() => selectOffset(1)}>
        <Chevron direction="right" />
      </ActionIcon>
    </div>
    <div className="flex h-2 items-center justify-center gap-[7px]" aria-hidden="true">
      {MAPS.map((field, index) => <span key={field.id} className={`h-[6px] rounded-full transition-all ${index === selectedIndex ? 'w-[18px] bg-teal-700' : 'w-[6px] bg-[#c8d0c7]'}`} />)}
    </div>
    <UpgradeOptions selected={upgrades} onChange={onUpgrades} />
    <Button autoFocus fullWidth radius="xl" mih={44} onClick={onPlay}>Play</Button>
  </section>;
}

function Chevron({ direction }: { direction: 'left' | 'right' }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[22px] w-[22px] fill-none stroke-current stroke-2">
    {direction === 'left' ? <path d="m15 18-6-6 6-6" /> : <path d="m9 18 6-6-6-6" />}
  </svg>;
}
