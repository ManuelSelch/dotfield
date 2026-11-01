import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';

import { CityControls, type CityControlsProps } from './city-controls';
const props: CityControlsProps = {
  name: 'Orchard',
  cityType: 'production',
  troops: 48,
  planePhase: null,
  capacity: 100,
  costs: { production: 10, defender: 20, airfield: 30, watchtower: 30, artillery: 40 },
  targeting: null,
  onConvert: () => {},
  onFly: () => {},
  onCancel: () => {},
};
it('renders five named icon controls and accessible current-city details without a visible header', () => {
  const html = renderToStaticMarkup(createElement(CityControls, props));
  expect(html).toContain('aria-description="Orchard, Production, 48 garrison troops"');
  expect(html).toContain('aria-label="Build Watchtower for 30 troops; leave 1 behind.');
  expect(html).toContain('aria-label="Build Artillery for 40 troops; leave 1 behind.');
  expect((html.match(/class="city-controls__icon"/g) ?? []).length).toBe(5);
  expect(html).toContain('<small>✓</small>');
  expect(html).not.toContain('garrison troops</span>');
  expect(html).not.toContain('Production · troop growth');
  expect(html).not.toContain('Ground…');
  expect(html).not.toContain('Close city controls');
});
it.each([
  ['preparing', '20s'],
  ['ready', 'Ready'],
  ['outbound', 'Away'],
  ['unloading', 'Unload'],
  ['returning', 'Return'],
  ['turnaround', '10s'],
] as const)('shows compact %s Airfield status', (planePhase, label) => {
  const html = renderToStaticMarkup(
    createElement(CityControls, { ...props, cityType: 'airfield', planePhase }),
  );
  expect(html).toContain(`<small>${label}</small>`);
});
it('shows Defender shield data and the available Fly/Cancel action', () => {
  const defender = renderToStaticMarkup(
    createElement(CityControls, {
      ...props,
      cityType: 'defender',
      detail: '2/3 shields · defender recharge 10s',
    }),
  );
  expect(defender).toContain('<small>2/3 shields</small>');
  const ready = { ...props, cityType: 'airfield' as const, planePhase: 'ready' as const };
  expect(renderToStaticMarkup(createElement(CityControls, ready))).toContain('>Fly</button>');
  const targeted = renderToStaticMarkup(
    createElement(CityControls, { ...ready, targeting: 'fly' }),
  );
  expect(targeted).toContain('>Cancel</button>');
  expect(targeted).toContain('Tap any other city to fly');
  expect(targeted).not.toContain('>Fly</button>');
});
