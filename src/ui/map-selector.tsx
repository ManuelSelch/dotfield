import { ActionIcon } from '@mantine/core';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';

import { MAPS, type FieldMap } from '@/board/maps';

import { MapPreview } from './map-preview';

export function MapSelector({ map, onSelect }: { map: FieldMap; onSelect: (id: string) => void }) {
  const selectedIndex = MAPS.findIndex((field) => field.id === map.id);
  const selectOffset = (offset: number) =>
    onSelect(MAPS[(selectedIndex + offset + MAPS.length) % MAPS.length].id);
  return (
    // Arrow keys bubble from the focusable Previous/Next buttons in this group.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <div
      className="home-map-panel"
      role="group"
      aria-label="Map selection"
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          selectOffset(-1);
        }
        if (event.key === 'ArrowRight') {
          event.preventDefault();
          selectOffset(1);
        }
      }}
    >
      <div className="home-map-selector">
        <ActionIcon
          variant="subtle"
          color="teal"
          size={44}
          radius="xl"
          aria-label="Previous map"
          onClick={() => selectOffset(-1)}
        >
          <Chevron direction="left" />
        </ActionIcon>
        <div className="home-map-space">
          <div className="home-map-frame">
            <MapPreview map={map} index={selectedIndex} />
          </div>
        </div>
        <ActionIcon
          variant="subtle"
          color="teal"
          size={44}
          radius="xl"
          aria-label="Next map"
          onClick={() => selectOffset(1)}
        >
          <Chevron direction="right" />
        </ActionIcon>
      </div>
      <div className="flex h-2 items-center justify-center gap-[7px]" aria-hidden="true">
        {MAPS.map((field, index) => (
          <span
            key={field.id}
            className={`h-[6px] rounded-full transition-all ${index === selectedIndex ? 'w-[18px] bg-teal-700' : 'w-[6px] bg-[#c8d0c7]'}`}
          />
        ))}
      </div>
    </div>
  );
}

function Chevron({ direction }: { direction: 'left' | 'right' }) {
  const Icon = direction === 'left' ? IconChevronLeft : IconChevronRight;
  return <Icon size={22} stroke={2} aria-hidden="true" />;
}
