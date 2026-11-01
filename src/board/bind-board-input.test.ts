import { afterEach, expect, it, vi } from 'vitest';

import { bindBoardInput } from './bind-board-input';
import { bindDrag } from './bind-drag';
import { bindKeyboard } from './bind-keyboard';
vi.mock('./bind-drag', () => ({
  bindDrag: vi.fn(() => ({ cancel: vi.fn(), validate: vi.fn(), dispose: vi.fn() })),
}));
vi.mock('./bind-keyboard', () => ({
  bindKeyboard: vi.fn(() => ({ cancel: vi.fn(), validate: vi.fn(), dispose: vi.fn() })),
}));
afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});
function harness(options: import('./city-input-options').CityInputOptions = {}) {
  const root = new EventTarget();
  vi.stubGlobal('document', root);
  const canvas = { parentElement: root } as unknown as HTMLCanvasElement;
  const onSelection = vi.fn();
  const input = bindBoardInput(canvas, () => [], onSelection, vi.fn(), undefined, options);
  return {
    root,
    input,
    onSelection,
    pointer: vi.mocked(bindDrag).mock.results.at(-1)!.value,
    keyboard: vi.mocked(bindKeyboard).mock.results.at(-1)!.value,
  };
}
it('forwards optional management and target adapters to both input paths', () => {
  const options = { onOwnedCityTap: vi.fn(), getTargetMode: () => 'fly' as const };
  harness(options);
  expect(vi.mocked(bindDrag).mock.lastCall?.[5]).toBe(options);
  expect(vi.mocked(bindKeyboard).mock.lastCall?.[5]).toBe(options);
});
it('Escape cancels mouse selection and cleanup removes its listener', () => {
  const h = harness();
  const escape = () => h.root.dispatchEvent(Object.assign(new Event('keydown'), { key: 'Escape' }));
  escape();
  expect(h.pointer.cancel).toHaveBeenCalledOnce();
  h.input.dispose();
  escape();
  expect(h.pointer.cancel).toHaveBeenCalledOnce();
});
it('coordinates keyboard and pointer selection without contradictory sources', () => {
  const h = harness();
  const selection = { sourceId: 'source', targetId: null, point: { x: 0, y: 0 } };
  vi.mocked(bindDrag).mock.lastCall![2](selection);
  expect(h.keyboard.cancel).toHaveBeenCalledOnce();
  vi.mocked(bindKeyboard).mock.lastCall![3](selection);
  expect(h.pointer.cancel).toHaveBeenCalledOnce();
  expect(h.onSelection).toHaveBeenLastCalledWith(selection);
});
it('validates pending selections for both input modes as the board changes', () => {
  const h = harness();
  h.input.validate();
  expect(h.pointer.validate).toHaveBeenCalledOnce();
  expect(h.keyboard.validate).toHaveBeenCalledOnce();
});
