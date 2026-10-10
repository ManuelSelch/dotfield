import { describe, expect, it } from 'vitest';
import { FIELD, projectBoard } from './layout';
import { TERRITORIES } from './map';

describe('static board', () => {
  it('has unique territories, both factions, and neutral defenders', () => {
    expect(new Set(TERRITORIES.map((node) => node.id)).size).toBe(TERRITORIES.length);
    expect(new Set(TERRITORIES.map((node) => node.owner))).toEqual(new Set(['player', 'enemy', 'neutral']));
    for (const node of TERRITORIES) {
      expect(Number.isInteger(node.units)).toBe(true);
      expect(node.units).toBeGreaterThan(0);
    }
  });

  it.each([[288, 300], [288, 350], [358, 540], [448, 650]])(
    'fits every circle into a %i × %i board without overlap', (width, height) => {
      const nodes = projectBoard(TERRITORIES, width, height);
      for (const node of nodes) {
        expect(node.x - node.radius).toBeGreaterThanOrEqual(0);
        expect(node.x + node.radius).toBeLessThanOrEqual(width);
        expect(node.y - node.radius).toBeGreaterThanOrEqual(0);
        expect(node.y + node.radius).toBeLessThanOrEqual(height);
        expect(node.fontSize).toBeGreaterThanOrEqual(11);
      }
      for (let i = 0; i < nodes.length; i++) {
        for (const other of nodes.slice(i + 1)) {
          expect(Math.hypot(nodes[i].x - other.x, nodes[i].y - other.y))
            .toBeGreaterThan(nodes[i].radius + other.radius + 8);
        }
      }
    },
  );

  it('centres the field and preserves its proportions', () => {
    const nodes = projectBoard(TERRITORIES, FIELD.width * 2, FIELD.height);
    expect(nodes[0].x).toBe(TERRITORIES[0].x + FIELD.width / 2);
    expect(nodes[0].y).toBe(TERRITORIES[0].y);
    expect(nodes[0].radius).toBe(FIELD.radius);
  });
});
