import { describe, expect, it, vi } from 'vitest';
import { drawCityFeatures } from './drawCityFeatures';
import { drawChevronIcon } from './upgradeIcons';
import { createSimulation } from '../game/state';
import { compileRoundSetup } from '../game/upgrades/compile';
import type { Territory } from '../game/types';

const host: Territory = { id: 'host', owner: 'player', units: 36, x: 100, y: 100 };
const enemy: Territory = { id: 'enemy', owner: 'enemy', units: 36, x: 250, y: 300 };
const context = () => ({ save: vi.fn(), restore: vi.fn(), beginPath: vi.fn(), arc: vi.fn(),
  fill: vi.fn(), stroke: vi.fn(), fillText: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(),
  closePath: vi.fn(), translate: vi.fn(), scale: vi.fn(), setLineDash: vi.fn(), globalAlpha: 1 });
const seed = (upgrades: ('factory' | 'industry' | 'watchtower' | 'slow-zone')[] = []) => {
  const setup = compileRoundSetup([host, enemy], { player: upgrades });
  return createSimulation(setup.territories, setup.rules);
};
const render = (state = seed(), width = 360, height = 480) => {
  const ctx = context(); drawCityFeatures(ctx as unknown as CanvasRenderingContext2D, state, width, height); return ctx;
};

describe('city upgrade indicators', () => {
  it('draws a vector factory silhouette, not F text, above/right of the counter', () => {
    const ctx = render(seed(['factory']));
    expect(ctx.fillText).not.toHaveBeenCalled(); expect(ctx.closePath).toHaveBeenCalledOnce();
    expect(ctx.lineTo.mock.calls.length).toBeGreaterThan(6);
    expect(ctx.translate.mock.calls[0][0]).toBeGreaterThan(host.x);
    expect(ctx.translate.mock.calls[0][1]).toBeLessThan(host.y);
  });
  it('draws one left-side chevron for Industry but none on ordinary enemy cities', () => {
    const ctx = render(seed(['industry']));
    expect(ctx.arc).toHaveBeenCalledOnce(); expect(ctx.moveTo).toHaveBeenCalledOnce();
    expect(ctx.lineTo).toHaveBeenCalledTimes(2);
    expect(ctx.translate.mock.calls[0][0]).toBeLessThan(host.x);
  });
  it('draws two distinct badges when Factory and Industry stack, not a double chevron', () => {
    const ctx = render(seed(['factory', 'industry']));
    expect(ctx.arc).toHaveBeenCalledTimes(2); expect(ctx.closePath).toHaveBeenCalledOnce();
    expect(ctx.moveTo).toHaveBeenCalledTimes(2);
    expect(ctx.translate.mock.calls.map(call => call[0] > host.x)).toEqual([true, false]);
  });
  it('keeps a captured factory active and removes the former owner’s Industry chevron', () => {
    const state = seed(['factory', 'industry']);
    const ctx = render({ ...state, territories: state.territories.map(city => ({ ...city, owner: 'enemy' })) });
    expect(ctx.arc).toHaveBeenCalledOnce(); expect(ctx.globalAlpha).toBe(1);
    expect(ctx.closePath).toHaveBeenCalledOnce(); expect(ctx.restore).toHaveBeenCalledOnce();
    const restored = render(state); expect(restored.arc).toHaveBeenCalledTimes(2);
  });
  it('dims neutral factories until captured', () => {
    const state = seed(['factory']);
    const ctx = render({ ...state, territories: state.territories.map(city => ({ ...city, owner: 'neutral' })) });
    expect(ctx.globalAlpha).toBe(0.45);
  });
  it('shows the Industry chevron on newly captured cities, never on neutrals', () => {
    const state = seed(['industry']);
    const cities = [state.territories[0], { ...state.territories[1], owner: 'player' as const },
      { ...state.territories[1], id: 'neutral', owner: 'neutral' as const }];
    expect(render({ ...state, territories: cities }).arc).toHaveBeenCalledTimes(2);
  });
  it('keeps small-board icons readable and separated from counters', () => {
    const ctx = render(seed(['factory', 'industry']), 288, 260);
    for (const call of ctx.arc.mock.calls) expect(call[2]).toBe(5);
    expect(ctx.save).toHaveBeenCalledTimes(2); expect(ctx.restore).toHaveBeenCalledTimes(2);
  });
  it('uses compact badges outside the counter on the logical-size board', () => {
    const ctx = render(seed(['factory', 'industry']));
    expect(ctx.arc.mock.calls.map(call => call.slice(0, 3))).toEqual([
      [114, 86, 5], [86, 86, 5],
    ]);
  });
  it('draws a compact cannon outside the counter, distinct from the Factory badge', () => {
    const city = { ...host, features: [{ id: 'gun', kind: 'artillery' as const, range: 90, fireIntervalMs: 2000 }] };
    const ctx = render(createSimulation([city, enemy]));
    expect(ctx.arc.mock.calls[0].slice(0, 3)).toEqual([114, 86, 5]);
    expect(ctx.lineTo.mock.calls.length).toBeGreaterThan(3);
    const stacked = render(createSimulation([{ ...city, features: [...city.features, { id: 'plant', kind: 'factory', productionMultiplier: 2 }] }, enemy]));
    expect(new Set(stacked.translate.mock.calls.map(call => call.join(','))).size).toBe(2);
  });
  it('adds no indicators when no upgrades are active', () => {
    expect(render().arc).not.toHaveBeenCalled();
  });
  it('draws the Watchtower coverage ring and tower silhouette at the starting city', () => {
    const state = seed(['watchtower']); const ctx = render(state);
    // One large coverage arc plus one small tower badge; the circle is a visual overlay only.
    expect(ctx.arc).toHaveBeenCalledTimes(2);
    const radii = ctx.arc.mock.calls.map(call => call[2]);
    expect(radii.some(radius => radius > 21)).toBe(true);
    expect(ctx.translate).toHaveBeenCalledOnce(); expect(ctx.fillText).not.toHaveBeenCalled();
  });
  it('draws a distinct dashed 90-unit Slow Zone circle and lower-left marker', () => {
    const ctx = render(seed(['slow-zone']));
    expect(ctx.arc.mock.calls.some(call => call[2] === 90)).toBe(true);
    expect(ctx.setLineDash).toHaveBeenCalledWith([4, 4]);
    expect(ctx.translate.mock.calls[0][0]).toBeLessThan(host.x);
    expect(ctx.translate.mock.calls[0][1]).toBeGreaterThan(host.y);
  });
  it('keeps four upgrade markers distinct when all effects share a city', () => {
    const ctx = render(seed(['factory', 'industry', 'watchtower', 'slow-zone']));
    expect(ctx.translate.mock.calls.map(([x, y]) => [x > host.x, y > host.y])).toEqual([
      [true, false], [false, true], [true, true], [false, false],
    ]);
  });
  it('supports two stacked chevrons for a future level without enabling that level', () => {
    const ctx = context(); drawChevronIcon(ctx as unknown as CanvasRenderingContext2D, 2);
    expect(ctx.moveTo).toHaveBeenCalledTimes(2); expect(ctx.lineTo).toHaveBeenCalledTimes(4);
  });
});
