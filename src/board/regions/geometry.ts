import type { Territory } from '../../game/types';
import { projectBoard, screenPoint } from '../layout';
import type { River } from '../../game/river';
import { territoryRegions } from '../../game/territoryRegions';
export type { CityRegion } from '../../game/territoryRegions';

export function createCityRegions(territories: readonly Territory[], width: number, height: number, river?: River) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return [];
  return territoryRegions(projectBoard(territories, width, height), width, height, river ? {
    top: screenPoint({ x: 0, y: river.top }, width, height).y,
    bottom: screenPoint({ x: 0, y: river.bottom }, width, height).y,
  } : undefined);
}
