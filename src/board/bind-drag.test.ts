import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Territory } from '@/game/types';

import { bindDrag } from './bind-drag';

afterEach(() => vi.unstubAllGlobals());
function harness(options: import('./city-input-options').CityInputOptions = {}) {
  vi.stubGlobal('document', { hidden: false });
  let nodes: readonly Territory[] = [
    { id: 'source', owner: 'player', units: 36, x: 180, y: 420 },
    { id: 'friendly', owner: 'player', units: 12, x: 60, y: 240 },
    { id: 'target', owner: 'neutral', units: 20, x: 180, y: 240 },
    { id: 'enemy', owner: 'enemy', units: 36, x: 180, y: 60 },
  ];
  const captures = new Set<number>();
  const canvas = Object.assign(new EventTarget(), {
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 360, height: 480 }),
    setPointerCapture: (id: number) => captures.add(id),
    hasPointerCapture: (id: number) => captures.has(id),
    releasePointerCapture: (id: number) => captures.delete(id),
  }) as unknown as HTMLCanvasElement;
  const select = vi.fn(),
    dispatch = vi.fn();
  const input = bindDrag(canvas, () => nodes, select, dispatch, undefined, options);
  function pointer(type: string, x: number, y: number, pointerType = 'mouse', extras = {}) {
    canvas.dispatchEvent(
      Object.assign(new Event(type, { cancelable: true }), {
        clientX: x,
        clientY: y,
        pointerType,
        pointerId: 1,
        button: 0,
        isPrimary: true,
        ...extras,
      }),
    );
  }
  function click(x: number, y: number, type = 'mouse') {
    pointer('pointerdown', x, y, type);
    pointer('pointerup', x, y, type);
  }
  return {
    input,
    select,
    dispatch,
    pointer,
    click,
    captures,
    changeSource: (owner: Territory['owner'], units: number) => {
      nodes = nodes.map((n) => (n.id === 'source' ? { ...n, owner, units } : n));
    },
  };
}

describe('optional city management input', () => {
  it('opens an owned one-troop city on touch/pen/mouse tap without dispatch', () => {
    for (const type of ['touch', 'pen', 'mouse']) {
      const tap = vi.fn(),
        h = harness({ onOwnedCityTap: tap });
      h.changeSource('player', 1);
      h.click(180, 420, type);
      expect(tap).toHaveBeenCalledExactlyOnceWith('source', type);
      expect(h.dispatch).not.toHaveBeenCalled();
    }
  });
  it('separates jitter from drag on touch and never opens the bar for a drag', () => {
    const tap = vi.fn(),
      h = harness({ onOwnedCityTap: tap });
    h.pointer('pointerdown', 180, 420, 'touch');
    h.pointer('pointerup', 186, 422, 'touch');
    expect(tap).toHaveBeenCalledOnce();
    tap.mockClear();
    h.pointer('pointerdown', 180, 420, 'touch');
    h.pointer('pointerup', 180, 240, 'touch');
    expect(tap).not.toHaveBeenCalled();
    expect(h.dispatch).toHaveBeenCalledExactlyOnceWith('source', 'target');
  });
  it('routes fly and ground target taps without a default order or management tap', () => {
    for (const mode of ['fly', 'ground'] as const) {
      const target = vi.fn(),
        tap = vi.fn();
      const h = harness({ getTargetMode: () => mode, onTargetTap: target, onOwnedCityTap: tap });
      h.click(180, 60, 'touch');
      h.click(60, 240);
      expect(target.mock.calls).toEqual([
        ['enemy', mode],
        ['friendly', mode],
      ]);
      expect(h.dispatch).not.toHaveBeenCalled();
      expect(tap).not.toHaveBeenCalled();
    }
  });
  it('ignores target-mode drags and calls outside dismissal without an order', () => {
    const target = vi.fn(),
      outside = vi.fn();
    const h = harness({ getTargetMode: () => 'fly', onTargetTap: target, onOutsideTap: outside });
    h.pointer('pointerdown', 180, 420, 'touch');
    h.pointer('pointerup', 180, 240, 'touch');
    expect(target).not.toHaveBeenCalled();
    expect(h.dispatch).not.toHaveBeenCalled();
    h.click(400, 240);
    expect(outside).toHaveBeenCalledOnce();
  });
  it('does not open a city captured during a tap', () => {
    const tap = vi.fn(),
      h = harness({ onOwnedCityTap: tap });
    h.pointer('pointerdown', 180, 420, 'touch');
    h.changeSource('enemy', 36);
    h.pointer('pointerup', 180, 420, 'touch');
    expect(tap).not.toHaveBeenCalled();
    expect(h.dispatch).not.toHaveBeenCalled();
  });
});

