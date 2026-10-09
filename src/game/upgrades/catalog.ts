import type { FactionRules } from '../types';
import type { FactoryFeature, WatchtowerFeature } from '../features/types';

export interface StatModifier {
  readonly kind: 'multiply-stat';
  readonly stat: keyof FactionRules;
  readonly multiplier: number;
}
export interface StartingFeatureEffect {
  readonly kind: 'attach-starting-feature';
  readonly feature: Omit<FactoryFeature, 'id' | 'beneficiaryId'> | Omit<WatchtowerFeature, 'id'>;
}
export type UpgradeEffect = StatModifier | StartingFeatureEffect;
interface UpgradeDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly effects: readonly UpgradeEffect[];
}

export const UPGRADES = {
  industry: {
    id: 'industry', name: 'Industry', description: '+25% production · You only',
    effects: [{ kind: 'multiply-stat', stat: 'unitsPerSecond', multiplier: 1.25 }],
  },
  factory: {
    id: 'factory', name: 'Factory', description: '2× starting-city production · You only',
    effects: [{ kind: 'attach-starting-feature', feature: { kind: 'factory', productionMultiplier: 2 } }],
  },
  watchtower: {
    id: 'watchtower', name: 'Watchtower', description: 'Shoots up to 4 nearby enemy troops per second · Changes sides if captured',
    effects: [{ kind: 'attach-starting-feature', feature: { kind: 'watchtower', range: 72, fireIntervalMs: 250 } }],
  },
} as const satisfies Record<string, UpgradeDefinition>;
export type UpgradeId = keyof typeof UPGRADES;
