import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { CityControls, type CityControlsProps } from './CityControls';
const props: CityControlsProps = {
  name: 'Orchard', cityType: 'production', troops: 48, planePhase: null, capacity: 100,
  costs: { production: 10, defender: 20, airfield: 30 }, targeting: null,
  onConvert: vi.fn(), onFly: vi.fn(), onGround: vi.fn(), onCancel: vi.fn(), onClose: vi.fn(),
};
it('renders compact semantic type controls, garrison, reasons and close action', () => {
  const html = renderToStaticMarkup(createElement(CityControls, props));
  expect(html).toContain('Orchard · Production');
  expect(html).toContain('48 garrison troops');
  expect(html).toContain('aria-pressed="true"');
  expect(html).toContain('20 troops');
  expect(html).toContain('30 troops');
  expect(html).toContain('aria-describedby=');
  expect(html).toContain('Close city controls');
  expect(html).toContain('Ground…');
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
