import type { Territory } from '../game/types';
import type { DragSelection } from './drag';
import { bindDrag } from './bindDrag';
import { bindKeyboard } from './bindKeyboard';

export function bindBoardInput(canvas: HTMLCanvasElement, getTerritories: () => readonly Territory[],
  onSelection: (selection: DragSelection | null) => void, onDispatch: (source: string, target: string) => void) {
  let pointer: ReturnType<typeof bindDrag> | undefined;
  const keyboard = bindKeyboard(canvas.parentElement ?? canvas, canvas, getTerritories,
    next => { if (next) pointer?.cancel(); onSelection(next); }, onDispatch);
  pointer = bindDrag(canvas, getTerritories,
    next => { if (next) keyboard.cancel(); onSelection(next); }, onDispatch);
  return {
    cancel() { pointer!.cancel(); keyboard.cancel(); },
    dispose() { pointer!.dispose(); keyboard.dispose(); },
  };
}
