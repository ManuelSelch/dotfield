import { describe, expect, it } from 'vitest';
import { createSimulation } from '../state';
import { dispatchUnits } from '../dispatch';
import { createRiver } from '../river';
import { createTerrain } from '../terrain/terrain';
import { chooseOrder } from './decision';
import { resolveAiBehavior } from './behaviors';
import { safeAirDeparture } from './mobility';
import { forecastBattle } from './forecast';
import { factionArmyUnits } from './logistics';
import type { SimulationState, Territory } from '../types';

const city = (id: string, units: number, x: number, y: number, owner = 'enemy'): Territory => ({ id, owner, units, x, y });
const hostile = city('player', 300, 180, 40, 'player');
const factory = (node: Territory): Territory => ({ ...node,
  features: [{ id: `${node.id}:factory`, kind: 'factory', productionMultiplier: 2 }] });
const opening = () => createSimulation([
  city('rear-left', 48, 60, 350), city('rear-right', 48, 300, 350), city('staging', 50, 180, 330), hostile,
]);

function order(state: SimulationState) {
  const result = chooseOrder(state);
  return result && dispatchUnits(state, result.sourceId, result.targetId, 'enemy');
}

describe('production-aware enemy logistics', () => {
  const guardedRear = (distance = 160) => createSimulation([
    city('rear', 50, 180, 350), city('staging', 50, 180, 330),
    city('player', 300, 180, 350 - distance, 'player'),
  ]);

  it.each(['aggressive', 'balanced', 'defensive'] as const)(
    'uses the %s production threat window for a hostile army 3–5 seconds away', behavior => {
      const selected = chooseOrder(guardedRear(), resolveAiBehavior(behavior));
      if (behavior === 'aggressive') expect(selected).toMatchObject({ sourceId: 'rear', targetId: 'staging', kind: 'reinforce' });
      else expect(selected).toBeNull();
    });

  it('still protects aggressive donors from armies within three seconds', () => {
    expect(chooseOrder(guardedRear(100), resolveAiBehavior('aggressive'))).toBeNull();
  });

  it('still blocks aggressive production relief under a known incoming attack', () => {
    const attacked = dispatchUnits(guardedRear(), 'player', 'rear');
    expect(chooseOrder(attacked, resolveAiBehavior('aggressive'))?.sourceId).not.toBe('rear');
  });

  it('retains the five-second aircraft departure guard', () => {
    const state = guardedRear();
    const launched = { ...state, territories: state.territories.map(c => c.id === 'rear' ? { ...c, units: 1 } : c) };
    expect(safeAirDeparture(state, launched, 'rear', 'enemy')).toBe(false);
  });

  it('retains the five-second production guard for legacy configs without the new setting', () => {
    const { productionThreatTravelMs: _window, ...legacy } = resolveAiBehavior('balanced');
    expect(chooseOrder(guardedRear(), legacy)).toBeNull();
  });
  it('frees a nearly capped rear city without requiring a 60-unit frontline advance', () => {
    expect(chooseOrder(opening())).toMatchObject({ sourceId: 'rear-left', targetId: 'staging', kind: 'reinforce' });
  });

  it('concentrates at one staging city above 50 while rear cities resume production', () => {
    let state = opening();
    const destinations: string[] = [];
    for (let decision = 0; decision < 10; decision++) {
      const selected = chooseOrder(state);
      if (selected) {
        expect(selected.sourceId).not.toBe('staging');
        destinations.push(selected.targetId);
        state = dispatchUnits(state, selected.sourceId, selected.targetId, 'enemy');
      }
      state = forecastBattle(state, 1_800);
    }
    expect(destinations.length).toBeGreaterThanOrEqual(2);
    expect(new Set(destinations)).toEqual(new Set(['staging']));
    expect(state.territories.find(node => node.id === 'staging')!.units).toBeGreaterThan(100);
    expect(state.territories.filter(node => node.owner === 'enemy' && node.units >= 50)).toHaveLength(1);
    expect(state.territories.find(node => node.id === 'rear-left')!.units).toBeLessThan(50);
    expect(state.territories.find(node => node.id === 'rear-right')!.units).toBeLessThan(50);
  });

  it('does not empty growing cities prematurely just to consolidate', () => {
    const state = createSimulation([city('rear', 20, 60, 350), city('staging', 50, 180, 330), hostile]);
    expect(chooseOrder(state)).toBeNull();
  });

  it('evacuates a Factory earlier because it will reach the cap sooner', () => {
    const state = createSimulation([
      city('ordinary', 40, 60, 350), factory(city('factory', 40, 300, 350)),
      city('staging', 50, 180, 330), hostile,
    ]);
    expect(chooseOrder(state)).toMatchObject({ sourceId: 'factory', targetId: 'staging' });
  });

  it('prioritizes the larger net gain from a full Factory when an ordinary city is also full', () => {
    const state = createSimulation([
      city('ordinary', 50, 60, 350), factory(city('factory', 50, 300, 350)),
      city('staging', 50, 180, 330), hostile,
    ]);
    expect(chooseOrder(state)).toMatchObject({ sourceId: 'factory', targetId: 'staging' });
  });

  it('rejects relief that loses more Factory production at the recipient than it frees at the source', () => {
    const state = createSimulation([city('rear', 48, 60, 350), factory(city('staging', 5, 180, 330)), hostile]);
    expect(chooseOrder(state)).toBeNull();
  });

  it('counts queued troops once and airborne troops without inventing a consolidation gain', () => {
    const state = opening();
    const dispatched = dispatchUnits(state, 'rear-left', 'staging', 'enemy');
    expect(dispatched.transfers.some(batch => batch.elapsedMs < 0)).toBe(true);
    expect(dispatched.transfers.some(batch => batch.elapsedMs >= 0)).toBe(true);
    expect(factionArmyUnits(dispatched, 'enemy')).toBe(factionArmyUnits(state, 'enemy'));
    const quiet = createSimulation(state.territories, { unitsPerSecond: 0 });
    const moved = dispatchUnits(quiet, 'rear-left', 'staging', 'enemy');
    expect(factionArmyUnits(forecastBattle(moved, 15_000), 'enemy')).toBe(factionArmyUnits(quiet, 'enemy'));
  });

  it('prefers sacrificing ordinary-city production rather than Factory production at the same front distance', () => {
    const state = createSimulation([city('ordinary', 50, 60, 350), factory(city('factory', 50, 300, 350)), hostile]);
    expect(chooseOrder(state)).toMatchObject({ sourceId: 'factory', targetId: 'ordinary' });
  });

  it('uses a stable direction for equally positioned cities, regardless of troop counts or map order', () => {
    const nodes = [city('a-staging', 50, 60, 350), city('z-rear', 50, 300, 350), hostile];
    const state = createSimulation(nodes);
    expect(chooseOrder(state)).toMatchObject({ sourceId: 'z-rear', targetId: 'a-staging' });
    expect(chooseOrder(createSimulation([...nodes].reverse()))).toMatchObject({ sourceId: 'z-rear', targetId: 'a-staging' });
    const moved = forecastBattle(order(state)!, 15_000);
    expect(chooseOrder(moved)?.sourceId).not.toBe('a-staging');
  });

  it('keeps a capped defensive stronghold when a nearby army could exploit its evacuation', () => {
    const state = createSimulation([
      city('stronghold', 50, 70, 210), city('staging', 50, 290, 200), city('player', 100, 180, 80, 'player'),
    ]);
    expect(chooseOrder(state)).toBeNull();
  });

  it('does not evacuate a source with a known incoming attack for production relief', () => {
    let state = opening();
    state = dispatchUnits(state, 'player', 'rear-left');
    expect(chooseOrder(state)?.sourceId).not.toBe('rear-left');
  });

  it('prioritizes saving a threatened city over relieving a production cap', () => {
    let state = createSimulation([
      city('rear', 48, 60, 350), city('staging', 50, 180, 330),
      city('defender', 5, 300, 260), city('player', 60, 180, 40, 'player'),
    ]);
    state = dispatchUnits(state, 'player', 'defender');
    expect(chooseOrder(state)).toMatchObject({ targetId: 'defender', kind: 'reinforce' });
  });

  it('can attack from a collected army instead of stockpiling forever', () => {
    const state = createSimulation([city('staging', 120, 180, 330), city('rear', 20, 60, 350), city('player', 30, 180, 40, 'player')]);
    expect(chooseOrder(state)).toMatchObject({ sourceId: 'staging', targetId: 'player', kind: 'attack' });
  });

  it('does not shuffle troops when production is disabled', () => {
    const state = createSimulation(opening().territories, { unitsPerSecond: 0 });
    expect(chooseOrder(state)).toBeNull();
  });

  it('stages at the legal bridge endpoint rather than sending across the river illegally', () => {
    const nodes = [city('rear', 48, 60, 400), city('south', 50, 180, 290),
      city('north', 300, 180, 190, 'player')];
    const river = createRiver({ top: 225, bottom: 255,
      bridges: [{ id: 'bridge', northId: 'north', southId: 'south', width: 64 }] }, nodes);
    const state = createSimulation(nodes, undefined, river);
    expect(chooseOrder(state)).toMatchObject({ sourceId: 'rear', targetId: 'south' });
  });

  it('does not transfer through a mountain even if it would free production', () => {
    const nodes = [city('rear', 48, 60, 350), city('staging', 50, 300, 350), hostile];
    const terrain = createTerrain({ bounds: { minX: 0, minY: 0, maxX: 360, maxY: 480 }, crossings: [],
      barriers: [{ id: 'ridge', kind: 'mountain', bounds: { minX: 150, minY: 300, maxX: 210, maxY: 400 } }] });
    expect(chooseOrder(createSimulation(nodes, undefined, undefined, terrain))).toBeNull();
  });

  it('applies to any AI faction without mutating the state', () => {
    const initial = opening();
    const state = createSimulation(initial.territories.map(node => node.owner === 'enemy' ? { ...node, owner: 'enemy-2' } : node));
    const snapshot = structuredClone(state);
    expect(chooseOrder(state, undefined, 'enemy-2')).toMatchObject({ sourceId: 'rear-left', targetId: 'staging' });
    expect(state).toEqual(snapshot);
  });
});
