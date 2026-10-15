import { expect, it } from 'vitest';
import { ARTILLERY_MAP } from './artilleryMap';
import { createSimulation } from '../game/state';
import { artilleryTarget } from '../game/features/artillery';
import { dispatchUnits } from '../game/dispatch';

it('authors an immutable siege map with an inactive contested Artillery and no blocking ridge', () => {
  const map=ARTILLERY_MAP;
  expect(map.id).toBe('siege');
  expect(Object.isFrozen(map.territories)).toBe(true);
  const gun=map.territories.find(c=>c.id==='artillery')!;
  expect(gun.cityType).toBe('artillery');
  expect(gun.features).toEqual([]);
  expect(gun.owner).toBe('neutral');
  const state=createSimulation(map.territories,undefined,undefined,map.terrain);
  expect(artilleryTarget(state,gun)).toBeUndefined();
  expect(artilleryTarget(state,{...gun,owner:'player'})?.id).toBe('near');
  expect(artilleryTarget(state,{...gun,owner:'enemy'})?.id).toBe('friendly');
  expect(dispatchUnits({...state,territories:state.territories.map(c=>c.id===gun.id?{...c,owner:'player'}:c)},gun.id,'blocked')).not.toMatchObject({transfers:[]});
  expect(dispatchUnits(state,'friendly',gun.id).transfers.length).toBeGreaterThan(0);
  expect(dispatchUnits(state,'near',gun.id,'enemy').transfers.length).toBeGreaterThan(0);
});