describe('mouse-only click and pointer drag input', () => {
  it('persists full-region source selection then dispatches exactly once and clears', () => {
    const h = harness();
    h.click(280, 470);
    expect(h.select).toHaveBeenLastCalledWith(
      expect.objectContaining({ sourceId: 'source', targetId: null, point: { x: 180, y: 420 } }),
    );
    expect(h.dispatch).not.toHaveBeenCalled();
    expect(h.captures.size).toBe(0);
    h.click(200, 240);
    expect(h.dispatch).toHaveBeenCalledExactlyOnceWith('source', 'target');
    expect(h.select).toHaveBeenLastCalledWith(null);
    h.click(180, 60);
    expect(h.dispatch).toHaveBeenCalledTimes(1);
  });
  it('allows friendly reinforcement and cancels on source re-click', () => {
    const h = harness();
    h.click(180, 420);
    h.click(180, 420);
    expect(h.select).toHaveBeenLastCalledWith(null);
    expect(h.dispatch).not.toHaveBeenCalled();
    h.click(180, 420);
    h.click(60, 240);
    expect(h.dispatch).toHaveBeenCalledExactlyOnceWith('source', 'friendly');
  });
  it('tolerates small mouse jitter without starting a drag', () => {
    const h = harness();
    h.pointer('pointerdown', 180, 420);
    h.pointer('pointermove', 183, 422);
    h.pointer('pointerup', 183, 422);
    expect(h.select).toHaveBeenLastCalledWith(expect.objectContaining({ sourceId: 'source' }));
    h.click(180, 240);
    expect(h.dispatch).toHaveBeenCalledExactlyOnceWith('source', 'target');
  });
  it('starts a drag from the pressed source, replacing old click selection without duplicate dispatch', () => {
    const h = harness();
    h.click(180, 420);
    h.pointer('pointerdown', 60, 240);
    h.pointer('pointermove', 180, 240);
    h.pointer('pointerup', 180, 240);
    expect(h.dispatch).toHaveBeenCalledExactlyOnceWith('friendly', 'target');
    h.click(180, 60);
    expect(h.dispatch).toHaveBeenCalledTimes(1);
  });
  it('never treats touch or pen taps as click-to-click and preserves drag dispatch', () => {
    for (const type of ['touch', 'pen']) {
      const h = harness();
      h.click(180, 420, type);
      h.click(180, 240, type);
      expect(h.dispatch).not.toHaveBeenCalled();
      expect(h.select).toHaveBeenLastCalledWith(null);
      h.pointer('pointerdown', 180, 420, type);
      h.pointer('pointermove', 180, 240, type);
      h.pointer('pointerup', 180, 240, type);
      expect(h.dispatch).toHaveBeenCalledExactlyOnceWith('source', 'target');
    }
  });
  it('clears mouse selection when a touch gesture begins', () => {
    const h = harness();
    h.click(180, 420);
    h.click(180, 240, 'touch');
    h.click(180, 240);
    expect(h.dispatch).not.toHaveBeenCalled();
  });
  it('invalid drags, pointer cancellation and lost capture clear without orders', () => {
    for (const ending of ['outside', 'source', 'pointercancel', 'lostpointercapture']) {
      const h = harness();
      h.click(180, 420);
      h.pointer('pointerdown', 180, 420);
      h.pointer('pointermove', 180, 240);
      if (ending === 'outside') h.pointer('pointerup', 400, 240);
      else if (ending === 'source') h.pointer('pointerup', 180, 420);
      else h.pointer(ending, 180, 240);
      h.click(180, 240);
      expect(h.dispatch).not.toHaveBeenCalled();
      expect(h.captures.size).toBe(0);
    }
  });
  it('does not turn a drag starting on an enemy into a pending click order', () => {
    const h = harness();
    h.click(180, 420);
    h.pointer('pointerdown', 180, 60);
    h.pointer('pointermove', 180, 240);
    h.pointer('pointerup', 180, 240);
    expect(h.dispatch).not.toHaveBeenCalled();
    h.click(180, 240);
    expect(h.dispatch).not.toHaveBeenCalled();
  });
  it('rejects captured or depleted sources at dispatch time', () => {
    for (const [owner, units] of [
      ['enemy', 36],
      ['player', 1],
    ] as const) {
      const h = harness();
      h.click(180, 420);
      h.pointer('pointerdown', 180, 240);
      h.changeSource(owner, units);
      h.pointer('pointerup', 180, 240);
      expect(h.dispatch).not.toHaveBeenCalled();
      expect(h.select).toHaveBeenLastCalledWith(null);
    }
  });
  it('revalidates an active drag source before releasing an order', () => {
    const h = harness();
    h.pointer('pointerdown', 180, 420);
    h.pointer('pointermove', 180, 240);
    h.changeSource('enemy', 36);
    h.pointer('pointerup', 180, 240);
    expect(h.dispatch).not.toHaveBeenCalled();
    expect(h.select).toHaveBeenLastCalledWith(null);
  });
  it('ignores nonprimary and right-button presses and hidden dispatch', () => {
    const h = harness();
    h.pointer('pointerdown', 180, 420, 'mouse', { button: 2 });
    h.pointer('pointerup', 180, 420);
    h.pointer('pointerdown', 180, 420, 'mouse', { isPrimary: false });
    h.pointer('pointerup', 180, 420);
    h.click(180, 240);
    expect(h.dispatch).not.toHaveBeenCalled();
    h.click(180, 420);
    Object.assign(document, { hidden: true });
    h.click(180, 240);
    expect(h.dispatch).not.toHaveBeenCalled();
  });
  it('clears invalid persistent sources proactively without waiting for another pointer event', () => {
    for (const [owner, units] of [
      ['enemy', 36],
      ['player', 1],
    ] as const) {
      const h = harness();
      h.click(180, 420);
      h.changeSource(owner, units);
      h.input.validate();
      expect(h.select).toHaveBeenLastCalledWith(null);
      expect(h.dispatch).not.toHaveBeenCalled();
    }
  });
  it('explicit cancellation/disposal removes pending selection and listeners', () => {
    const h = harness();
    h.click(180, 420);
    h.input.cancel();
    h.click(180, 240);
    expect(h.dispatch).not.toHaveBeenCalled();
    h.click(180, 420);
    h.input.dispose();
    h.click(180, 240);
    expect(h.dispatch).not.toHaveBeenCalled();
  });
});
