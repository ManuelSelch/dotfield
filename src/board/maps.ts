import type { Territory } from '../game/types';
import { TERRITORIES } from './map';

export interface FieldMap {
  readonly id: string; readonly name: string; readonly description: string;
  readonly territories: readonly Territory[];
}

export const MAPS: readonly FieldMap[] = [
  { id: 'meadow', name: 'Meadow', description: 'Thirteen cities. Room to spread.', territories: TERRITORIES },
  { id: 'forks', name: 'Forks', description: 'Eleven cities. Choose your flank.', territories: [
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
  { id: 'ridge', name: 'Ridge', description: 'Nine cities. A diagonal contest.', territories: [
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
];
