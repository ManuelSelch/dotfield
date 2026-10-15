import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { RegionControls } from './RegionControls';
import { TerritoryDetails } from './TerritoryDetails';
import { TransferDetails } from './TransferDetails';
import { createSimulation } from '../game/state';

const cities = [
  { id: 'home', owner: 'player', cityType: 'airfield' as const, units: 12, x: 60, y: 100 },
  { id: 'defender', owner: 'enemy', cityType: 'defender' as const, units: 10, x: 260, y: 100 },
];
const state = { ...createSimulation(cities), captureShields: { defender: { remaining: 2 } }, aircraft: {
  home: { homeId: 'home', owner: 'player', tripId: 1, phase: 'unloading' as const, cargo: 95,
    targetId: 'defender', position: { x: 246, y: 100 }, from: cities[0], to: { x: 246, y: 100 },
    elapsedMs: 100, durationMs: 200 },
} };

it('exposes city types, nonproduction, shared shields and plane cargo to keyboard region controls', () => {
  const html = renderToStaticMarkup(createElement(RegionControls, { state }));
  expect(html).toMatch(/Select home region: You, 12 units.*Airfield city; no troop growth.*95 troops aboard/);
  expect(html).toMatch(/Select defender region: Opponent, 10 units.*Defender shields: 2 stored \(capacity 3\)/);
  expect(html).not.toContain('Defensive Network shields: 2');
});
it('supports state-aware details and legacy territory-only callers without inventing a plane', () => {
  const html = renderToStaticMarkup(createElement(TerritoryDetails, { territories: state.territories, state }));
  expect(html).toContain('95 troops aboard'); expect(html).toContain('2 stored (capacity 3)');
  const legacy = renderToStaticMarkup(createElement(TerritoryDetails, { territories: cities }));
  expect(legacy).toContain('no troop growth'); expect(legacy).not.toContain('troops aboard');
});
it('lists embarked troops separately from ordinary unit transfers and describes empty returns', () => {
  const html = renderToStaticMarkup(createElement(TransferDetails, { state }));
  expect(html).toContain('docked at defender, unloading; 95 troops aboard');
  const returning = { ...state, aircraft: { home: { ...state.aircraft.home, phase: 'returning' as const, cargo: 0 } } };
  expect(renderToStaticMarkup(createElement(TransferDetails, { state: returning }))).toContain('returning empty to home; no troops aboard');
});
