import type { FieldMap } from './maps';
import type { Territory } from '../game/types';
import { createRiver } from '../game/river';
import { createTerrain } from '../game/terrain/terrain';
import type { Terrain } from '../game/terrain/types';
import { snapshotTerritories } from '../game/features/snapshot';

export interface MapSettings {
  readonly cities: number;
  readonly enemies: number;
  readonly industry: boolean;
  readonly river: boolean;
}
export interface GeneratedMap extends FieldMap {
  readonly terrain: Terrain;
  readonly seed: number;
  readonly settings: MapSettings;
}
export const DEFAULT_MAP_SETTINGS: MapSettings = Object.freeze({ cities: 14, enemies: 2, industry: true, river: true });
export const enemyIds = (count: number) => Array.from({ length: count }, (_, i) => i === 0 ? 'enemy' : `enemy-${i + 1}`);

export function isMapSettings(value: unknown): value is MapSettings {
  if (!value || typeof value !== 'object') return false;
  const settings = value as MapSettings;
  return Number.isInteger(settings.cities) && settings.cities >= 6 && settings.cities <= 24
    && Number.isInteger(settings.enemies) && settings.enemies >= 1 && settings.enemies <= 4
    && typeof settings.industry === 'boolean' && typeof settings.river === 'boolean';
}

// Bounded, reproducible randomness; no simulation or browser dependency.
export function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t ^= t + Math.imul(t ^ t >>> 7, 61 | t);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
export function newMapSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0];
}

export function generateMap(settings: MapSettings, seed: number): GeneratedMap {
  if (!isMapSettings(settings)) throw new RangeError('Invalid map settings.');
  if (!Number.isInteger(seed) || seed < 0 || seed >= 2 ** 32) throw new RangeError('Invalid map seed.');
  const random = seededRandom(seed);
  // Stratified capacity guarantees termination and >=58-unit city separation even
  // at maximum density. Each generation jitters coordinates and chooses new slots.
  const rows = settings.river ? [50, 120, 190, 290, 360, 430] : [40, 120, 200, 280, 360, 440];
  const slots: Territory[] = rows.flatMap((y, row) => {
    const mountainRow = row === 3 || row === 4;
    const xs = mountainRow ? [48, 116, 244, 312] : [48, 136, 224, 312];
    const offset = () => (random() - 0.5) * (mountainRow ? 8 : 12);
    return xs.map((x, column) => ({
      id: `city-${row * 4 + column + 1}`, owner: 'neutral', units: 8 + Math.floor(random() * 5), x: x + offset(), y: y + offset(),
    }));
  });
  const cities: Territory[] = [];
  if (settings.river) {
    for (const column of [0, 3]) {
      const north = slots[8 + column], south = slots[12 + column];
      slots[12 + column] = { ...south, x: north.x }; // Straight paired-city crossings.
      cities.push(north, slots[12 + column]);
    }
  } else cities.push(slots[Math.floor(random() * slots.length)]);
  // Farthest-point sampling spreads sparse maps, with random weighting for variety.
  while (cities.length < settings.cities) {
    const candidates = slots.filter(slot => !cities.includes(slot));
    const scores = candidates.map(city => ({ city, score: Math.min(...cities.map(other =>
      Math.hypot(city.x - other.x, city.y - other.y))) * (0.85 + random() * 0.3) }));
    scores.sort((a, b) => b.score - a.score);
    cities.push(scores[0].city);
  }
  // Equal garrisons, separated starts. Every bank has at least two cities and
  // both bridges remain legal; no generated faction/area can be disconnected.
  const starts: Territory[] = [];
  const factions = ['player', ...enemyIds(settings.enemies)];
  for (let i = 0; i < factions.length; i++) {
    const candidates = cities.filter(city => !starts.includes(city));
    const chosen = starts.length ? candidates.reduce((best, city) => {
      const distance = (c: Territory) => Math.min(...starts.map(other => Math.hypot(c.x - other.x, c.y - other.y)));
      return distance(city) > distance(best) ? city : best;
    }) : candidates.reduce((best, city) => city.y > best.y ? city : best);
    starts.push(chosen);
  }
  let territories = cities.map(city => {
    const index = starts.indexOf(city);
    return index < 0 ? city : { ...city, owner: factions[index], units: 36 };
  });
  if (settings.industry) {
    const neutral = territories.filter(city => city.owner === 'neutral');
    const factoryCount = Math.min(neutral.length, Math.max(1, Math.round(settings.cities / 6)));
    for (let i = 0; i < factoryCount; i++) {
      const host = neutral.splice(Math.floor(random() * neutral.length), 1)[0];
      territories = territories.map(city => city === host ? { ...city, units: 14,
        features: [{ id: `${city.id}:factory`, kind: 'factory', productionMultiplier: 2 }] } : city);
    }
  }
  const river = settings.river ? createRiver({ top: 225, bottom: 255, bridges: [0, 3].map(column => ({
    id: `bridge-${column}`, northId: slots[8 + column].id, southId: slots[12 + column].id, width: 64,
  })) }, territories) : undefined;
  const terrain = createTerrain({ bounds: { minX: 0, minY: 0, maxX: 360, maxY: 480 }, barriers: [{
    id: 'mountain-range', kind: 'mountain', bounds: { minX: 140, minY: 270, maxX: 220, maxY: 370 },
  }], crossings: [] });
  return Object.freeze({ id: `generated-${seed}`, seed, settings: Object.freeze({ ...settings }),
    territories: snapshotTerritories(territories), terrain, ...(river ? { river } : {}) });
}
