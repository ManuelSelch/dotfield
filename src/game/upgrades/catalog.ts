import type { FactionRules } from '../types';
import type { FactoryFeature } from '../features/types';

export interface StatModifier {
  readonly kind: 'multiply-stat';
  readonly stat: Exclude<keyof FactionRules, 'captureShieldBatches' | 'connectedDefense'>;
  readonly multiplier: number;
}
export interface StartingFeatureEffect {
  readonly kind: 'attach-starting-feature';
  readonly feature: Omit<FactoryFeature, 'id' | 'beneficiaryId'>;
}
export interface CaptureShieldEffect {
  readonly kind: 'capture-shield';
  readonly batches: number;
}
export interface ConnectedDefenseEffect {
  readonly kind: 'connected-defense';
}
export type UpgradeEffect = StatModifier | StartingFeatureEffect | CaptureShieldEffect | ConnectedDefenseEffect;
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
    id: 'factory', name: 'Factory', description: '2× starting-city production · Follows ownership',
    effects: [{ kind: 'attach-starting-feature', feature: { kind: 'factory', productionMultiplier: 2 } }],
  },
  'capture-shield': {
    id: 'capture-shield', name: 'Capture shield', description: 'New captures block 3 hostile batches · Refreshes on recapture',
    effects: [{ kind: 'capture-shield', batches: 3 }],
  },
  'defensive-network': {
    id: 'defensive-network', name: 'Defensive Network', description: 'Connected cities gain up to +30% defense against troops',
    effects: [{ kind: 'connected-defense' }],
  },
} as const satisfies Record<string, UpgradeDefinition>;
export type UpgradeId = keyof typeof UPGRADES;
