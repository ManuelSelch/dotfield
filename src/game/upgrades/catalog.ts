import type { FactionRules } from '../types';

export interface StatModifier {
  readonly kind: 'multiply-stat';
  readonly stat: keyof FactionRules;
  readonly multiplier: number;
}
interface UpgradeDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly effects: readonly StatModifier[];
}

export const UPGRADES = {
  industry: {
    id: 'industry', name: 'Industry', description: '+25% production · You only',
    effects: [{ kind: 'multiply-stat', stat: 'unitsPerSecond', multiplier: 1.25 }],
  },
} as const satisfies Record<string, UpgradeDefinition>;
export type UpgradeId = keyof typeof UPGRADES;
