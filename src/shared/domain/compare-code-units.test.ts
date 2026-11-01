import { describe, expect, it } from 'vitest';

import { compareCodeUnits } from './compare-code-units';

describe('deterministic identifier ordering', () => {
  it('preserves default UTF-16 ordering rather than locale or numeric ordering', () => {
    const ids = ['enemy-2', 'enemy-10', 'enemy', 'ä', 'Z', 'a', '😀', '\uffff'];

    expect([...ids].sort(compareCodeUnits)).toEqual([
      'Z',
      'a',
      'enemy',
      'enemy-10',
      'enemy-2',
      'ä',
      '😀',
      '\uffff',
    ]);
  });

  it('compares equal identifiers equally', () => {
    expect(compareCodeUnits('enemy', 'enemy')).toBe(0);
    expect(compareCodeUnits('', '')).toBe(0);
    expect(compareCodeUnits('', 'enemy')).toBe(-1);
    expect(compareCodeUnits('enemy', '')).toBe(1);
  });
});
