import type { Territory } from '../game/types';
import type { DragSelection } from './drag';
import { bindDrag } from './bindDrag';
import { bindKeyboard } from './bindKeyboard';
import type { River } from '../game/river';

export function bindBoardInput(canvas: HTMLCanvasElement, getTerritories: () => readonly Territory[],
  onSelection: (selection: DragSelection | null) => void, onDispatch: (source: string, target: string) => void, getRiver: () => River | undefined = () => undefined) {
  let pointer: ReturnType<typeof bindDrag> | undefined;
  const root = canvas.parentElement ?? canvas;
  const keyboard = bindKeyboard(root, canvas, getTerritories,
    next => { if (next) pointer?.cancel(); onSelection(next); }, onDispatch);
  pointer = bindDrag(canvas, getTerritories,
    next => { if (next) keyboard.cancel(); onSelection(next); }, onDispatch, getRiver);
  function key(event: KeyboardEvent) {
    if (event.key === 'Escape') pointer!.cancel();
  }
  // Mouse presses prevent default focus changes; Escape must also work when focus is outside the board.
  const keyRoot = canvas.ownerDocument ?? document;
  keyRoot.addEventListener('keydown', key);
  return {
    cancel() { pointer!.cancel(); keyboard.cancel(); },
    validate() { pointer!.validate(); keyboard.validate(); },
    dispose() {
      keyRoot.removeEventListener('keydown', key);
      pointer!.dispose(); keyboard.dispose();
    },
  };
}
