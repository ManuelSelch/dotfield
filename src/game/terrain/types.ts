import type { Point } from '@/game/types';

// Authored logical-field geometry, independent of Canvas/Voronoi cells.
export interface Bounds {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}
export interface Barrier {
  readonly id: string;
  readonly kind: 'mountain' | 'river';
  readonly bounds: Bounds;
}
export interface Crossing {
  readonly id: string;
  readonly kind: 'bridge' | 'pass';
  readonly barrierId: string;
  readonly from: Point;
  readonly to: Point;
}
export interface Terrain {
  readonly bounds: Bounds;
  readonly barriers: readonly Barrier[];
  readonly crossings: readonly Crossing[];
}
export interface PlannedRoute {
  // Border-to-border centerline. Bends and crossing endpoints remain explicit.
  readonly points: readonly Point[];
  readonly distance: number;
  readonly durationMs: number;
  readonly crossingIds: readonly string[];
}
