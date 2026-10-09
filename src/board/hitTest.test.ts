import { describe, expect, it } from 'vitest';
import { TERRITORIES } from './map';
import { projectBoard } from './layout';
import { hitTest } from './hitTest';

describe('CSS-pixel hit testing', () => {
  it.each([[288, 350], [358, 640], [448, 650]])('finds circles at %i × %i with letterboxing', (width, height) => {
    const nodes = projectBoard(TERRITORIES, width, height);
    for (const node of nodes) {
      expect(hitTest(TERRITORIES, width, height, node)).toBe(node.id);
      expect(hitTest(TERRITORIES, width, height, { x: node.x + node.radius - 0.1, y: node.y })).toBe(node.id);
    }
    expect(hitTest(TERRITORIES, width, height, { x: 0, y: 0 })).toBeNull();
    expect(hitTest(TERRITORIES, width, height, { x: -100, y: -100 })).toBeNull();
  });
});
