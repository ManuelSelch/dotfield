import { describe, expect, it } from 'vitest';
import { TERRITORIES } from './map';
import { projectBoard } from './layout';
import { hitTest } from './hitTest';

describe('CSS-pixel city-region hit testing', () => {
  it('selects large regions outside city circles and cancels only outside the board', () => {
    expect(hitTest(TERRITORIES, 360, 480, { x: 100, y: 470 })).toBe('south');
    expect(hitTest(TERRITORIES, 360, 480, { x: 177, y: 185 })).toBe('centre');
    expect(hitTest(TERRITORIES, 360, 480, { x: -1, y: 470 })).toBeNull();
    expect(hitTest(TERRITORIES, 360, 480, { x: 361, y: 240 })).toBeNull();
    expect(hitTest(TERRITORIES, 360, 480, { x: 180, y: 481 })).toBeNull();
    expect(hitTest([], 360, 480, { x: 0, y: 0 })).toBeNull();
  });
  it('uses map order to deterministically break a border tie', () => {
    const cities = [
      { ...TERRITORIES[0], id: 'left', x: 90, y: 240 },
      { ...TERRITORIES[0], id: 'right', x: 270, y: 240 },
    ];
    expect(hitTest(cities, 360, 480, { x: 180, y: 240 })).toBe('left');
  });
  it('assigns every point on the canvas, including letterboxed margins', () => {
    for (let x = 0; x <= 358; x += 20) {
      for (let y = 0; y <= 640; y += 20) {
        expect(hitTest(TERRITORIES, 358, 640, { x, y })).not.toBeNull();
      }
    }
  });

  it.each([[288, 350], [358, 640], [448, 650]])('finds circles at %i × %i with letterboxing', (width, height) => {
    const nodes = projectBoard(TERRITORIES, width, height);
    for (const node of nodes) {
      expect(hitTest(TERRITORIES, width, height, node)).toBe(node.id);
      expect(hitTest(TERRITORIES, width, height, { x: node.x + node.radius - 0.1, y: node.y })).toBe(node.id);
    }
    expect(hitTest(TERRITORIES, width, height, { x: 0, y: 0 })).not.toBeNull();
    expect(hitTest(TERRITORIES, width, height, { x: -100, y: -100 })).toBeNull();
  });
});
