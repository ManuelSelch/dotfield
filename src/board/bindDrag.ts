import type { Point, Territory } from '../game/types';
import type { DragSelection } from './drag';
import { hitTest } from './hitTest';
import { screenPoint } from './layout';
import type { River } from '../game/river';
import type { CityInputOptions } from './cityInputOptions';

const MOUSE_DRAG_THRESHOLD = 5; // CSS pixels, independent of board scaling/DPR.
const CITY_TAP_THRESHOLD = 8; // Approved management tap tolerance; legacy input stays unchanged.

export function bindDrag(
  canvas: HTMLCanvasElement, getTerritories: () => readonly Territory[],
  onSelection: (selection: DragSelection | null) => void,
  onDispatch: (source: string, target: string) => void,
  getRiver: () => River | undefined = () => undefined,
  options: CityInputOptions = {},
) {
  let clicked: DragSelection | null = null;
  let active: { pointerId: number; mouse: boolean; sourceId: string | null;
    start: Point; dragging: boolean; targetMode: ReturnType<NonNullable<CityInputOptions['getTargetMode']>> } | null = null;
  function owned(id: string | null) {
    return getTerritories().some(node => node.id === id && node.owner === 'player');
  }
  function eligible(id: string | null) {
    return getTerritories().some(node => node.id === id && node.owner === 'player' && node.units >= 2);
  }
  function location(event: PointerEvent) {
    const bounds = canvas.getBoundingClientRect();
    const point = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
    return { point, id: hitTest(getTerritories(), bounds.width, bounds.height, point, getRiver()) };
  }
  function cancel() {
    const selected = !!active || !!clicked;
    const pointerId = active?.pointerId;
    active = null; clicked = null;
    if (selected) onSelection(null);
    if (pointerId !== undefined && canvas.hasPointerCapture(pointerId)) canvas.releasePointerCapture(pointerId);
  }
  function validate() {
    if (document.hidden || (clicked && !eligible(clicked.sourceId))
      || (active?.sourceId && !(options.onOwnedCityTap ? owned(active.sourceId) : eligible(active.sourceId)))) cancel();
  }
  function down(event: PointerEvent) {
    if (active || !event.isPrimary || event.button !== 0 || document.hidden) return;
    validate();
    const mouse = event.pointerType === 'mouse';
    // A touch/pen gesture must never consume a mouse click selection.
    if (!mouse) cancel();
    const { point, id } = location(event);
    const targetMode = options.getTargetMode?.() ?? null;
    const sourceId = (eligible(id) || (options.onOwnedCityTap && owned(id))) ? id : null;
    if (!sourceId && !(mouse && clicked && id) && !targetMode && !options.onOutsideTap) return;
    active = { sourceId, mouse, pointerId: event.pointerId, targetMode,
      start: { x: event.clientX, y: event.clientY }, dragging: !mouse && !options.onOwnedCityTap && !targetMode };
    canvas.setPointerCapture(event.pointerId);
    event.preventDefault();
    if (!targetMode) onSelection(clicked ?? (sourceId ? { sourceId, targetId: null, point } : null));
  }
  function update(event: PointerEvent) {
    if (!active) return;
    const threshold = options.onOwnedCityTap || active.targetMode ? CITY_TAP_THRESHOLD : MOUSE_DRAG_THRESHOLD;
    if (!active.dragging && Math.hypot(event.clientX - active.start.x, event.clientY - active.start.y) >= threshold) {
      active.dragging = true; clicked = null;
    }
    if (active.dragging && !active.targetMode) {
      const { point, id } = location(event);
      onSelection(active.sourceId ? { sourceId: active.sourceId,
        targetId: id === active.sourceId ? null : id, point } : null);
    }
  }
  function move(event: PointerEvent) {
    validate();
    if (event.pointerId === active?.pointerId) update(event);
  }
  function up(event: PointerEvent) {
    validate();
    if (event.pointerId !== active?.pointerId) return;
    update(event); // Include final movement even if no pointermove was delivered.
    const press = active!;
    const { id } = location(event);
    const prior = clicked;
    cancel();
    if (document.hidden) return;
    if (press.targetMode || options.getTargetMode?.()) {
      if (!press.dragging && press.targetMode === options.getTargetMode?.()) {
        if (id) options.onTargetTap?.(id, press.targetMode!);
        else options.onOutsideTap?.();
      }
      return;
    }
    if (!id) { if (!press.dragging) options.onOutsideTap?.(); return; }
    if (!press.dragging && !prior) {
      if (id === press.sourceId && owned(id)) options.onOwnedCityTap?.(id);
      else if (!owned(id)) { options.onOutsideTap?.(); return; }
    }
    if (press.dragging) {
      if (press.sourceId && id !== press.sourceId && eligible(press.sourceId)) onDispatch(press.sourceId, id);
    } else if (prior) {
      if (id !== prior.sourceId && eligible(prior.sourceId)) onDispatch(prior.sourceId, id);
    } else if (press.mouse && id === press.sourceId && eligible(id)) {
      const bounds = canvas.getBoundingClientRect();
      // Persistent clicks show just the source highlight, not a stale pointer route.
      const node = getTerritories().find(node => node.id === id)!;
      clicked = { sourceId: id, targetId: null, point: screenPoint(node, bounds.width, bounds.height) };
      onSelection(clicked);
    }
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
    cancel, validate,
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
