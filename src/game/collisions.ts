import { compareCodeUnits } from '@/shared/domain/compare-code-units';

import { groupContacts } from './contacts';
import { transferPosition } from './movement';
import { DOT_RADIUS, DOT_SPACING } from './settings';
import { progressAt, trajectory, type Trajectory } from './trajectory';
import type { SimulationState, Transfer } from './types';

export function hasOpposingTransfers(state: SimulationState): boolean {
  return new Set(state.transfers.map((t) => t.owner)).size > 1;
}

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}
const COLLISION_CELL_SIZE = 64;

function transferBounds(transfer: Transfer, motion: Trajectory): Bounds {
  const padding = DOT_RADIUS + (Math.max(0, transfer.formationSize - 1) * DOT_SPACING) / 2;
  const points = motion.segments.flatMap((segment) => [
    transferPosition(transfer, progressAt(segment, segment.start)),
    transferPosition(transfer, progressAt(segment, segment.end)),
  ]);
  return {
    minX: Math.min(...points.map((point) => point.x)) - padding,
    minY: Math.min(...points.map((point) => point.y)) - padding,
    maxX: Math.max(...points.map((point) => point.x)) + padding,
    maxY: Math.max(...points.map((point) => point.y)) + padding,
  };
}

/** Conservative path broad-phase used to avoid dot-level work for distant groups. */
export function mayContact(first: Bounds, second: Bounds): boolean {
  return (
    first.minX <= second.maxX &&
    first.maxX >= second.minX &&
    first.minY <= second.maxY &&
    first.maxY >= second.minY
  );
}

function cellKey(x: number, y: number) {
  return `${x},${y}`;
}

function coveredCells(bounds: Bounds) {
  const cells: string[] = [];
  const minX = Math.floor(bounds.minX / COLLISION_CELL_SIZE);
  const maxX = Math.floor(bounds.maxX / COLLISION_CELL_SIZE);
  const minY = Math.floor(bounds.minY / COLLISION_CELL_SIZE);
  const maxY = Math.floor(bounds.maxY / COLLISION_CELL_SIZE);
  for (let x = minX; x <= maxX; x++) for (let y = minY; y <= maxY; y++) cells.push(cellKey(x, y));
  return cells;
}

/** Returns only spatially plausible opposing group pairs. */
export function spatialCandidates(
  first: readonly Transfer[],
  second: readonly Transfer[],
  bounds: ReadonlyMap<number, Bounds>,
) {
  const grid = new Map<string, Transfer[]>();
  for (const transfer of second)
    for (const key of coveredCells(bounds.get(transfer.id)!)) {
      const cell = grid.get(key);
      if (cell) cell.push(transfer);
      else grid.set(key, [transfer]);
    }

  const pairs: [Transfer, Transfer][] = [];
  for (const transfer of first) {
    const seen = new Set<number>();
    for (const key of coveredCells(bounds.get(transfer.id)!))
      for (const other of grid.get(key) ?? []) {
        if (seen.has(other.id) || !mayContact(bounds.get(transfer.id)!, bounds.get(other.id)!))
          continue;
        seen.add(other.id);
        pairs.push([transfer, other]);
      }
  }
  return pairs;
}

export function resolveTravelCollisions(
  state: SimulationState,
  elapsedMs: number,
  motions?: ReadonlyMap<number, Trajectory>,
): SimulationState {
  if (state.roundStatus !== 'playing' || elapsedMs === 0 || !hasOpposingTransfers(state))
    return state;
  const groups = new Map<string, typeof state.transfers>();
  for (const transfer of state.transfers)
    groups.set(transfer.owner, [...(groups.get(transfer.owner) ?? []), transfer]);
  const factionIds = [...groups.keys()].sort(compareCodeUnits);
  const resolvedMotions = new Map(
    state.transfers.map((transfer) => [
      transfer.id,
      motions?.get(transfer.id) ?? trajectory(transfer, elapsedMs),
    ]),
  );
  const bounds = new Map(
    state.transfers.map((transfer) => [
      transfer.id,
      transferBounds(transfer, resolvedMotions.get(transfer.id)!),
    ]),
  );
  const contacts = [] as ReturnType<typeof groupContacts>;
  for (let i = 0; i < factionIds.length; i++)
    for (let j = i + 1; j < factionIds.length; j++)
      for (const [first, second] of spatialCandidates(
        groups.get(factionIds[i])!,
        groups.get(factionIds[j])!,
        bounds,
      ))
        contacts.push(
          ...groupContacts(
            first,
            second,
            elapsedMs,
            resolvedMotions.get(first.id),
            resolvedMotions.get(second.id),
          ),
        );

  contacts.sort(
    (a, b) =>
      a.time - b.time ||
      a.firstId - b.firstId ||
      a.firstSlot - b.firstSlot ||
      a.secondId - b.secondId ||
      a.secondSlot - b.secondSlot,
  );
  const destroyed = new Map<number, Set<number>>();
  for (const contact of contacts) {
    if (
      destroyed.get(contact.firstId)?.has(contact.firstSlot) ||
      destroyed.get(contact.secondId)?.has(contact.secondSlot)
    )
      continue;
    for (const [id, slot] of [
      [contact.firstId, contact.firstSlot],
      [contact.secondId, contact.secondSlot],
    ]) {
      const slots = destroyed.get(id) ?? new Set<number>();
      slots.add(slot);
      destroyed.set(id, slots);
    }
  }
  if (!destroyed.size) return state;
  const transfers = state.transfers.flatMap((batch) => {
    const removed = destroyed.get(batch.id);
    if (!removed) return [batch];
    const dotSlots = batch.dotSlots.filter((slot) => !removed.has(slot));
    return dotSlots.length ? [{ ...batch, units: dotSlots.length, dotSlots }] : [];
  });
  return { ...state, transfers };
}
