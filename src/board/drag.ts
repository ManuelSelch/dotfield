import type { Point } from '@/game/types';

export interface DragSelection {
  readonly focusId?: string;
  readonly sourceId: string;
  readonly targetId: string | null;
  readonly point: Point;
}
