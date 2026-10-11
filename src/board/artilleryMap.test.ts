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
  const feature=gun.features![0];
  expect(feature).toMatchObject({kind:'artillery',range:110,fireIntervalMs:1000/3});
  expect(gun.owner).toBe('neutral');
  const state=createSimulation(map.territories,undefined,undefined,map.terrain);
  if(feature.kind!=='artillery')throw new Error('Artillery missing');
  expect(artilleryTarget(state,gun,feature)).toBeUndefined();
  expect(artilleryTarget(state,{...gun,owner:'player'},feature)?.id).toBe('near');
  expect(artilleryTarget(state,{...gun,owner:'enemy'},feature)?.id).toBe('friendly');
  expect(dispatchUnits({...state,territories:state.territories.map(c=>c.id===gun.id?{...c,owner:'player'}:c)},gun.id,'blocked')).not.toMatchObject({transfers:[]});
  expect(dispatchUnits(state,'friendly',gun.id).transfers.length).toBeGreaterThan(0);
  expect(dispatchUnits(state,'near',gun.id,'enemy').transfers.length).toBeGreaterThan(0);
});
