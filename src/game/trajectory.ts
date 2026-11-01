import { slowIntervals } from './features/slow-zone';
import { traveledTime } from './movement';
import type { SimulationState, Transfer } from './types';

export interface MotionSegment {
  readonly start: number;
  readonly end: number;
  readonly from: number;
  readonly to: number;
}
export interface Trajectory {
  readonly segments: readonly MotionSegment[];
  readonly traveledMs: number;
  readonly arrivalMs: number | null;
}

// Time offsets are relative to this step; progress is distance in base-speed ms.
// Circle boundaries split sweeps even when both endpoints are outside a zone.
export function trajectory(
  transfer: Transfer,
  elapsedMs: number,
  state?: SimulationState,
): Trajectory {
  let time = Math.max(0, -transfer.elapsedMs);
  let progress = traveledTime(transfer);
  const segments: MotionSegment[] = [];
  const intervals = state ? slowIntervals(state, transfer) : [];
  const boundaries = [
    ...new Set([...intervals.flatMap((i) => [i.from, i.to]), transfer.durationMs]),
  ]
    .filter((boundary) => boundary > progress + 1e-7)
    .sort((a, b) => a - b);
  for (const boundary of boundaries) {
    if (time > elapsedMs || progress >= transfer.durationMs) break;
    const midpoint = (progress + boundary) / 2;
    const multiplier = Math.min(
      1,
      ...intervals.filter((i) => midpoint > i.from && midpoint < i.to).map((i) => i.multiplier),
    );
    const end = Math.min(elapsedMs, time + (boundary - progress) / multiplier);
    const to = Math.min(boundary, progress + Math.max(0, end - time) * multiplier);
    segments.push({ start: time, end, from: progress, to });
    time = end;
    progress = to;
    if (end >= elapsedMs) break;
  }
  return {
    segments,
    traveledMs: progress,
    arrivalMs: progress + 1e-7 >= transfer.durationMs ? time : null,
  };
}

export function progressAt(segment: MotionSegment, time: number): number {
  return segment.end === segment.start
    ? segment.from
    : segment.from +
        ((segment.to - segment.from) * (time - segment.start)) / (segment.end - segment.start);
}
