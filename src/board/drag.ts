import type { Point } from '../game/types';

export interface DragSelection {
  readonly sourceId: string;
  readonly targetId: string | null;
  readonly point: Point;
}
