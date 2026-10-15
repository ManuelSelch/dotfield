import { afterEach, expect, it, vi } from 'vitest';
import { bindKeyboard } from './bindKeyboard';
import type { CityInputOptions } from './cityInputOptions';
vi.stubGlobal('document', { hidden: false });
afterEach(() => vi.unstubAllGlobals());
function harness(options: CityInputOptions = {}) {
  vi.stubGlobal('document', { hidden: false });
  let id: string | null = 'source';
  const root = Object.assign(new EventTarget(), {
    closest: () => id ? { dataset: { cityId: id } } : null,
  }) as unknown as HTMLElement;
  const canvas = { getBoundingClientRect: () => ({ width: 360, height: 480 }) } as HTMLCanvasElement;
  const nodes = [{ id: 'source', x: 180, y: 420, owner: 'player' as const, units: 1 },
    { id: 'enemy', x: 180, y: 60, owner: 'enemy' as const, units: 20 }];
  const dispatch = vi.fn();
  const select = vi.fn();
  const input = bindKeyboard(root, canvas, () => nodes, select, dispatch, options);
  return { input, dispatch, nodes, select, focus() { root.dispatchEvent(new Event('focusin')); },
    escape() { root.dispatchEvent(Object.assign(new Event('keydown'), { key: 'Escape' })); },
    click(next: string | null) { id = next; root.dispatchEvent(new Event('click')); } };
}
it('opens keyboard owned one-troop cities and ignores unrelated control clicks', () => {
  const tap = vi.fn(), h = harness({ onOwnedCityTap: tap });
  h.click('source'); h.click(null);
  expect(tap).toHaveBeenCalledExactlyOnceWith('source', 'keyboard'); expect(h.dispatch).not.toHaveBeenCalled();
});
it('clears all highlights on Escape rather than recreating a focused selection', () => {
  const h = harness(); h.nodes[0].units = 36;
  h.focus(); h.click('source'); h.escape();
  expect(h.select).toHaveBeenLastCalledWith(null);
  h.click('enemy'); expect(h.dispatch).not.toHaveBeenCalled();
});
it('routes keyboard targeting to the adapter without default ground dispatch', () => {
  const target = vi.fn(), h = harness({ getTargetMode: () => 'fly', onTargetTap: target });
  h.click('enemy'); expect(target).toHaveBeenCalledExactlyOnceWith('enemy', 'fly');
  expect(h.dispatch).not.toHaveBeenCalled();
});
it('retains default keyboard click-to-click dispatch and never reacts to UI clicks', () => {
  const h = harness(); h.nodes[0].units = 36;
  h.click('source'); h.click(null); h.click('enemy');
  expect(h.dispatch).toHaveBeenCalledExactlyOnceWith('source', 'enemy');
});
