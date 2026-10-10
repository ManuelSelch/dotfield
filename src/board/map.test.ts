import { describe, expect, it } from 'vitest';
import { TERRITORIES } from './map';
import { TERRITORY_RADIUS, DOT_RADIUS, DOT_SPACING } from '../game/settings';

describe('approved thirteen-city map', () => {
  it('starts with equal opposing armies and eleven neutral cities', () => {
    expect(TERRITORIES).toHaveLength(13);
    expect(TERRITORIES.filter(n => n.owner === 'neutral')).toHaveLength(11);
    expect(TERRITORIES.filter(n => n.owner !== 'neutral').map(n => n.units)).toEqual([36, 36]);
    expect(new Set(TERRITORIES.map(n => n.id)).size).toBe(13);
  });
  it('balances positions and neutral defenders by rotating around the field center', () => {
    for (const city of TERRITORIES) {
      const opposite = TERRITORIES.find(n => n.x === 360 - city.x && n.y === 480 - city.y);
      expect(opposite).toBeDefined();
      expect(opposite!.units).toBe(city.units);
    }
  });
  it('uses approved smaller shared circle and troop geometry', () => {
    expect(TERRITORY_RADIUS).toBe(14);
    expect(DOT_RADIUS).toBe(3);
    expect(DOT_SPACING).toBe(8);
    expect(DOT_SPACING).toBeGreaterThan(2 * DOT_RADIUS);
  });
});
