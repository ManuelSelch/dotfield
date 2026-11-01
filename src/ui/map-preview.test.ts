import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { DEFAULT_MAP_SETTINGS, generateMap } from '@/board/generate-map';
import type { FieldMap } from '@/board/maps';
import type { TerritoryFeature } from '@/game/features/types';

import { MapPreview } from './map-preview';

const render = (map: FieldMap, index?: number) =>
  renderToStaticMarkup(createElement(MapPreview, { map, index }));

describe('map preview presentation', () => {
  it('shows generated regions, faction garrisons, relay, river and mountains', () => {
    const map = generateMap({ ...DEFAULT_MAP_SETTINGS, relay: true }, 42);

    const html = render(map);

    expect(html).toContain('aria-label="Generated map preview"');
    expect(html.match(/<polygon /g)).toHaveLength(map.territories.length);
    expect(html).toContain('River with two paired bridge crossings');
    expect(html).toContain('Mountain blocks direct orders and shots');
    expect(html).toContain(`data-relay-city-id="${map.relay!.cityId}"`);
    expect(html).toContain('RELAY');
    expect(html).toContain('aria-label="Factory"');
    expect(html).toContain('>36</text>');
  });

  it('omits terrain and objective decorations on an open authored map', () => {
    const html = render(
      {
        id: 'simple',
        territories: [
          { id: 'home', owner: 'player', units: 30, x: 100, y: 100 },
          { id: 'neutral', owner: 'neutral', units: 8, x: 200, y: 200 },
        ],
      },
      2,
    );

    expect(html).toContain('aria-label="Map 3 preview"');
    expect(html.match(/<polygon /g)).toHaveLength(2);
    expect(html).not.toContain('River with');
    expect(html).not.toContain('Mountain blocks');
    expect(html).not.toContain('Relay objective');
    expect(html).not.toContain('coverage');
  });

  it.each(['neutral', 'enemy'])('shows feature ranges and badges for %s cities', (owner) => {
    const features: TerritoryFeature[] = [
      { id: 'artillery', kind: 'artillery', range: 150, fireIntervalMs: 1000 },
      { id: 'watchtower', kind: 'watchtower', range: 120, fireIntervalMs: 1000 },
      { id: 'slow', kind: 'slow-zone', radius: 90, speedMultiplier: 0.5 },
      { id: 'factory', kind: 'factory', productionMultiplier: 2 },
    ];
    const html = render({
      id: 'features',
      territories: features.map((feature, i) => ({
        id: `city-${i}`,
        owner,
        units: 14,
        x: 50 + i * 70,
        y: 100,
        features: [feature],
      })),
    });

    for (const label of [
      'Artillery range',
      'Watchtower coverage',
      'Slow Zone coverage',
      'Artillery',
      'Watchtower',
      'Slow Zone',
      'Factory',
    ])
      expect(html).toContain(`aria-label="${label}"`);
    expect(html).toContain('r="150"');
    expect(html).toContain('r="120"');
    expect(html).toContain('r="90"');
    expect(html).toContain(`opacity="${owner === 'neutral' ? 0.45 : 1}"`);
  });
});
