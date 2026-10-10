import type { Territory } from '../game/types';
import { TERRITORIES } from './map';
import { RIVER_MAP } from './riverMap';
import { FACTORY_MAP } from './factoryMap';
import type { River } from '../game/river';

export interface FieldMap {
  readonly id: string;
  readonly territories: readonly Territory[];
  readonly river?: River;
}

export const MAPS: readonly FieldMap[] = [
  { id: 'meadow', territories: TERRITORIES },
  { id: 'forks', territories: [
    { id: 'north', owner: 'enemy', units: 36, x: 180, y: 40 },
    { id: 'north-west', owner: 'neutral', units: 8, x: 70, y: 110 },
    { id: 'north-east', owner: 'neutral', units: 8, x: 290, y: 110 },
    { id: 'upper-west', owner: 'neutral', units: 12, x: 95, y: 210 },
    { id: 'upper-east', owner: 'neutral', units: 12, x: 265, y: 210 },
    { id: 'centre', owner: 'neutral', units: 20, x: 180, y: 240 },
    { id: 'lower-west', owner: 'neutral', units: 12, x: 95, y: 270 },
    { id: 'lower-east', owner: 'neutral', units: 12, x: 265, y: 270 },
    { id: 'south-west', owner: 'neutral', units: 8, x: 70, y: 370 },
    { id: 'south-east', owner: 'neutral', units: 8, x: 290, y: 370 },
    { id: 'south', owner: 'player', units: 36, x: 180, y: 440 },
  ] },
  { id: 'ridge', territories: [
    { id: 'north', owner: 'enemy', units: 36, x: 70, y: 40 },
    { id: 'north-east', owner: 'neutral', units: 10, x: 250, y: 90 },
    { id: 'upper-west', owner: 'neutral', units: 8, x: 80, y: 150 },
    { id: 'upper-east', owner: 'neutral', units: 12, x: 260, y: 190 },
    { id: 'centre', owner: 'neutral', units: 20, x: 180, y: 240 },
    { id: 'lower-west', owner: 'neutral', units: 12, x: 100, y: 290 },
    { id: 'lower-east', owner: 'neutral', units: 8, x: 280, y: 330 },
    { id: 'south-west', owner: 'neutral', units: 10, x: 110, y: 390 },
    { id: 'south', owner: 'player', units: 36, x: 290, y: 440 },
  ] },
  { id: 'dense', territories: [
    { id: 'north', owner: 'enemy', units: 36, x: 180, y: 40 },
    { id: 'north-west', owner: 'neutral', units: 8, x: 70, y: 100 },
    { id: 'north-centre', owner: 'neutral', units: 12, x: 180, y: 100 },
    { id: 'north-east', owner: 'neutral', units: 8, x: 290, y: 100 },
    { id: 'upper-west', owner: 'neutral', units: 10, x: 45, y: 170 },
    { id: 'upper-mid-west', owner: 'neutral', units: 12, x: 110, y: 170 },
    { id: 'upper-centre', owner: 'neutral', units: 14, x: 180, y: 170 },
    { id: 'upper-mid-east', owner: 'neutral', units: 12, x: 250, y: 170 },
    { id: 'upper-east', owner: 'neutral', units: 10, x: 315, y: 170 },
    { id: 'middle-west', owner: 'neutral', units: 10, x: 70, y: 240 },
    { id: 'centre', owner: 'neutral', units: 20, x: 180, y: 240 },
    { id: 'middle-east', owner: 'neutral', units: 10, x: 290, y: 240 },
    { id: 'lower-west', owner: 'neutral', units: 10, x: 45, y: 310 },
    { id: 'lower-mid-west', owner: 'neutral', units: 12, x: 110, y: 310 },
    { id: 'lower-centre', owner: 'neutral', units: 14, x: 180, y: 310 },
    { id: 'lower-mid-east', owner: 'neutral', units: 12, x: 250, y: 310 },
    { id: 'lower-east', owner: 'neutral', units: 10, x: 315, y: 310 },
    { id: 'south-west', owner: 'neutral', units: 8, x: 70, y: 380 },
    { id: 'south-centre', owner: 'neutral', units: 12, x: 180, y: 380 },
    { id: 'south-east', owner: 'neutral', units: 8, x: 290, y: 380 },
    { id: 'south', owner: 'player', units: 36, x: 180, y: 440 },
  ] },
  { id: 'crossfire', territories: [
    { id: 'north', owner: 'neutral', units: 12, x: 180, y: 40 },
    { id: 'north-west', owner: 'neutral', units: 8, x: 70, y: 100 },
    { id: 'north-centre', owner: 'neutral', units: 12, x: 180, y: 100 },
    { id: 'north-east', owner: 'neutral', units: 8, x: 290, y: 100 },
    { id: 'upper-west', owner: 'neutral', units: 10, x: 45, y: 170 },
    { id: 'upper-mid-west', owner: 'neutral', units: 12, x: 110, y: 170 },
    { id: 'upper-centre', owner: 'neutral', units: 14, x: 180, y: 170 },
    { id: 'upper-mid-east', owner: 'neutral', units: 12, x: 250, y: 170 },
    { id: 'upper-east', owner: 'neutral', units: 10, x: 315, y: 170 },
    { id: 'middle-west', owner: 'neutral', units: 10, x: 70, y: 240 },
    { id: 'centre', owner: 'neutral', units: 20, x: 180, y: 240 },
    { id: 'middle-east', owner: 'neutral', units: 10, x: 290, y: 240 },
    { id: 'lower-west', owner: 'neutral', units: 10, x: 45, y: 310 },
    { id: 'lower-mid-west', owner: 'neutral', units: 12, x: 110, y: 310 },
    { id: 'lower-centre', owner: 'neutral', units: 14, x: 180, y: 310 },
    { id: 'lower-mid-east', owner: 'neutral', units: 12, x: 250, y: 310 },
    { id: 'lower-east', owner: 'neutral', units: 10, x: 315, y: 310 },
    { id: 'south-west', owner: 'neutral', units: 8, x: 70, y: 380 },
    { id: 'south-centre', owner: 'neutral', units: 12, x: 180, y: 380 },
    { id: 'south-east', owner: 'neutral', units: 8, x: 290, y: 380 },
    { id: 'south', owner: 'player', units: 36, x: 180, y: 440 },
    { id: 'enemy-west', owner: 'enemy', units: 30, x: 70, y: 40 },
    { id: 'enemy-east', owner: 'enemy-2', units: 30, x: 290, y: 40 },
  ] },
  RIVER_MAP,
  FACTORY_MAP,
];
