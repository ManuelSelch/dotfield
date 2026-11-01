import type { Territory } from '@/game/types';

import type { CityInputOptions } from './city-input-options';
import type { DragSelection } from './drag';
import { screenPoint } from './layout';

export function bindKeyboard(
  root: HTMLElement,
  canvas: HTMLCanvasElement,
  getTerritories: () => readonly Territory[],
  onSelection: (selection: DragSelection | null) => void,
  onDispatch: (source: string, target: string) => void,
  options: CityInputOptions = {},
) {
  let sourceId: string | null = null;
  let focusId: string | null = null;
  const cityId = (event: Event) =>
    (event.target as Element).closest<HTMLButtonElement>('button[data-city-id]')?.dataset.cityId;
  function cancel() {
    const selected = sourceId !== null || focusId !== null;
    sourceId = null;
    focusId = null;
    if (selected) onSelection(null);
  }
  function validate() {
    if (
      sourceId &&
      !getTerritories().some(
        (node) => node.id === sourceId && node.owner === 'player' && node.units >= 2,
      )
    )
      cancel();
  }
  function notify() {
    const node = getTerritories().find((n) => n.id === focusId);
    if (!node) {
      cancel();
      return;
    }
    const bounds = canvas.getBoundingClientRect();
    onSelection({
      sourceId: sourceId ?? '',
      focusId: node.id,
      targetId: sourceId && sourceId !== node.id ? node.id : null,
      point: screenPoint(node, bounds.width, bounds.height),
    });
  }
  function focus(event: Event) {
    const id = cityId(event);
    if (!id) return;
    focusId = id;
    notify();
  }
  function click(event: Event) {
    validate();
    const id = cityId(event);
    const node = getTerritories().find((n) => n.id === id);
    if (!node || document.hidden) return;
    const targetMode = options.getTargetMode?.();
    if (targetMode) {
      cancel();
      options.onTargetTap?.(node.id, targetMode);
      return;
    }
    if (!sourceId && node.owner === 'player') options.onOwnedCityTap?.(node.id, 'keyboard');
    else if (!sourceId && node.owner !== 'player') options.onOutsideTap?.();
    if (sourceId && sourceId !== id) {
      const source = sourceId;
      cancel();
      onDispatch(source, node.id);
      focusId = node.id;
      notify();
    } else if (sourceId === id) {
      cancel();
      focusId = node.id;
      notify();
    } else if (node.owner === 'player' && node.units >= 2) {
      sourceId = node.id;
      focusId = node.id;
      notify();
    } else {
      focusId = node.id;
      notify();
    }
  }
  function key(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      cancel();
    }
    // Native buttons provide Enter/Space activation through click, including screen readers.
  }
  function blur(event: FocusEvent) {
    if (!event.relatedTarget || !root.contains(event.relatedTarget as Node)) cancel();
  }
  root.addEventListener('focusin', focus);
  root.addEventListener('focusout', blur);
  root.addEventListener('click', click);
  root.addEventListener('keydown', key);
  return {
    cancel,
    validate,
    dispose() {
      cancel();
      root.removeEventListener('focusin', focus);
      root.removeEventListener('focusout', blur);
      root.removeEventListener('click', click);
      root.removeEventListener('keydown', key);
    },
  };
}
