import type { Territory } from '../game/types';
import type { DragSelection } from './drag';
import { hitTest } from './hitTest';

export function bindDrag(
  canvas: HTMLCanvasElement, getTerritories: () => readonly Territory[],
  onSelection: (selection: DragSelection | null) => void,
  onDispatch: (source: string, target: string) => void,
) {
  let active: { pointerId: number; sourceId: string } | null = null;
  function selection(event: PointerEvent): DragSelection {
    const bounds = canvas.getBoundingClientRect();
    const point = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
    const target = hitTest(getTerritories(), bounds.width, bounds.height, point);
    return { sourceId: active!.sourceId, targetId: target === active!.sourceId ? null : target, point };
  }
  function cancel() {
    const pointerId = active?.pointerId;
    active = null;
    onSelection(null);
    if (pointerId !== undefined && canvas.hasPointerCapture(pointerId)) canvas.releasePointerCapture(pointerId);
  }
  function down(event: PointerEvent) {
    if (active || !event.isPrimary || event.button !== 0 || document.hidden) return;
    const bounds = canvas.getBoundingClientRect();
    const sourceId = hitTest(getTerritories(), bounds.width, bounds.height,
      { x: event.clientX - bounds.left, y: event.clientY - bounds.top });
    const source = getTerritories().find((node) => node.id === sourceId);
    if (!source || source.owner !== 'player' || source.units < 2) return;
    active = { sourceId: source.id, pointerId: event.pointerId };
    canvas.setPointerCapture(event.pointerId);
    event.preventDefault();
    onSelection(selection(event));
  }
  function move(event: PointerEvent) {
    if (event.pointerId === active?.pointerId) onSelection(selection(event));
  }
  function up(event: PointerEvent) {
    if (event.pointerId !== active?.pointerId) return;
    const { sourceId, targetId } = selection(event);
    cancel();
    if (targetId && !document.hidden) onDispatch(sourceId, targetId);
  }
  function interrupted(event: PointerEvent) {
    if (event.pointerId === active?.pointerId) cancel();
  }
  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', interrupted);
  canvas.addEventListener('lostpointercapture', interrupted);
  return {
    cancel,
    dispose() {
      cancel();
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointercancel', interrupted);
      canvas.removeEventListener('lostpointercapture', interrupted);
    },
  };
}
