import { Button, Group, Radio, Text, Title } from '@mantine/core';
import { MAPS, type FieldMap } from '../board/maps';
import { MapPreview } from './MapPreview';

export function HomeScreen({ map, onSelect, onPlay }: { map: FieldMap; onSelect: (id: string) => void; onPlay: () => void }) {
  return <section className="flex min-h-0 flex-1 flex-col gap-3" aria-labelledby="home-title">
    <Title order={2} id="home-title" className="m-0 text-[23px] font-medium tracking-[-0.7px] text-ink">Choose your field.</Title>
    <div className="min-h-0 flex-1"><MapPreview map={map} /></div>
    <Radio.Group value={map.id} onChange={onSelect} aria-label="Choose a map">
      <Group justify="space-between" gap={4}>
        {MAPS.map(field => <Radio key={field.id} value={field.id} label={field.name} styles={{ body: { minHeight: 44, alignItems: 'center' }, label: { paddingInlineStart: 6 } }} />)}
      </Group>
    </Radio.Group>
    <Text size="sm" c="dimmed" ta="center">{map.description}</Text>
    <Button autoFocus fullWidth radius="xl" mih={44} onClick={onPlay}>Play</Button>
  </section>;
}
