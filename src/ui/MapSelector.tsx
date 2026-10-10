import { ActionIcon } from '@mantine/core';
import { MAPS, type FieldMap } from '../board/maps';
import { MapPreview } from './MapPreview';

export function MapSelector({ map, onSelect }: { map: FieldMap; onSelect: (id: string) => void }) {
  const selectedIndex = MAPS.findIndex(field => field.id === map.id);
  const selectOffset = (offset: number) => onSelect(MAPS[(selectedIndex + offset + MAPS.length) % MAPS.length].id);
  return <div className="home-map-panel" role="group" aria-label="Map selection"
    onKeyDown={event => {
      if (event.key === 'ArrowLeft') { event.preventDefault(); selectOffset(-1); }
      if (event.key === 'ArrowRight') { event.preventDefault(); selectOffset(1); }
    }}>
    <div className="home-map-selector">
      <ActionIcon variant="subtle" color="teal" size={44} radius="xl" aria-label="Previous map" onClick={() => selectOffset(-1)}>
        <Chevron direction="left" />
      </ActionIcon>
      <div className="home-map-space">
        <div className="home-map-frame"><MapPreview map={map} index={selectedIndex} /></div>
      </div>
      <ActionIcon variant="subtle" color="teal" size={44} radius="xl" aria-label="Next map" onClick={() => selectOffset(1)}>
        <Chevron direction="right" />
      </ActionIcon>
    </div>
    <div className="flex h-2 items-center justify-center gap-[7px]" aria-hidden="true">
      {MAPS.map((field, index) => <span key={field.id} className={`h-[6px] rounded-full transition-all ${index === selectedIndex ? 'w-[18px] bg-teal-700' : 'w-[6px] bg-[#c8d0c7]'}`} />)}
    </div>
  </div>;
}

function Chevron({ direction }: { direction: 'left' | 'right' }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[22px] w-[22px] fill-none stroke-current stroke-2">
    {direction === 'left' ? <path d="m15 18-6-6 6-6" /> : <path d="m9 18 6-6-6-6" />}
  </svg>;
}
