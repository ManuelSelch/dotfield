import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { CityControls, type CityControlsProps } from './CityControls';
const props: CityControlsProps = {
  name: 'Orchard', cityType: 'production', troops: 48, planePhase: null, capacity: 100,
  costs: { production: 10, defender: 20, airfield: 30 }, targeting: null,
  onConvert: vi.fn(), onFly: vi.fn(), onCancel: vi.fn(), onClose: vi.fn(),
};
it('renders one row of controls without a visible header or redundant production status', () => {
  const html = renderToStaticMarkup(createElement(CityControls, props));
  expect(html).toContain('aria-description="Orchard, Production, 48 garrison troops"');
  expect(html).not.toContain('city-controls__selection');
  expect(html).not.toContain('Production · troop growth');
  expect(html).not.toContain('city-controls__flight');
  expect(html).toContain('<small>Current</small>');
  expect(html).toContain('aria-pressed="true"');
  expect(html).toContain('20 troops');
  expect(html).toContain('30 troops');
  expect(html).toContain('aria-describedby=');
  expect(html).toContain('Close city controls');
  expect(html).not.toContain('Ground…');
  expect(html).not.toContain('>Fly<');
});
it('renders Fly only for airfields and Cancel instead of dispatch during targeting', () => {
  const ready = { ...props, cityType: 'airfield' as const, planePhase: 'ready' as const };
  expect(renderToStaticMarkup(createElement(CityControls, ready))).toContain('>Fly<');
  const html = renderToStaticMarkup(createElement(CityControls, { ...ready, targeting: 'fly' }));
  expect(html).toContain('>Cancel<');
  expect(html).toContain('Tap any other city to fly');
  expect(html).not.toContain('>Fly<');
  expect(html).not.toContain('Ground…');
});
it.each([
  ['preparing', 'Preparing'], ['ready', 'Ready · 100'], ['outbound', 'Away'],
  ['unloading', 'Unloading'], ['returning', 'Returning'], ['turnaround', 'Turnaround'],
] as const)('shows compact %s status inside the selected Airfield button', (planePhase, label) => {
  const html = renderToStaticMarkup(createElement(CityControls, { ...props, cityType: 'airfield', planePhase }));
  expect(html).toContain(`<span>Airfield</span><small>${label}</small>`);
});
it('shows authoritative shield status in the selected Defender button', () => {
  const html = renderToStaticMarkup(createElement(CityControls, { ...props, cityType: 'defender', detail: '2/3 shields · defender recharge 10s' }));
  expect(html).toContain('<span>Defender</span><small>2/3 shields</small>');
});
