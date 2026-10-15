import { expect, it } from 'vitest';
import { featureLabels } from './featureLabels';
import { createSimulation } from '../game/state';
import type { AircraftPhase, Territory } from '../game/types';

it('announces legacy Production and no growth on converted cities while retaining Factory semantics', () => {
  const city: Territory = { id: 'home', x: 80, y: 190, owner: 'player', units: 14 };
  expect(featureLabels(city)).toContain('Production city');
  expect(featureLabels({ ...city, cityType: 'airfield' })).toContain('Airfield city; no troop growth');
  const label = featureLabels({ ...city, cityType: 'defender' }, { remaining: 2 }, 1);
  expect(label).toContain('Defender city; no troop growth');
  expect(label).toContain('Defender shields: 2 stored (capacity 3)');
  expect(label).toContain('every 10 seconds independently of network connectivity');
  expect(label).not.toContain('Defensive Network shields:');
});
it('announces each plane phase, separate embarked cargo and the empty return from state', () => {
  const city: Territory = { id: 'home', x: 80, y: 190, owner: 'player', units: 14, cityType: 'airfield' };
  const state = createSimulation([city, { ...city, id: 'target', owner: 'enemy', x: 250 }]);
  for (const phase of ['preparing', 'ready', 'outbound', 'unloading', 'returning', 'turnaround'] as AircraftPhase[]) {
    const s = { ...state, aircraft: { home: { homeId: 'home', owner: 'player', tripId: 1, targetId: 'target',
      phase, cargo: phase === 'returning' ? 0 : 25, position: city, from: city, to: city, elapsedMs: 5000, durationMs: 20000 } } };
    const label = featureLabels(city, undefined, undefined, s);
    expect(label).toContain(phase === 'unloading' ? 'docked at target, unloading' : phase === 'returning' ? 'returning empty' : phase);
    if (phase === 'outbound' || phase === 'unloading') expect(label).toContain('25 troops aboard');
    if (phase === 'ready') expect(label).toContain('capacity 100');
    if (phase === 'preparing' || phase === 'turnaround') expect(label).toContain('15 seconds remaining');
  }
});
it('keeps existing network and charge label semantics and exposes shared nonadditive Defender capacity', () => {
  const city: Territory = { id: 'home', x: 80, y: 190, owner: 'player', units: 14 };
  expect(featureLabels(city, { remaining: 3 }, 2)).toContain('Defensive Network shields: 3 stored (capacity 2)');
  expect(featureLabels(city, { remaining: 1 })).toContain('Shields: 1 active charge');
  expect(featureLabels(city, { remaining: 0 })).toContain('Shields depleted');
  expect(featureLabels({ ...city, cityType: 'defender' }, { remaining: 5 }, 2)).toContain('5 stored (capacity 3)');
});
it('does not claim neutral Defenders recharge, and reads stored charges from optional state', () => {
  const city: Territory = { id: 'home', x: 80, y: 190, owner: 'neutral', units: 14, cityType: 'defender' };
  expect(featureLabels(city)).toContain('Defender shields: 0 stored (capacity 0); recharge inactive while neutral');
  const owned = { ...city, owner: 'player' };
  const state = { ...createSimulation([owned]), captureShields: { home: { remaining: 2 } } };
  expect(featureLabels(owned, undefined, undefined, state)).toContain('Defender shields: 2 stored (capacity 3)');
});
it('labels authored and legacy Factories by current ownership', () => {
  for (const beneficiaryId of [undefined, 'player']) {
    const city = { id: 'plant', x: 80, y: 190, owner: 'enemy', units: 14,
      features: [{ id: 'plant:factory', kind: 'factory' as const, productionMultiplier: 2, ...(beneficiaryId ? { beneficiaryId } : {}) }] };
    expect(featureLabels(city)).toContain('Factory active (2× production)');
    expect(featureLabels({ ...city, owner: 'neutral' })).toContain('Factory inactive');
  }
});
