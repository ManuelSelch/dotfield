import type { FieldMap } from './maps';
import type { Territory } from '../game/types';
import { createRiver } from '../game/river';
import { snapshotTerritories } from '../game/features/snapshot';
import { createTerrain } from '../game/terrain/terrain';
import type { Terrain } from '../game/terrain/types';
import { TERRITORY_RADIUS } from '../game/settings';

export interface MapSettings {
  readonly cities: number;
  readonly enemies: number;
  readonly industry: boolean;
  readonly river: boolean;
  readonly mountains: boolean;
  /** @deprecated legacy saved match-preference fields; weapons are now built as city roles. */
  readonly artillery?: boolean;
  /** @deprecated legacy saved match-preference fields; weapons are now built as city roles. */
  readonly watchtower?: boolean;
  readonly slowZone: boolean;
}
export interface GeneratedMap extends FieldMap {
  readonly seed: number;
  readonly settings: MapSettings;
}
export const DEFAULT_MAP_SETTINGS: MapSettings = Object.freeze({ cities: 14, enemies: 2, industry: true, river: true, mountains: true, slowZone: false });
export const enemyIds = (count: number) => Array.from({ length: count }, (_, i) => i === 0 ? 'enemy' : `enemy-${i + 1}`);
const MOUNTAIN_RANGE = { id: 'mountain-range', kind: 'mountain' as const,
  bounds: { minX: 140, minY: 270, maxX: 220, maxY: 370 } };

export function isMapSettings(value: unknown): value is MapSettings {
  if (!value || typeof value !== 'object') return false;
  const settings = value as MapSettings;
  return Number.isInteger(settings.cities) && settings.cities >= 6 && settings.cities <= 30
    && Number.isInteger(settings.enemies) && settings.enemies >= 1 && settings.enemies <= 4
    && typeof settings.industry === 'boolean' && typeof settings.river === 'boolean'
    && typeof settings.mountains === 'boolean'
    && (settings.artillery === undefined || typeof settings.artillery === 'boolean')
    && (settings.watchtower === undefined || typeof settings.watchtower === 'boolean')
    && typeof settings.slowZone === 'boolean';
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
  // Stratified slots bound generation through the supported 30-city maximum.
  const rows = Array.from({ length: 10 }, (_, row) => settings.river
    ? 30 + row * 40 + (row >= 5 ? 60 : 0) : 24 + row * 48);
  const slots: Territory[] = rows.flatMap((y, row) => {
    const mountainRow = settings.mountains && row >= 5 && row <= 7;
    const xs = mountainRow ? [48, 112, 248, 312] : [48, 114, 180, 246, 312];
    const offset = () => settings.river && (row === 4 || row === 5) ? 0 : (random() - 0.5) * 6;
    return xs.map((x, column) => ({
      id: `city-${row * 5 + column + 1}`, owner: 'neutral', units: 8 + Math.floor(random() * 5), x: x + offset(), y: y + offset(),
    }));
  });
  const cities: Territory[] = [];
  const bridgePairs: { north: Territory; south: Territory }[] = [];
  if (settings.river) {
    const northBank = slots.filter(city => city.y === 190).sort((a, b) => a.x - b.x);
    const southBank = slots.filter(city => city.y === 290).sort((a, b) => a.x - b.x);
    for (const column of [0, 1]) {
      const north = northBank[column === 0 ? 0 : northBank.length - 1];
      const south = southBank[column === 0 ? 0 : southBank.length - 1];
      const alignedSouth = { ...south, x: north.x };
      slots[slots.indexOf(south)] = alignedSouth;
      bridgePairs.push({ north, south: alignedSouth });
      cities.push(north, alignedSouth);
    }
  } else cities.push(slots[Math.floor(random() * slots.length)]);
  // Farthest-point sampling spreads sparse maps and faction starts.
  while (cities.length < settings.cities) {
    const candidates = slots.filter(slot => !cities.includes(slot));
    const scores = candidates.map(city => ({ city, score: Math.min(...cities.map(other =>
      Math.hypot(city.x - other.x, city.y - other.y))) * (0.85 + random() * 0.3) }));
    scores.sort((a, b) => b.score - a.score);
    cities.push(scores[0].city);
  }
  // Equal garrisons; terrain-aware slots retain a connected legal staging graph.
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
  if (settings.slowZone) {
    const host = territories[Math.floor(random() * territories.length)];
    territories = territories.map(city => city === host ? { ...city, features: [...(city.features ?? []),
      { id: `${city.id}:slow-zone`, kind: 'slow-zone' as const, radius: 150, speedMultiplier: 0.5 }] } : city);
  }
  if (settings.industry) {
    const neutral = territories.filter(city => city.owner === 'neutral');
    const factoryCount = Math.min(neutral.length, Math.max(1, Math.round(settings.cities / 6)));
    for (let i = 0; i < factoryCount; i++) {
      const host = neutral.splice(Math.floor(random() * neutral.length), 1)[0];
      territories = territories.map(city => city === host ? { ...city, units: 14,
        features: [...(city.features ?? []), { id: `${city.id}:factory`, kind: 'factory', productionMultiplier: 2 }] } : city);
    }
  }
  const river = settings.river ? createRiver({ top: 225, bottom: 255, bridges: bridgePairs.map((pair, index) => ({
    id: `bridge-${index}`, northId: pair.north.id, southId: pair.south.id, width: 64,
  })) }, territories) : undefined;
  const barriers = [...(settings.mountains ? [MOUNTAIN_RANGE] : [])];
  const terrain = barriers.length ? createTerrain({ bounds: { minX: 0, minY: 0, maxX: 360, maxY: 480 }, crossings: [], barriers }) : undefined;
  return Object.freeze({ id: `generated-${seed}`, seed, settings: Object.freeze({ ...settings }),
    territories: snapshotTerritories(territories), ...(terrain ? { terrain } : {}), ...(river ? { river } : {}) });
}
